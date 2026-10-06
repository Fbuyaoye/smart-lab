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

type Experiment = {
  id: number;
  name: string;
};

type UserProfile = {
  name: string | null;
  student_id: string | null;
};

type ReportRow = {
  task_id: number;
  status: string;
};

type Task = {
  id: number;
  name: string;
  type: string;
  deadline: string | null;
  status: string;
};

/* =========================================================
   根据实验名称返回对应图标
   ========================================================= */

function getExperimentIcon(name: string) {
  if (name.includes("伏安") || name.includes("电阻")) {
    return "⚡";
  }

  if (name.includes("单摆") || name.includes("重力")) {
    return "⏱️";
  }

  if (name.includes("透镜") || name.includes("焦距")) {
    return "🔍";
  }

  if (name.includes("分光计") || name.includes("三棱镜")) {
    return "🌈";
  }

  if (name.includes("液晶") || name.includes("电光")) {
    return "💡";
  }

  if (name.includes("电表") || name.includes("改装")) {
    return "📟";
  }

  if (name.includes("落球") || name.includes("粘滞")) {
    return "⚙️";
  }

  return "🧪";
}

/* =========================================================
   格式化截止时间
   ========================================================= */

function formatDeadline(deadline: string | null) {
  if (!deadline) {
    return "未设置";
  }

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return "未设置";
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   首页
   ========================================================= */

export default function StudentHomePage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);

  const [userName, setUserName] = React.useState("");
  const [studentId, setStudentId] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    async function loadPage() {
      const supabase = createClient();

      if (!supabase) {
        setError("Supabase 未配置");
        setLoading(false);
        return;
      }

      try {
        /* =====================================================
           1. 获取当前登录用户
           ===================================================== */

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          setError("当前没有登录用户");
          setLoading(false);
          return;
        }

        /* =====================================================
           2. 获取学生信息
           ===================================================== */

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("users")
          .select("name, student_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("读取学生信息失败:", profileError);

          setUserName("同学");
          setStudentId("");
        } else if (profile) {
          const userProfile = profile as UserProfile;

          setUserName(
            userProfile.name?.trim() || "同学"
          );

          setStudentId(
            userProfile.student_id?.trim() || ""
          );
        } else {
          setUserName("同学");
          setStudentId("");
        }

        /* =====================================================
           3. 查询实验任务
           ===================================================== */

        const {
          data: taskRows,
          error: taskError,
        } = await supabase
          .from("tasks")
          .select(
            "id, class_id, experiment_id, deadline"
          )
          .order("deadline", {
            ascending: true,
            nullsFirst: false,
          });

        if (taskError) {
          throw taskError;
        }

        if (!taskRows || taskRows.length === 0) {
          setTasks([]);
          setLoading(false);
          return;
        }

        const rows = taskRows as TaskRow[];

        /* =====================================================
   4. 获取当前学生的实验报告
   ===================================================== */

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

        const experimentIds = [
          ...new Set(
            rows.map(
              (task) => task.experiment_id
            )
          ),
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

        /* =====================================================
           5. 建立实验 ID → 实验名称映射
           ===================================================== */

        const experimentMap = new Map<
          number,
          string
        >(
          ((experiments ?? []) as Experiment[]).map(
            (experiment) => [
              experiment.id,
              experiment.name,
            ]
          )
        );

        /* =====================================================
           6. 组装首页任务数据
           ===================================================== */

        const result: Task[] = rows.map((task) => {
          const reportStatus = reportMap.get(task.id);

          let status = "待完成";

          if (reportStatus === "submitted") {
            status = "已提交";
          } else if (reportStatus === "graded") {
            status = "已批改";
          }

          return {
            id: task.id,

            name:
              experimentMap.get(task.experiment_id) ?? "未命名实验",

            type: "大学物理实验",

            deadline: task.deadline,

            status,
          };
        });

        setTasks(result);
      } catch (err) {
        console.error(
          "加载学生首页失败:",
          err
        );

        if (err instanceof Error) {
          setError(
            "加载页面失败：" + err.message
          );
        } else {
          setError("加载页面失败");
        }
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, []);

  /* =========================================================
     首页统计
     ========================================================= */

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) =>
      task.status === "已提交" ||
      task.status === "已批改"
  ).length;

  const pendingTasks = tasks.filter(
    (task) => task.status === "待完成"
  ).length;
  // 首页只展示最近的 3 个任务，
  // 完整任务列表交给「我的任务」页面。
  const recentTasks = tasks.slice(0, 3);

  /* =========================================================
     Loading
     ========================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">
              正在加载学习信息……
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =========================================================
     Error
     ========================================================= */

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <div className="font-semibold">
              加载失败
            </div>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =========================================================
     页面
     ========================================================= */

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">

        {/* ===================================================
            欢迎区域
        =================================================== */}

        <section>
          <p className="text-sm font-medium text-blue-600">
            Student Workspace
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {userName
                ? `你好，${userName} 👋`
                : "你好，同学 👋"}
            </h1>

            {studentId && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 shadow-sm">
                学号：{studentId}
              </span>
            )}
          </div>

          <p className="mt-2 text-slate-500">
            欢迎回来，继续完成你的大学物理实验。
          </p>
        </section>

        {/* ===================================================
            学习概览
        =================================================== */}

        <section className="mt-8 grid gap-4 md:grid-cols-3">

          <OverviewCard
            title="待完成实验"
            value={String(pendingTasks)}
            description="等待完成的实验任务"
            icon="📝"
          />

          <OverviewCard
            title="已完成实验"
            value={String(completedTasks)}
            description="已提交或完成的实验"
            icon="✅"
          />

          <OverviewCard
            title="实验总数"
            value={String(totalTasks)}
            description="当前可用的实验任务"
            icon="🧪"
          />

        </section>

        {/* ===================================================
            最近任务
        =================================================== */}

        <section className="mt-8">

          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                最近实验任务
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                快速进入最近需要完成的实验
              </p>
            </div>

            <Link
              href="/student/tasks"
              className="shrink-0 text-sm font-medium text-blue-600 transition hover:text-blue-700"
            >
              查看全部任务 →
            </Link>
          </div>

          {recentTasks.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-4xl">
                📚
              </div>

              <h3 className="mt-3 font-semibold text-slate-800">
                暂时没有实验任务
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                老师发布实验任务后，会显示在这里。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">

                    {/* 左侧实验信息 */}

                    <div className="flex min-w-0 gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                        {getExperimentIcon(
                          task.name
                        )}
                      </div>

                      <div className="min-w-0">

                        <h3 className="truncate text-lg font-semibold text-slate-900">
                          {task.name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {task.type}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          截止时间：
                          <span className="ml-1 font-medium text-slate-700">
                            {formatDeadline(
                              task.deadline
                            )}
                          </span>
                        </p>

                      </div>
                    </div>

                    {/* 状态 */}

                    <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      {task.status}
                    </span>
                  </div>

                  {/* 操作 */}

                  <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">

                    <Link
                      href={`/student/experiment?taskId=${task.id}`}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                      {task.status === "待完成"
                        ? "开始实验 →"
                        : task.status === "已提交"
                          ? "已提交"
                          : "已批改"}
                    </Link>

                  </div>
                </div>
              ))}
            </div>
          )}

        </section>

        {/* ===================================================
            快捷入口
        =================================================== */}

        <section className="mt-8">

          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              快捷入口
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              快速进入常用功能
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">

            <QuickLink
              href="/student/experiment"
              icon="🧪"
              title="开始实验"
              description="进入当前实验并记录实验数据"
            />

            <QuickLink
              href="/student/analysis"
              icon="📊"
              title="数据分析"
              description="使用曲线拟合工具分析实验数据"
            />

            <QuickLink
              href="/student/class"
              icon="👥"
              title="我的班级"
              description="查看班级信息和实验安排"
            />

          </div>

        </section>

      </div>
    </main>
  );
}

/* =========================================================
   学习概览卡片
   ========================================================= */

function OverviewCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-xl">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   快捷入口卡片
   ========================================================= */

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start gap-4">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl transition group-hover:bg-blue-100">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

      </div>
    </Link>
  );
}