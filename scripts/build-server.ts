/**
 * Bundles server.ts into dist/server.cjs (node_modules stay external).
 * The banner makes `node dist/server.cjs` default to NODE_ENV=production on every platform.
 */

import { build } from "esbuild";
import fs from "fs";

await build({
  entryPoints: ["server.ts"],
  outfile: "dist/server.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  packages: "external",
  sourcemap: true,
  banner: { js: 'process.env.NODE_ENV = process.env.NODE_ENV || "production";' },
  logLevel: "info",
});

const bundle = fs.readFileSync("dist/server.cjs", "utf8");
// vite is a devDependency: it may only be loaded lazily (inside the development branch).
const topLevelVite = bundle.split("\n").some((line) => /^(var|const|let)\s+\w+\s*=\s*.*require\("vite"\)/.test(line));
if (topLevelVite) {
  console.error("dist/server.cjs requires vite at the top level - it must be imported lazily in development only.");
  process.exit(1);
}
