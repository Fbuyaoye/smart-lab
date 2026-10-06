import { useMemo, useState } from "react";
import { createAiReviewClient } from "./client";
import { filterReports, normalizeScore, reviewStats, statusLabel } from "./review";
import type { AiReview, RequestAiReview, ReviewStatus, ReviewTab, SaveTeacherReview, TeacherReport } from "./types";
import "./review.css";

export type TeacherReviewWorkbenchProps = {
  reports: TeacherReport[];
  requestAiReview?: RequestAiReview;
  onSave?: SaveTeacherReview;
};

const RISK_LABELS = { low: "低风险", medium: "需复核", high: "重点复核" } as const;

function json(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

const reportSectionTitles: Record<string, string> = {
  "实验目的": "一、实验目的",
  "实验原理": "二、实验原理",
  "实验仪器与装置": "三、实验仪器",
  "实验仪器": "三、实验仪器",
  "实验步骤": "四、实验步骤",
  "数据处理与分析": "五、数据记录与处理",
  "数据记录与处理": "五、数据记录与处理",
  "实验结果": "六、实验结果",
  "误差分析": "七、误差分析",
  "实验结论": "八、实验结论",
};

function reportSections(content: string) {
  const sections: Array<{ title: string; content: string }> = [];
  const marker = /【([^】]+)】/g;
  const matches = Array.from(content.matchAll(marker));
  if (!matches.length) return sections;
  matches.forEach((match, index) => {
    const rawTitle = match[1].trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? content.length;
    sections.push({
      title: reportSectionTitles[rawTitle] ?? rawTitle,
      content: content.slice(start, end).trim(),
    });
  });
  return sections;
}

function StudentReportDocument({ report }: { report: TeacherReport }) {
  const sections = reportSections(report.finalContent);
  return <article className="teacher-review-paper teacher-review-document">
    <header className="teacher-review-document-header">
      <p>大学物理实验</p>
      <h3>实验报告</h3>
      <h4>{report.experimentName}</h4>
      <dl>
        <div><dt>姓名</dt><dd>{report.studentName}</dd></div>
        <div><dt>班级</dt><dd>{report.className}</dd></div>
      </dl>
    </header>
    {sections.length ? <div className="teacher-review-document-sections">{sections.map((section, index) => <section key={`${section.title}-${index}`}>
      <h5>{section.title}</h5>
      <p>{section.content || "暂无内容"}</p>
    </section>)}</div> : <p className="teacher-review-document-fallback">{report.finalContent || "学生尚未填写最终实验报告。"}</p>}
    <footer>本报告由学生根据实验原始记录整理，AI 内容须经学生核对。</footer>
  </article>;
}

export function TeacherReviewWorkbench({ reports, requestAiReview = createAiReviewClient(), onSave }: TeacherReviewWorkbenchProps) {
  const [status, setStatus] = useState<ReviewStatus | "all">("submitted");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<TeacherReport["id"] | null>(reports[0]?.id ?? null);
  const [tab, setTab] = useState<ReviewTab>("report");
  const [localReviews, setLocalReviews] = useState<Record<string, AiReview | undefined>>({});
  const [score, setScore] = useState("");
  const [comment, setComment] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => filterReports(reports, status, query), [reports, status, query]);
  const selected = reports.find((report) => report.id === selectedId) ?? filtered[0] ?? null;
  const activeReview = selected ? localReviews[String(selected.id)] ?? selected.aiReview ?? null : null;
  const stats = useMemo(() => reviewStats(reports), [reports]);

  const selectReport = (report: TeacherReport) => {
    setSelectedId(report.id);
    setScore(report.teacherScore == null ? "" : String(report.teacherScore));
    setComment(report.teacherComment ?? "");
    setTab("report");
    setError("");
    setNotice("");
  };

  const runAiReview = async () => {
    if (!selected || selected.status === "draft") return;
    setReviewing(true); setError(""); setNotice("");
    try {
      const { review } = await requestAiReview(selected);
      setLocalReviews((current) => ({ ...current, [String(selected.id)]: review }));
      setTab("ai");
      setNotice("AI 审阅建议已生成，最终评分仍需教师确认。 ");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI 审阅请求失败，请稍后重试。");
    } finally { setReviewing(false); }
  };

  const save = async () => {
    if (!selected) return;
    if (selected.status === "draft") { setError("学生尚未提交报告，暂时不能批改。 "); return; }
    const numericScore = normalizeScore(score);
    if (numericScore === null) { setError("请填写 0 到 100 的有效分数。 "); return; }
    if (!comment.trim()) { setError("请填写教师评语后再保存。 "); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      await onSave?.({ reportId: selected.id, score: numericScore, comment: comment.trim(), aiReview: activeReview });
      setNotice("教师评分与评语已保存。 ");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败，请稍后重试。 ");
    } finally { setSaving(false); }
  };

  return (
    <section className="teacher-review" aria-label="教师作业批改工作台">
      <header className="teacher-review-header">
        <div><p>作业批改</p><h1>实验报告批改</h1><span>AI 审阅用于定位问题，最终评分与评语由教师确认。</span></div>
        <div className="teacher-review-header-metrics">
          <span><b>{stats.pending}</b> 待批改</span><span><b>{stats.graded}</b> 已完成</span>
        </div>
      </header>
      {error && <div className="teacher-review-alert error" role="alert">{error}</div>}
      {notice && <div className="teacher-review-alert success" role="status">{notice}</div>}

      <div className="teacher-review-layout">
        <aside className="teacher-review-queue">
          <div className="teacher-review-queue-header"><h2>报告队列</h2><span>{filtered.length} 份</span></div>
          <input className="teacher-review-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学生、班级或实验" aria-label="搜索报告" />
          <div className="teacher-review-filters" role="tablist" aria-label="报告状态筛选">
            {(["submitted", "graded", "draft", "all"] as const).map((item) => <button key={item} type="button" className={status === item ? "active" : ""} onClick={() => setStatus(item)}>{item === "all" ? "全部" : statusLabel(item)}</button>)}
          </div>
          <div className="teacher-review-list">
            {filtered.map((report) => <button key={report.id} type="button" className={`teacher-review-row ${selected?.id === report.id ? "selected" : ""}`} onClick={() => selectReport(report)}>
              <span className="teacher-review-row-top"><strong>{report.studentName}</strong><em className={`teacher-review-status ${report.status}`}>{statusLabel(report.status)}</em></span>
              <span>{report.experimentName}</span><small>{report.className} · {report.submittedAt ?? "未提交"}</small>
            </button>)}
            {!filtered.length && <p className="teacher-review-empty">暂无符合条件的报告。</p>}
          </div>
        </aside>

        <main className="teacher-review-detail">
          {!selected ? <div className="teacher-review-empty">从左侧选择一份报告开始批改。</div> : <>
            <header className="teacher-review-detail-header">
              <div><p>{selected.className} · {selected.studentNumber || "未填写学号"}</p><h2>{selected.studentName}的《{selected.experimentName}》</h2><span>{selected.submittedAt ? `提交于 ${selected.submittedAt}` : "尚未提交"}</span></div>
              <div className="teacher-review-detail-actions">
                <button type="button" className="teacher-review-button secondary" disabled={selected.status === "draft" || reviewing} onClick={() => void runAiReview()}>{reviewing ? "审阅中..." : "AI 审阅"}</button>
                <button type="button" className="teacher-review-button primary" disabled={selected.status === "draft" || saving} onClick={() => void save()}>{saving ? "保存中..." : "保存批改"}</button>
              </div>
            </header>
            <nav className="teacher-review-tabs" aria-label="报告审阅视图">
              <button className={tab === "report" ? "active" : ""} onClick={() => setTab("report")}>报告正文</button>
              <button className={tab === "data" ? "active" : ""} onClick={() => setTab("data")}>数据与计算</button>
              <button className={tab === "ai" ? "active" : ""} onClick={() => setTab("ai")}>AI 审阅{activeReview && <i />}</button>
            </nav>

            {tab === "report" && <StudentReportDocument report={selected} />}
            {tab === "data" && <div className="teacher-review-data-grid"><article><h3>原始数据</h3><pre>{json(selected.rawData)}</pre></article><article><h3>计算结果</h3><pre>{json(selected.calculation)}</pre></article></div>}
            {tab === "ai" && <AiReviewPanel review={activeReview} />}

            <section className="teacher-review-grade"><div><h3>教师评分</h3><p>评分提交后由教师负责，AI 仅作为审阅参考。</p></div><div className="teacher-review-grade-fields"><label>分数<input value={score} inputMode="decimal" placeholder="0 - 100" onChange={(event) => setScore(event.target.value)} /></label><label>教师评语<textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="说明评分依据、需改进之处和后续建议。" /></label></div></section>
          </>}
        </main>
      </div>
    </section>
  );
}

function AiReviewPanel({ review }: { review: AiReview | null }) {
  if (!review) return <div className="teacher-review-empty">点击“AI 审阅”后，将显示数据、计算与结论的一致性检查。AI 不会输出最终分数。</div>;
  return <section className="teacher-review-ai"><header><div><h3>结构化审阅建议</h3><p>每项建议应由教师结合实验指导书和原始记录复核。</p></div><span className={`teacher-review-risk ${review.riskLevel}`}>{RISK_LABELS[review.riskLevel]}</span></header><div className="teacher-review-ai-grid"><article><h4>数据质量</h4><p>{review.dataQuality}</p></article><article><h4>计算一致性</h4><p>{review.calculationConsistency}</p></article><article><h4>结论一致性</h4><p>{review.conclusionConsistency}</p></article></div><article className="teacher-review-suggestions"><h4>可执行改进建议</h4><ol>{review.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ol></article></section>;
}
