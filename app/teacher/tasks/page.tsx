import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TaskRow = {
  id: number;
  deadline: string | null;
  created_at: string;
  classes: { name: string };
  experiments: { name: string };
};

export default async function TasksPage() {
  const supabase = createClient();
  let tasks: TaskRow[] = [];
  let error = "";
  if (!supabase) {
    error = "数据库尚未连接。配置 .env.local 后即可查看任务。";
  } else {
    const result = await supabase
      .from("tasks")
      .select("id,deadline,created_at,classes!inner(name),experiments!inner(name)")
      .order("created_at", { ascending: false });
    if (result.error) error = result.error.message;
    else tasks = (result.data ?? []) as unknown as TaskRow[];
  }

  return <>
    <header className="topbar"><div><p className="eyebrow">Task management</p><h1>任务管理</h1><p className="muted">查看已发布的实验任务和截止时间。</p></div><Link className="button" href="/teacher/tasks/new">发布新任务</Link></header>
    {error && <div className="alert error">{error}</div>}
    <section className="card"><div className="card-header"><h2>已发布任务</h2><span className="muted small">{tasks.length} 个任务</span></div>
      {tasks.length === 0 ? <div className="empty">还没有发布任务。</div> : <div className="table-wrap"><table><thead><tr><th>实验</th><th>班级</th><th>截止时间</th><th>发布时间</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td><strong>{task.experiments.name}</strong></td><td>{task.classes.name}</td><td>{task.deadline ? new Date(task.deadline).toLocaleString("zh-CN") : "未设置"}</td><td>{new Date(task.created_at).toLocaleString("zh-CN")}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
