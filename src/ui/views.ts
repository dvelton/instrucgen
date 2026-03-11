import type { FetchProgress } from "../api/types";
import type { DeveloperProfile, TargetFormat } from "../analyzer/types";

export function renderLanding(onSubmit: (username: string) => void): string {
  setTimeout(() => {
    const form = document.getElementById("search-form") as HTMLFormElement;
    const input = document.getElementById("username-input") as HTMLInputElement;
    if (form && input) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const val = input.value.trim();
        if (val) onSubmit(val);
      });
    }
  }, 0);

  return `
    <div class="min-h-screen flex flex-col items-center justify-center px-4">
      <div class="max-w-xl w-full text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-3">instrucgen</h1>
        <p class="text-lg text-gray-600 mb-8">
          Enter a GitHub username. Get a comprehensive AI prompt that generates
          personalized custom instructions based on their public profile and activity.
        </p>
        <form id="search-form" class="flex gap-3 justify-center">
          <div class="relative flex-1 max-w-sm">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">github.com/</span>
            <input
              id="username-input"
              type="text"
              placeholder="username"
              autocomplete="off"
              spellcheck="false"
              class="w-full pl-24 pr-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>
          <button
            type="submit"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Analyze
          </button>
        </form>
        <p class="text-sm text-gray-400 mt-6">
          Works with any public GitHub profile. No sign-in required.
        </p>
      </div>
    </div>
  `;
}

export function renderAnalysis(): string {
  return `
    <div class="min-h-screen flex flex-col items-center justify-center px-4">
      <div class="max-w-md w-full text-center">
        <h2 class="text-xl font-semibold text-gray-900 mb-6" id="analysis-stage">Starting analysis...</h2>
        <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div id="analysis-progress" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
        </div>
        <p class="text-sm text-gray-500" id="analysis-detail"></p>
      </div>
    </div>
  `;
}

export function updateAnalysisProgress(progress: FetchProgress): void {
  const stage = document.getElementById("analysis-stage");
  const detail = document.getElementById("analysis-detail");
  const bar = document.getElementById("analysis-progress");

  if (stage) stage.textContent = progress.stage;
  if (detail) detail.textContent = progress.detail;
  if (bar && progress.total > 0) {
    bar.style.width = `${Math.round((progress.current / progress.total) * 100)}%`;
  }
}

export function renderResults(
  profile: DeveloperProfile,
  prompt: string,
  currentFormat: TargetFormat,
  onFormatChange: (format: TargetFormat) => void,
  onNewSearch: () => void
): string {
  const formats: { value: TargetFormat; label: string }[] = [
    { value: "copilot", label: "GitHub Copilot" },
    { value: "chatgpt", label: "ChatGPT" },
    { value: "claude", label: "Claude" },
    { value: "cursor", label: "Cursor" },
    { value: "generic", label: "Generic" },
  ];

  const techTags = [
    ...profile.languages.primary.map((l) => l.name),
    ...profile.frameworks.frameworks.slice(0, 6).map((f) => f.name),
    ...profile.frameworks.buildTools.slice(0, 2),
    ...profile.frameworks.testingTools.slice(0, 2),
    ...profile.frameworks.lintingTools.slice(0, 2),
  ];
  const uniqueTags = [...new Set(techTags)];

  setTimeout(() => {
    // Copy button
    const copyBtn = document.getElementById("copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const textarea = document.getElementById("prompt-output") as HTMLTextAreaElement;
        if (textarea) {
          navigator.clipboard.writeText(textarea.value).then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => { copyBtn.textContent = "Copy prompt"; }, 2000);
          });
        }
      });
    }

    // Download button
    const dlBtn = document.getElementById("download-btn");
    if (dlBtn) {
      dlBtn.addEventListener("click", () => {
        const textarea = document.getElementById("prompt-output") as HTMLTextAreaElement;
        if (textarea) {
          const blob = new Blob([textarea.value], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `instrucgen-prompt-${profile.identity.username}.txt`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    }

    // Format selector
    const formatBtns = document.querySelectorAll("[data-format]");
    formatBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const format = btn.getAttribute("data-format") as TargetFormat;
        onFormatChange(format);
      });
    });

    // New search
    const newBtn = document.getElementById("new-search-btn");
    if (newBtn) newBtn.addEventListener("click", onNewSearch);
  }, 0);

  return `
    <div class="min-h-screen py-8 px-4">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <button id="new-search-btn" class="text-sm text-blue-600 hover:text-blue-800">&larr; New search</button>
          <h1 class="text-xl font-bold text-gray-900">instrucgen</h1>
          <div class="w-20"></div>
        </div>

        <!-- Profile card -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div class="flex items-start gap-4">
            <img src="${profile.identity.avatarUrl}" alt="" class="w-16 h-16 rounded-full" />
            <div class="flex-1">
              <h2 class="text-lg font-semibold text-gray-900">
                ${profile.identity.displayName || profile.identity.username}
                <span class="text-gray-400 font-normal text-base ml-1">@${profile.identity.username}</span>
              </h2>
              ${profile.identity.bio ? `<p class="text-gray-600 mt-1">${escapeHtml(profile.identity.bio)}</p>` : ""}
              <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                ${profile.identity.company ? `<span>${escapeHtml(profile.identity.company)}</span>` : ""}
                ${profile.identity.location ? `<span>${escapeHtml(profile.identity.location)}</span>` : ""}
                <span>${profile.identity.publicRepoCount} repos</span>
                <span>${profile.identity.followers} followers</span>
                <span>Active ${profile.identity.accountAge}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tech tags -->
        ${uniqueTags.length > 0 ? `
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-500 mb-2">Detected technologies</h3>
          <div class="flex flex-wrap gap-2">
            ${uniqueTags.map((tag) => `<span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">${escapeHtml(tag)}</span>`).join("")}
          </div>
        </div>` : ""}

        <!-- Insights -->
        ${profile.insights.length > 0 ? `
        <div class="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6">
          <h3 class="text-sm font-medium text-gray-500 mb-3">Profile insights</h3>
          <ul class="space-y-2">
            ${profile.insights.map((i) => `<li class="text-gray-700 text-sm">${escapeHtml(i)}</li>`).join("")}
          </ul>
        </div>` : ""}

        <!-- Format selector -->
        <div class="mb-4">
          <h3 class="text-sm font-medium text-gray-500 mb-2">Target format</h3>
          <div class="flex flex-wrap gap-2">
            ${formats.map((f) => `
              <button
                data-format="${f.value}"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  f.value === currentFormat
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }"
              >${f.label}</button>
            `).join("")}
          </div>
        </div>

        <!-- Prompt output -->
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div class="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 class="text-sm font-medium text-gray-900">Generated prompt</h3>
            <div class="flex gap-2">
              <button
                id="download-btn"
                class="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >Download</button>
              <button
                id="copy-btn"
                class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >Copy prompt</button>
            </div>
          </div>
          <textarea
            id="prompt-output"
            readonly
            class="w-full p-4 text-sm font-mono text-gray-800 bg-gray-50 resize-y focus:outline-none"
            rows="20"
          >${escapeHtml(prompt)}</textarea>
        </div>

        <!-- Usage hint -->
        <p class="text-sm text-gray-400 text-center">
          Paste this prompt into ${formatLabel(currentFormat)} to generate your personalized custom instructions.
        </p>
      </div>
    </div>
  `;
}

export function renderError(message: string, onRetry: () => void): string {
  setTimeout(() => {
    const btn = document.getElementById("retry-btn");
    if (btn) btn.addEventListener("click", onRetry);
  }, 0);

  let userMessage = message;
  if (message === "not_found") userMessage = "User not found. Check the username and try again.";
  else if (message === "rate_limited") userMessage = "GitHub API rate limit reached. Try again in a few minutes, or enter a GitHub token below for higher limits.";
  else if (message === "forbidden") userMessage = "Access denied by GitHub API.";

  return `
    <div class="min-h-screen flex flex-col items-center justify-center px-4">
      <div class="max-w-md w-full text-center">
        <p class="text-red-600 text-lg mb-4">${escapeHtml(userMessage)}</p>
        <button id="retry-btn" class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
          Try again
        </button>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLabel(format: TargetFormat): string {
  const labels: Record<TargetFormat, string> = {
    copilot: "GitHub Copilot Chat",
    chatgpt: "ChatGPT",
    claude: "Claude",
    cursor: "Cursor",
    generic: "your AI assistant",
  };
  return labels[format];
}
