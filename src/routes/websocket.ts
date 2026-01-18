import { WebSocketServer, WebSocket } from "ws";
import { CDPConnection, Snapshot } from "../types/index.js";
import { config } from "../utils/config.js";
import { captureSnapshot } from "../cdp/snapshot.js";
import { hashString } from "../utils/network.js";

export function setupWebSocket(
  server: any,
  cdpRef: { current: CDPConnection | null },
  setLastSnapshot: (s: Snapshot) => void,
) {
  const wss = new WebSocketServer({ server });
  let lastSnapshotHash = "";

  // Snapshot polling loop
  setInterval(async () => {
    if (!cdpRef.current) return;

    try {
      const snapshot = await captureSnapshot(cdpRef.current);
      if (snapshot) {
        setLastSnapshot(snapshot);
        const currentHash = hashString(snapshot.html);

        if (currentHash !== lastSnapshotHash) {
          if (!lastSnapshotHash) {
            console.log("📸 First snapshot captured!");
          }
          lastSnapshotHash = currentHash;
          // Hash changed -> notify all clients
          broadcast(wss, { type: "update", hash: currentHash });
        }
      }
    } catch (e: any) {
      console.error(`❌ Snapshot error: ${e.message}`);
    }
  }, config.POLL_INTERVAL);

  wss.on("connection", (ws: WebSocket) => {
    console.log("📱 Phone connected");

    ws.send(
      JSON.stringify({
        type: "hello",
        snapshotAvailable: !!lastSnapshotHash,
      }),
    );

    ws.on("close", () => console.log("📱 Phone disconnected"));
  });

  return wss;
}

function broadcast(wss: WebSocketServer, data: any) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}
