import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type TrainingExample = { intent: string; text: string };
type LocalIntentModel = {
  version: 1;
  algorithm: "multinomial-naive-bayes";
  trainedAt: string;
  totalExamples: number;
  labels: Record<string, { documentCount: number; tokenCount: number; tokenCounts: Record<string, number> }>;
  vocabularySize: number;
};

function tokenize(text: string): string[] {
  const latin = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const chinese = text.replace(/[^\u4e00-\u9fff]/g, "");
  const characters = [...chinese];
  const bigrams = characters.slice(0, -1).map((character, index) => `${character}${characters[index + 1]}`);
  return [...latin, ...characters, ...bigrams];
}

const root = resolve(import.meta.dirname, "..");
const trainingPath = resolve(root, "training", "intent-training.json");
const outputPath = resolve(root, "models", "intent-model.json");
const examples = JSON.parse(await readFile(trainingPath, "utf8")) as TrainingExample[];
const labels: LocalIntentModel["labels"] = {};
const vocabulary = new Set<string>();

for (const example of examples) {
  if (!example.intent || !example.text) throw new Error("训练样本必须包含 intent 和 text。");
  const label = labels[example.intent] ??= { documentCount: 0, tokenCount: 0, tokenCounts: {} };
  label.documentCount += 1;
  for (const token of tokenize(example.text)) {
    label.tokenCount += 1;
    label.tokenCounts[token] = (label.tokenCounts[token] ?? 0) + 1;
    vocabulary.add(token);
  }
}

const model: LocalIntentModel = {
  version: 1,
  algorithm: "multinomial-naive-bayes",
  trainedAt: new Date().toISOString(),
  totalExamples: examples.length,
  labels,
  vocabularySize: vocabulary.size,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(model, null, 2)}\n`);
console.log(`本地意图模型训练完成：${outputPath}`);
console.log(`样本数：${model.totalExamples}；类别数：${Object.keys(model.labels).length}；词表数：${model.vocabularySize}`);
