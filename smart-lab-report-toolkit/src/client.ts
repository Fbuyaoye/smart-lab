import type { GenerateReport, GenerateReportInput, ReportSectionKey } from "./types";

export function createReportClient(endpoint = "/api/ai/report"): GenerateReport {
  return async (input: GenerateReportInput) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = await response.json().catch(() => ({})) as { draft?: unknown; error?: unknown };
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "AI 报告生成失败，请稍后重试。");
    if (typeof payload.draft === "string") return { draft: parseDraftText(payload.draft) };
    if (typeof payload.draft === "object" && payload.draft !== null) return { draft: payload.draft as Partial<Record<ReportSectionKey, string>> };
    throw new Error("AI 没有返回有效的报告草稿。");
  };
}

function parseDraftText(draft: string): Partial<Record<ReportSectionKey, string>> {
  return { dataAnalysis: draft.trim() };
}
