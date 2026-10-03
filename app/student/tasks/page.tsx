"use client";

import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

type TaskRow = {
  id: number;
  class_id: number;
  experiment_id: number;
  deadline: string | null;
};

type ReportRow = {
  task_id: number;
  status: string;
};

type Task = {
  id: number;
  deadline: string | null;
  className: string;
  experimentName: string;
  status: "pending" | "submitted" | "graded";
};

export default function TasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    async function loadTasks() {
      const supabase = createClient();

      if (!supabase) {
        setError("Supabase 未配置");
        setLoading(false);
        return;
      }

      try {
        // ==========================================
        // 1. 获取当前登录学生
        // ==========================================
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setError("登录状态已失效，请重新登录");
          setLoading(false);
          return;
        }

        // ==========================================
        // 2. 查询任务
        // ==========================================
        const {
          data: taskRows,
          error: taskError,
        } = await supabase
          .from("tasks")
          .select("id, class_id, experiment_id, deadline")
          .order("deadline", { ascending: true });

        if (taskError) {
          throw taskError;
        }

        if (!taskRows || taskRows.length === 0) {
          setTasks([]);
          setLoading(false);
          return;
        }

        const rows = taskRows as TaskRow[];

        // ==========================================
        // 3. 查询当前学生的实验报告
        // ==========================================
        const {
          data: reports,
          error: reportError,
        } = await supabase
          .from("reports")
          .select("task_id, status")
          .eq("student_id", user.id);

        if (reportError) {
          throw reportError;
        }

        const reportRows = (reports ?? []) as ReportRow[];

        // ==========================================
        // 4. 建立 task_id → status 映射
        // ==========================================
        const reportMap = new Map<number, string>();

        reportRows.forEach((report) => {
          reportMap.set(report.task_id, report.status);
        });

        // ==========================================
        // 5. 找出 experiment_id
        // ==========================================
        const experimentIds = [
          ...new Set(rows.map((task) => task.experiment_id)),
        ];

        // ==========================================
        // 6. 找出 class_id
        // ==========================================
        const classIds = [
          ...new Set(rows.map((task) => task.class_id)),
        ];

        // ==========================================
        // 7. 查询实验
        // ==========================================
        const {
          data: experiments,
          error: experimentError,
        } = await supabase
          .from("experiments")
          .select("id, name")
          .in("id", experimentIds);

        if (experimentError) {
          throw experimentError;
        }

        // ==========================================
        // 8. 查询班级
        // ==========================================
        const {
          data: classes,
          error: classError,
        } = await supabase
          .from("classes")
          .select("id, name")
          .in("id", classIds);

        if (classError) {
          throw classError;
        }

        // ==========================================
        // 9. 建立 ID → 名称映射
        // ==========================================
        const experimentMap = new Map(
          (experiments ?? []).map((experiment) => [
            experiment.id,
            experiment.name,
          ])
        );

        const classMap = new Map(
          (classes ?? []).map((item) => [
            item.id,
            item.name,
          ])
        );

        // ==========================================
        // 10. 组装最终任务数据
        // ==========================================
        const result: Task[] = rows.map((task) => {
          const reportStatus = reportMap.get(task.id);

          let status: Task["status"] = "pending";

          if (reportStatus === "submitted") {
            status = "submitted";
          } else if (reportStatus === "graded") {
            status = "graded";
          }

          return {
            id: task.id,
            deadline: task.deadline,
            experimentName:
              experimentMap.get(task.experiment_id) ?? "未命名实验",
            className:
              classMap.get(task.class_id) ?? "未加入班级",
            status,
          };
        });

        console.log("当前学生:", user.id);
        console.log("tasks:", rows);
        console.log("reports:", reports);
        console.log("最终任务数据:", result);

        setTasks(result);
      } catch (err) {
        console.error("加载任务失败:", err);

        if (err instanceof Error) {
          setError("加载任务失败：" + err.message);
        } else {
          setError("加载任务失败");
        }
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <h1 className="text-3xl font-bold text-zinc-900">
        学生任务
      </h1>

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
            {/* 实验名称 */}
            <h2 className="text-xl font-semibold text-zinc-900">
              {task.experimentName}
            </h2>

            {/* 班级名称 */}
            <p className="mt-2 text-zinc-600">
              {task.className}
            </p>

            {/* 任务说明 */}
            <p className="mt-4 text-zinc-700">
              请完成实验数据记录，并提交实验报告。
            </p>

            {/* 截止时间 */}
            {task.deadline && (
              <p className="mt-3 text-sm text-zinc-500">
                截止时间：
                {new Date(task.deadline).toLocaleString("zh-CN")}
              </p>
            )}

            {/* 状态 */}
            <div className="mt-5">
              {task.status === "submitted" && (
                <span className="inline-flex rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                  ✓ 已提交
                </span>
              )}

              {task.status === "graded" && (
                <span className="inline-flex rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                  ✓ 已批改
                </span>
              )}

              {task.status === "pending" && (
                <Link
                  href={`/student/experiment?taskId=${task.id}`}
                  className="inline-block rounded-lg bg-blue-500 px-5 py-2 text-white transition hover:bg-blue-600"
                >
                  开始实验
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}