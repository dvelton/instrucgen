// GitHub API response types

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  language: string | null;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  archived: boolean;
  homepage: string | null;
  size: number;
}

export interface GitHubEvent {
  id: string;
  type: string;
  repo: { id: number; name: string; url: string };
  payload: Record<string, unknown>;
  created_at: string;
}

export type LanguageBytes = Record<string, number>;

export interface RepoAnalysisData {
  repo: GitHubRepo;
  languages: LanguageBytes;
  dependencies: DetectedDependencies;
  hasReadme: boolean;
  readmeExcerpt: string | null;
  hasExistingInstructions: boolean;
  existingInstructions: string | null;
  projectStructure: ProjectStructureSignals;
}

export interface DetectedDependencies {
  packageJson: PackageJsonData | null;
  requirementsTxt: string[] | null;
  cargoToml: CargoTomlData | null;
  goMod: GoModData | null;
  gemfile: string[] | null;
  pyprojectToml: PyprojectData | null;
}

export interface PackageJsonData {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export interface CargoTomlData {
  dependencies: string[];
}

export interface GoModData {
  module: string;
  requires: string[];
}

export interface PyprojectData {
  dependencies: string[];
  devDependencies: string[];
  buildSystem: string | null;
}

export interface ProjectStructureSignals {
  hasSrcDir: boolean;
  hasTestDir: boolean;
  hasDocsDir: boolean;
  hasCiConfig: boolean;
  hasDockerfile: boolean;
  hasLinterConfig: boolean;
  hasTypeScriptConfig: boolean;
  ciConfigFiles: string[];
  linterConfigFiles: string[];
}

export interface FetchProgress {
  stage: string;
  detail: string;
  current: number;
  total: number;
}
