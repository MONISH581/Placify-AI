/**
 * Placify - Express + TypeScript server entry point.
 *
 * - /api/*      JSON API (see server/app.ts and server/routes/*)
 * - development Vite dev middleware serves the React app (vite is imported lazily, dev only)
 * - production  serves the pre-built client from dist/client
 *
 * @license Apache-2.0
 */

import fs from "fs";
import path from "path";
import express from "express";
import { config } from "./server/config";
import { createApp, errorHandler } from "./server/app";
import { prisma } from "./server/db";

process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled promise rejection:", reason);
});

async function attachClient(app: express.Express) {
  if (config.isTest) return; // API-only in automated tests

  if (!config.isProduction) {
    // Lazy import: vite is a devDependency and must never be required by the production bundle.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    return;
  }

  const clientDir = path.resolve(process.cwd(), "dist", "client");
  const indexHtml = path.join(clientDir, "index.html");
  if (!fs.existsSync(indexHtml)) {
    console.warn(`[server] ${indexHtml} not found - run \`npm run build\` first. Serving the API only.`);
    return;
  }
  app.use(express.static(clientDir, { index: false, maxAge: "1h" }));
  app.get("*", (_req, res) => {
    res.sendFile(indexHtml);
  });
}

async function startServer() {
  await prisma.$connect();
  const app = createApp();
  await attachClient(app);
  app.use(errorHandler);

  const server = app.listen(config.port, config.host, () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : config.port;
    console.log(`[server] Placify running on http://${config.host}:${port} (${config.nodeEnv}, code runner: ${config.codeRunner})`);
    if (config.codeRunner === "local" && config.isProduction) {
      console.warn("[server] WARNING: the local code runner is intended for development only. Configure Judge0 for production.");
    }
  });
  server.on("error", (err) => {
    console.error("[server] Failed to start HTTP server:", err);
    process.exit(1);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(() => {
      prisma.$disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
