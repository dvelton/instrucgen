import type { GitHubUser, GitHubRepo, GitHubEvent, RepoAnalysisData } from "../api/types";
import type {
  DeveloperProfile,
  LanguageEntry,
  LanguageProfile,
  FrameworkEntry,
  FrameworkProfile,
  ProjectType,
  ProjectTypeEntry,
  ProjectTypeProfile,
  CodingStyleProfile,
  DomainProfile,
  DomainSignal,
  ActivityProfile,
} from "./types";

// --- Framework detection maps ---

const NPM_FRAMEWORK_MAP: Record<string, { name: string; category: FrameworkEntry["category"] }> = {
  react: { name: "React", category: "frontend" },
  "react-dom": { name: "React", category: "frontend" },
  next: { name: "Next.js", category: "fullstack" },
  vue: { name: "Vue", category: "frontend" },
  nuxt: { name: "Nuxt", category: "fullstack" },
  svelte: { name: "Svelte", category: "frontend" },
  "@sveltejs/kit": { name: "SvelteKit", category: "fullstack" },
  angular: { name: "Angular", category: "frontend" },
  "@angular/core": { name: "Angular", category: "frontend" },
  express: { name: "Express", category: "backend" },
  fastify: { name: "Fastify", category: "backend" },
  hono: { name: "Hono", category: "backend" },
  koa: { name: "Koa", category: "backend" },
  "socket.io": { name: "Socket.IO", category: "backend" },
  prisma: { name: "Prisma", category: "backend" },
  "@prisma/client": { name: "Prisma", category: "backend" },
  drizzle: { name: "Drizzle ORM", category: "backend" },
  "drizzle-orm": { name: "Drizzle ORM", category: "backend" },
  mongoose: { name: "Mongoose", category: "backend" },
  sequelize: { name: "Sequelize", category: "backend" },
  typeorm: { name: "TypeORM", category: "backend" },
  tailwindcss: { name: "Tailwind CSS", category: "frontend" },
  "@tailwindcss/vite": { name: "Tailwind CSS", category: "frontend" },
  "styled-components": { name: "Styled Components", category: "frontend" },
  "@emotion/react": { name: "Emotion", category: "frontend" },
  electron: { name: "Electron", category: "other" },
  "react-native": { name: "React Native", category: "frontend" },
  expo: { name: "Expo", category: "frontend" },
  three: { name: "Three.js", category: "frontend" },
  d3: { name: "D3.js", category: "frontend" },
  tensorflow: { name: "TensorFlow.js", category: "ml" },
  "@tensorflow/tfjs": { name: "TensorFlow.js", category: "ml" },
};

const NPM_TEST_MAP: Record<string, string> = {
  jest: "Jest",
  vitest: "Vitest",
  mocha: "Mocha",
  "@testing-library/react": "React Testing Library",
  "@testing-library/jest-dom": "React Testing Library",
  cypress: "Cypress",
  playwright: "Playwright",
  "@playwright/test": "Playwright",
  puppeteer: "Puppeteer",
  ava: "AVA",
  tap: "Node TAP",
};

const NPM_BUILD_MAP: Record<string, string> = {
  vite: "Vite",
  webpack: "Webpack",
  esbuild: "esbuild",
  rollup: "Rollup",
  parcel: "Parcel",
  turbo: "Turborepo",
  tsup: "tsup",
  "@swc/core": "SWC",
};

const NPM_LINT_MAP: Record<string, string> = {
  eslint: "ESLint",
  prettier: "Prettier",
  "@biomejs/biome": "Biome",
  biome: "Biome",
  stylelint: "Stylelint",
  "@typescript-eslint/parser": "typescript-eslint",
};

const PY_FRAMEWORK_MAP: Record<string, { name: string; category: FrameworkEntry["category"] }> = {
  django: { name: "Django", category: "backend" },
  flask: { name: "Flask", category: "backend" },
  fastapi: { name: "FastAPI", category: "backend" },
  starlette: { name: "Starlette", category: "backend" },
  tornado: { name: "Tornado", category: "backend" },
  celery: { name: "Celery", category: "backend" },
  sqlalchemy: { name: "SQLAlchemy", category: "backend" },
  pandas: { name: "Pandas", category: "ml" },
  numpy: { name: "NumPy", category: "ml" },
  scipy: { name: "SciPy", category: "ml" },
  scikit: { name: "scikit-learn", category: "ml" },
  "scikit-learn": { name: "scikit-learn", category: "ml" },
  tensorflow: { name: "TensorFlow", category: "ml" },
  torch: { name: "PyTorch", category: "ml" },
  pytorch: { name: "PyTorch", category: "ml" },
  transformers: { name: "Hugging Face Transformers", category: "ml" },
  langchain: { name: "LangChain", category: "ml" },
  streamlit: { name: "Streamlit", category: "frontend" },
  gradio: { name: "Gradio", category: "frontend" },
  pytest: { name: "pytest", category: "testing" },
  ruff: { name: "Ruff", category: "linting" },
  black: { name: "Black", category: "linting" },
  mypy: { name: "mypy", category: "linting" },
  pydantic: { name: "Pydantic", category: "backend" },
};

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  "Legal Tech": ["legal", "law", "contract", "compliance", "litigation", "attorney", "counsel", "dispute"],
  "FinTech": ["finance", "fintech", "banking", "payment", "trading", "crypto", "blockchain", "defi"],
  "HealthTech": ["health", "medical", "clinical", "patient", "healthcare", "biotech", "pharma"],
  "EdTech": ["education", "learning", "course", "teaching", "student", "school", "curriculum"],
  "DevTools": ["developer", "devtool", "cli", "sdk", "api", "framework", "tooling", "dx"],
  "AI/ML": ["ai", "machine-learning", "ml", "deep-learning", "neural", "nlp", "llm", "generative", "model", "inference"],
  "Data Engineering": ["data-pipeline", "etl", "data-engineering", "analytics", "warehouse", "spark", "kafka"],
  "Security": ["security", "auth", "encryption", "vulnerability", "pentest", "cybersecurity"],
  "Gaming": ["game", "gaming", "unity", "godot", "gamedev", "engine"],
  "Infrastructure": ["infrastructure", "terraform", "kubernetes", "k8s", "cloud", "aws", "gcp", "azure", "devops", "sre"],
  "E-Commerce": ["ecommerce", "e-commerce", "shop", "store", "cart", "checkout", "product-catalog"],
  "Creative/Art": ["art", "generative-art", "creative", "music", "svg", "design", "visualization"],
};

function analyzeLanguages(repos: GitHubRepo[], repoData: RepoAnalysisData[]): LanguageProfile {
  const langStats: Record<string, { bytes: number; repos: Set<string>; recentRepos: number }> = {};
  const now = Date.now();
  const sixMonthsAgo = now - 180 * 86400000;

  for (const rd of repoData) {
    for (const [lang, bytes] of Object.entries(rd.languages)) {
      if (!langStats[lang]) langStats[lang] = { bytes: 0, repos: new Set(), recentRepos: 0 };
      langStats[lang].bytes += bytes;
      langStats[lang].repos.add(rd.repo.name);
      if (new Date(rd.repo.pushed_at).getTime() > sixMonthsAgo) {
        langStats[lang].recentRepos++;
      }
    }
  }

  // Also count primary language from all repos (not just analyzed ones)
  for (const repo of repos) {
    if (repo.language && !repo.fork && !repo.archived) {
      if (!langStats[repo.language]) langStats[repo.language] = { bytes: 0, repos: new Set(), recentRepos: 0 };
      langStats[repo.language].repos.add(repo.name);
    }
  }

  const totalBytes = Object.values(langStats).reduce((s, v) => s + v.bytes, 0) || 1;

  const entries: LanguageEntry[] = Object.entries(langStats)
    .map(([name, stats]) => ({
      name,
      totalBytes: stats.bytes,
      repoCount: stats.repos.size,
      percentage: Math.round((stats.bytes / totalBytes) * 1000) / 10,
      trend: (stats.recentRepos > stats.repos.size * 0.6
        ? "rising"
        : stats.recentRepos < stats.repos.size * 0.3
          ? "declining"
          : "stable") as LanguageEntry["trend"],
    }))
    .sort((a, b) => b.totalBytes - a.totalBytes);

  const primary = entries.filter((e) => e.percentage >= 10);
  const secondary = entries.filter((e) => e.percentage < 10 && e.percentage >= 2);

  // Detect pairings: languages that co-occur in the same repos
  const pairings: string[] = [];
  const langRepoSets = Object.entries(langStats).map(([name, stats]) => ({ name, repos: stats.repos }));
  for (let i = 0; i < langRepoSets.length; i++) {
    for (let j = i + 1; j < langRepoSets.length; j++) {
      const overlap = [...langRepoSets[i].repos].filter((r) => langRepoSets[j].repos.has(r));
      if (overlap.length >= 2) {
        pairings.push(`${langRepoSets[i].name} + ${langRepoSets[j].name}`);
      }
    }
  }

  return { primary, secondary, pairings: pairings.slice(0, 5) };
}

function analyzeFrameworks(repoData: RepoAnalysisData[]): FrameworkProfile {
  const seen = new Map<string, FrameworkEntry>();
  const buildTools = new Set<string>();
  const testingTools = new Set<string>();
  const lintingTools = new Set<string>();
  const ciPlatforms = new Set<string>();
  let containerization = false;
  const infrastructure = new Set<string>();

  function addFramework(name: string, category: FrameworkEntry["category"], source: string) {
    const existing = seen.get(name);
    if (existing) {
      existing.repoCount++;
    } else {
      seen.set(name, { name, category, repoCount: 1, source });
    }
  }

  for (const rd of repoData) {
    // NPM dependencies
    if (rd.dependencies.packageJson) {
      const allDeps = {
        ...rd.dependencies.packageJson.dependencies,
        ...rd.dependencies.packageJson.devDependencies,
      };
      for (const dep of Object.keys(allDeps)) {
        const fw = NPM_FRAMEWORK_MAP[dep];
        if (fw) addFramework(fw.name, fw.category, `package.json (${rd.repo.name})`);
        const test = NPM_TEST_MAP[dep];
        if (test) testingTools.add(test);
        const build = NPM_BUILD_MAP[dep];
        if (build) buildTools.add(build);
        const lint = NPM_LINT_MAP[dep];
        if (lint) lintingTools.add(lint);
      }
    }

    // Python dependencies
    const pyDeps = [
      ...(rd.dependencies.requirementsTxt || []),
      ...(rd.dependencies.pyprojectToml?.dependencies || []),
    ];
    for (const dep of pyDeps) {
      const fw = PY_FRAMEWORK_MAP[dep];
      if (fw) {
        if (fw.category === "testing") testingTools.add(fw.name);
        else if (fw.category === "linting") lintingTools.add(fw.name);
        else addFramework(fw.name, fw.category, `Python deps (${rd.repo.name})`);
      }
    }

    // Rust crates
    if (rd.dependencies.cargoToml) {
      for (const crate of rd.dependencies.cargoToml.dependencies) {
        if (["actix-web", "actix", "actix-rt"].includes(crate)) addFramework("Actix Web", "backend", `Cargo.toml (${rd.repo.name})`);
        if (crate === "axum") addFramework("Axum", "backend", `Cargo.toml (${rd.repo.name})`);
        if (crate === "tokio") addFramework("Tokio", "backend", `Cargo.toml (${rd.repo.name})`);
        if (crate === "serde") addFramework("Serde", "other", `Cargo.toml (${rd.repo.name})`);
        if (crate === "rocket") addFramework("Rocket", "backend", `Cargo.toml (${rd.repo.name})`);
        if (crate === "warp") addFramework("Warp", "backend", `Cargo.toml (${rd.repo.name})`);
        if (crate === "diesel") addFramework("Diesel", "backend", `Cargo.toml (${rd.repo.name})`);
        if (crate === "sqlx") addFramework("SQLx", "backend", `Cargo.toml (${rd.repo.name})`);
      }
    }

    // Go modules
    if (rd.dependencies.goMod) {
      for (const req of rd.dependencies.goMod.requires) {
        if (req.includes("gin-gonic")) addFramework("Gin", "backend", `go.mod (${rd.repo.name})`);
        if (req.includes("gorilla/mux")) addFramework("Gorilla Mux", "backend", `go.mod (${rd.repo.name})`);
        if (req.includes("labstack/echo")) addFramework("Echo", "backend", `go.mod (${rd.repo.name})`);
        if (req.includes("go-fiber")) addFramework("Fiber", "backend", `go.mod (${rd.repo.name})`);
      }
    }

    // Ruby gems
    if (rd.dependencies.gemfile) {
      for (const gem of rd.dependencies.gemfile) {
        if (gem === "rails") addFramework("Ruby on Rails", "fullstack", `Gemfile (${rd.repo.name})`);
        if (gem === "sinatra") addFramework("Sinatra", "backend", `Gemfile (${rd.repo.name})`);
        if (gem === "rspec") testingTools.add("RSpec");
        if (gem === "rubocop") lintingTools.add("RuboCop");
      }
    }

    // Project structure signals
    if (rd.projectStructure.hasCiConfig) {
      rd.projectStructure.ciConfigFiles.forEach((ci) => ciPlatforms.add(ci));
    }
    if (rd.projectStructure.hasDockerfile) containerization = true;
    if (rd.projectStructure.hasLinterConfig) {
      rd.projectStructure.linterConfigFiles.forEach((l) => {
        if (l.includes("eslint")) lintingTools.add("ESLint");
        if (l.includes("prettier")) lintingTools.add("Prettier");
        if (l.includes("biome")) lintingTools.add("Biome");
        if (l.includes("ruff")) lintingTools.add("Ruff");
        if (l.includes("rubocop")) lintingTools.add("RuboCop");
        if (l.includes("clippy")) lintingTools.add("Clippy");
      });
    }

    // Infrastructure detection from topics
    for (const topic of rd.repo.topics || []) {
      const t = topic.toLowerCase();
      if (["terraform", "pulumi", "cdk", "cloudformation"].includes(t)) infrastructure.add(topic);
      if (["kubernetes", "k8s", "helm"].includes(t)) infrastructure.add(topic);
    }
  }

  return {
    frameworks: [...seen.values()].sort((a, b) => b.repoCount - a.repoCount),
    buildTools: [...buildTools],
    testingTools: [...testingTools],
    lintingTools: [...lintingTools],
    ciPlatforms: [...ciPlatforms],
    containerization,
    infrastructure: [...infrastructure],
  };
}

function classifyProjectTypes(_repos: GitHubRepo[], repoData: RepoAnalysisData[]): ProjectTypeProfile {
  const typeMap: Record<ProjectType, string[]> = {
    "web-frontend": [],
    "web-backend": [],
    "web-fullstack": [],
    cli: [],
    library: [],
    "data-science": [],
    devops: [],
    mobile: [],
    documentation: [],
    experimental: [],
    other: [],
  };

  for (const rd of repoData) {
    const topics = (rd.repo.topics || []).map((t) => t.toLowerCase());
    const desc = (rd.repo.description || "").toLowerCase();
    const hasFrontendFw = rd.dependencies.packageJson
      && Object.keys({ ...rd.dependencies.packageJson.dependencies, ...rd.dependencies.packageJson.devDependencies })
        .some((d) => ["react", "react-dom", "vue", "svelte", "@angular/core"].includes(d));
    const hasBackendFw = rd.dependencies.packageJson
      && Object.keys(rd.dependencies.packageJson.dependencies || {})
        .some((d) => ["express", "fastify", "hono", "koa", "next"].includes(d));
    const hasPyWeb = (rd.dependencies.requirementsTxt || []).some((d) =>
      ["django", "flask", "fastapi"].includes(d)
    );
    const hasML = (rd.dependencies.requirementsTxt || []).some((d) =>
      ["pandas", "numpy", "torch", "tensorflow", "scikit-learn", "transformers"].includes(d)
    );

    let type: ProjectType = "other";
    if (topics.includes("cli") || desc.includes("command line") || desc.includes("cli tool")) {
      type = "cli";
    } else if (topics.includes("library") || topics.includes("package") || topics.includes("sdk")) {
      type = "library";
    } else if (hasML || topics.includes("machine-learning") || topics.includes("data-science")) {
      type = "data-science";
    } else if (hasFrontendFw && hasBackendFw) {
      type = "web-fullstack";
    } else if (hasFrontendFw) {
      type = "web-frontend";
    } else if (hasBackendFw || hasPyWeb) {
      type = "web-backend";
    } else if (topics.includes("devops") || topics.includes("infrastructure") || topics.includes("terraform")) {
      type = "devops";
    } else if (topics.includes("mobile") || topics.includes("react-native") || topics.includes("ios") || topics.includes("android")) {
      type = "mobile";
    } else if (rd.repo.language === "HTML" || topics.includes("documentation")) {
      type = "documentation";
    } else if (desc.includes("experiment") || desc.includes("thought experiment") || desc.includes("playground") || desc.includes("proof of concept")) {
      type = "experimental";
    }

    typeMap[type].push(rd.repo.name);
  }

  const types: ProjectTypeEntry[] = Object.entries(typeMap)
    .filter(([, examples]) => examples.length > 0)
    .map(([type, examples]) => ({ type: type as ProjectType, count: examples.length, examples }))
    .sort((a, b) => b.count - a.count);

  return { types, primaryType: types[0]?.type || "other" };
}

function analyzeCodingStyle(repoData: RepoAnalysisData[], repos: GitHubRepo[]): CodingStyleProfile {
  let tsCount = 0;
  let jsCount = 0;
  let strictTs = false;

  for (const r of repos) {
    if (r.language === "TypeScript") tsCount++;
    if (r.language === "JavaScript") jsCount++;
  }

  for (const rd of repoData) {
    if (rd.projectStructure.hasTypeScriptConfig) {
      strictTs = true; // tsconfig presence suggests intentional TS usage
    }
  }

  const testingFrameworks = new Set<string>();
  for (const rd of repoData) {
    if (rd.projectStructure.hasTestDir) {
      if (rd.dependencies.packageJson) {
        const devDeps = rd.dependencies.packageJson.devDependencies || {};
        for (const dep of Object.keys(devDeps)) {
          const test = NPM_TEST_MAP[dep];
          if (test) testingFrameworks.add(test);
        }
      }
    }
  }

  const hasTests = repoData.some((rd) => rd.projectStructure.hasTestDir);
  const hasDocs = repoData.some((rd) => rd.projectStructure.hasDocsDir);
  const readmeCount = repoData.filter((rd) => rd.hasReadme).length;
  const docStyle =
    hasDocs ? "thorough" : readmeCount > repoData.length * 0.7 ? "moderate" : "minimal";

  const hasSrc = repoData.filter((rd) => rd.projectStructure.hasSrcDir).length;
  const structurePattern =
    hasSrc > repoData.length * 0.5 ? "src/ directory convention" : null;

  return {
    typescriptOverJavascript: tsCount > 0 && jsCount > 0 ? tsCount > jsCount : tsCount > 0 ? true : null,
    strictTypeScript: tsCount > 0 ? strictTs : null,
    usesMonorepo: repos.some((r) => (r.topics || []).includes("monorepo")),
    testingApproach: hasTests ? [...testingFrameworks].join(", ") || "has tests" : null,
    documentationStyle: docStyle as CodingStyleProfile["documentationStyle"],
    commitStyle: null, // filled from events
    projectStructurePattern: structurePattern,
  };
}

function analyzeDomain(
  user: GitHubUser,
  repos: GitHubRepo[],
  _repoData: RepoAnalysisData[]
): DomainProfile {
  const signals: DomainSignal[] = [];

  // Check bio
  if (user.bio) {
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      if (keywords.some((kw) => user.bio!.toLowerCase().includes(kw))) {
        signals.push({ domain, source: "Bio", confidence: "high" });
      }
    }
  }

  // Check company
  if (user.company) {
    signals.push({
      domain: `Works at ${user.company.replace("@", "")}`,
      source: "Company field",
      confidence: "high",
    });
  }

  // Check repo topics and descriptions
  const topicDomainHits: Record<string, number> = {};
  for (const repo of repos) {
    const text = [repo.description || "", ...(repo.topics || [])].join(" ").toLowerCase();
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      if (keywords.some((kw) => text.includes(kw))) {
        topicDomainHits[domain] = (topicDomainHits[domain] || 0) + 1;
      }
    }
  }

  for (const [domain, count] of Object.entries(topicDomainHits)) {
    if (count >= 2) {
      signals.push({ domain, source: `${count} repos`, confidence: count >= 3 ? "high" : "medium" });
    }
  }

  const domains = [...new Set(signals.map((s) => s.domain))];
  return { domains, signals };
}

function analyzeActivity(events: GitHubEvent[], _repos: GitHubRepo[]): ActivityProfile {
  const breakdown: Record<string, number> = {};
  for (const e of events) {
    breakdown[e.type] = (breakdown[e.type] || 0) + 1;
  }

  // Recent focus: repos appearing most in events
  const repoActivity: Record<string, number> = {};
  for (const e of events) {
    repoActivity[e.repo.name] = (repoActivity[e.repo.name] || 0) + 1;
  }
  const recentFocus = Object.entries(repoActivity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name]) => name.split("/").pop() || name);

  // Activity level based on events in the last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const recentEvents = events.filter((e) => new Date(e.created_at).getTime() > thirtyDaysAgo);
  let level: ActivityProfile["level"];
  if (recentEvents.length > 100) level = "very-active";
  else if (recentEvents.length > 40) level = "active";
  else if (recentEvents.length > 10) level = "moderate";
  else if (recentEvents.length > 0) level = "occasional";
  else level = "inactive";

  // Contribution style
  const prEvents = events.filter(
    (e) => e.type === "PullRequestEvent" || e.type === "PullRequestReviewEvent"
  );
  const issueEvents = events.filter(
    (e) => e.type === "IssueCommentEvent" || e.type === "IssuesEvent"
  );
  const collabEvents = prEvents.length + issueEvents.length;
  const pushEvents = events.filter((e) => e.type === "PushEvent").length;
  let contributionStyle: ActivityProfile["contributionStyle"] = "solo";
  if (collabEvents > pushEvents * 0.5) contributionStyle = "collaborative";
  else if (collabEvents > pushEvents * 0.2) contributionStyle = "mixed";

  const lastActiveDate = events.length > 0 ? events[0].created_at : null;

  return { level, recentFocus, contributionStyle, eventBreakdown: breakdown, lastActiveDate };
}

function generateInsights(profile: DeveloperProfile): string[] {
  const insights: string[] = [];

  // Language insight
  if (profile.languages.primary.length > 0) {
    const top = profile.languages.primary[0];
    const rising = profile.languages.primary.find((l) => l.trend === "rising" && l !== top);
    if (rising) {
      insights.push(
        `Primarily a ${top.name} developer (${top.percentage}% of code), with increasing focus on ${rising.name}`
      );
    } else {
      insights.push(
        `Primarily a ${top.name} developer, accounting for ${top.percentage}% of code across ${top.repoCount} repos`
      );
    }
  }

  // Framework insight
  if (profile.frameworks.frameworks.length > 0) {
    const topFw = profile.frameworks.frameworks.slice(0, 3).map((f) => f.name);
    insights.push(`Core stack includes ${topFw.join(", ")}`);
  }

  // Domain insight
  if (profile.domain.domains.length > 0) {
    insights.push(`Domain focus: ${profile.domain.domains.slice(0, 3).join(", ")}`);
  }

  // Activity insight
  if (profile.activity.level !== "inactive") {
    const styleDesc =
      profile.activity.contributionStyle === "collaborative"
        ? "with significant collaborative activity (PRs, reviews, issue discussions)"
        : profile.activity.contributionStyle === "mixed"
          ? "with a mix of solo work and collaboration"
          : "primarily working on personal projects";
    insights.push(`${profile.activity.level} contributor, ${styleDesc}`);
  }

  // Style insight
  if (profile.codingStyle.typescriptOverJavascript === true) {
    insights.push("Chooses TypeScript over JavaScript when both are options");
  }
  if (profile.codingStyle.testingApproach) {
    insights.push(`Testing with ${profile.codingStyle.testingApproach}`);
  }

  // Project type insight
  if (profile.projectTypes.types.length > 1) {
    const typeNames = profile.projectTypes.types
      .slice(0, 3)
      .map((t) => t.type.replace(/-/g, " "))
      .join(", ");
    insights.push(`Projects span ${typeNames}`);
  }

  return insights;
}

export function buildDeveloperProfile(
  user: GitHubUser,
  repos: GitHubRepo[],
  repoData: RepoAnalysisData[],
  events: GitHubEvent[]
): DeveloperProfile {
  const accountAge = formatAccountAge(user.created_at);

  const languages = analyzeLanguages(repos, repoData);
  const frameworks = analyzeFrameworks(repoData);
  const projectTypes = classifyProjectTypes(repos, repoData);
  const codingStyle = analyzeCodingStyle(repoData, repos);
  const domain = analyzeDomain(user, repos, repoData);
  const activity = analyzeActivity(events, repos);

  // Enrich commit style from events
  const pushEvents = events.filter((e) => e.type === "PushEvent");
  if (pushEvents.length > 0) {
    const commits = pushEvents.flatMap((e) => {
      const payload = e.payload as { commits?: Array<{ message: string }> };
      return (payload.commits || []).map((c) => c.message);
    });
    const conventionalCount = commits.filter((m) =>
      /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\(.+?\))?:/.test(m)
    ).length;
    if (commits.length > 0 && conventionalCount > commits.length * 0.5) {
      codingStyle.commitStyle = "Conventional Commits";
    } else if (commits.length > 0) {
      codingStyle.commitStyle = "informal";
    }
  }

  const profile: DeveloperProfile = {
    identity: {
      username: user.login,
      displayName: user.name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      company: user.company,
      location: user.location,
      blog: user.blog,
      accountAge,
      publicRepoCount: user.public_repos,
      followers: user.followers,
    },
    languages,
    frameworks,
    projectTypes,
    codingStyle,
    domain,
    activity,
    insights: [],
  };

  profile.insights = generateInsights(profile);
  return profile;
}

function formatAccountAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const years = now.getFullYear() - created.getFullYear();
  if (years < 1) return "less than a year";
  if (years === 1) return "about 1 year";
  return `${years} years`;
}
