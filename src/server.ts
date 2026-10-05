import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import "./env.js";
import { AppError } from "./errors.js";
import type { NumericRow } from "./domain.js";
import { getExperiment, listExperiments } from "./specs/index.js";
import { analyzeExperiment } from "./services/analysis.js";
import { askDeepSeek } from "./services/deepseek.js";
import { askGlm } from "./services/glm.js";
import { askLocalAssistant, draftLocalReport, reviewLocalReport } from "./services/local-ai.js";
import { knowledgeReportDraftMessages, knowledgeReviewMessages, qaKnowledgeMessages, reportMessages, reviewMessages } from "./services/prompts.js";
import { retrieveKnowledge } from "./services/knowledge.js";

const MAX_BODY_BYTES = 1_000_000;

function aiMode(): "local" | "deepseek" | "glm" {
  const mode = process.env.AI_MODE ?? "local";
  if (mode === "local" || mode === "deepseek" || mode === "glm") return mode;
  throw new AppError(500, "AI_MODE must be local, deepseek, or glm.");
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

function addCorsHeaders(request: IncomingMessage, response: ServerResponse): void {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = request.headers.origin;
  if (allowedOrigin && origin === allowedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_BODY_BYTES) throw new AppError(413, "Request body is too large.");
    chunks.push(bytes);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new AppError(400, "JSON body must be an object.");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "Request body must be valid JSON.");
  }
}

function requireServiceToken(request: IncomingMessage): void {
  const expected = process.env.INTERNAL_API_TOKEN;
  const received = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!expected || !received) throw new AppError(401, "Missing service authorization.");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new AppError(401, "Invalid service authorization.");
  }
}

function readExperiment(body: Record<string, unknown>) {
  const experimentId = body.experimentId;
  if (typeof experimentId !== "string" || !experimentId.trim()) {
    throw new AppError(400, "experimentId is required.");
  }
  const spec = getExperiment(experimentId);
  if (!spec) throw new AppError(404, "Unknown experimentId. Register its real experiment specification first.");
  return spec;
}

function readExperimentId(body: Record<string, unknown>): string {
  const experimentId = body.experimentId;
  if (typeof experimentId !== "string" || !experimentId.trim()) {
    throw new AppError(400, "experimentId is required.");
  }
  return experimentId;
}

function readOptionalExperimentId(body: Record<string, unknown>): string | undefined {
  const experimentId = body.experimentId;
  if (experimentId === undefined || experimentId === null || experimentId === "") return undefined;
  if (typeof experimentId !== "string") throw new AppError(400, "experimentId 必须是文本。 ");
  return experimentId.trim() || undefined;
}

function readRows(body: Record<string, unknown>): NumericRow[] {
  if (!Array.isArray(body.rows)) throw new AppError(400, "rows must be an array.");
  return body.rows as NumericRow[];
}

function readText(body: Record<string, unknown>, key: string, maximumLength: number): string {
  const value = body[key];
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > maximumLength) {
    throw new AppError(400, `${key} must be a string no longer than ${maximumLength} characters.`);
  }
  return value.trim();
}

function readHistory(body: Record<string, unknown>): Array<{ role: "assistant" | "student"; content: string }> {
  if (body.history === undefined) return [];
  if (!Array.isArray(body.history) || body.history.length > 10) {
    throw new AppError(400, "history must contain at most 10 messages.");
  }
  return body.history.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new AppError(400, `history item ${index + 1} is invalid.`);
    }
    const turn = item as Record<string, unknown>;
    if ((turn.role !== "assistant" && turn.role !== "student") || typeof turn.content !== "string" || !turn.content.trim() || turn.content.length > 2_000) {
      throw new AppError(400, `history item ${index + 1} is invalid.`);
    }
    return { role: turn.role, content: turn.content.trim() };
  });
}

type ReportDraftKey = "purpose" | "principle" | "apparatus" | "procedure" | "dataAnalysis" | "results" | "errorAnalysis" | "conclusion";
const reportDraftKeys: ReportDraftKey[] = ["purpose", "principle", "apparatus", "procedure", "dataAnalysis", "results", "errorAnalysis", "conclusion"];

function readRawData(body: Record<string, unknown>): Array<{ x: number | string; y: number | string }> {
  const value = body.rawData;
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 200) throw new AppError(400, "rawData 必须是最多 200 行的数组。 ");
  return value.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) throw new AppError(400, `rawData 第 ${index + 1} 行无效。`);
    const row = item as Record<string, unknown>;
    const x = row.x;
    const y = row.y;
    if ((typeof x !== "string" && typeof x !== "number") || (typeof y !== "string" && typeof y !== "number")) {
      throw new AppError(400, `rawData 第 ${index + 1} 行必须包含 x 和 y。`);
    }
    return { x, y };
  });
}

function readMetadata(body: Record<string, unknown>): Record<string, string> {
  const value = body.metadata;
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new AppError(400, "metadata 必须是对象。 ");
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (typeof item !== "string" || item.length > 500) throw new AppError(400, `metadata.${key} 必须是长度不超过 500 的文本。`);
    return [key, item.trim()];
  }));
}

function parseReportDraft(value: string): Partial<Record<ReportDraftKey, string>> {
  const normalized = value.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? normalized.slice(start, end + 1) : normalized;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new AppError(502, "GLM 返回的报告草稿格式无效，请重试。 ");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new AppError(502, "GLM 返回的报告草稿格式无效，请重试。 ");
  }
  const result: Partial<Record<ReportDraftKey, string>> = {};
  for (const key of reportDraftKeys) {
    const section = (parsed as Record<string, unknown>)[key];
    if (typeof section === "string" && section.length <= 8_000) result[key] = section.trim();
  }
  if (Object.keys(result).length === 0) throw new AppError(502, "GLM 未返回有效报告章节，请重试。 ");
  return result;
}

type ReviewDraft = {
  dataQuality: string;
  calculationConsistency: string;
  conclusionConsistency: string;
  suggestions: string[];
  riskLevel: "low" | "medium" | "high";
};

function parseReviewDraft(value: string): ReviewDraft {
  const normalized = value.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? normalized.slice(start, end + 1) : normalized;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new AppError(502, "GLM 返回的审阅建议格式无效，请重试。 ");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new AppError(502, "GLM 返回的审阅建议格式无效，请重试。 ");
  }
  const item = parsed as Record<string, unknown>;
  const text = (key: "dataQuality" | "calculationConsistency" | "conclusionConsistency") => {
    const value = item[key];
    if (typeof value !== "string" || !value.trim() || value.length > 4_000) throw new AppError(502, "GLM 返回的审阅建议不完整，请重试。 ");
    return value.trim();
  };
  const suggestions = item.suggestions;
  if (!Array.isArray(suggestions) || suggestions.length < 2 || suggestions.length > 4 || suggestions.some((entry) => typeof entry !== "string" || !entry.trim() || entry.length > 1_000)) {
    throw new AppError(502, "GLM 返回的改进建议不完整，请重试。 ");
  }
  const riskLevel = item.riskLevel;
  if (riskLevel !== "low" && riskLevel !== "medium" && riskLevel !== "high") throw new AppError(502, "GLM 返回的风险等级无效，请重试。 ");
  return { dataQuality: text("dataQuality"), calculationConsistency: text("calculationConsistency"), conclusionConsistency: text("conclusionConsistency"), suggestions: suggestions.map((entry) => entry.trim()), riskLevel };
}

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  addCorsHeaders(request, response);
  if (request.method === "OPTIONS") return sendJson(response, 204, {});
  const path = new URL(request.url ?? "/", "http://localhost").pathname;

  if (request.method === "GET" && path === "/health") {
    const mode = aiMode();
    return sendJson(response, 200, {
      ok: true,
      aiMode: mode,
      aiConfigured: mode === "local" || (mode === "deepseek" ? Boolean(process.env.DEEPSEEK_API_KEY) : Boolean(process.env.GLM_API_KEY)),
    });
  }

  requireServiceToken(request);

  if (request.method === "GET" && path === "/v1/experiments") {
    return sendJson(response, 200, { experiments: listExperiments() });
  }
  if (request.method !== "POST") throw new AppError(404, "Route not found.");

  const body = await readJson(request);
  if (path === "/v1/ai/qa") {
    const question = readText(body, "question", 2_000);
    if (!question) throw new AppError(400, "question is required.");
    const knowledge = await retrieveKnowledge(readOptionalExperimentId(body), question);
    const answer = aiMode() === "local"
      ? await askLocalAssistant(knowledge, question)
      : aiMode() === "glm"
        ? await askGlm(qaKnowledgeMessages(knowledge, question, readHistory(body)))
        : await askDeepSeek(qaKnowledgeMessages(knowledge, question, readHistory(body)));
    return sendJson(response, 200, { answer });
  }

  if (path === "/v1/ai/report-draft") {
    const experimentId = readExperimentId(body);
    const studentNotes = readText(body, "studentNotes", 10_000);
    const analysisSummary = readText(body, "analysisSummary", 10_000);
    const knowledge = await retrieveKnowledge(experimentId, `${analysisSummary}\n${studentNotes}`);
    if (aiMode() === "local") {
      throw new AppError(503, "AI 报告草稿需要配置 GLM 或 DeepSeek 模式。 ");
    }
    const messages = knowledgeReportDraftMessages(knowledge, {
      metadata: readMetadata(body),
      rawData: readRawData(body),
      analysisSummary,
      studentNotes,
    });
    const content = aiMode() === "glm" ? await askGlm(messages) : await askDeepSeek(messages);
    return sendJson(response, 200, { draft: parseReportDraft(content) });
  }

  if (path === "/v1/ai/review-draft") {
    const experimentId = readExperimentId(body);
    const finalContent = readText(body, "finalContent", 20_000);
    const knowledge = await retrieveKnowledge(experimentId, finalContent);
    if (aiMode() === "local") throw new AppError(503, "AI 审阅需要配置 GLM 或 DeepSeek 模式。 ");
    const messages = knowledgeReviewMessages(knowledge, { rawData: body.rawData ?? {}, calculation: body.calculation ?? {}, finalContent });
    const content = aiMode() === "glm" ? await askGlm(messages) : await askDeepSeek(messages);
    return sendJson(response, 200, { review: parseReviewDraft(content) });
  }

  const spec = readExperiment(body);
  if (path === "/v1/analysis") {
    return sendJson(response, 200, { analysis: analyzeExperiment(spec, readRows(body)) });
  }

  const analysis = analyzeExperiment(spec, readRows(body));
  if (path === "/v1/ai/report") {
    const studentNotes = readText(body, "studentNotes", 10_000);
    const draft = aiMode() === "local"
      ? await draftLocalReport(spec, analysis, studentNotes)
      : aiMode() === "glm"
        ? await askGlm(reportMessages(spec, analysis, studentNotes))
        : await askDeepSeek(reportMessages(spec, analysis, studentNotes));
    return sendJson(response, 200, {
      analysis,
      draft,
    });
  }
  if (path === "/v1/ai/review") {
    const studentConclusion = readText(body, "studentConclusion", 10_000);
    const review = aiMode() === "local"
      ? await reviewLocalReport(spec, analysis, studentConclusion)
      : aiMode() === "glm"
        ? await askGlm(reviewMessages(spec, analysis, studentConclusion))
        : await askDeepSeek(reviewMessages(spec, analysis, studentConclusion));
    return sendJson(response, 200, {
      analysis,
      review,
    });
  }
  throw new AppError(404, "Route not found.");
}

const server = createServer((request, response) => {
  void handle(request, response).catch((error: unknown) => {
    const appError = error instanceof AppError ? error : new AppError(500, "Internal server error.");
    sendJson(response, appError.status, { error: appError.message });
  });
});

const port = Number(process.env.PORT ?? "8787");
const host = process.env.HOST ?? "0.0.0.0";
server.listen(port, host, () => {
  console.log(`smart-lab-ai-service listening on http://${host}:${port}`);
});
