"use client";

import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

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

type ExperimentRow = {
  id: number;
  name: string;
};

type UserRow = {
  name: string | null;
  student_id: string | null;
};

type Task = {
  id: number;
  experimentName: string;
  deadline: string | null;
  status: "pending" | "submitted" | "graded";
};

export default function Home() {
  const router = useRouter();
  console.log("========== 学生首页正在运行 ==========");
  const [studentName, setStudentName] = React.useState("同学");
  const [studentId, setStudentId] = React.useState("");

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  // ==========================================
  // 新增：未登录自动跳转到登录页
  // ==========================================
  React.useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
      }
    }
    checkAuth();
  }, [router]);

  React.useEffect(() => {
    async function loadHomeData() {
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
        // 2. 获取学生基本信息
        // ==========================================
        const {
          data: userInfo,
          error: userInfoError,
        } = await supabase
          .from("users")
          .select("name, student_id")
          .eq("id", user.id)
          .maybeSingle();

        if (userInfoError) {
          throw userInfoError;
        }

        const info = userInfo as UserRow | null;

        if (info?.name) {
          setStudentName(info.name);
        }

        if (info?.student_id) {
          setStudentId(info.student_id);
        }

        // ==========================================
        // 3. 获取任务
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
        // 4. 获取当前学生的报告
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

        const reportMap = new Map<number, string>();

        ((reports ?? []) as ReportRow[]).forEach((report) => {
          reportMap.set(report.task_id, report.status);
        });

        console.log("首页当前用户:", user.id);
        console.log("首页读取到的 reports:", reports);
        console.log("首页 reportMap:", reportMap);

        // ==========================================
        // 5. 获取实验名称
        // ==========================================
        const experimentIds = [
          ...new Set(rows.map((task) => task.experiment_id)),
        ];

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

        const experimentMap = new Map(
          ((experiments ?? []) as ExperimentRow[]).map((experiment) => [
            experiment.id,
            experiment.name,
          ])
        );

        // ==========================================
        // 6. 组装任务
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
            experimentName:
              experimentMap.get(task.experiment_id) ?? "未命名实验",
            deadline: task.deadline,
            status,
          };
        });

        setTasks(result);
      } catch (err) {
        console.error("首页数据加载失败：", err);

        if (err instanceof Error) {
          setError("加载数据失败：" + err.message);
        } else {
          setError("加载数据失败");
        }
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, []);

  // ==========================================
  // 统计数据
  // ==========================================

  const totalCount = tasks.length;

  const completedCount = tasks.filter(
    (task) => task.status === "submitted" || task.status === "graded"
  ).length;

  const pendingCount = tasks.filter(
    (task) => task.status === "pending"
  ).length;

  const recentTasks = tasks.slice(0, 3);

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mx-auto max-w-6xl">

        {/* ========================================== */}
        {/* 欢迎区 */}
        {/* ========================================== */}
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-blue-600">
            大学物理实验智能导师
          </p>

          <h1 className="mt-2 text-3xl font-bold text-zinc-900">
            你好，{studentName} 👋
          </h1>

          {studentId && (
            <p className="mt-2 text-sm text-zinc-500">
              学号：{studentId}
            </p>
          )}

          <p className="mt-4 text-zinc-600">
            欢迎回来，继续完成你的大学物理实验学习任务吧。
          </p>
        </section>

        {/* ========================================== */}
        {/* 错误 */}
        {/* ========================================== */}
        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* ========================================== */}
        {/* 学习概览 */}
        {/* ========================================== */}
        <section className="mt-6">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900">
            学习概览
          </h2>

          <div className="grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-zinc-500">
                全部实验
              </p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">
                {loading ? "-" : totalCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-zinc-500">
                已完成
              </p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {loading ? "-" : completedCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-zinc-500">
                待完成
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {loading ? "-" : pendingCount}
              </p>
            </div>

          </div>
        </section>

        {/* ========================================== */}
        {/* 最近任务 */}
        {/* ========================================== */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900">
              最近任务
            </h2>

            <Link
              href="/student/tasks"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              查看全部任务 →
            </Link>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-6 text-zinc-500 shadow-sm">
              正在加载任务...
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-zinc-500 shadow-sm">
              暂时没有实验任务。
            </div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {task.experimentName}
                    </h3>

                    {task.deadline && (
                      <p className="mt-2 text-sm text-zinc-500">
                        截止时间：
                        {new Date(task.deadline).toLocaleString("zh-CN")}
                      </p>
                    )}
                  </div>

                  <div>
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
                        className="inline-block rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                      >
                        开始实验
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========================================== */}
        {/* 快捷入口 */}
        {/* ========================================== */}
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900">
            快捷入口
          </h2>

          <div className="grid gap-4 md:grid-cols-3">

            <Link
              href="/student/experiment"
              className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-2xl">🧪</div>
              <h3 className="mt-3 font-semibold text-zinc-900">
                开始实验
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                进入当前实验任务
              </p>
            </Link>

            <Link
              href="/student/analysis"
              className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-2xl">📊</div>
              <h3 className="mt-3 font-semibold text-zinc-900">
                数据分析
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                进行实验数据拟合与分析
              </p>
            </Link>

            <Link
              href="/student/class"
              className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-2xl">👥</div>
              <h3 className="mt-3 font-semibold text-zinc-900">
                我的班级
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                查看班级与课程信息
              </p>
            </Link>

          </div>
        </section>

      </div>
    </main>
  );
}