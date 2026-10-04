import type { RequestAiReview, TeacherReport } from "./types";

export function createAiReviewClient(endpoint = "/api/ai/review"): RequestAiReview {
  return async (report: TeacherReport) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experimentId: report.experimentId, rawData: report.rawData, calculation: report.calculation, finalContent: report.finalContent }),
    });
    const payload = await response.json().catch(() => ({})) as { review?: unknown; error?: unknown };
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "AI 审阅请求失败，请稍后重试。");
    if (!isAiReview(payload.review)) throw new Error("AI 未返回有效的结构化审阅结果。");
    return { review: payload.review };
  };
}

function isAiReview(value: unknown): value is NonNullable<TeacherReport["aiReview"]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.dataQuality === "string"
    && typeof item.calculationConsistency === "string"
    && typeof item.conclusionConsistency === "string"
    && Array.isArray(item.suggestions)
    && item.suggestions.every((suggestion) => typeof suggestion === "string")
    && (item.riskLevel === "low" || item.riskLevel === "medium" || item.riskLevel === "high");
}
