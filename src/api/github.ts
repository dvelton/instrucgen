import type {
  GitHubUser,
  GitHubRepo,
  GitHubEvent,
  LanguageBytes,
  RepoAnalysisData,
  DetectedDependencies,
  PackageJsonData,
  CargoTomlData,
  GoModData,
  PyprojectData,
  ProjectStructureSignals,
  FetchProgress,
} from "./types";

const API_BASE = "https://api.github.com";
const RAW_BASE = "https://raw.githubusercontent.com";

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function apiFetch<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: headers(token) });
  if (res.status === 404) throw new Error("not_found");
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") throw new Error("rate_limited");
    throw new Error("forbidden");
  }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

async function fetchRaw(owner: string, repo: string, branch: string, path: string): Promise<string | null> {
  try {
    const res = await fetch(`${RAW_BASE}/${owner}/${repo}/${branch}/${path}`);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

export async function fetchUserProfile(username: string, token?: string): Promise<GitHubUser> {
  return apiFetch<GitHubUser>(`/users/${username}`, token);
}

export async function fetchUserRepos(username: string, token?: string): Promise<GitHubRepo[]> {
  const allRepos: GitHubRepo[] = [];
  let page = 1;
  while (true) {
    const batch = await apiFetch<GitHubRepo[]>(
      `/users/${username}/repos?sort=pushed&per_page=100&page=${page}&type=owner`,
      token
    );
    allRepos.push(...batch);
    if (batch.length < 100) break;
    page++;
    if (page > 5) break; // cap at 500 repos
  }
  return allRepos;
}

export async function fetchRepoLanguages(
  owner: string,
  repo: string,
  token?: string
): Promise<LanguageBytes> {
  return apiFetch<LanguageBytes>(`/repos/${owner}/${repo}/languages`, token);
}

export async function fetchPublicEvents(username: string, token?: string): Promise<GitHubEvent[]> {
  const allEvents: GitHubEvent[] = [];
  for (let page = 1; page <= 3; page++) {
    try {
      const batch = await apiFetch<GitHubEvent[]>(
        `/users/${username}/events/public?per_page=100&page=${page}`,
        token
      );
      allEvents.push(...batch);
      if (batch.length < 100) break;
    } catch {
      break;
    }
  }
  return allEvents;
}

async function detectDependencies(
  owner: string,
  repo: string,
  branch: string
): Promise<DetectedDependencies> {
  const [pkgRaw, reqRaw, cargoRaw, goModRaw, gemfileRaw, pyprojectRaw] = await Promise.all([
    fetchRaw(owner, repo, branch, "package.json"),
    fetchRaw(owner, repo, branch, "requirements.txt"),
    fetchRaw(owner, repo, branch, "Cargo.toml"),
    fetchRaw(owner, repo, branch, "go.mod"),
    fetchRaw(owner, repo, branch, "Gemfile"),
    fetchRaw(owner, repo, branch, "pyproject.toml"),
  ]);

  let packageJson: PackageJsonData | null = null;
  if (pkgRaw) {
    try {
      const parsed = JSON.parse(pkgRaw);
      packageJson = {
        dependencies: parsed.dependencies || {},
        devDependencies: parsed.devDependencies || {},
        scripts: parsed.scripts || {},
      };
    } catch { /* invalid JSON */ }
  }

  let requirementsTxt: string[] | null = null;
  if (reqRaw) {
    requirementsTxt = reqRaw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => l.split(/[>=<!\s]/)[0].toLowerCase());
  }

  let cargoToml: CargoTomlData | null = null;
  if (cargoRaw) {
    const depMatches = cargoRaw.match(/^\[dependencies\]([\s\S]*?)(?=^\[|\Z)/m);
    if (depMatches) {
      cargoToml = {
        dependencies: depMatches[1]
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("#") && !l.startsWith("["))
          .map((l) => l.split(/\s*=/)[0]),
      };
    }
  }

  let goMod: GoModData | null = null;
  if (goModRaw) {
    const moduleLine = goModRaw.match(/^module\s+(.+)$/m);
    const requireBlock = goModRaw.match(/require\s*\(([\s\S]*?)\)/);
    const requires = requireBlock
      ? requireBlock[1]
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("//"))
          .map((l) => l.split(/\s+/)[0])
      : [];
    goMod = { module: moduleLine?.[1] || "", requires };
  }

  let gemfile: string[] | null = null;
  if (gemfileRaw) {
    gemfile = gemfileRaw
      .split("\n")
      .filter((l) => l.trim().startsWith("gem "))
      .map((l) => {
        const match = l.match(/gem\s+['"]([^'"]+)['"]/);
        return match ? match[1] : "";
      })
      .filter(Boolean);
  }

  let pyprojectToml: PyprojectData | null = null;
  if (pyprojectRaw) {
    const deps: string[] = [];
    const devDeps: string[] = [];
    const depsMatch = pyprojectRaw.match(/\[project\][\s\S]*?dependencies\s*=\s*\[([\s\S]*?)\]/);
    if (depsMatch) {
      deps.push(
        ...depsMatch[1]
          .split("\n")
          .map((l) => l.trim().replace(/['"]/g, ""))
          .filter((l) => l && l !== ",")
          .map((l) => l.replace(/[,>=<!\s].*/g, "").toLowerCase())
      );
    }
    const buildMatch = pyprojectRaw.match(/\[build-system\][\s\S]*?requires\s*=\s*\[([\s\S]*?)\]/);
    const buildSystem = buildMatch
      ? buildMatch[1].replace(/['"]/g, "").trim().split(",")[0]?.trim() || null
      : null;
    pyprojectToml = { dependencies: deps, devDependencies: devDeps, buildSystem };
  }

  return { packageJson, requirementsTxt, cargoToml, goMod, gemfile, pyprojectToml };
}

async function detectProjectStructure(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<ProjectStructureSignals> {
  const signals: ProjectStructureSignals = {
    hasSrcDir: false,
    hasTestDir: false,
    hasDocsDir: false,
    hasCiConfig: false,
    hasDockerfile: false,
    hasLinterConfig: false,
    hasTypeScriptConfig: false,
    ciConfigFiles: [],
    linterConfigFiles: [],
  };

  try {
    const contents = await apiFetch<Array<{ name: string; type: string }>>(
      `/repos/${owner}/${repo}/contents/?ref=${branch}`,
      token
    );

    const names = contents.map((c) => c.name.toLowerCase());
    const dirNames = contents.filter((c) => c.type === "dir").map((c) => c.name.toLowerCase());

    signals.hasSrcDir = dirNames.some((d) => ["src", "lib", "app"].includes(d));
    signals.hasTestDir = dirNames.some((d) =>
      ["test", "tests", "__tests__", "spec", "specs"].includes(d)
    );
    signals.hasDocsDir = dirNames.some((d) => ["docs", "doc", "documentation"].includes(d));

    signals.hasDockerfile = names.some((n) =>
      ["dockerfile", "docker-compose.yml", "docker-compose.yaml", ".dockerignore"].includes(n)
    );

    const tsConfigs = ["tsconfig.json", "tsconfig.build.json"];
    signals.hasTypeScriptConfig = names.some((n) => tsConfigs.includes(n));

    const linterFiles = [
      ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.cjs", ".eslintrc.yml",
      "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs",
      ".prettierrc", ".prettierrc.json", ".prettierrc.js", "prettier.config.js",
      ".stylelintrc", ".stylelintrc.json",
      "biome.json", "biome.jsonc",
      ".ruff.toml", "ruff.toml",
      "setup.cfg", ".flake8",
      ".rubocop.yml",
      "clippy.toml", ".clippy.toml",
    ];
    signals.linterConfigFiles = names.filter((n) => linterFiles.includes(n));
    signals.hasLinterConfig = signals.linterConfigFiles.length > 0;

    if (dirNames.includes(".github")) {
      signals.hasCiConfig = true;
      signals.ciConfigFiles.push("GitHub Actions");
    }
    if (names.includes(".travis.yml")) {
      signals.hasCiConfig = true;
      signals.ciConfigFiles.push("Travis CI");
    }
    if (names.includes(".circleci") || dirNames.includes(".circleci")) {
      signals.hasCiConfig = true;
      signals.ciConfigFiles.push("CircleCI");
    }
    if (names.includes("jenkinsfile")) {
      signals.hasCiConfig = true;
      signals.ciConfigFiles.push("Jenkins");
    }
  } catch {
    // contents API call failed -- not critical
  }

  return signals;
}

export async function analyzeTopRepos(
  user: GitHubUser,
  repos: GitHubRepo[],
  token: string | undefined,
  onProgress: (p: FetchProgress) => void
): Promise<RepoAnalysisData[]> {
  // Pick the top repos by a score combining recency and stars
  const nonForkRepos = repos.filter((r) => !r.fork && !r.archived);
  const scored = nonForkRepos.map((r) => {
    const daysSincePush = (Date.now() - new Date(r.pushed_at).getTime()) / 86400000;
    const recencyScore = Math.max(0, 100 - daysSincePush);
    const starScore = Math.min(r.stargazers_count * 5, 50);
    const sizeScore = Math.min(r.size / 100, 20);
    return { repo: r, score: recencyScore + starScore + sizeScore };
  });
  scored.sort((a, b) => b.score - a.score);
  const topRepos = scored.slice(0, 8).map((s) => s.repo);

  const results: RepoAnalysisData[] = [];

  for (let i = 0; i < topRepos.length; i++) {
    const repo = topRepos[i];
    onProgress({
      stage: "Analyzing repositories",
      detail: repo.name,
      current: i + 1,
      total: topRepos.length,
    });

    const [languages, dependencies, structure] = await Promise.all([
      fetchRepoLanguages(user.login, repo.name, token).catch(() => ({} as LanguageBytes)),
      detectDependencies(user.login, repo.name, repo.default_branch),
      detectProjectStructure(user.login, repo.name, repo.default_branch, token),
    ]);

    const [readmeContent, instructionsContent] = await Promise.all([
      fetchRaw(user.login, repo.name, repo.default_branch, "README.md"),
      fetchRaw(user.login, repo.name, repo.default_branch, ".github/copilot-instructions.md"),
    ]);

    results.push({
      repo,
      languages,
      dependencies,
      hasReadme: readmeContent !== null,
      readmeExcerpt: readmeContent ? readmeContent.slice(0, 500) : null,
      hasExistingInstructions: instructionsContent !== null,
      existingInstructions: instructionsContent,
      projectStructure: structure,
    });
  }

  return results;
}
