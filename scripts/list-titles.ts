/** Prints the existing problem titles of one category key (or all): tsx scripts/list-titles.ts [categoryKey] */
import { PROBLEM_BANK } from "../server/data/problemBank";
const key = process.argv[2];
for (const p of PROBLEM_BANK) if (!key || p.id.startsWith(`prob-${key}-`)) console.log(`${p.id.split("-")[1]}\t${p.difficulty}\t${p.title}`);
