import { Router, Request, Response } from "express";
import { CDPRef, Snapshot } from "../types/index.js";
import * as actions from "../cdp/actions.js";
import { detectSSL, generateSSL } from "../utils/ssl.js";
import { inspectUI } from "../utils/ui-inspector.js";

export function createApiRouter(
  cdpRef: CDPRef,
  getLastSnapshot: () => Snapshot | null,
): Router {
  const router = Router();

  // Helper to handle async routes with error catching
  const asyncHandler =
    (fn: (req: Request, res: Response) => Promise<any>) =>
    async (req: Request, res: Response) => {
      try {
        await fn(req, res);
      } catch (error: any) {
        console.error(`❌ API Error: ${req.method} ${req.url}`, error);
        res.status(500).json({
          error: "Internal Server Error",
          message: error.message,
        });
      }
    };

  // Health check
  router.get("/health", (req, res) => {
    res.json({
      status: "ok",
      cdpConnected: cdpRef.current?.ws?.readyState === 1,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      https: detectSSL().hasSSL,
    });
  });

  // Get snapshot
  router.get("/snapshot", (req, res) => {
    const snapshot = getLastSnapshot();
    if (!snapshot)
      return res.status(503).json({ error: "No snapshot available" });
    res.json(snapshot);
  });

  // App state
  router.get(
    "/app-state",
    asyncHandler(async (req, res) => {
      if (!cdpRef.current)
        return res.json({ mode: "Unknown", model: "Unknown" });
      const result = await actions.getAppState(cdpRef.current);
      res.json(result);
    }),
  );

  // SSL status
  router.get("/ssl-status", (req, res) => {
    const { hasSSL } = detectSSL();
    res.json({
      enabled: hasSSL,
      message: hasSSL ? "HTTPS is active" : "No certificates found",
    });
  });

  // Generate SSL
  router.post(
    "/generate-ssl",
    asyncHandler(async (req, res) => {
      const result = await generateSSL();
      res.json(result);
    }),
  );

  // Send message
  router.post(
    "/send",
    asyncHandler(async (req: Request, res: Response) => {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });
      if (!cdpRef.current)
        return res.status(503).json({ error: "CDP disconnected" });

      const result = await actions.injectMessage(cdpRef.current, message);
      res.json({
        success: result.ok !== false,
        method: result.method || "attempted",
        details: result,
      });
    }),
  );

  // Remote actions
  router.post(
    "/set-mode",
    asyncHandler(async (req, res) => {
      const { mode } = req.body;
      if (!cdpRef.current)
        return res.status(503).json({ error: "CDP disconnected" });
      res.json(await actions.setMode(cdpRef.current, mode));
    }),
  );

  router.post(
    "/set-model",
    asyncHandler(async (req, res) => {
      const { model } = req.body;
      if (!cdpRef.current)
        return res.status(503).json({ error: "CDP disconnected" });

      const result = await actions.setModel(cdpRef.current, model);
      res.json(result);
    }),
  );

  router.post(
    "/stop",
    asyncHandler(async (req, res) => {
      if (!cdpRef.current)
        return res.status(503).json({ error: "CDP disconnected" });
      res.json(await actions.stopGeneration(cdpRef.current));
    }),
  );

  router.post(
    "/remote-click",
    asyncHandler(async (req, res) => {
      if (!cdpRef.current)
        return res.status(503).json({ error: "CDP disconnected" });
      res.json(await actions.clickElement(cdpRef.current, req.body));
    }),
  );

  router.post(
    "/remote-scroll",
    asyncHandler(async (req, res) => {
      if (!cdpRef.current)
        return res.status(503).json({ error: "CDP disconnected" });

      const result = await actions.remoteScroll(cdpRef.current, req.body);
      res.json(result);
    }),
  );

  router.get(
    "/debug-ui",
    asyncHandler(async (req, res) => {
      if (!cdpRef.current)
        return res.status(503).json({ error: "CDP disconnected" });
      const uiTree = await inspectUI(cdpRef.current);
      res.json(uiTree);
    }),
  );

  return router;
}
