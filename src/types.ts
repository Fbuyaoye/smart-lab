export type ReviewStatus = "draft" | "submitted" | "graded";
export type ReviewRiskLevel = "low" | "medium" | "high";
export type ReviewTab = "report" | "data" | "ai";

export type AiReview = {
  dataQuality: string;
  calculationConsistency: string;
  conclusionConsistency: string;
  suggestions: string[];
  riskLevel: ReviewRiskLevel;
};

export type TeacherReport = {
  id: string | number;
  studentName: string;
  studentNumber?: string;
  className: string;
  experimentName: string;
  experimentId: string;
  submittedAt?: string;
  status: ReviewStatus;
  rawData: unknown;
  calculation: unknown;
  finalContent: string;
  teacherScore?: number | null;
  teacherComment?: string | null;
  aiReview?: AiReview | null;
};

export type RequestAiReview = (report: TeacherReport) => Promise<{ review: AiReview }>;
export type SaveTeacherReview = (input: { reportId: TeacherReport["id"]; score: number; comment: string; aiReview?: AiReview | null }) => Promise<void>;
