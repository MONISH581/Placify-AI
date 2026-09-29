import { Router } from "express";
import { aiEnabled } from "../ai";
import { describeRunner } from "../codeRunner";
import { prisma } from "../db";
import { asyncHandler } from "../http";
import { getMLHealth } from "../ml";

export const healthRouter = Router();

// Always 200 while Node is up; dependency state is reported in the body.
healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [dbOk, ml] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(
        () => true,
        () => false
      ),
      getMLHealth(),
    ]);
    const mlService = !ml.ok ? "disconnected" : ml.data.status === "ok" ? "connected" : "degraded";
    res.json({
      status: dbOk && mlService === "connected" ? "ok" : "degraded",
      node: "online",
      database: dbOk ? "connected" : "disconnected",
      mlService,
      ...(ml.ok && ml.data.models ? { mlModels: ml.data.models } : {}),
      codeRunner: describeRunner(),
      aiProvider: aiEnabled ? "gemini" : "disabled",
      timestamp: new Date().toISOString(),
    });
  })
);
