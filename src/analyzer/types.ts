// Analyzed profile types -- the structured output of the analysis engine

export type TargetFormat = "copilot" | "chatgpt" | "claude" | "cursor" | "generic";

export interface DeveloperProfile {
  identity: IdentityProfile;
  languages: LanguageProfile;
  frameworks: FrameworkProfile;
  projectTypes: ProjectTypeProfile;
  codingStyle: CodingStyleProfile;
  domain: DomainProfile;
  activity: ActivityProfile;
  insights: string[];
}

export interface IdentityProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  accountAge: string;
  publicRepoCount: number;
  followers: number;
}

export interface LanguageEntry {
  name: string;
  totalBytes: number;
  repoCount: number;
  percentage: number;
  trend: "rising" | "stable" | "declining";
}

export interface LanguageProfile {
  primary: LanguageEntry[];
  secondary: LanguageEntry[];
  pairings: string[];
}

export interface FrameworkEntry {
  name: string;
  category: "frontend" | "backend" | "fullstack" | "testing" | "build" | "linting" | "ci" | "infra" | "ml" | "other";
  repoCount: number;
  source: string;
}

export interface FrameworkProfile {
  frameworks: FrameworkEntry[];
  buildTools: string[];
  testingTools: string[];
  lintingTools: string[];
  ciPlatforms: string[];
  containerization: boolean;
  infrastructure: string[];
}

export type ProjectType =
  | "web-frontend"
  | "web-backend"
  | "web-fullstack"
  | "cli"
  | "library"
  | "data-science"
  | "devops"
  | "mobile"
  | "documentation"
  | "experimental"
  | "other";

export interface ProjectTypeEntry {
  type: ProjectType;
  count: number;
  examples: string[];
}

export interface ProjectTypeProfile {
  types: ProjectTypeEntry[];
  primaryType: ProjectType;
}

export interface CodingStyleProfile {
  typescriptOverJavascript: boolean | null;
  strictTypeScript: boolean | null;
  usesMonorepo: boolean;
  testingApproach: string | null;
  documentationStyle: "minimal" | "moderate" | "thorough" | null;
  commitStyle: string | null;
  projectStructurePattern: string | null;
}

export interface DomainProfile {
  domains: string[];
  signals: DomainSignal[];
}

export interface DomainSignal {
  domain: string;
  source: string;
  confidence: "high" | "medium" | "low";
}

export interface ActivityProfile {
  level: "very-active" | "active" | "moderate" | "occasional" | "inactive";
  recentFocus: string[];
  contributionStyle: "solo" | "collaborative" | "mixed";
  eventBreakdown: Record<string, number>;
  lastActiveDate: string | null;
}
