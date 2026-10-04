import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReviewModelConfig } from "@/lib/ai/review-config";
import type { AiReview } from "@/lib/teacher-review-toolkit/types";

const MAX_CONTENT_LENGTH = 10_000;
const REVIEW_SYSTEM_PROMPT = "你是一位严谨的大学物理实验教师。请审阅学生实验报告，只输出 JSON，不要给出最终分数或通过结论。JSON 必须包含 dataQuality、calculationConsistency、conclusionConsistency、suggestions（字符串数组）和 riskLevel（low、medium 或 high）五个字段。不要编造学生没有提供的数据，明确区分事实、推断和建议。";

function validReview(value: unknown): value is AiReview {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const review = value as Record<string, unknown>;
  return typeof review.dataQuality === "string"
    && typeof review.calculationConsistency === "string"
    && typeof review.conclusionConsistency === "string"
    && Array.isArray(review.suggestions)
    && review.suggestions.length > 0
    && review.suggestions.every((item) => typeof item === "string" && Boolean(item.trim()))
    && (review.riskLevel === "low" || review.riskLevel === "medium" || review.riskLevel === "high");
}

function parseReviewText(value: unknown): AiReview | null {
  if (validReview(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed: unknown = JSON.parse(text);
    if (validReview(parsed)) return parsed;
  } catch { /* Some compatible providers return a plain-text review. */ }

  const section = (labels: string[], fallback: string) => {
    const start = new RegExp(`(?:${labels.join("|")})\\s*[：:]\\s*`, "i").exec(text);
    if (!start) return fallback;
    const rest = text.slice(start.index + start[0].length);
    const next = /\n\s*(?:数据质量|计算一致性|结论一致性|改进建议|建议)\s*[：:]/i.exec(rest);
    return (next ? rest.slice(0, next.index) : rest).trim() || fallback;
  };
  const suggestionText = section(["改进建议", "建议"], "请结合实验指导书、原始记录和确定性计算结果逐项复核。");
  const suggestions = suggestionText.split(/\n+/).map((item) => item.replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, "").trim()).filter(Boolean);
  return {
    dataQuality: section(["数据质量"], "模型未提供数据质量的结构化说明，请教师结合原始数据复核。"),
    calculationConsistency: section(["计算一致性"], "模型未提供计算一致性的结构化说明，请教师结合计算结果复核。"),
    conclusionConsistency: section(["结论一致性"], "模型未提供结论一致性的结构化说明，请教师结合报告正文复核。"),
    suggestions: suggestions.length ? suggestions.slice(0, 5) : [suggestionText],
    riskLevel: /高风险|重点复核|严重|错误/i.test(text) ? "high" : /需复核|警告|异常/i.test(text) ? "medium" : "low",
  };
}

function rowsFromRawData(rawData: unknown): unknown[] {
  if (Array.isArray(rawData)) return rawData;
  if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
    const rows = (rawData as Record<string, unknown>).rows;
    if (Array.isArray(rows)) return rows;
    const validData = (rawData as Record<string, unknown>).validData;
    if (Array.isArray(validData)) return validData;
  }
  return [];
}

async function readBody(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.experimentId !== "string" || !body.experimentId.trim()) throw new Error("实验标识不能为空。");
  const reportId = body.reportId === undefined ? undefined : Number(body.reportId);
  if (reportId !== undefined && (!Number.isInteger(reportId) || reportId < 1)) throw new Error("reportId 无效。");
  if (body.finalContent !== undefined && (typeof body.finalContent !== "string" || body.finalContent.length > MAX_CONTENT_LENGTH)) throw new Error("报告正文不能超过 10000 个字符。");
  return { reportId, experimentId: body.experimentId.trim(), rawData: body.rawData ?? [], calculation: body.calculation ?? {}, finalContent: typeof body.finalContent === "string" ? body.finalContent.trim() : "" };
}

export async function POST(request: Request) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置。" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录教师账号。" }, { status: 401 });
  const { data: isTeacher, error: roleError } = await supabase.rpc("is_teacher");
  if (roleError || !isTeacher) return NextResponse.json({ error: "只有教师账号可以使用 AI 批改。" }, { status: 403 });

  let input: Awaited<ReturnType<typeof readBody>>;
  try { input = await readBody(request); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "请求参数无效。" }, { status: 400 }); }
  if (input.reportId !== undefined) {
    const { data: report, error: reportError } = await supabase.from("reports").select("id").eq("id", input.reportId).maybeSingle();
    if (reportError || !report) return NextResponse.json({ error: "找不到报告，或你没有查看权限。" }, { status: 404 });
  }

  const serviceUrl = process.env.AI_SERVICE_URL?.trim();
  const serviceToken = process.env.AI_SERVICE_TOKEN?.trim();
  const modelConfig = getReviewModelConfig();
  if (!serviceUrl && !modelConfig) return NextResponse.json({ error: "教师评阅模型尚未配置，请联系管理员。" }, { status: 503 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    let review: AiReview | null = null;
    let provider = "teacher-review-toolkit";
    if (serviceUrl) {
      if (!serviceToken) return NextResponse.json({ error: "AI_SERVICE_TOKEN 尚未配置。" }, { status: 503 });
      const upstream = await fetch(`${serviceUrl.replace(/\/$/, "")}/v1/ai/review`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceToken}` },
        body: JSON.stringify({ experimentId: input.experimentId, rows: rowsFromRawData(input.rawData), studentConclusion: input.finalContent, calculation: input.calculation }), signal: controller.signal, cache: "no-store",
      });
      const payload = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return NextResponse.json({ error: payload.error ?? "AI 服务请求失败。" }, { status: 502 });
      review = parseReviewText(payload.review);
    } else if (modelConfig) {
      provider = modelConfig.provider;
      const upstream = await fetch(modelConfig.endpoint, {
        method: "POST", headers: { "Content-Type": "application/json", ...(modelConfig.apiKey ? { Authorization: `Bearer ${modelConfig.apiKey}` } : {}) },
        body: JSON.stringify({ model: modelConfig.model, stream: false, temperature: 0.2, messages: [
          { role: "system", content: REVIEW_SYSTEM_PROMPT },
          { role: "user", content: `实验标识：${input.experimentId}\n原始数据：${JSON.stringify(input.rawData)}\n计算记录：${JSON.stringify(input.calculation)}\n学生报告：${input.finalContent || "未填写"}` },
        ] }), signal: controller.signal, cache: "no-store",
      });
      const payload = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return NextResponse.json({ error: payload.error?.message ?? `${modelConfig.provider} 请求失败。` }, { status: 502 });
      review = parseReviewText(payload.review ?? payload.choices?.[0]?.message?.content ?? payload.output_text ?? payload.response);
    }
    if (!review) return NextResponse.json({ error: "AI 未返回有效的结构化审阅结果。" }, { status: 502 });
    return NextResponse.json({ review, provider });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.name === "AbortError" ? "教师评阅模型请求超过 30 秒，请稍后重试。" : "教师评阅模型暂时不可用。" }, { status: 502 });
  } finally { clearTimeout(timeout); }
}
