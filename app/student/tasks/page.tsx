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
  teacher_score: number | null;
  teacher_comment: string | null;
  graded_at: string | null;
};

type Task = {
  id: number;
  deadline: string | null;
  className: string;
  experimentName: string;
  status: "pending" | "submitted" | "graded";
  teacherScore: number | null;
  teacherComment: string | null;
  gradedAt: string | null;
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
          .select(
            "task_id, status, teacher_score, teacher_comment, graded_at"
          )
          .eq("student_id", user.id);

        if (reportError) {
          throw reportError;
        }

        const reportRows = (reports ?? []) as ReportRow[];

        // ==========================================
        // 4. 建立 task_id → report 映射
        // ==========================================
        const reportMap = new Map<number, ReportRow>();

        reportRows.forEach((report) => {
          reportMap.set(report.task_id, report);
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
          const report = reportMap.get(task.id);

          let status: Task["status"] = "pending";

          if (report?.status === "submitted") {
            status = "submitted";
          } else if (report?.status === "graded") {
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
            teacherScore: report?.teacher_score ?? null,
            teacherComment: report?.teacher_comment ?? null,
            gradedAt: report?.graded_at ?? null,
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
      <div className="mx-auto max-w-5xl">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            我的实验任务
          </h1>

          <p className="mt-2 text-zinc-500">
            查看教师布置的实验任务、提交状态和批改结果
          </p>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-zinc-500">
              正在加载任务...
            </p>
          </div>
        )}

        {/* 错误 */}
        {error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-600">
            {error}
          </div>
        )}

        {/* 没有任务 */}
        {!loading && !error && tasks.length === 0 && (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-zinc-500">
              暂时没有实验任务。
            </p>
          </div>
        )}

        {/* 任务列表 */}
        {!loading && !error && tasks.length > 0 && (
          <div className="mt-8 space-y-5">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                {/* 顶部 */}
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900">
                      {task.experimentName}
                    </h2>

                    <p className="mt-2 text-sm text-zinc-500">
                      {task.className}
                    </p>
                  </div>

                  {/* 状态标签 */}
                  <div>
                    {task.status === "pending" && (
                      <span className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">
                        待完成
                      </span>
                    )}

                    {task.status === "submitted" && (
                      <span className="inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                        ✓ 已提交 · 待批改
                      </span>
                    )}

                    {task.status === "graded" && (
                      <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                        ✓ 已批改
                      </span>
                    )}
                  </div>
                </div>

                {/* 任务说明 */}
                <div className="mt-5 rounded-xl bg-zinc-50 p-4">
                  <p className="text-sm leading-6 text-zinc-700">
                    请完成实验数据记录、数据分析和实验报告，并在截止时间前提交。
                  </p>

                  {task.deadline && (
                    <p className="mt-2 text-sm text-zinc-500">
                      截止时间：
                      {new Date(task.deadline).toLocaleString("zh-CN")}
                    </p>
                  )}
                </div>

                {/* ==========================================
                    已批改：显示教师评分
                   ========================================== */}
                {task.status === "graded" && (
                  <div className="mt-5 space-y-4">
                    {/* 评分 */}
                    {task.teacherScore !== null && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                        <div className="text-sm font-medium text-blue-600">
                          教师评分
                        </div>

                        <div className="mt-2 flex items-baseline">
                          <span className="text-4xl font-bold text-blue-800">
                            {task.teacherScore}
                          </span>

                          <span className="ml-2 text-sm text-blue-600">
                            分
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 教师评语 */}
                    <div className="rounded-xl border border-green-100 bg-green-50 p-5">
                      <div className="text-sm font-medium text-green-700">
                        教师评语
                      </div>

                      <p className="mt-2 whitespace-pre-wrap leading-7 text-green-900">
                        {task.teacherComment ||
                          "教师暂未填写评语。"}
                      </p>

                      {task.gradedAt && (
                        <p className="mt-3 text-xs text-green-600">
                          批改时间：
                          {new Date(
                            task.gradedAt
                          ).toLocaleString("zh-CN")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ==========================================
                    底部按钮
                   ========================================== */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {/* 待完成 */}
                  {task.status === "pending" && (
                    <Link
                      href={`/student/experiment?taskId=${task.id}`}
                      className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                      开始实验
                    </Link>
                  )}

                  {/* 已提交 */}
                  {task.status === "submitted" && (
                    <>
                      <Link
                        href={`/student/experiment?taskId=${task.id}`}
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                      >
                        查看实验
                      </Link>

                      <span className="flex items-center rounded-xl bg-zinc-100 px-5 py-2.5 text-sm text-zinc-500">
                        等待教师批改
                      </span>
                    </>
                  )}

                  {/* 已批改 */}
                  {task.status === "graded" && (
                    <>
                      <Link
                        href={`/student/experiment?taskId=${task.id}`}
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                      >
                        查看实验
                      </Link>

                      <Link
                        href={`/student/experiment?taskId=${task.id}`}
                        className="rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                      >
                        查看批改结果
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}