export type ReportRow = {
  id: number;
  task_id: number;
  student_id: string;
  status: "draft" | "submitted" | "graded";
  teacher_score: number | null;
  teacher_comment: string | null;
  ai_suggestion: string | null;
  ai_content: string | null;
  final_content: string | null;
  raw_data: unknown;
  calculation: unknown;
  created_at: string;
  submitted_at: string | null;
  graded_at: string | null;
  tasks: {
    class_id: number;
    classes: { name: string } | null;
    experiments: { name: string } | null;
  } | null;
  users: { name: string } | null;
};

export function reportTitle(report: ReportRow) {
  return report.tasks?.experiments?.name || `实验任务 #${report.task_id}`;
}

export function reportClass(report: ReportRow) {
  return report.tasks?.classes?.name || "班级信息暂不可用";
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function rows(value: unknown) {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

// Preserve measured strings (including trailing zeroes), while rounding computed
// numbers only for display. The original report is never rewritten.
export function displayValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(Number(value.toPrecision(8))) : "—";
  }
  return typeof value === "string" && value.trim() ? value : "—";
}

export function reportData(rawData: unknown, calculation: unknown) {
  const raw = record(rawData);
  const result = record(calculation);
  const fit = record(result.fit);
  const metrics = record(fit.metrics);
  const measuredRows = rows(raw.rows);
  return {
    xLabel: text(raw.xLabel, "X"),
    yLabel: text(raw.yLabel, "Y"),
    measuredRows: measuredRows.length ? measuredRows : rows(raw.validData),
    calculatedRows: rows(result.calculatedRows),
    calculationTitle: text(result.calculationTitle, "计算结果"),
    deriveLabel: text(result.deriveLabel, "计算值"),
    unit: text(result.calculationUnit),
    formula: text(result.formula),
    averageValue: displayValue(result.averageValue),
    model: text(fit.model),
    equation: text(fit.equation),
    parameters: Object.entries(record(fit.parameters)),
    metrics: [
      ["R²", metrics.rSquared],
      ["调整后 R²", metrics.adjustedRSquared],
      ["RMSE", metrics.rmse],
      ["AIC", metrics.aic],
      ["BIC", metrics.bic],
    ].filter(([, value]) => typeof value === "number" && Number.isFinite(value)) as [string, number][],
    warnings: Array.isArray(fit.warnings)
      ? fit.warnings.filter((value): value is string => typeof value === "string" && Boolean(value.trim())) : [],
  };
}
