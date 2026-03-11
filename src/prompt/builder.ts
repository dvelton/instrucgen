import type { DeveloperProfile, TargetFormat } from "../analyzer/types";

const FORMAT_INSTRUCTIONS: Record<TargetFormat, string> = {
  copilot: `Generate a GitHub Copilot custom instructions file (copilot-instructions.md).
This file is read by GitHub Copilot to understand the developer's preferences, conventions, and context when generating code.
Use markdown format. Organize into clear sections. Be specific and actionable -- Copilot needs concrete guidance, not abstract principles.
The file should be comprehensive enough to meaningfully improve Copilot's suggestions for this developer.`,

  chatgpt: `Generate ChatGPT Custom Instructions text.
ChatGPT has two custom instruction fields: "What would you like ChatGPT to know about you?" and "How would you like ChatGPT to respond?"
Generate content for both fields. Keep each field under 1500 characters (ChatGPT's limit).
Be concise but specific. Focus on the information that will most improve ChatGPT's responses for this developer's day-to-day work.`,

  claude: `Generate Claude custom instructions (used as a system prompt or project instructions).
Claude supports detailed, nuanced instructions. Take advantage of that -- be thorough.
Use markdown format. Cover the developer's technical context, preferences, and communication style.
Include guidance on how Claude should approach code generation, review, and technical discussion for this developer.`,

  cursor: `Generate a Cursor rules file (.cursorrules).
This file guides Cursor's AI-powered code editing. Focus on:
- Language and framework conventions specific to this developer
- Code style and structure preferences
- Project patterns and architecture decisions
- Testing and documentation expectations
Use a direct, instruction-oriented tone. Cursor rules work best when they're concrete and specific.`,

  generic: `Generate a universal AI custom instructions document in markdown.
This should work with any AI coding assistant or chatbot. Cover the developer's technical context, language preferences, framework conventions, coding style, and domain expertise.
Be specific and grounded in the profile data. Avoid generic advice that would apply to any developer.`,
};

export function buildPrompt(profile: DeveloperProfile, format: TargetFormat): string {
  const sections: string[] = [];

  sections.push(buildHeader(format));
  sections.push(buildProfileSection(profile));
  sections.push(buildLanguageSection(profile));
  sections.push(buildFrameworkSection(profile));
  sections.push(buildProjectTypeSection(profile));
  sections.push(buildCodingStyleSection(profile));
  sections.push(buildDomainSection(profile));
  sections.push(buildActivitySection(profile));
  sections.push(buildMetaInstructions(format));

  return sections.filter(Boolean).join("\n\n---\n\n");
}

function buildHeader(format: TargetFormat): string {
  return `# Task

You are generating personalized AI custom instructions for a developer based on a detailed analysis of their GitHub profile and public activity.

${FORMAT_INSTRUCTIONS[format]}

## Important guidance

- Ground every recommendation in the actual profile data below. Do not invent preferences or assume conventions that aren't supported by the evidence.
- Be specific. Instead of "use modern JavaScript features," say "uses TypeScript with strict mode, async/await patterns, and ES module imports based on their project configurations."
- If the data suggests something but doesn't confirm it, phrase it as a likely preference rather than a certainty.
- Do NOT include generic filler like "write clean, readable code" or "follow best practices." Every line should reflect something specific about this developer.
- The developer will copy your output directly into their AI tool. Write it in the voice of the developer (first person where appropriate, or as direct instructions to the AI).`;
}

function buildProfileSection(profile: DeveloperProfile): string {
  const p = profile.identity;
  const lines = [`# Developer Profile`];
  lines.push(`- **Username:** ${p.username}`);
  if (p.displayName) lines.push(`- **Name:** ${p.displayName}`);
  if (p.bio) lines.push(`- **Bio:** "${p.bio}"`);
  if (p.company) lines.push(`- **Company:** ${p.company}`);
  if (p.location) lines.push(`- **Location:** ${p.location}`);
  if (p.blog) lines.push(`- **Blog/Website:** ${p.blog}`);
  lines.push(`- **Public repos:** ${p.publicRepoCount}`);
  lines.push(`- **Followers:** ${p.followers}`);
  lines.push(`- **Account age:** ${p.accountAge}`);
  return lines.join("\n");
}

function buildLanguageSection(profile: DeveloperProfile): string {
  const lang = profile.languages;
  if (lang.primary.length === 0 && lang.secondary.length === 0) {
    return "# Languages\n\nNo significant language data detected.";
  }

  const lines = ["# Language Profile"];
  lines.push("");
  lines.push("## Primary languages (10%+ of codebase)");
  for (const l of lang.primary) {
    const trendNote = l.trend === "rising" ? " (increasing usage recently)" : l.trend === "declining" ? " (less recent usage)" : "";
    lines.push(`- **${l.name}**: ${l.percentage}% of code, used in ${l.repoCount} repos${trendNote}`);
  }

  if (lang.secondary.length > 0) {
    lines.push("");
    lines.push("## Secondary languages (2-10% of codebase)");
    for (const l of lang.secondary) {
      lines.push(`- **${l.name}**: ${l.percentage}%, ${l.repoCount} repos`);
    }
  }

  if (lang.pairings.length > 0) {
    lines.push("");
    lines.push("## Common language pairings (languages frequently used together in the same repos)");
    for (const p of lang.pairings) {
      lines.push(`- ${p}`);
    }
  }

  lines.push("");
  lines.push("*Interpretation: The primary languages and their trends indicate what this developer works with day-to-day. Language pairings suggest polyglot projects or complementary tool choices. Use these to determine which language conventions and idioms should be prioritized in the custom instructions.*");

  return lines.join("\n");
}

function buildFrameworkSection(profile: DeveloperProfile): string {
  const fw = profile.frameworks;
  const lines = ["# Frameworks, Libraries & Tooling"];

  if (fw.frameworks.length > 0) {
    lines.push("");
    lines.push("## Frameworks & libraries detected");
    for (const f of fw.frameworks) {
      lines.push(`- **${f.name}** (${f.category}) -- found in ${f.repoCount} repo(s), detected from ${f.source}`);
    }
  }

  if (fw.buildTools.length > 0) {
    lines.push("");
    lines.push(`## Build tools: ${fw.buildTools.join(", ")}`);
  }
  if (fw.testingTools.length > 0) {
    lines.push("");
    lines.push(`## Testing frameworks: ${fw.testingTools.join(", ")}`);
  }
  if (fw.lintingTools.length > 0) {
    lines.push("");
    lines.push(`## Linting & formatting: ${fw.lintingTools.join(", ")}`);
  }
  if (fw.ciPlatforms.length > 0) {
    lines.push("");
    lines.push(`## CI/CD: ${fw.ciPlatforms.join(", ")}`);
  }
  if (fw.containerization) {
    lines.push("");
    lines.push("## Containerization: Docker detected in projects");
  }
  if (fw.infrastructure.length > 0) {
    lines.push("");
    lines.push(`## Infrastructure: ${fw.infrastructure.join(", ")}`);
  }

  if (fw.frameworks.length === 0 && fw.buildTools.length === 0) {
    lines.push("\nNo specific frameworks or tooling detected from dependency files.");
  }

  lines.push("");
  lines.push("*Interpretation: These frameworks and tools represent the developer's actual working stack, not aspirational choices. Custom instructions should reference these specific tools and their conventions. For example, if they use Vitest, test examples should use Vitest syntax, not Jest.*");

  return lines.join("\n");
}

function buildProjectTypeSection(profile: DeveloperProfile): string {
  const pt = profile.projectTypes;
  const lines = ["# Project Types"];
  lines.push("");

  for (const t of pt.types) {
    const label = t.type.replace(/-/g, " ");
    lines.push(`- **${label}**: ${t.count} project(s) (${t.examples.join(", ")})`);
  }

  lines.push("");
  lines.push(`Primary project type: **${pt.primaryType.replace(/-/g, " ")}**`);
  lines.push("");
  lines.push("*Interpretation: The mix of project types tells you what kind of code this developer writes most often. A developer who mostly builds CLIs needs different AI assistance than one building web frontends. Instructions should be weighted toward the primary project type while acknowledging the range.*");

  return lines.join("\n");
}

function buildCodingStyleSection(profile: DeveloperProfile): string {
  const cs = profile.codingStyle;
  const lines = ["# Coding Style Signals"];
  lines.push("");

  if (cs.typescriptOverJavascript === true) {
    lines.push("- Prefers **TypeScript** over JavaScript when both are available");
  } else if (cs.typescriptOverJavascript === false) {
    lines.push("- Uses **JavaScript** more than TypeScript");
  }
  if (cs.strictTypeScript) {
    lines.push("- Uses TypeScript with **tsconfig.json** present (intentional, configured TypeScript)");
  }
  if (cs.usesMonorepo) {
    lines.push("- Has **monorepo** projects");
  }
  if (cs.testingApproach) {
    lines.push(`- Testing approach: **${cs.testingApproach}**`);
  } else {
    lines.push("- No consistent testing framework detected across projects");
  }
  if (cs.documentationStyle) {
    lines.push(`- Documentation style: **${cs.documentationStyle}** (based on README and docs/ presence)`);
  }
  if (cs.commitStyle) {
    lines.push(`- Commit message style: **${cs.commitStyle}**`);
  }
  if (cs.projectStructurePattern) {
    lines.push(`- Project structure: **${cs.projectStructurePattern}**`);
  }

  lines.push("");
  lines.push("*Interpretation: These signals come from configuration files and structural patterns, not just language choices. They indicate how this developer likes to organize and maintain code. Custom instructions should align with these patterns -- for instance, if they use Conventional Commits, the AI should follow that convention in commit message suggestions.*");

  return lines.join("\n");
}

function buildDomainSection(profile: DeveloperProfile): string {
  const d = profile.domain;
  if (d.domains.length === 0 && d.signals.length === 0) {
    return "# Domain & Expertise\n\nNo strong domain signals detected from profile and repositories. The developer may be a generalist or work primarily in private repos.";
  }

  const lines = ["# Domain & Expertise"];
  lines.push("");

  for (const s of d.signals) {
    lines.push(`- **${s.domain}** (source: ${s.source}, confidence: ${s.confidence})`);
  }

  lines.push("");
  lines.push("*Interpretation: Domain expertise shapes what kind of advice is useful. A legal tech developer needs different contextual awareness than a game developer. If domain signals are present, the custom instructions should incorporate relevant domain terminology and conventions.*");

  return lines.join("\n");
}

function buildActivitySection(profile: DeveloperProfile): string {
  const a = profile.activity;
  const lines = ["# Activity & Contribution Profile"];
  lines.push("");
  lines.push(`- **Activity level:** ${a.level}`);
  lines.push(`- **Contribution style:** ${a.contributionStyle}`);

  if (a.lastActiveDate) {
    lines.push(`- **Last active:** ${new Date(a.lastActiveDate).toLocaleDateString()}`);
  }

  if (a.recentFocus.length > 0) {
    lines.push(`- **Recent focus areas:** ${a.recentFocus.join(", ")}`);
  }

  if (Object.keys(a.eventBreakdown).length > 0) {
    lines.push("");
    lines.push("## Event breakdown (from recent public activity)");
    const sorted = Object.entries(a.eventBreakdown).sort(([, a], [, b]) => b - a);
    for (const [type, count] of sorted.slice(0, 8)) {
      lines.push(`- ${type}: ${count}`);
    }
  }

  lines.push("");
  lines.push("*Interpretation: Activity patterns reveal whether this developer works solo or collaboratively, and what they've been focused on recently. A collaborative developer benefits from instructions about PR descriptions and code review. A solo developer benefits more from instructions about code organization and self-documentation.*");

  return lines.join("\n");
}

function buildMetaInstructions(format: TargetFormat): string {
  const lines = ["# Generation Guidelines"];
  lines.push("");
  lines.push("When generating the custom instructions from the above profile:");
  lines.push("");
  lines.push("1. Write in a natural, direct tone. These instructions are from the developer to their AI assistant.");
  lines.push("2. Reference specific technologies by name. Say \"use Vitest for tests\" not \"use the project's testing framework.\"");
  lines.push("3. Infer reasonable preferences from patterns. If every project uses a src/ directory, include that as a structural preference.");
  lines.push("4. Include domain context if detected. An AI that knows the developer works in legal tech will give better-contextualized answers.");
  lines.push("5. Address the developer's actual stack breadth. If they use 3 languages, acknowledge all of them with appropriate conventions for each.");
  lines.push("6. Skip categories where the data is thin. If there's no testing data, don't invent testing preferences.");
  lines.push("7. Make the output immediately usable. The developer should be able to paste it directly without editing.");

  if (format === "chatgpt") {
    lines.push("8. Remember the two-field format and the 1500-character limit per field. Be concise.");
  }

  return lines.join("\n");
}
