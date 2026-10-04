import { readFile, writeFile } from "node:fs/promises";

const catalogUrl = new URL("../documents/experiments.json", import.meta.url);
const notesUrl = new URL("../documents/source-notes.json", import.meta.url);
const outputUrl = new URL("../index.json", import.meta.url);
const experiments = JSON.parse(await readFile(catalogUrl, "utf8"));
const sourceNotes = JSON.parse(await readFile(notesUrl, "utf8"));

const sections = ["objective", "principle", "apparatus", "procedure", "dataRequirements", "formulae", "commonIssues", "reportRequirements"];
const records = experiments.flatMap((experiment) => sections.flatMap((section) => {
  const value = experiment.content[section];
  const text = Array.isArray(value) ? value.join("\n") : value;
  if (!text?.trim()) return [];
  return [{
    id: `${experiment.id}:${section}`,
    experimentId: experiment.id,
    experimentName: experiment.name,
    section,
    text,
    keywords: [experiment.name, ...experiment.aliases, section].join(" ").toLowerCase(),
  }];
}));

const noteRecords = sourceNotes.flatMap((entry) => {
  const experiment = experiments.find((item) => item.id === entry.experimentId);
  if (!experiment) throw new Error(`source-notes.json references an unknown experiment: ${entry.experimentId}`);
  const sourceText = entry.sources.map((source) => `${source.institution}：${source.scope}。${source.url}`).join("\n");
  return [
    ...entry.notes.map((text, index) => ({
      id: `${entry.experimentId}:note:${index + 1}`,
      experimentId: entry.experimentId,
      experimentName: experiment.name,
      section: "来源摘要",
      text,
      keywords: [experiment.name, ...experiment.aliases, text].join(" ").toLowerCase(),
    })),
    {
      id: `${entry.experimentId}:sources`,
      experimentId: entry.experimentId,
      experimentName: experiment.name,
      section: "资料来源",
      text: sourceText,
      keywords: [experiment.name, ...experiment.aliases, sourceText].join(" ").toLowerCase(),
    },
  ];
});

const allRecords = [...records, ...noteRecords];
await writeFile(outputUrl, `${JSON.stringify({ generatedAt: new Date().toISOString(), records: allRecords }, null, 2)}\n`);
console.log(`已建立索引：${allRecords.length} 个资料片段。`);
