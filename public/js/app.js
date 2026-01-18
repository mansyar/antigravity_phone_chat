/**
 * Main Application Entry Point
 */
import { state, MODELS } from "./state.js";
import { api } from "./api.js";
import {
  elements,
  updateStatus,
  scrollToBottom,
  renderSnapshot,
  openModal,
  closeModal,
} from "./ui.js";
import { connectWebSocket } from "./websocket.js";

// --- Initialization ---

async function init() {
  // Setup Event Listeners
  setupEventListeners();

  // Initial State Sync
  fetchAppState();

  // Connect WebSocket
  connectWebSocket(handleWsMessage, updateStatus);

  // Initial SSL Check
  checkSslStatus();

  // Responsive Height Handling
  handleViewport();

  // Periodic State Sync (keep in sync with desktop changes)
  setInterval(fetchAppState, 5000);
}

// --- Handlers ---

function handleWsMessage(data) {
  if (
    data.type === "connected" ||
    (data.type === "update" &&
      state.autoRefreshEnabled &&
      !state.userIsScrolling)
  ) {
    loadSnapshot();
  }
}

async function loadSnapshot() {
  try {
    const snapshot = await api.fetchSnapshot();
    if (snapshot) renderSnapshot(snapshot);
  } catch (e) {
    console.error("Load snapshot failed", e);
  }
}

async function fetchAppState() {
  try {
    const data = await api.fetchAppState();
    if (data.mode && data.mode !== "Unknown") {
      elements.modeText.textContent = data.mode;
      elements.modeBtn.classList.toggle("active", data.mode === "Planning");
      state.currentMode = data.mode;
    }
    if (data.model && data.model !== "Unknown") {
      elements.modelText.textContent = data.model;
      state.currentModel = data.model;
    }
  } catch (e) {
    console.error("Sync failed", e);
  }
}

function setupEventListeners() {
  elements.sendBtn.addEventListener("click", sendMessage);

  elements.refreshBtn.addEventListener("click", () => {
    loadSnapshot();
    fetchAppState();
  });

  elements.messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  elements.messageInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });

  elements.chatContainer.addEventListener("scroll", handleScroll);

  elements.scrollToBottomBtn.addEventListener("click", () => {
    state.userIsScrolling = false;
    scrollToBottom();
  });

  elements.stopBtn.addEventListener("click", async () => {
    elements.stopBtn.style.opacity = "0.5";
    try {
      await api.stopGeneration();
    } catch (e) {}
    setTimeout(() => (elements.stopBtn.style.opacity = "1"), 500);
  });

  elements.modeBtn.addEventListener("click", () => {
    openModal("Select Mode", ["Fast", "Planning"], async (mode) => {
      elements.modeText.textContent = "Setting...";
      try {
        const res = await api.setMode(mode);
        const data = await res.json();
        if (data.success) {
          state.currentMode = mode;
          elements.modeText.textContent = mode;
          elements.modeBtn.classList.toggle("active", mode === "Planning");
        } else {
          alert("Error: " + (data.error || "Unknown"));
          elements.modeText.textContent = state.currentMode;
        }
      } catch (e) {
        elements.modeText.textContent = state.currentMode;
      }
    });
  });

  elements.modelBtn.addEventListener("click", () => {
    openModal("Select Model", MODELS, async (model) => {
      const prev = elements.modelText.textContent;
      elements.modelText.textContent = "Setting...";
      try {
        const res = await api.setModel(model);
        const data = await res.json();
        if (data.success) {
          elements.modelText.textContent = model;
          state.currentModel = model;
        } else {
          alert("Error: " + (data.error || "Unknown"));
          elements.modelText.textContent = prev;
        }
      } catch (e) {
        elements.modelText.textContent = prev;
      }
    });
  });

  elements.closeModalBtn.addEventListener("click", closeModal);

  // Remote Click Logic
  elements.chatContainer.addEventListener("click", handleRemoteClick);

  // Quick Actions
  window.quickAction = (text) => {
    elements.messageInput.value = text;
    elements.messageInput.style.height = "auto";
    elements.messageInput.style.height =
      elements.messageInput.scrollHeight + "px";
    elements.messageInput.focus();
  };

  // SSL Banner
  elements.enableHttpsBtn.addEventListener("click", async () => {
    elements.enableHttpsBtn.textContent = "Generating...";
    elements.enableHttpsBtn.disabled = true;
    try {
      const res = await api.generateSSL();
      const data = await res.json();
      if (data.success) {
        elements.sslBanner.innerHTML = `<span>✅ ${data.message}</span><button onclick="location.reload()">Reload After Restart</button>`;
        elements.sslBanner.style.background =
          "linear-gradient(90deg, #22c55e, #16a34a)";
      } else {
        elements.enableHttpsBtn.textContent = "Failed - Retry";
        elements.enableHttpsBtn.disabled = false;
      }
    } catch (e) {
      elements.enableHttpsBtn.textContent = "Error - Retry";
      elements.enableHttpsBtn.disabled = false;
    }
  });

  const dismissBtn = elements.sslBanner.querySelector(".dismiss-btn");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      elements.sslBanner.style.display = "none";
      localStorage.setItem("sslBannerDismissed", "true");
    });
  }
}

async function sendMessage() {
  const message = elements.messageInput.value.trim();
  if (!message) return;

  elements.messageInput.value = "";
  elements.messageInput.style.height = "auto";
  elements.messageInput.blur();

  elements.sendBtn.disabled = true;
  elements.sendBtn.style.opacity = "0.5";

  try {
    await api.sendMessage(message);
    setTimeout(loadSnapshot, 300);
    setTimeout(loadSnapshot, 800);
  } catch (e) {
    console.error("Send failed", e);
    setTimeout(loadSnapshot, 500);
  } finally {
    elements.sendBtn.disabled = false;
    elements.sendBtn.style.opacity = "1";
  }
}

function handleScroll() {
  state.userIsScrolling = true;
  clearTimeout(state.idleTimer);

  const isNearBottom =
    elements.chatContainer.scrollHeight -
      elements.chatContainer.scrollTop -
      elements.chatContainer.clientHeight <
    120;
  elements.scrollToBottomBtn.classList.toggle("show", !isNearBottom);

  const now = Date.now();
  if (now - state.lastScrollSync > 150) {
    state.lastScrollSync = now;
    clearTimeout(state.scrollSyncTimeout);
    state.scrollSyncTimeout = setTimeout(syncScrollToDesktop, 100);
  }

  state.idleTimer = setTimeout(() => {
    state.userIsScrolling = false;
    state.autoRefreshEnabled = true;
  }, 5000);
}

async function syncScrollToDesktop() {
  const scrollPercent =
    elements.chatContainer.scrollTop /
    (elements.chatContainer.scrollHeight - elements.chatContainer.clientHeight);
  try {
    await api.remoteScroll({ scrollPercent });
    if (!state.snapshotReloadPending) {
      state.snapshotReloadPending = true;
      setTimeout(() => {
        loadSnapshot();
        state.snapshotReloadPending = false;
      }, 300);
    }
  } catch (e) {}
}

async function handleRemoteClick(e) {
  const target = e.target.closest("div, span, p, summary, button, details");
  if (!target) return;

  const text = target.innerText || "";
  if (/Thought|Thinking/i.test(text) && text.length < 500) {
    target.style.opacity = "0.5";
    setTimeout(() => (target.style.opacity = "1"), 300);

    const firstLine = text.split("\n")[0].trim();
    try {
      await api.remoteClick({
        selector: target.tagName.toLowerCase(),
        index: 0,
        textContent: firstLine,
      });
      setTimeout(loadSnapshot, 400);
      setTimeout(loadSnapshot, 800);
      setTimeout(loadSnapshot, 1500);
    } catch (e) {}
  }
}

function checkSslStatus() {
  if (
    window.location.protocol === "https:" ||
    localStorage.getItem("sslBannerDismissed")
  )
    return;
  elements.sslBanner.style.display = "flex";
}

function handleViewport() {
  if (window.visualViewport) {
    const handler = () => {
      document.body.style.height = window.visualViewport.height + "px";
      if (document.activeElement === elements.messageInput)
        setTimeout(scrollToBottom, 100);
    };
    window.visualViewport.addEventListener("resize", handler);
    window.visualViewport.addEventListener("scroll", handler);
    handler();
  } else {
    const handler = () => {
      document.body.style.height = window.innerHeight + "px";
    };
    window.addEventListener("resize", handler);
    handler();
  }
}

// Start the app
init();
