import type { ReviewStatus, TeacherReport } from "./types";

export function filterReports(reports: TeacherReport[], status: ReviewStatus | "all", query: string): TeacherReport[] {
  const normalized = query.trim().toLowerCase();
  return reports.filter((report) => {
    const statusMatches = status === "all" || report.status === status;
    const text = `${report.studentName} ${report.studentNumber ?? ""} ${report.className} ${report.experimentName}`.toLowerCase();
    return statusMatches && (!normalized || text.includes(normalized));
  });
}

export function reviewStats(reports: TeacherReport[]): { submitted: number; graded: number; pending: number } {
  const submitted = reports.filter((report) => report.status === "submitted").length;
  const graded = reports.filter((report) => report.status === "graded").length;
  return { submitted, graded, pending: submitted };
}

export function normalizeScore(value: string): number | null {
  if (!value.trim()) return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

export function statusLabel(status: ReviewStatus): string {
  return status === "submitted" ? "待批改" : status === "graded" ? "已批改" : "草稿";
}
