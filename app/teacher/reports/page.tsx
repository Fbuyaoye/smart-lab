"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { reportClass, reportTitle, type ReportRow } from "@/lib/reports";
import ReportContent from "./ReportContent";

const statusLabels = { draft: "草稿", submitted: "待批改", graded: "已批改" };
const reportColumns = "id,task_id,student_id,status,teacher_score,teacher_comment,ai_suggestion,ai_content,final_content,raw_data,calculation,created_at,submitted_at,graded_at,users(name),tasks(class_id,classes(name),experiments(name))";

function formatTime(value: string | null) {
  if (!value) return "未提交";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间暂不可用" : date.toLocaleString("zh-CN");
}

export default function ReportsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [score, setScore] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const requestInFlight = useRef<Promise<void> | null>(null);

  const loadReports = useCallback((): Promise<void> => {
    // Manual refresh, focus and polling share one request to avoid stale results.
    if (requestInFlight.current) return requestInFlight.current;
    const request = (async () => {
      setRefreshing(true);
      try {
        if (!supabase) throw new Error("请先配置 Supabase 环境变量。");
        const rows: ReportRow[] = [];
        let offset = 0;
        for (;;) {
          // RLS controls report access. Optional related labels must not hide an
          // otherwise accessible report when a profile or relation is unavailable.
          const { data, error: queryError } = await supabase.from("reports")
            .select(reportColumns)
            .order("id", { ascending: false }).range(offset, offset + 499);
          if (queryError) throw new Error(queryError.message);
          if (!data?.length) break;
          rows.push(...(data as unknown as ReportRow[]));
          // Respect projects configured with a lower API row limit, too.
          offset += data.length;
        }
        const uniqueRows = Array.from(new Map(rows.map(row => [row.id, row])).values());
        uniqueRows.sort((a, b) => {
          const submittedOrder = (b.submitted_at ? Date.parse(b.submitted_at) : 0)
            - (a.submitted_at ? Date.parse(a.submitted_at) : 0);
          return submittedOrder || b.id - a.id;
        });
        setReports(uniqueRows);
        setSelectedId(current => uniqueRows.some(row => row.id === current) ? current : null);
        setLoadError("");
        setLastUpdated(new Date());
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : "报告加载失败，请检查网络后重试。");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    })();
    requestInFlight.current = request;
    void request.finally(() => { requestInFlight.current = null; });
    return request;
  }, [supabase]);

  useEffect(() => {
    void loadReports();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadReports();
    };
    const interval = window.setInterval(refreshWhenVisible, 30000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadReports]);

  const classOptions = useMemo(() => {
    const classes = new Map<number, string>();
    reports.forEach(report => {
      if (report.tasks) classes.set(report.tasks.class_id, reportClass(report));
    });
    return Array.from(classes.entries()).sort(([, a], [, b]) => a.localeCompare(b, "zh-CN"));
  }, [reports]);
  const filtered = useMemo(() => reports.filter(report =>
    (statusFilter === "all" || report.status === statusFilter)
    && (classFilter === "all" || String(report.tasks?.class_id) === classFilter)
  ), [reports, statusFilter, classFilter]);
  const selected = reports.find(report => report.id === selectedId) ?? null;
  const busy = saving || aiLoading;

  function selectReport(report: ReportRow) {
    if (busy) return;
    setSelectedId(report.id);
    setScore(report.teacher_score == null ? "" : String(report.teacher_score));
    setComment(report.teacher_comment ?? "");
    setMessage("");
    setError("");
  }

  async function requestAiCheck() {
    if (!selected || busy || selected.status === "draft") return;
    setAiLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/ai/check-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: selected.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "AI 批改失败");
      // Finish an older poll before applying the saved version.
      await requestInFlight.current;
      setReports(current => current.map(report => report.id === selected.id
        ? { ...report, ai_suggestion: payload.suggestion } : report));
      setMessage("AI 批改建议已生成。");
      await loadReports();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI 请求失败，请检查网络后重试。");
    } finally {
      setAiLoading(false);
    }
  }

  async function saveGrade() {
    if (!supabase || !selected || busy) return;
    setError("");
    setMessage("");
    if (selected.status === "draft") {
      setError("学生尚未提交报告，暂时不能批改。"); return;
    }
    const numericScore = score.trim() === "" ? null : Number(score);
    if (numericScore !== null && (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100)) {
      setError("分数请输入 0 到 100 之间的数字。"); return;
    }
    setSaving(true);
    try {
      const { data, error: updateError } = await supabase.from("reports")
        .update({ teacher_score: numericScore, teacher_comment: comment.trim() || null, status: "graded" })
        .eq("id", selected.id).select("id,status,teacher_score,teacher_comment,graded_at").single();
      if (updateError) throw new Error(updateError.message);
      if (!data) throw new Error("未能保存这份报告，请刷新后重试。");
      await requestInFlight.current;
      setReports(current => current.map(report => report.id === selected.id ? { ...report, ...data } : report));
      setMessage("评分和评语已保存，学生端可查看批改结果。");
      await loadReports();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <header className="topbar">
      <div>
        <p className="eyebrow">Report review</p><h1>报告检查</h1>
        <p className="muted">查看本班学生的实验数据和报告，页面每 30 秒自动刷新。</p>
      </div>
      <button className="button secondary" onClick={() => void loadReports()} disabled={refreshing}>
        {refreshing ? "刷新中…" : "刷新报告"}
      </button>
    </header>
    {loadError && <div className="alert error" role="alert">
      报告刷新失败：{loadError}{lastUpdated && " 当前显示上次成功加载的内容。"}
    </div>}
    {lastUpdated && <p className="muted small" aria-live="polite">
      共 {reports.length} 份报告 · 待批改 {reports.filter(report => report.status === "submitted").length} 份 · 最近更新 {lastUpdated.toLocaleTimeString("zh-CN")}
    </p>}
    {error && <div className="alert error" role="alert">{error}</div>}
    {message && <div className="alert success" role="status">{message}</div>}
    <section className="grid report-layout">
      <div className="card report-list">
        <div className="card-header"><h2>报告列表</h2></div>
        <div className="filter-controls report-filters">
          <label className="sr-only" htmlFor="report-class-filter">按班级筛选</label>
          <select id="report-class-filter" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="all">全部班级</option>
            {classOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <label className="sr-only" htmlFor="report-status-filter">按状态筛选</label>
          <select id="report-status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">全部状态</option><option value="submitted">待批改</option>
            <option value="graded">已批改</option><option value="draft">草稿</option>
          </select>
        </div>
        {loading ? <div className="empty">正在加载…</div> : filtered.length === 0 ? <div className="empty">
          {loadError ? "报告暂时无法加载，请点击刷新报告重试。" : reports.length === 0 ? <>
            <p>暂未收到本班学生的报告。</p>
            <p className="small">若学生已提交，请确认该实验任务属于你管理的班级，并使用发布任务的教师账号登录。</p>
          </> : "暂无符合条件的报告。"}
        </div> : <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">实验 / 班级</th><th scope="col">学生 / 状态</th><th scope="col">提交时间</th></tr></thead>
            <tbody>{filtered.map(report => <tr key={report.id} className={selectedId === report.id ? "report-selected" : undefined}>
              <td>
                <button className="report-select" onClick={() => selectReport(report)} disabled={busy} aria-pressed={selectedId === report.id}>
                  {reportTitle(report)}<span className="sr-only">，{report.users?.name || report.student_id}，报告 #{report.id}</span>
                </button>
                <br /><span className="muted small">{reportClass(report)}</span>
              </td>
              <td>{report.users?.name || report.student_id.slice(0, 8)}<br />
                <span className={`badge ${report.status}`}>{statusLabels[report.status]}</span>
              </td>
              <td className="small">{formatTime(report.submitted_at)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </div>
      <div className="card report-detail">
        <div className="card-header"><h2>报告详情</h2>{selected && <span className={`badge ${selected.status}`}>{statusLabels[selected.status]}</span>}</div>
        {!selected ? <div className="empty">选择报告查看实验数据、正文和批改结果。</div> : <div className="form">
          <div><h3>{reportTitle(selected)}</h3><p className="muted small">{reportClass(selected)} · {selected.users?.name || selected.student_id}</p>
            <p className="muted small">报告 #{selected.id} · 提交时间：{formatTime(selected.submitted_at)}</p>
            {selected.graded_at && <p className="muted small">批改时间：{formatTime(selected.graded_at)}</p>}
          </div>
          <ReportContent rawData={selected.raw_data} calculation={selected.calculation} />
          <section className="report-section"><h3>学生最终报告</h3>
            <div className="report-content report-body">{selected.final_content?.trim() ? selected.final_content : "学生尚未填写最终报告正文。"}</div>
          </section>
          {selected.ai_content && <details className="report-source"><summary>查看学生端 AI 生成稿</summary>
            <div className="report-content report-body">{selected.ai_content}</div>
          </details>}
          {selected.status === "draft" && <p className="notice">这份报告仍是草稿，学生提交后才可批改。</p>}
          <div className="form-actions">
            <button className="button secondary" onClick={requestAiCheck} disabled={busy || selected.status === "draft"}>
              {aiLoading ? "分析中…" : "AI 辅助检查"}
            </button>
          </div>
          {selected.ai_suggestion && <section className="report-section"><h3>AI 批改建议</h3><div className="report-content">{selected.ai_suggestion}</div></section>}
          <div className="field"><label htmlFor="score">教师评分（0–100）</label>
            <input id="score" type="number" min="0" max="100" step="any" value={score} onChange={e => setScore(e.target.value)} disabled={busy || selected.status === "draft"} />
          </div>
          <div className="field"><label htmlFor="comment">教师评语</label>
            <textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} placeholder="填写最终评语和改进建议" disabled={busy || selected.status === "draft"} />
          </div>
          <button className="button" onClick={saveGrade} disabled={busy || selected.status === "draft"}>
            {saving ? "保存中…" : "保存评分和评语"}
          </button>
        </div>}
      </div>
    </section>
  </>;
}
