"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type ExperimentOption={
  id:number;
  name:string;
  principle:string|null;
  key_points:string|null;
  procedure:string|null;
  common_issues:string|null;
};
type ClassOption={id:number;name:string};

type TaskDocumentSection={title:string;content:string;formula?:string|null};

const experimentFormulas: Array<[string, string]> = [
  ["用伏安法测电阻", "U = RI + b"],
  ["单摆", "T² = (4π² / g)L + b"],
  ["薄透镜", "1 / v = -1 / u + 1 / f"],
  ["三棱镜", "n = sin[(A + δmin) / 2] / sin(A / 2)"],
  ["分光计", "n = sin[(A + δmin) / 2] / sin(A / 2)"],
  ["液晶电光效应", "I = I(U)"],
  ["电表改装", "y = kx + b"],
  ["落球法测粘滞系数", "v = [2(ρs - ρl)g / (9η)]r²"],
];

function experimentFormula(name:string){
  return experimentFormulas.find(([keyword])=>name.includes(keyword))?.[1]??null;
}

function formatExperimentContent(value:string|null){
  const content=(value??"")
    .replace(/\\#/g,"")
    .replace(/#/g,"")
    .replace(/[\uFEFF\uFFFD]/g,"")
    .replace(/\$\$?/g,"")
    .replace(/\\\[/g,"")
    .replace(/\\\]/g,"")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g,"($1 / $2)")
    .replace(/\\sqrt\{([^{}]+)\}/g,"√($1)")
    .replace(/\\(times|cdot)/g,"×")
    .replace(/\\(left|right|mathrm|mathbf|displaystyle)/g,"")
    .replace(/\\pi/g,"π")
    .replace(/\\Delta/g,"Δ")
    .replace(/\\(approx|sim)/g,"≈")
    .replace(/\\pm/g,"±")
    .replace(/\\(leq|le)/g,"≤")
    .replace(/\\(geq|ge)/g,"≥")
    .replace(/\\neq/g,"≠")
    .replace(/\\sum/g,"∑")
    .replace(/\\int/g,"∫")
    .replace(/\\(alpha|beta|gamma|theta|lambda|mu|rho|sigma|omega)/g,(_, name:string)=>({alpha:"α",beta:"β",gamma:"γ",theta:"θ",lambda:"λ",mu:"μ",rho:"ρ",sigma:"σ",omega:"ω"}[name]??name))
    .replace(/\\text\{([^{}]+)\}/g,"$1")
    .replace(/\^\{2\}/g,"²")
    .replace(/\^\{3\}/g,"³")
    .replace(/\^2/g,"²")
    .replace(/\^3/g,"³")
    .replace(/[{}]/g,"")
    .replace(/\\n/g,"\n")
    .replace(/\\([a-zA-Z]+)/g,"$1")
    .replace(/\r\n?/g,"\n")
    .normalize("NFC")
    .trim();
  return content||"暂无内容";
}

function taskDocumentSections(experiment:ExperimentOption):TaskDocumentSection[]{
  const principle=formatExperimentContent(experiment.principle);
  const keyPoints=formatExperimentContent(experiment.key_points);
  const procedure=formatExperimentContent(experiment.procedure);
  const commonIssues=formatExperimentContent(experiment.common_issues);
  return [
    {title:"一、实验目的",content:"完成本实验操作，记录实验现象与原始数据，并掌握相应的数据处理方法。"},
    {title:"二、实验原理",content:keyPoints === "暂无内容" ? principle : `${principle}\n\n实验要点：${keyPoints}`,formula:experimentFormula(experiment.name)},
    {title:"三、实验仪器",content:"请根据本次实验实际使用的仪器、型号和量程填写。"},
    {title:"四、实验步骤",content:procedure},
    {title:"五、数据记录与处理",content:"完成实验后填写原始数据、计算过程和拟合分析。"},
    {title:"六、实验结果",content:"完成实验后填写测量结果、单位和有效数字。"},
    {title:"七、误差分析",content:commonIssues === "暂无内容" ? "结合仪器精度、读数、环境和操作过程分析误差来源，并说明改进措施。" : `常见问题：${commonIssues}\n\n请结合本次实验的实际情况分析误差来源，并说明改进措施。`},
    {title:"八、实验结论",content:"请根据本次实验的实际数据归纳结论，避免复制理论结论或夸大结果。"},
  ];
}

export default function NewTaskPage(){
  const supabase=createClient();const [classes,setClasses]=useState<ClassOption[]>([]);const [experiments,setExperiments]=useState<ExperimentOption[]>([]);const [classId,setClassId]=useState("");const [experimentId,setExperimentId]=useState("");const [deadline,setDeadline]=useState("");const [error,setError]=useState("");const [message,setMessage]=useState("");const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);
  const selectedExperiment=experiments.find((item)=>String(item.id)===experimentId)??null;
  const selectedClass=classes.find((item)=>String(item.id)===classId)??null;
  useEffect(()=>{async function load(){if(!supabase){setError("请先配置 Supabase 环境变量。");setLoading(false);return;}const [c,e]=await Promise.all([supabase.from("classes").select("id,name").order("name"),supabase.from("experiments").select("id,name,principle,key_points,procedure,common_issues").order("name")]);if(c.error||e.error)setError(c.error?.message??e.error?.message??"加载数据失败");setClasses((c.data??[]) as ClassOption[]);setExperiments((e.data??[]) as ExperimentOption[]);setLoading(false);}void load();},[]);
  async function publish(event:FormEvent<HTMLFormElement>){event.preventDefault();setError("");setMessage("");if(!supabase){setError("请先配置 Supabase 环境变量。");return;}setSaving(true);const {error:insertError}=await supabase.from("tasks").insert({class_id:Number(classId),experiment_id:Number(experimentId),deadline:deadline?new Date(deadline).toISOString():null});setSaving(false);if(insertError){setError(insertError.message);return;}setMessage("任务发布成功，班级成员现在可以查看。");setClassId("");setExperimentId("");setDeadline("");}
  return <><header className="topbar task-publish-header"><div><p className="eyebrow">Lesson preparation</p><h1>发布实验任务</h1><p className="muted">从实验知识库选择内容，指定班级和截止时间。</p></div><div className="task-header-mark" aria-hidden="true"><span>NEW</span><strong>任务</strong></div></header>{error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}<div className="task-publish-layout"><section className="card task-form-card"><div className="card-header task-form-header"><div><span className="task-section-kicker">TASK SETUP</span><h2>任务信息</h2><p>先选择实验和班级，再设置提交时间。</p></div><span className="task-step-badge">1 / 2</span></div>{loading?<div className="empty">正在加载实验和班级…</div>:<form className="form task-form" onSubmit={publish}><div className="field task-field"><label htmlFor="experiment">实验</label><select className="task-select" id="experiment" required value={experimentId} onChange={(e)=>setExperimentId(e.target.value)}><option value="">请选择实验</option>{experiments.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field task-field"><label htmlFor="class">目标班级</label><select className="task-select" id="class" required value={classId} onChange={(e)=>setClassId(e.target.value)}><option value="">请选择班级</option>{classes.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field task-field deadline-field"><div className="deadline-label-row"><label htmlFor="deadline">截止时间</label><span>可选</span></div><div className="deadline-control"><svg className="deadline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3m10-3v3M4.5 9.5h15M6 5h12a2 2 0 0 1 2 2v11.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"/><path d="M8 13h2m2 0h2m-6 3h2m2 0h2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7"/></svg><input id="deadline" type="datetime-local" value={deadline} onChange={(e)=>setDeadline(e.target.value)} /></div><p className="deadline-hint">设置后，学生将在指定时间前提交实验报告。</p></div><div className="form-actions task-form-actions"><button className="button task-publish-button" disabled={saving||!classes.length||!experiments.length}>{saving?"发布中…":"发布任务"}</button><Link className="button secondary" href="/teacher">取消</Link></div></form>}</section><aside className="card task-content-preview" aria-live="polite">{selectedExperiment?<><div className="card-header"><div><h2>任务具体内容</h2><p className="muted small">学生端 PDF 预览</p></div></div><div className="task-document-shell"><article className="task-document"><header className="task-document-header"><p>大学物理实验</p><h1>实验报告</h1><h2>{selectedExperiment.name}</h2><dl><div><dt>姓名</dt><dd>________</dd></div><div><dt>学号</dt><dd>________</dd></div><div><dt>班级</dt><dd>{selectedClass?.name||"________"}</dd></div><div><dt>指导教师</dt><dd>________</dd></div><div><dt>实验日期</dt><dd>________</dd></div></dl></header><div className="task-document-sections">{taskDocumentSections(selectedExperiment).map((section)=><section key={section.title} className="task-document-section"><h3>{section.title}</h3><p>{section.content}</p>{section.formula&&<div className="task-document-formula"><span>核心公式</span><strong>{formatExperimentContent(section.formula)}</strong></div>}</section>)}</div><footer className="task-document-footer">本报告由学生根据实验原始记录整理，AI 内容须经学生核对。</footer></article></div></>:<div className="task-content-empty"><h2>任务具体内容</h2><p className="muted small">选择实验后可在发布前查看内容。</p><div className="empty">请选择一个实验，查看学生端 PDF 格式的任务内容。</div></div>}</aside></div></>;
}
