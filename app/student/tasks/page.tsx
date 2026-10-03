"use client";

import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

type Task = {
  id: number;
  deadline: string | null;
  classes: {
    name: string;
  }[];
  experiments: {
    id: number;
    name: string;
    principle: string | null;
    key_points: string | null;
    procedure: string | null;
  }[];
};

export default function TasksPage() {
  const supabase = createClient();

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    async function loadTasks() {
      if (!supabase) {
        setError("Supabase 未配置");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          deadline,
          classes(name),
          experiments(
            id,
            name,
            principle,
            key_points,
            procedure
          )
        `)
        .order("deadline", { ascending: true });

      if (error) {
        console.error("加载任务失败:", error);
        setError("加载任务失败：" + error.message);
      } else {
        setTasks((data ?? []) as Task[]);
      }

      setLoading(false);
    }

    loadTasks();
  }, [supabase]);

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <h1 className="text-3xl font-bold">学生任务</h1>

      {loading && (
        <p className="mt-6 text-zinc-500">
          正在加载任务...
        </p>
      )}

      {error && (
        <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <p className="text-zinc-500">
            暂时没有实验任务。
          </p>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-2xl bg-white p-6 shadow"
          >
            <h2 className="text-xl font-semibold">
              {task.experiments?.[0]?.name ?? "未命名实验"}
            </h2>

            <p className="mt-2 text-zinc-500">
              {task.classes?.[0]?.name ?? "未加入班级"}
            </p>

            <p className="mt-4">
              请完成实验数据记录，并提交实验报告。
            </p>

            {task.deadline && (
              <p className="mt-3 text-sm text-zinc-500">
                截止时间：
                {new Date(task.deadline).toLocaleString("zh-CN")}
              </p>
            )}

            <Link
              href={`/student/experiment?taskId=${task.id}`}
              className="mt-6 inline-block rounded-lg bg-blue-500 px-5 py-2 text-white"
            >
              开始实验
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}