import { useMemo, useRef, useState } from "react";
import { createReportClient } from "./client";
import { exportReportPdf } from "./pdf";
import { createReportDraft, defaultMetadata } from "./report";
import type { GenerateReport, ReportDraft, ReportMetadata, ReportSectionKey } from "./types";
import "./report.css";

export type ExperimentReportWorkbenchProps = {
  experimentId?: string;
  experimentName?: string;
  rawData?: Array<{ x: number | string; y: number | string }>;
  analysisSummary?: string;
  generate?: GenerateReport;
};

const sectionHelp: Record<ReportSectionKey, string> = {
  purpose: "写明本次实验实际要测量、验证或掌握的内容。",
  principle: "写入已审核的物理原理、公式与变量含义。",
  apparatus: "逐项填写本次实际使用的仪器、型号和量程。",
  procedure: "按真实操作顺序叙述，保留关键控制条件。",
  dataAnalysis: "列出数据处理方法、拟合结果、单位与有效数字。",
  results: "写明最终测量结果及不确定度或误差表达。",
  errorAnalysis: "结合实际操作与仪器条件分析误差来源及改进办法。",
  conclusion: "结论必须基于本次实验数据，不照抄理论结论。",
};

export function ExperimentReportWorkbench({
  experimentId,
  experimentName = "大学物理实验",
  rawData = [],
  analysisSummary = "尚未接入数据分析结果。",
  generate = createReportClient(),
}: ExperimentReportWorkbenchProps) {
  const [metadata, setMetadata] = useState<ReportMetadata>(() => defaultMetadata(experimentName));
  const [studentNotes, setStudentNotes] = useState("");
  const [draft, setDraft] = useState<ReportDraft>(() => createReportDraft({ experimentId, metadata: defaultMetadata(experimentName), rawData, analysisSummary, studentNotes: "" }));
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  const currentDraft = useMemo(() => ({ ...draft, metadata }), [draft, metadata]);

  const updateMetadata = (key: keyof ReportMetadata, value: string) => setMetadata((current) => ({ ...current, [key]: value }));
  const updateSection = (key: ReportSectionKey, content: string) => setDraft((current) => ({
    ...current,
    sections: current.sections.map((section) => section.key === key ? { ...section, content } : section),
  }));

  const generateDraft = async () => {
    setGenerating(true);
    setStatus("");
    try {
      const response = await generate({ experimentId, metadata, rawData, analysisSummary, studentNotes });
      setDraft(createReportDraft({ experimentId, metadata, rawData, analysisSummary, studentNotes }, response.draft));
      setStatus("AI 草稿已生成，请逐段核对后再导出。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "AI 报告生成失败，请稍后重试。");
    } finally {
      setGenerating(false);
    }
  };

  const resetDraft = () => {
    setDraft(createReportDraft({ experimentId, metadata, rawData, analysisSummary, studentNotes }));
    setStatus("已恢复为报告模板。 ");
  };

  const downloadPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    setStatus("");
    try {
      await exportReportPdf(reportRef.current, metadata.experimentName, metadata.studentName);
      setStatus("PDF 已下载。 ");
    } catch {
      setStatus("PDF 导出失败，请检查浏览器是否允许下载。 ");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="report-workbench" aria-label="实验报告工作台">
      <header className="report-workbench-header">
        <div>
          <p>AI 实验报告</p>
          <h1>实验报告工作台</h1>
          <span>生成后请核对实验事实、原始数据、单位和结论。</span>
        </div>
        <div className="report-workbench-actions">
          <button type="button" className="report-button report-button-secondary" onClick={resetDraft}>恢复模板</button>
          <button type="button" className="report-button report-button-primary" onClick={() => void generateDraft()} disabled={generating}>
            {generating ? "生成中..." : "生成 AI 草稿"}
          </button>
          <button type="button" className="report-icon-button" onClick={() => void downloadPdf()} disabled={exporting} title="下载 PDF" aria-label="下载 PDF">
            {exporting ? "..." : "↓"}
          </button>
        </div>
      </header>

      {status && <p className="report-status" role="status">{status}</p>}

      <div className="report-workbench-layout">
        <aside className="report-sidebar">
          <h2>报告信息</h2>
          <div className="report-field-grid">
            <label>实验名称<input value={metadata.experimentName} onChange={(event) => updateMetadata("experimentName", event.target.value)} /></label>
            <label>课程名称<input value={metadata.courseName} onChange={(event) => updateMetadata("courseName", event.target.value)} /></label>
            <label>学生姓名<input value={metadata.studentName} onChange={(event) => updateMetadata("studentName", event.target.value)} /></label>
            <label>学号<input value={metadata.studentNumber} onChange={(event) => updateMetadata("studentNumber", event.target.value)} /></label>
            <label>班级<input value={metadata.className} onChange={(event) => updateMetadata("className", event.target.value)} /></label>
            <label>指导教师<input value={metadata.teacherName} onChange={(event) => updateMetadata("teacherName", event.target.value)} /></label>
            <label>实验日期<input type="date" value={metadata.experimentDate} onChange={(event) => updateMetadata("experimentDate", event.target.value)} /></label>
          </div>
          <label className="report-notes">实验补充记录<textarea value={studentNotes} maxLength={4000} onChange={(event) => setStudentNotes(event.target.value)} placeholder="填写本次实际操作、环境条件、观察现象和需要 AI 协助整理的要点。" /></label>
          <div className="report-guardrail"><strong>生成边界</strong><span>AI 草稿不代替原始记录、教师审核或最终实验结论。</span></div>
        </aside>

        <div className="report-editor-shell">
          <div className="report-page" ref={reportRef}>
            <header className="report-document-header">
              <p>{metadata.courseName || "大学物理实验"}</p>
              <h1>实验报告</h1>
              <h2>{metadata.experimentName || "未命名实验"}</h2>
              <dl>
                <div><dt>姓名</dt><dd>{metadata.studentName || "________"}</dd></div>
                <div><dt>学号</dt><dd>{metadata.studentNumber || "________"}</dd></div>
                <div><dt>班级</dt><dd>{metadata.className || "________"}</dd></div>
                <div><dt>指导教师</dt><dd>{metadata.teacherName || "________"}</dd></div>
                <div><dt>实验日期</dt><dd>{metadata.experimentDate || "________"}</dd></div>
              </dl>
            </header>
            <div className="report-document-sections">
              {currentDraft.sections.map((section) => (
                <section key={section.key} className="report-section">
                  <h3>{section.title}</h3>
                  <p className="report-section-hint">{sectionHelp[section.key]}</p>
                  <textarea aria-label={section.title} value={section.content} onChange={(event) => updateSection(section.key, event.target.value)} />
                </section>
              ))}
            </div>
            <footer className="report-document-footer">本报告由学生根据实验原始记录整理，AI 内容须经学生核对。</footer>
          </div>
        </div>
      </div>
    </section>
  );
}
