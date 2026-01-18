import http from "http";
import WebSocket from "ws";
import { config } from "../utils/config.js";
import { CDPConnection } from "../types/index.js";

/**
 * Helper: HTTP GET JSON
 */
function getJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * Find Antigravity CDP endpoint
 */
export async function discoverCDP(): Promise<{ port: number; url: string }> {
  for (const port of config.CDP_PORTS) {
    try {
      const list = await getJson(`http://127.0.0.1:${port}/json/list`);
      console.log(
        `📡 Port ${port} targets:`,
        list.map((t: any) => `[${t.type}] ${t.title} (${t.url})`),
      );
      // Heuristic: Prioritize workbench (UI) over jetski-agent (headless)
      const sorted = list.sort((a: any, b: any) => {
        const score = (t: any) => {
          const url = (t.url || "").toLowerCase();
          const title = (t.title || "").toLowerCase();
          // Main workbench with UI gets highest priority
          if (url.includes("workbench.html") && !url.includes("jetski"))
            return 100;
          if (title.includes("antigravity") && !title.includes("launchpad"))
            return 90;
          // jetski-agent is a headless process, lower priority
          if (url.includes("jetski") || url.includes("agent")) return 10;
          return 0;
        };
        return score(b) - score(a);
      });

      const found =
        sorted[0] && sorted[0].webSocketDebuggerUrl ? sorted[0] : null;

      if (found) {
        console.log(`🎯 Picked target: ${found.title} (${found.url})`);
        return { port, url: found.webSocketDebuggerUrl };
      }
    } catch (e) {}
  }
  throw new Error(
    "CDP not found. Is Antigravity started with --remote-debugging-port=9000?",
  );
}

/**
 * Connect to CDP
 */
export async function connectCDP(url: string): Promise<CDPConnection> {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });

  let idCounter = 1;
  const pendingCalls = new Map<
    number,
    { resolve: Function; reject: Function; timeoutId: NodeJS.Timeout }
  >();
  const contexts: any[] = [];

  // Single centralized message handler
  ws.on("message", (msg: string) => {
    try {
      const data = JSON.parse(msg);

      // Handle CDP method responses
      if (data.id !== undefined && pendingCalls.has(data.id)) {
        const pending = pendingCalls.get(data.id);
        if (pending) {
          const { resolve, reject, timeoutId } = pending;
          clearTimeout(timeoutId);
          pendingCalls.delete(data.id);

          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      }

      // Handle execution context events
      if (data.method === "Runtime.executionContextCreated") {
        const context = data.params.context;
        // Avoid duplicates
        if (!contexts.find((c) => c.id === context.id)) {
          contexts.push(context);
        }
      }
    } catch (e) {}
  });

  // Disconnect handler
  ws.on("close", () => {
    console.warn("🔻 CDP Connection closed");
  });

  const call = (method: string, params: any) =>
    new Promise((resolve, reject) => {
      const id = idCounter++;

      // Setup timeout to prevent memory leaks
      const timeoutId = setTimeout(() => {
        if (pendingCalls.has(id)) {
          pendingCalls.delete(id);
          reject(
            new Error(
              `CDP call ${method} timed out after ${config.CDP_CALL_TIMEOUT}ms`,
            ),
          );
        }
      }, config.CDP_CALL_TIMEOUT);

      pendingCalls.set(id, { resolve, reject, timeoutId });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await call("Runtime.enable", {});

  // Robust context discovery: Wait for at least one context with retries
  let retries = 5;
  while (contexts.length === 0 && retries > 0) {
    console.log(
      `⏳ Waiting for execution contexts... (${retries} retries left)`,
    );
    await new Promise((r) => setTimeout(r, 500));
    retries--;
  }

  if (contexts.length === 0) {
    console.warn("⚠️ No execution contexts discovered. Snapshot might fail.");
  }

  return { ws, call, contexts };
}

/**
 * Initialize CDP connection
 */
export async function initCDP(): Promise<CDPConnection> {
  console.log("🔍 Discovering VS Code CDP endpoint...");
  const cdpInfo = await discoverCDP();
  console.log(`✅ Found VS Code on port ${cdpInfo.port}`);

  console.log("🔌 Connecting to CDP...");
  const connection = await connectCDP(cdpInfo.url);
  console.log(
    `✅ Connected! Found ${connection.contexts.length} contexts:`,
    connection.contexts.map(
      (c) => `[${c.id}] ${c.name || "unnamed"} (${c.origin})`,
    ),
  );

  return connection;
}
