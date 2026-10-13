/**
 * Verifies the problem bank offline: structure checks plus every JavaScript / Python reference solution against
 * every test case (stdin -> solve() -> trimmed stdout), the same contract the code runner uses.
 *
 * Usage: tsx scripts/verify-problems.ts [idSubstring]
 *        tsx scripts/verify-problems.ts --spec server/data/problems/extraA.ts   (check one spec file in isolation)
 */

import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import { buildBank, COMPANIES, PROBLEM_BANK as FULL_BANK } from "../server/data/problemBank";

const args = process.argv.slice(2);
const specIndex = args.indexOf("--spec");
const filter = specIndex >= 0 ? "" : (args[0] ?? "");
let PROBLEM_BANK = FULL_BANK;
if (specIndex >= 0) {
  const specPath = path.resolve(args[specIndex + 1]);
  const mod = await import(pathToFileURL(specPath).href);
  const firstExport = Object.values(mod).find((v) => v && typeof v === "object");
  let record: Parameters<typeof buildBank>[0];
  if (Array.isArray(firstExport)) {
    // real/<categoryKey>.ts exports an array; use the filename stem as the category key
    const key = path.basename(specPath, ".ts");
    record = { [key]: firstExport } as Parameters<typeof buildBank>[0];
  } else {
    record = firstExport as Parameters<typeof buildBank>[0];
  }
  PROBLEM_BANK = buildBank(record);
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-problems-"));
const norm = (text: string) => text.replace(/\r\n/g, "\n").trim();
const problems = PROBLEM_BANK.filter((p) => p.id.includes(filter));
const failures: string[] = [];

const seen = new Set<string>();
for (const p of PROBLEM_BANK) {
  if (seen.has(p.id)) failures.push(`${p.id}: duplicate id`);
  seen.add(p.id);
}
const titles = new Map<string, string>();
for (const p of PROBLEM_BANK) {
  const key = p.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (titles.has(key)) failures.push(`${p.id}: same title as ${titles.get(key)}`);
  titles.set(key, p.id);
}
for (const p of problems) {
  if (p.testCases.length < 3) failures.push(`${p.id}: fewer than 3 test cases`);
  if (!p.testCases.some((t) => t.isHidden)) failures.push(`${p.id}: no hidden test case`);
  if (!p.testCases.some((t) => !t.isHidden)) failures.push(`${p.id}: no visible test case`);
  if (p.hints.length < 3) failures.push(`${p.id}: fewer than 3 hints`);
  const companies = p.tags.slice(1);
  if (companies.length < 1) failures.push(`${p.id}: no company tags`);
  for (const c of companies) if (!COMPANIES.includes(c)) failures.push(`${p.id}: unknown company "${c}"`);
  if (new Set(companies).size !== companies.length) failures.push(`${p.id}: duplicate company tags`);
  const visible = new Set(p.testCases.filter((t) => !t.isHidden).map((t) => norm(t.input)));
  for (const ex of p.examples) {
    const match = p.testCases.find((t) => norm(t.input) === norm(ex.input));
    if (!match) failures.push(`${p.id}: example input is not a test case`);
    else if (norm(match.expectedOutput) !== norm(ex.output)) failures.push(`${p.id}: example output differs from its test case`);
    else if (!visible.has(norm(ex.input))) failures.push(`${p.id}: example is a hidden test case`);
  }
  const inputs = p.testCases.map((t) => norm(t.input));
  if (new Set(inputs).size !== inputs.length) failures.push(`${p.id}: duplicate test inputs`);
}

function runJs(source: string, inputs: string[]): { out?: string; err?: string }[] {
  const file = path.join(dir, "sol.cjs");
  fs.writeFileSync(
    file,
    `${source}\nconst fs=require("fs");const inputs=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));\n` +
      `const res=inputs.map(i=>{try{return {out:String(solve(i))}}catch(e){return {err:String(e&&e.stack||e)}}});\n` +
      `fs.writeFileSync(process.argv[3],JSON.stringify(res));`
  );
  return exec("node", [file], inputs);
}

function runPy(source: string, inputs: string[]): { out?: string; err?: string }[] {
  const file = path.join(dir, "sol.py");
  fs.writeFileSync(
    file,
    `${source}\nimport sys, json, traceback\nsys.setrecursionlimit(100000)\ninputs = json.load(open(sys.argv[1], encoding="utf8"))\nres = []\n` +
      `for i in inputs:\n    try:\n        res.append({"out": str(solve(i))})\n    except Exception:\n        res.append({"err": traceback.format_exc()})\n` +
      `json.dump(res, open(sys.argv[2], "w", encoding="utf8"))\n`
  );
  return exec("python", [file], inputs);
}

function exec(cmd: string, args: string[], inputs: string[]) {
  const inFile = path.join(dir, "in.json");
  const outFile = path.join(dir, "out.json");
  fs.writeFileSync(inFile, JSON.stringify(inputs));
  fs.rmSync(outFile, { force: true });
  const r = spawnSync(cmd, [...args, inFile, outFile], { encoding: "utf8", timeout: 120_000, maxBuffer: 1 << 26 });
  if (!fs.existsSync(outFile)) return inputs.map(() => ({ err: `crashed: ${(r.stderr || r.error?.message || "").slice(0, 400)}` }));
  return JSON.parse(fs.readFileSync(outFile, "utf8"));
}

for (const p of problems) {
  const inputs = p.testCases.map((t) => t.input);
  for (const [lang, run] of [["javascript", runJs], ["python", runPy]] as const) {
    const source = p.solutions[lang];
    if (!source.trim()) {
      failures.push(`${p.id} [${lang}]: missing reference solution`);
      continue;
    }
    const started = Date.now();
    const results = run(source, inputs);
    const ms = Date.now() - started;
    results.forEach((r, i) => {
      const want = norm(p.testCases[i].expectedOutput);
      if (r.err) failures.push(`${p.id} [${lang}] case ${i + 1}: ${r.err.split("\n").slice(-3).join(" | ")}`);
      else if (norm(r.out ?? "") !== want) failures.push(`${p.id} [${lang}] case ${i + 1}: expected ${JSON.stringify(want.slice(0, 120))} got ${JSON.stringify(norm(r.out ?? "").slice(0, 120))}`);
    });
    if (ms > 6000) failures.push(`${p.id} [${lang}]: slow (${ms}ms for all cases)`);
  }
}

fs.rmSync(dir, { recursive: true, force: true });
console.log(`checked ${problems.length} problems (of ${PROBLEM_BANK.length})`);
if (failures.length) {
  console.log(`\n${failures.length} problem(s):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("all good");
