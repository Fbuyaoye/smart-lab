export type ReportSectionKey = "purpose" | "principle" | "apparatus" | "procedure" | "dataAnalysis" | "results" | "errorAnalysis" | "conclusion";

export type ReportSection = { key: ReportSectionKey; title: string; content: string };

export type ReportMetadata = {
  experimentName: string;
  courseName: string;
  studentName: string;
  studentNumber: string;
  className: string;
  teacherName: string;
  experimentDate: string;
};

export type ReportDraft = {
  metadata: ReportMetadata;
  sections: ReportSection[];
  rawData: Array<{ x: number | string; y: number | string }>;
  analysisSummary: string;
};

export type GenerateReportInput = {
  experimentId?: string;
  metadata: ReportMetadata;
  rawData: Array<{ x: number | string; y: number | string }>;
  analysisSummary: string;
  studentNotes: string;
};

export type GenerateReport = (input: GenerateReportInput) => Promise<{ draft: Partial<Record<ReportSectionKey, string>> }>;
