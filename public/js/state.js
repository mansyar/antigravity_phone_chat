/**
 * Application State
 */
export const state = {
  ws: null,
  autoRefreshEnabled: true,
  userIsScrolling: false,
  lastScrollPosition: 0,
  currentMode: "Fast",
  currentModel: "Select Model",
  lastHash: "",
  idleTimer: null,
  scrollSyncTimeout: null,
  lastScrollSync: 0,
  snapshotReloadPending: false,
};

export const MODELS = [
  "Gemini 3 Pro (High)",
  "Gemini 3 Pro (Low)",
  "Gemini 3 Flash",
  "Claude Sonnet 4.5",
  "Claude Sonnet 4.5 (Thinking)",
  "Claude Opus 4.5 (Thinking)",
  "GPT-OSS 120B (Medium)",
];
