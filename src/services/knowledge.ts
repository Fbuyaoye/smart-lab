import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AppError } from "../errors.js";

type KnowledgeRecord = {
  id: string;
  experimentId: string;
  experimentName: string;
  section: string;
  text: string;
  keywords: string;
};

type KnowledgeIndex = {
  records: KnowledgeRecord[];
};

export type KnowledgeContext = {
  experimentId?: string;
  experimentName?: string;
  scope: "experiment" | "all";
  excerpts: Array<Pick<KnowledgeRecord, "experimentId" | "experimentName" | "section" | "text">>;
};

function queryTerms(query: string): string[] {
  const latinTerms = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const chinese = query.replace(/[^\u4e00-\u9fff]/g, "");
  const chineseTerms = Array.from({ length: Math.max(chinese.length - 1, 0) }, (_, index) => chinese.slice(index, index + 2));
  return [...new Set([...latinTerms, ...chineseTerms])];
}

function indexPath(): string {
  return process.env.KNOWLEDGE_BASE_INDEX_PATH
    ?? resolve(process.cwd(), "..", "smart-lab-knowledge-base", "index.json");
}

export async function retrieveKnowledge(experimentId: string | undefined, question: string, filePath = indexPath()): Promise<KnowledgeContext> {
  let index: KnowledgeIndex;
  try {
    index = JSON.parse(await readFile(filePath, "utf8")) as KnowledgeIndex;
  } catch {
    throw new AppError(503, "实验知识库尚未构建或无法读取。");
  }

  const selectedExperimentId = experimentId?.trim() || undefined;
  const candidates = selectedExperimentId
    ? index.records.filter((record) => record.experimentId === selectedExperimentId)
    : index.records;
  if (candidates.length === 0) {
    throw new AppError(404, selectedExperimentId ? "当前实验尚未录入知识库资料。" : "实验知识库中暂无资料。");
  }

  const terms = queryTerms(question);
  const ranked = candidates
    .map((record) => {
      const text = `${record.keywords}\n${record.text}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
      return { record, score };
    })
    .sort((left, right) => right.score - left.score || left.record.section.localeCompare(right.record.section, "zh-CN"))
    .slice(0, 6)
    .map(({ record }) => ({
      experimentId: record.experimentId,
      experimentName: record.experimentName,
      section: record.section,
      text: record.text,
    }));

  return {
    experimentId: selectedExperimentId,
    experimentName: selectedExperimentId ? candidates[0].experimentName : undefined,
    scope: selectedExperimentId ? "experiment" : "all",
    excerpts: ranked,
  };
}
