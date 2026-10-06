import type { GenerateReportInput, ReportDraft, ReportMetadata, ReportSection, ReportSectionKey } from "./types";

const SECTION_TITLES: Array<[ReportSectionKey, string]> = [
  ["purpose", "一、实验目的"],
  ["principle", "二、实验原理"],
  ["apparatus", "三、实验仪器"],
  ["procedure", "四、实验步骤"],
  ["dataAnalysis", "五、数据记录与处理"],
  ["results", "六、实验结果"],
  ["errorAnalysis", "七、误差分析"],
  ["conclusion", "八、实验结论"],
];

export function defaultMetadata(experimentName = "大学物理实验"): ReportMetadata {
  return { experimentName, courseName: "大学物理实验", studentName: "", studentNumber: "", className: "", teacherName: "", experimentDate: new Date().toISOString().slice(0, 10) };
}

export function createReportDraft(input: GenerateReportInput, generated: Partial<Record<ReportSectionKey, string>> = {}): ReportDraft {
  const dataRows = input.rawData.length ? input.rawData.map((row, index) => `${index + 1}. x = ${row.x}，y = ${row.y}`).join("；") : "尚未录入原始数据。";
  const fallback: Record<ReportSectionKey, string> = {
    purpose: "在教师指导下完成实验操作，记录实验现象与原始数据，并掌握相应的数据处理方法。",
    principle: "请依据本实验指导书补充实验原理、物理模型和相关公式；不要使用未经确认的公式或参数。",
    apparatus: "请如实填写本次实验实际使用的仪器、型号和量程。",
    procedure: "请按实际操作顺序记录关键步骤、控制条件和观察现象。",
    dataAnalysis: `${dataRows}\n\n${input.analysisSummary || "尚未生成数据分析结果。"}`,
    results: "请结合原始数据和计算结果，写明测得量、单位及有效数字。",
    errorAnalysis: "请结合仪器精度、读数、环境和操作过程分析误差来源，并说明改进措施。",
    conclusion: "请根据本次实验的实际数据归纳结论，避免复制理论结论或夸大结果。",
  };
  const sections: ReportSection[] = SECTION_TITLES.map(([key, title]) => ({ key, title, content: generated[key]?.trim() || fallback[key] }));
  return { metadata: input.metadata, sections, rawData: input.rawData, analysisSummary: input.analysisSummary };
}

export function safePdfFilename(experimentName: string, studentName: string): string {
  const base = `${experimentName}-${studentName || "实验报告"}`.replace(/[\\/:*?"<>|]/g, "-").trim();
  return `${base || "实验报告"}.pdf`;
}
