import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AnalysisResult, ExperimentSpec } from "../domain.js";
import { AppError } from "../errors.js";
import type { KnowledgeContext } from "./knowledge.js";

type IntentLabel = "principle" | "procedure" | "data" | "troubleshooting" | "safety" | "report" | "general";
type ModelLabel = { documentCount: number; tokenCount: number; tokenCounts: Record<string, number> };
type LocalIntentModel = {
  version: 1;
  algorithm: "multinomial-naive-bayes";
  totalExamples: number;
  vocabularySize: number;
  labels: Record<IntentLabel, ModelLabel>;
};

const intentNames: Record<IntentLabel, string> = {
  principle: "实验原理",
  procedure: "操作步骤",
  data: "数据处理",
  troubleshooting: "异常排查",
  safety: "操作注意事项",
  report: "报告撰写",
  general: "实验学习",
};

function tokenize(text: string): string[] {
  const latin = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const chinese = text.replace(/[^\u4e00-\u9fff]/g, "");
  const characters = [...chinese];
  const bigrams = characters.slice(0, -1).map((character, index) => `${character}${characters[index + 1]}`);
  return [...latin, ...characters, ...bigrams];
}

function modelPath(): string {
  return process.env.LOCAL_AI_MODEL_PATH ?? resolve(process.cwd(), "models", "intent-model.json");
}

let cachedModel: LocalIntentModel | undefined;

async function loadModel(): Promise<LocalIntentModel> {
  if (cachedModel) return cachedModel;
  try {
    cachedModel = JSON.parse(await readFile(modelPath(), "utf8")) as LocalIntentModel;
  } catch {
    throw new AppError(503, "本地 AI 模型尚未训练。请执行 npm run train:local。");
  }
  if (cachedModel.algorithm !== "multinomial-naive-bayes" || !cachedModel.labels || cachedModel.vocabularySize < 1) {
    throw new AppError(503, "本地 AI 模型文件无效。请重新执行 npm run train:local。");
  }
  return cachedModel;
}

export async function classifyIntent(question: string): Promise<{ intent: IntentLabel; confidence: number }> {
  const model = await loadModel();
  const tokens = tokenize(question);
  const labels = Object.entries(model.labels) as Array<[IntentLabel, ModelLabel]>;
  const scores = labels.map(([intent, label]) => {
    const prior = Math.log(label.documentCount / model.totalExamples);
    const likelihood = tokens.reduce((total, token) => {
      const count = label.tokenCounts[token] ?? 0;
      return total + Math.log((count + 1) / (label.tokenCount + model.vocabularySize));
    }, 0);
    return { intent, score: prior + likelihood };
  }).sort((left, right) => right.score - left.score);
  const best = scores[0];
  const exponentials = scores.map(({ score }) => Math.exp(score - best.score));
  const confidence = exponentials[0] / exponentials.reduce((total, value) => total + value, 0);
  return { intent: best.intent, confidence };
}

function usableExcerpts(knowledge: KnowledgeContext): KnowledgeContext["excerpts"] {
  const nonSource = knowledge.excerpts.filter((item) => item.section !== "资料来源");
  return (nonSource.length > 0 ? nonSource : knowledge.excerpts).slice(0, 2);
}

export async function askLocalAssistant(knowledge: KnowledgeContext, question: string): Promise<string> {
  const { intent, confidence } = await classifyIntent(question);
  const excerpts = usableExcerpts(knowledge);
  const evidence = excerpts.map((item, index) => `${index + 1}. ${item.text}`).join("\n");
  const certainty = confidence >= 0.55 ? "" : "问题类型识别不够确定，以下只给出已收录资料范围内的提示。\n";
  const nextStep = intent === "data"
    ? "请保留原始数据、单位和拟合设置；具体公式和判定阈值以本校指导书为准。"
    : intent === "report"
      ? "报告应如实引用原始数据和确定性计算结果，不能由本地助手替代最终结论。"
      : "如果需要具体仪器参数、公式或操作顺序，请补充本校指导书内容后再确认。";
  const title = knowledge.scope === "experiment" ? knowledge.experimentName : "通用实验问答";
  return `【${title}｜本地助教】\n识别方向：${intentNames[intent]}。\n${certainty}已收录资料：\n${evidence}\n\n${nextStep}`;
}

function resultSummary(analysis: AnalysisResult): string {
  const { result } = analysis;
  return `线性拟合结果：斜率 ${result.slope.toFixed(6)}，截距 ${result.intercept.toFixed(6)}，R² ${result.rSquared.toFixed(6)}，RMSE ${result.rmse.toFixed(6)}。`;
}

export async function draftLocalReport(spec: ExperimentSpec, analysis: AnalysisResult, studentNotes: string): Promise<string> {
  return [
    `《${spec.name}》报告草稿（本地模板，需学生自行核对和补充）`,
    "",
    "一、数据处理",
    resultSummary(analysis),
    analysis.warnings.length ? `系统提示：${analysis.warnings.join("；")}` : "系统提示：未发现当前规则覆盖的异常提示。",
    "",
    "二、结果与讨论",
    "请根据本校指导书说明拟合量的物理含义、单位及结果是否满足实验要求。本地模板不会替学生补写未提供的实验事实。",
    "",
    "三、学生记录",
    studentNotes || "未提供；请补充实际操作、环境条件和观察现象。",
  ].join("\n");
}

export async function reviewLocalReport(spec: ExperimentSpec, analysis: AnalysisResult, studentConclusion: string): Promise<string> {
  const suggestions = [
    "核对原始数据、单位和图表标注是否与仪器读数一致。",
    "将报告中的计算数值与系统确定性计算结果逐项对照，不一致时说明原因。",
    "误差讨论应联系实际操作和仪器条件，避免只写笼统结论。",
  ];
  return [
    `《${spec.name}》本地审阅提示（不含最终评分）`,
    "",
    "数据质量：",
    analysis.warnings.length ? analysis.warnings.join("；") : "当前规则未标记异常；这不等于数据一定无误。",
    "",
    "计算一致性：",
    resultSummary(analysis),
    "",
    "结论一致性：",
    studentConclusion ? "已收到学生结论；请教师结合指导书确认其物理解释。" : "尚未填写学生结论。",
    "",
    "改进建议：",
    ...suggestions.map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");
}
