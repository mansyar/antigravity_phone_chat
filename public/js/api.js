/**
 * API Client
 */
export const api = {
  async fetchSnapshot() {
    const response = await fetch("/snapshot");
    if (!response.ok) {
      if (response.status === 503) return null;
      throw new Error("Failed to load snapshot");
    }
    return response.json();
  },

  async fetchAppState() {
    const res = await fetch("/app-state");
    return res.json();
  },

  async sendMessage(message) {
    return fetch("/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  },

  async setMode(mode) {
    return fetch("/set-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
  },

  async setModel(model) {
    return fetch("/set-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
  },

  async stopGeneration() {
    return fetch("/stop", { method: "POST" });
  },

  async remoteClick(params) {
    return fetch("/remote-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async remoteScroll(params) {
    return fetch("/remote-scroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },

  async generateSSL() {
    return fetch("/generate-ssl", { method: "POST" });
  },
};
