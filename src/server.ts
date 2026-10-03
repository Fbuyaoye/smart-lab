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
import { qaKnowledgeMessages, reportMessages, reviewMessages } from "./services/prompts.js";
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
    const knowledge = await retrieveKnowledge(readExperimentId(body), question);
    const answer = aiMode() === "local"
      ? await askLocalAssistant(knowledge, question)
      : aiMode() === "glm"
        ? await askGlm(qaKnowledgeMessages(knowledge, question, readHistory(body)))
        : await askDeepSeek(qaKnowledgeMessages(knowledge, question, readHistory(body)));
    return sendJson(response, 200, { answer });
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
