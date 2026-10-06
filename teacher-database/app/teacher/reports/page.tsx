"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { reportClass, reportTitle, type ReportRow } from "@/lib/reports";
import { TeacherReviewWorkbench } from "@/lib/teacher-review-toolkit/TeacherReviewWorkbench";
import { createAiReviewClient } from "@/lib/teacher-review-toolkit/client";
import type { AiReview, TeacherReport } from "@/lib/teacher-review-toolkit/types";

const reportColumns = "id,task_id,student_id,status,teacher_score,teacher_comment,ai_suggestion,ai_content,final_content,raw_data,calculation,created_at,submitted_at,graded_at,users(name),tasks(class_id,classes(name),experiments(id,name,knowledge_id))";
const legacyReportColumns = "id,task_id,student_id,status,teacher_score,teacher_comment,ai_suggestion,ai_content,final_content,raw_data,calculation,created_at,submitted_at,graded_at,users(name),tasks(class_id,classes(name),experiments(id,name))";

const experimentKnowledgeIds: Record<string, string> = {
  "用伏安法测电阻": "voltammetry", "单摆法测重力加速度": "simple-pendulum-gravity", "薄透镜焦距测量": "thin-lens-focal-length",
  "光电效应": "photoelectric-effect", "伏安特性": "voltammetry", "霍尔效应": "hall-effect",
  "空气比热容比的测定": "air-specific-heat-ratio", "示波器的使用": "oscilloscope", "液晶电光效应": "liquid-crystal-electro-optic",
  "拉伸法测杨氏模量": "tensile-young-modulus", "动力学法测杨氏模量": "dynamic-young-modulus", "电位差计": "potentiometer",
  "弗兰克-赫兹实验": "franck-hertz", "磁滞回线": "hysteresis-loop", "牛顿环、劈尖": "newtons-rings-wedge",
  "光栅衍射实验": "grating-diffraction", "分光计的使用": "spectrometer", "电表改装": "meter-modification",
  "落球法测粘滞系数": "falling-ball-viscosity", "三线摆、扭摆实验": "trifilar-torsion-pendulum", "声速测量": "speed-of-sound",
  "波尔共振": "forced-resonance", "磁场测量（霍尔法）": "hall-magnetic-field",
};

type ExperimentInfo = { id: number; name: string; knowledge_id?: string | null };

function experimentId(report: ReportRow): string {
  const experiment = report.tasks?.experiments as (ExperimentInfo | null) | null;
  // The AI knowledge base owns the stable IDs. Prefer the explicit course-name
  // mapping so older seed rows cannot send a local-only ID to the AI service.
  return experimentKnowledgeIds[experiment?.name ?? ""] || experiment?.knowledge_id?.trim() || `supabase-experiment-${experiment?.id ?? report.task_id}`;
}

function parseAiReview(value: string | null): AiReview | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const review = parsed as Record<string, unknown>;
    if (typeof review.dataQuality !== "string" || typeof review.calculationConsistency !== "string" || typeof review.conclusionConsistency !== "string"
      || !Array.isArray(review.suggestions) || !review.suggestions.every((item) => typeof item === "string") || !["low", "medium", "high"].includes(String(review.riskLevel))) return null;
    return { dataQuality: review.dataQuality, calculationConsistency: review.calculationConsistency, conclusionConsistency: review.conclusionConsistency, suggestions: review.suggestions as string[], riskLevel: review.riskLevel as AiReview["riskLevel"] };
  } catch { return null; }
}

function toTeacherReport(report: ReportRow): TeacherReport {
  return {
    id: report.id, studentName: report.users?.name || report.student_id.slice(0, 8), className: reportClass(report), experimentName: reportTitle(report), experimentId: experimentId(report),
    submittedAt: report.submitted_at ? new Date(report.submitted_at).toLocaleString("zh-CN") : undefined, status: report.status, rawData: report.raw_data, calculation: report.calculation,
    finalContent: report.final_content ?? "", teacherScore: report.teacher_score, teacherComment: report.teacher_comment, aiReview: parseAiReview(report.ai_suggestion),
  };
}

export default function ReportsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestInFlight = useRef<Promise<void> | null>(null);

  const loadReports = useCallback((): Promise<void> => {
    if (requestInFlight.current) return requestInFlight.current;
    const request = (async () => {
      setRefreshing(true);
      try {
        if (!supabase) throw new Error("请先配置 Supabase 环境变量。");
        const rows: ReportRow[] = [];
        let offset = 0;
        let columns = reportColumns;
        for (;;) {
          let response = await supabase.from("reports").select(columns).order("id", { ascending: false }).range(offset, offset + 499);
          if (response.error && columns === reportColumns) {
            columns = legacyReportColumns;
            response = await supabase.from("reports").select(columns).order("id", { ascending: false }).range(offset, offset + 499);
          }
          if (response.error) throw new Error(response.error.message);
          if (!response.data?.length) break;
          rows.push(...(response.data as unknown as ReportRow[]));
          offset += response.data.length;
        }
        const uniqueRows = Array.from(new Map(rows.map((row) => [row.id, row])).values());
        uniqueRows.sort((a, b) => (b.submitted_at ? Date.parse(b.submitted_at) : 0) - (a.submitted_at ? Date.parse(a.submitted_at) : 0) || b.id - a.id);
        setReports(uniqueRows); setLoadError(""); setLastUpdated(new Date());
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : "报告加载失败，请检查网络后重试。");
      } finally { setLoading(false); setRefreshing(false); }
    })();
    requestInFlight.current = request;
    void request.finally(() => { requestInFlight.current = null; });
    return request;
  }, [supabase]);

  useEffect(() => {
    void loadReports();
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void loadReports(); };
    const interval = window.setInterval(refreshWhenVisible, 30000);
    window.addEventListener("focus", refreshWhenVisible); document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refreshWhenVisible); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, [loadReports]);

  const teacherReports = useMemo(() => reports.map(toTeacherReport), [reports]);
  const requestAiReview = useMemo(() => createAiReviewClient("/api/ai/review", async () => {
    if (!supabase) return undefined;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }), [supabase]);

  async function saveTeacherReview(input: { reportId: string | number; score: number; comment: string; aiReview?: AiReview | null }) {
    if (!supabase) throw new Error("请先配置 Supabase 环境变量。");
    const current = reports.find((report) => report.id === Number(input.reportId));
    const aiSuggestion = input.aiReview ? JSON.stringify(input.aiReview) : current?.ai_suggestion ?? null;
    const { data, error } = await supabase.from("reports").update({ teacher_score: input.score, teacher_comment: input.comment, ai_suggestion: aiSuggestion, status: "graded" })
      .eq("id", Number(input.reportId)).select("id,status,teacher_score,teacher_comment,ai_suggestion,graded_at").single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("未能保存这份报告，请刷新后重试。");
    setReports((currentReports) => currentReports.map((report) => report.id === Number(input.reportId) ? { ...report, ...data } : report));
  }

  return <>
    <header className="topbar"><div><p className="eyebrow">Report review</p><h1>报告检查</h1><p className="muted">使用 teacher-review-toolkit 检查实验报告，AI 只提供审阅建议，最终评分由教师确认。</p></div><button className="button secondary" onClick={() => void loadReports()} disabled={refreshing}>{refreshing ? "刷新中…" : "刷新报告"}</button></header>
    {loadError && <div className="alert error" role="alert">报告刷新失败：{loadError}{lastUpdated && " 当前显示上次成功加载的内容。"}</div>}
    {lastUpdated && <p className="muted small">共 {reports.length} 份报告 · 最近更新 {lastUpdated.toLocaleTimeString("zh-CN")}</p>}
    {loading ? <div className="card empty">正在加载报告…</div> : teacherReports.length ? <TeacherReviewWorkbench reports={teacherReports} requestAiReview={requestAiReview} onSave={saveTeacherReview} /> : <div className="card empty">暂未收到本班学生的报告。</div>}
  </>;
}
