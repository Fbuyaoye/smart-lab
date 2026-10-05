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

function formatExperimentContent(value:string|null){
  const content=(value??"")
    .replace(/\\#/g,"")
    .replace(/#/g,"")
    .replace(/[\uFEFF\uFFFD]/g,"")
    .replace(/\r\n?/g,"\n")
    .trim();
  return content||"暂无内容";
}

export default function NewTaskPage(){
  const supabase=createClient();const [classes,setClasses]=useState<ClassOption[]>([]);const [experiments,setExperiments]=useState<ExperimentOption[]>([]);const [classId,setClassId]=useState("");const [experimentId,setExperimentId]=useState("");const [deadline,setDeadline]=useState("");const [error,setError]=useState("");const [message,setMessage]=useState("");const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);
  const selectedExperiment=experiments.find((item)=>String(item.id)===experimentId)??null;
  useEffect(()=>{async function load(){if(!supabase){setError("请先配置 Supabase 环境变量。");setLoading(false);return;}const [c,e]=await Promise.all([supabase.from("classes").select("id,name").order("name"),supabase.from("experiments").select("id,name,principle,key_points,procedure,common_issues").order("name")]);if(c.error||e.error)setError(c.error?.message??e.error?.message??"加载数据失败");setClasses((c.data??[]) as ClassOption[]);setExperiments((e.data??[]) as ExperimentOption[]);setLoading(false);}void load();},[]);
  async function publish(event:FormEvent<HTMLFormElement>){event.preventDefault();setError("");setMessage("");if(!supabase){setError("请先配置 Supabase 环境变量。");return;}setSaving(true);const {error:insertError}=await supabase.from("tasks").insert({class_id:Number(classId),experiment_id:Number(experimentId),deadline:deadline?new Date(deadline).toISOString():null});setSaving(false);if(insertError){setError(insertError.message);return;}setMessage("任务发布成功，班级成员现在可以查看。");setClassId("");setExperimentId("");setDeadline("");}
  return <><header className="topbar"><div><p className="eyebrow">Lesson preparation</p><h1>发布实验任务</h1><p className="muted">从实验知识库选择内容，指定班级和截止时间。</p></div></header>{error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}<div className="task-publish-layout"><section className="card"><div className="card-header"><h2>任务信息</h2></div>{loading?<div className="empty">正在加载实验和班级…</div>:<form className="form" onSubmit={publish}><div className="field"><label htmlFor="experiment">实验</label><select id="experiment" required value={experimentId} onChange={(e)=>setExperimentId(e.target.value)}><option value="">请选择实验</option>{experiments.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label htmlFor="class">目标班级</label><select id="class" required value={classId} onChange={(e)=>setClassId(e.target.value)}><option value="">请选择班级</option>{classes.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label htmlFor="deadline">截止时间（可选）</label><input id="deadline" type="datetime-local" value={deadline} onChange={(e)=>setDeadline(e.target.value)} /></div><div className="form-actions"><button className="button" disabled={saving||!classes.length||!experiments.length}>{saving?"发布中…":"发布任务"}</button><Link className="button secondary" href="/teacher">取消</Link></div></form>}</section><aside className="card task-content-preview" aria-live="polite"><div className="card-header"><div><h2>任务具体内容</h2><p className="muted small">选择实验后可在发布前查看内容。</p></div></div>{selectedExperiment?<div className="experiment-detail"><h3>{selectedExperiment.name}</h3><div className="experiment-detail-section"><strong>实验原理</strong><p>{formatExperimentContent(selectedExperiment.principle)}</p></div><div className="experiment-detail-section"><strong>实验要点</strong><p>{formatExperimentContent(selectedExperiment.key_points)}</p></div><div className="experiment-detail-section"><strong>实验步骤</strong><p>{formatExperimentContent(selectedExperiment.procedure)}</p></div><div className="experiment-detail-section"><strong>常见问题</strong><p>{formatExperimentContent(selectedExperiment.common_issues)}</p></div></div>:<div className="empty">请选择一个实验，查看它的原理、要点和步骤。</div>}</aside></div></>;
}
