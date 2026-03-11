# instrucgen

Enter a GitHub username, get a comprehensive prompt that generates personalized AI custom instructions based on their public profile and activity.

**[Try it live](https://dvelton.github.io/instrucgen/)**

## What this does

Most AI custom instructions files are either generic boilerplate or require you to manually describe your tech stack and preferences. instrucgen takes a different approach: it looks at what you actually do on GitHub and builds a detailed prompt from that.

Enter any public GitHub handle. The app fetches the user's profile, repositories, dependency files, and recent activity, then analyzes all of it to construct a structured prompt you can paste into your AI tool of choice. The AI does the final generation -- instrucgen does the hard work of gathering, organizing, and contextualizing the data so the output is grounded in reality rather than generic filler.

## How it works

The app makes 15-25 GitHub API calls per analysis, pulling data from multiple sources:

- **User profile** -- bio, company, location, account age
- **Repositories** -- up to 500 repos, sorted by recent activity, with topics and descriptions
- **Language stats** -- byte-level language breakdowns for the top 8 repos
- **Dependency files** -- package.json, requirements.txt, Cargo.toml, go.mod, Gemfile, pyproject.toml fetched via raw.githubusercontent.com (no rate limit on this endpoint)
- **Project structure** -- src/, tests/, docs/, CI configs, linter configs, Dockerfiles, tsconfig presence
- **Public events** -- last 300 events for activity patterns and contribution style

From that raw data, the analyzer produces a structured developer profile covering:

- Primary and secondary languages weighted by byte volume and repo count, with trend detection
- Frameworks and libraries detected from actual dependency files, not just repo language tags
- Build tools, testing frameworks, linters, CI/CD platforms, containerization, infrastructure tooling
- Project type classification (web frontend, backend, CLI, library, data science, devops, etc.)
- Coding style signals (TypeScript preference, strict configs, monorepo patterns, commit conventions)
- Domain expertise inferred from bio, topics, and repo descriptions
- Activity level, contribution style (solo vs collaborative), and recent focus areas

The prompt builder then wraps all of this in a well-structured prompt with interpretive framing -- not just "this user has 40% TypeScript" but context about what that means for the AI generating their instructions. It also includes anti-boilerplate guidance so the AI doesn't pad the output with "write clean, readable code."

## Target formats

Pick your AI tool before copying. The prompt adjusts its meta-instructions for each:

- **GitHub Copilot** -- copilot-instructions.md format
- **ChatGPT** -- Custom Instructions with the two-field format and character limits
- **Claude** -- project-level or account-level custom instructions
- **Cursor** -- .cursorrules format
- **Generic** -- universal markdown for any AI tool

## Running locally

```
git clone https://github.com/dvelton/instrucgen.git
cd instrucgen
npm install
npm run dev
```

## Rate limits

The GitHub API allows 60 unauthenticated requests per hour. That's enough for a few analyses. If you hit the limit, the app supports an optional GitHub personal access token (stored in localStorage, never sent anywhere except github.com and raw.githubusercontent.com) for 5,000 requests/hour.

Dependency files are fetched via raw.githubusercontent.com, which has no rate limit, so framework detection works regardless.

## Tech stack

TypeScript, Vite, Tailwind CSS. No backend, no database, no third-party services. Everything runs in your browser.
