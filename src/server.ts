import express from "express";
import { createServer } from "https";
import { createServer as createHttpServer } from "http";
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "./utils/config.js";
import { getLocalIP, getNetworkInterfaces } from "./utils/network.js";
import { detectSSL } from "./utils/ssl.js";
import { initCDP } from "./cdp/connection.js";
import { createApiRouter } from "./routes/api.js";
import { setupWebSocket } from "./routes/websocket.js";
import { CDPRef, Snapshot } from "./types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "../");
const PUBLIC_DIR = join(PROJECT_ROOT, "public");

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  let lastSnapshot: Snapshot | null = null;
  const cdpRef: CDPRef = { current: null };

  const setLastSnapshot = (s: Snapshot) => {
    lastSnapshot = s;
  };
  const getLastSnapshot = () => lastSnapshot;

  // API Routes
  app.use("/", createApiRouter(cdpRef, getLastSnapshot));

  // SSL Setup
  const { hasSSL, keyPath, certPath } = detectSSL();
  let server;
  let protocol = "http";

  if (hasSSL) {
    try {
      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      server = createServer(options, app);
      protocol = "https";
    } catch (e) {
      console.error("❌ Failed to start HTTPS server, falling back to HTTP");
      server = createHttpServer(app);
    }
  } else {
    server = createHttpServer(app);
  }

  // WebSocket Setup
  setupWebSocket(server, cdpRef, setLastSnapshot);

  // Initial CDP connection attempt
  try {
    cdpRef.current = await initCDP();

    cdpRef.current.ws.on("close", () => {
      cdpRef.current = null;
    });
  } catch (e: any) {
    console.warn(`⚠️ CDP Initialization failed: ${e.message}`);
    console.warn(
      "   The server is running but mirroring will be unavailable until CDP is connected.",
    );
  }

  const interfaces = getNetworkInterfaces();
  const tailscaleIface = interfaces.find((i) => i.type === "Tailscale");

  server.listen(config.SERVER_PORT, "0.0.0.0", () => {
    console.log("\n" + "=".repeat(50));
    console.log(`🚀 Antigravity Phone Connect is LIVE!`);
    console.log(`📡 Protocol: ${protocol.toUpperCase()}`);
    console.log(`🔗 Local:   ${protocol}://localhost:${config.SERVER_PORT}`);

    interfaces.forEach((iface) => {
      const icon = iface.type === "Tailscale" ? "🔒" : "📱";
      console.log(
        `${icon} ${iface.type.padEnd(9)} ${protocol}://${iface.address}:${config.SERVER_PORT}`,
      );
    });

    console.log("=".repeat(50) + "\n");

    if (!hasSSL) {
      if (tailscaleIface) {
        console.log(
          "🔒 Tailscale detected! You can use the Tailscale IP above for secure access without SSL certificates.",
        );
      } else {
        console.log(
          "💡 TIP: Run Task 1.8 (SSL generation) to enable secure mobile access\n",
        );
      }
    }
  });

  // Handle unexpected errors
  process.on("uncaughtException", (err) => {
    if (err.message.includes("ECONNRESET") || err.message.includes("EPIPE"))
      return;
    console.error("💥 Uncaught Exception:", err);
  });
}

startServer();
