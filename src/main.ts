import "./style.css";
import { fetchUserProfile, fetchUserRepos, fetchPublicEvents, analyzeTopRepos } from "./api/github";
import { buildDeveloperProfile } from "./analyzer/profile";
import { buildPrompt } from "./prompt/builder";
import type { DeveloperProfile, TargetFormat } from "./analyzer/types";
import {
  renderLanding,
  renderAnalysis,
  updateAnalysisProgress,
  renderResults,
  renderError,
} from "./ui/views";

const app = document.getElementById("app")!;
let currentProfile: DeveloperProfile | null = null;
let currentFormat: TargetFormat = "copilot";

function getStoredToken(): string | undefined {
  const token = localStorage.getItem("instrucgen_gh_token");
  return token || undefined;
}

function showLanding() {
  currentProfile = null;
  app.innerHTML = renderLanding(handleSearch);
}

async function handleSearch(username: string) {
  app.innerHTML = renderAnalysis();
  const token = getStoredToken();

  try {
    updateAnalysisProgress({
      stage: "Fetching profile",
      detail: username,
      current: 1,
      total: 5,
    });
    const user = await fetchUserProfile(username, token);

    updateAnalysisProgress({
      stage: "Fetching repositories",
      detail: `${user.public_repos} public repos`,
      current: 2,
      total: 5,
    });
    const repos = await fetchUserRepos(username, token);

    updateAnalysisProgress({
      stage: "Fetching activity",
      detail: "Public events",
      current: 3,
      total: 5,
    });
    const events = await fetchPublicEvents(username, token);

    updateAnalysisProgress({
      stage: "Analyzing repositories",
      detail: "Detecting frameworks and dependencies...",
      current: 4,
      total: 5,
    });
    const repoData = await analyzeTopRepos(user, repos, token, updateAnalysisProgress);

    updateAnalysisProgress({
      stage: "Building profile",
      detail: "Generating prompt...",
      current: 5,
      total: 5,
    });
    currentProfile = buildDeveloperProfile(user, repos, repoData, events);
    showResults();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    app.innerHTML = renderError(message, showLanding);
  }
}

function showResults() {
  if (!currentProfile) return;
  const prompt = buildPrompt(currentProfile, currentFormat);
  app.innerHTML = renderResults(
    currentProfile,
    prompt,
    currentFormat,
    (format) => {
      currentFormat = format;
      showResults();
    },
    showLanding
  );
}

showLanding();
