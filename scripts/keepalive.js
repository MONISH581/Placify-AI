#!/usr/bin/env node
/**
 * Render Keep-Alive Ping Script
 *
 * Continuously triggers the Render web service to prevent it from spinning down
 * due to free tier inactivity (Render sleeps after 15 minutes of zero traffic).
 *
 * Usage:
 *   node scripts/keepalive.js                           # Runs continuously (every 10 min)
 *   node scripts/keepalive.js https://my-app.onrender.com
 *   node scripts/keepalive.js --interval 5              # Runs every 5 minutes
 *   node scripts/keepalive.js --once                    # Pings once and exits
 *
 * Environment variables:
 *   RENDER_APP_URL or APP_URL (e.g. https://placify-ai.onrender.com)
 *   KEEPALIVE_INTERVAL_MINUTES (default: 10)
 */

const args = process.argv.slice(2);

let targetUrl = process.env.RENDER_APP_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "";
let intervalMinutes = Number(process.env.KEEPALIVE_INTERVAL_MINUTES) || 10;
let runOnce = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--help" || arg === "-h") {
    console.log(`
Placify-AI Render Keep-Alive Ping Tool

Usage:
  node scripts/keepalive.js [url] [options]

Options:
  --interval <minutes>   Minutes between pings (default: 10)
  --once                 Perform a single ping and exit
  --help, -h             Show this help message

Environment Variables:
  RENDER_APP_URL         Target URL (e.g. https://placify-ai.onrender.com)
  KEEPALIVE_INTERVAL_MINUTES Interval in minutes (default: 10)
`);
    process.exit(0);
  } else if (arg === "--once") {
    runOnce = true;
  } else if (arg === "--interval" && args[i + 1]) {
    intervalMinutes = Number(args[++i]) || 10;
  } else if (arg.startsWith("http://") || arg.startsWith("https://")) {
    targetUrl = arg;
  }
}

if (!targetUrl) {
  targetUrl = "https://placify-ai-pds2.onrender.com";
}

// Ensure the URL ends with /api/health if only base domain was provided
try {
  const parsed = new URL(targetUrl);
  if (!parsed.pathname || parsed.pathname === "/") {
    parsed.pathname = "/api/health";
  }
  targetUrl = parsed.toString();
} catch (err) {
  console.error(`[keepalive] Invalid URL: ${targetUrl}`);
  process.exit(1);
}

function formatTime() {
  return new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
}

async function ping(retries = 2) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const start = Date.now();
    const attemptStr = attempt > 1 ? ` (attempt ${attempt}/${retries + 1})` : "";
    console.log(`[keepalive] [${formatTime()}] Pinging ${targetUrl}${attemptStr}...`);

    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Placify-KeepAlive-Cron/1.0",
          "Accept": "application/json, text/plain, */*",
        },
        signal: controller.signal,
      });

      const duration = Date.now() - start;
      const text = await res.text();
      let preview = text.trim();
      if (preview.length > 120) preview = preview.slice(0, 120) + "...";

      if (res.ok) {
        console.log(`[keepalive] [${formatTime()}] ✅ SUCCESS: HTTP ${res.status} (${duration}ms) - ${preview}`);
        return true;
      } else {
        console.warn(`[keepalive] [${formatTime()}] ⚠️ HTTP ${res.status} (${duration}ms) - ${preview}`);
        if (attempt <= retries) {
          console.log(`[keepalive] Render may be waking up from sleep. Waiting 15s before retry...`);
          await new Promise((resolve) => setTimeout(resolve, 15000));
        }
      }
    } catch (err) {
      const duration = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[keepalive] [${formatTime()}] ⚠️ Attempt ${attempt} failed after ${duration}ms: ${msg}`);
      if (attempt <= retries) {
        console.log(`[keepalive] Render may be spinning up from sleep. Waiting 15s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, 15000));
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  console.error(`[keepalive] [${formatTime()}] ❌ All ping attempts failed.`);
  return false;
}

if (runOnce) {
  const ok = await ping(2);
  process.exitCode = ok ? 0 : 1;
} else {
  console.log("==================================================");
  console.log("🚀 Placify-AI Render Keep-Alive Daemon Started");
  console.log(`🎯 Target:   ${targetUrl}`);
  console.log(`⏱️ Interval: Every ${intervalMinutes} minutes (Render sleeps after 15m)`);
  console.log("==================================================");

  // Initial ping immediately
  void ping();

  // Recurring cron interval
  const intervalMs = intervalMinutes * 60 * 1000;
  const timer = setInterval(() => {
    void ping();
  }, intervalMs);

  const shutdown = (signal) => {
    console.log(`\n[keepalive] Received ${signal}. Stopping keep-alive timer.`);
    clearInterval(timer);
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
