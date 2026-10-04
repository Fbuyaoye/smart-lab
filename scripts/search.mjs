import { readFile } from "node:fs/promises";

const query = process.argv.slice(2).join(" ").trim().toLowerCase();
if (!query) {
  console.error("用法：node scripts/search.mjs \"实验名称或问题\"");
  process.exit(1);
}

const indexUrl = new URL("../index.json", import.meta.url);
const index = JSON.parse(await readFile(indexUrl, "utf8"));
const terms = query.split(/\s+/).filter(Boolean);
const matches = index.records
  .map((record) => ({ ...record, score: terms.reduce((total, term) => total + (record.keywords.includes(term) ? 2 : 0) + (record.text.toLowerCase().includes(term) ? 1 : 0), 0) }))
  .filter((record) => record.score > 0)
  .sort((left, right) => right.score - left.score)
  .slice(0, 6);

if (matches.length === 0) {
  console.log("没有检索到已导入的资料。请先补充实验指导书内容并运行 build-index.mjs。");
} else {
  for (const match of matches) console.log(`\n[${match.experimentName} / ${match.section}]\n${match.text}`);
}
