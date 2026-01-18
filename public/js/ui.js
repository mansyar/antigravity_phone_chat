/**
 * UI Manipulation Module
 */
import { state } from "./state.js";

// Elements
export const elements = {
  chatContainer: document.getElementById("chatContainer"),
  chatContent: document.getElementById("chatContent"),
  messageInput: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  scrollToBottomBtn: document.getElementById("scrollToBottom"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  refreshBtn: document.getElementById("refreshBtn"),
  stopBtn: document.getElementById("stopBtn"),
  modeBtn: document.getElementById("modeBtn"),
  modelBtn: document.getElementById("modelBtn"),
  modalOverlay: document.getElementById("modalOverlay"),
  modalList: document.getElementById("modalList"),
  modalTitle: document.getElementById("modalTitle"),
  modeText: document.getElementById("modeText"),
  modelText: document.getElementById("modelText"),
  statsText: document.getElementById("statsText"),
  sslBanner: document.getElementById("sslBanner"),
  enableHttpsBtn: document.getElementById("enableHttpsBtn"),
  closeModalBtn: document.getElementById("closeModalBtn"),
};

export function updateStatus(connected) {
  if (connected) {
    elements.statusDot.classList.remove("disconnected");
    elements.statusDot.classList.add("connected");
    elements.statusText.textContent = "Live";
  } else {
    elements.statusDot.classList.remove("connected");
    elements.statusDot.classList.add("disconnected");
    elements.statusText.textContent = "Reconnecting";
  }
}

export function scrollToBottom() {
  elements.chatContainer.scrollTo({
    top: elements.chatContainer.scrollHeight,
    behavior: "smooth",
  });
}

export function renderSnapshot(data) {
  if (!data) return;

  // Add spin animation to refresh button
  const icon = elements.refreshBtn.querySelector("svg");
  icon.classList.remove("spin-anim");
  void icon.offsetWidth; // trigger reflow
  icon.classList.add("spin-anim");

  const scrollPos = elements.chatContainer.scrollTop;
  const isNearBottom =
    elements.chatContainer.scrollHeight -
      elements.chatContainer.scrollTop -
      elements.chatContainer.clientHeight <
    120;

  // Update stats
  if (data.stats) {
    const kbs = Math.round((data.stats.htmlSize + data.stats.cssSize) / 1024);
    const nodes = data.stats.nodes;
    if (elements.statsText)
      elements.statsText.textContent = `${nodes} Nodes · ${kbs}KB`;
  }

  // Force Dark Mode Overrides
  const darkModeOverrides = `
        <style>
            ${data.css}
            :root {
                --bg-app: #0f172a;
                --text-main: #f8fafc;
                --text-muted: #94a3b8;
                --border-color: #334155;
            }
            #cascade {
                background-color: transparent !important;
                color: var(--text-main) !important;
                font-family: 'Inter', system-ui, sans-serif !important;
                position: relative !important;
                height: auto !important;
                width: 100% !important;
            }
            #cascade * { position: static !important; }
            #cascade p, #cascade h1, #cascade h2, #cascade h3, #cascade h4, #cascade h5, #cascade span, #cascade div, #cascade li {
                color: inherit !important;
            }
            #cascade a { color: #60a5fa !important; text-decoration: underline; }
            pre, code, .monaco-editor-background, [class*="terminal"] {
                background-color: #1e293b !important;
                color: #e2e8f0 !important;
                font-family: 'JetBrains Mono', monospace !important;
                border-radius: 6px;
                border: 1px solid #334155;
            }
            blockquote {
                border-left: 3px solid #3b82f6 !important;
                background: rgba(59, 130, 246, 0.1) !important;
                color: #cbd5e1 !important;
                padding: 8px 12px !important;
                margin: 8px 0 !important;
            }
            table { border-collapse: collapse !important; width: 100% !important; border: 1px solid #334155 !important; }
            th, td { border: 1px solid #334155 !important; padding: 8px !important; color: #e2e8f0 !important; }
            ::-webkit-scrollbar { width: 0 !important; }
            [style*="background-color: rgb(255, 255, 255)"], [style*="background-color: white"], [style*="background: white"] {
                background-color: transparent !important;
            }
        </style>
    `;

  elements.chatContent.innerHTML = darkModeOverrides + data.html;

  // Scroll Sync Logic
  // Only sync FROM server if the user is NOT actively scrolling
  if (data.scrollInfo && !state.userIsScrolling) {
    const { scrollPercent } = data.scrollInfo;
    const clientHeight = elements.chatContainer.clientHeight;
    const scrollHeight = elements.chatContainer.scrollHeight;

    // Calculate target scroll top based on percentage to handle different screen sizes
    const targetScrollTop = scrollPercent * (scrollHeight - clientHeight);

    // If server is at the bottom (approx > 98%), stick to bottom on mobile too
    if (scrollPercent > 0.98) {
      if (!isNearBottom) scrollToBottom();
    } else {
      elements.chatContainer.scrollTop = targetScrollTop;
    }
  } else if (!data.scrollInfo) {
    // Fallback if no scroll info (legacy)
    if (isNearBottom || scrollPos === 0) {
      scrollToBottom();
    } else {
      elements.chatContainer.scrollTop = scrollPos;
    }
  }
}

export function openModal(title, options, onSelect) {
  elements.modalTitle.textContent = title;
  elements.modalList.innerHTML = "";
  options.forEach((opt) => {
    const div = document.createElement("div");
    div.className = "modal-option";
    div.textContent = opt;
    div.onclick = () => {
      onSelect(opt);
      closeModal();
    };
    elements.modalList.appendChild(div);
  });
  elements.modalOverlay.classList.add("show");
}

export function closeModal() {
  elements.modalOverlay.classList.remove("show");
}
