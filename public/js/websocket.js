/**
 * WebSocket Client
 */
import { state } from "./state.js";

export function connectWebSocket(onMessage, onStatusChange) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    console.log("WS Connected");
    onStatusChange(true);
    onMessage({ type: "connected" });
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  ws.onclose = () => {
    console.log("WS Disconnected");
    onStatusChange(false);
    setTimeout(() => connectWebSocket(onMessage, onStatusChange), 2000);
  };

  state.ws = ws;
  return ws;
}
