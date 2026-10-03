import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const supabase = createClient(); let classCount = 0; let taskCount = 0; let pendingCount = 0; let setupMessage = "";
  if (!supabase) setupMessage = "数据库尚未连接。配置 .env.local 并执行 supabase/migrations/001_init.sql 后即可看到真实数据。";
  else {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (user) {
      const [classes,tasks,reports] = await Promise.all([
        supabase.from("classes").select("id",{ count:"exact", head:true }).eq("teacher_id",user.id),
        supabase.from("tasks").select("id",{ count:"exact", head:true }),
        supabase.from("reports").select("id",{ count:"exact", head:true }).eq("status","submitted"),
      ]);
      classCount=classes.count??0; taskCount=tasks.count??0; pendingCount=reports.count??0;
    } else setupMessage="请先登录教师账号，再查看你的班级、任务和待批改报告。";
  }
  return <><header className="topbar"><div><p className="eyebrow">Teacher workspace</p><h1>教师工作台</h1><p className="muted">从实验知识库发布任务，集中检查学生实验报告。</p></div><Link className="button" href="/teacher/tasks/new">发布新任务</Link></header>{setupMessage&&<div className="alert error">{setupMessage}</div>}<section className="grid stats-grid"><div className="card"><div className="stat-label">我的班级</div><div className="stat-value">{classCount}</div></div><div className="card"><div className="stat-label">已发布任务</div><div className="stat-value">{taskCount}</div></div><div className="card"><div className="stat-label">待批改报告</div><div className="stat-value">{pendingCount}</div></div></section><section className="grid two-col"><div className="card"><div className="card-header"><h2>开始使用</h2></div><p className="muted">先创建班级并把邀请码发给学生，然后从实验知识库选择实验、设置截止时间并发布任务。</p><div className="form-actions"><Link className="button secondary" href="/teacher/classes">管理班级</Link><Link className="button secondary" href="/teacher/reports">查看报告</Link></div></div><div className="card"><div className="card-header"><h2>当前版本范围</h2></div><p className="notice">已覆盖班级管理、任务发布、报告筛选、AI 批改建议和教师评分。Excel 上传与复杂实验编辑器可在 MVP 稳定后再加入。</p></div></section></>;
}
