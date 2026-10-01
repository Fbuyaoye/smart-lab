import Link from "next/link";

export default function TasksPage() {
  const tasks = [
    {
      name: "测量金属丝的电阻率",
      type: "电学实验",
      deadline: "2026年10月15日",
      status: "进行中",
    },
    {
      name: "验证牛顿第二定律",
      type: "力学实验",
      deadline: "2026年10月20日",
      status: "待完成",
    },
    {
      name: "测量重力加速度",
      type: "力学实验",
      deadline: "2026年10月10日",
      status: "已完成",
    },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <div>
        <p className="text-sm text-slate-400">Student Workspace</p >

        <h1 className="mt-1 text-3xl font-bold text-slate-800">
          我的任务
        </h1>

        <p className="mt-2 text-slate-500">
          查看老师发布的实验任务，并完成你的实验报告。
        </p >
      </div>

      {/* 筛选栏 */}
      <div className="mt-8 flex gap-3">
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
          全部
        </button>

        <button className="rounded-lg bg-white px-4 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50">
          待完成
        </button>

        <button className="rounded-lg bg-white px-4 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50">
          进行中
        </button>

        <button className="rounded-lg bg-white px-4 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50">
          已完成
        </button>
      </div>

      {/* 任务列表 */}
      <div className="mt-6 space-y-4">
        {tasks.map((task) => (
          <div
            key={task.name}
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                {/* 实验图标 */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                  🧪
                </div>

                {/* 实验信息 */}
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    {task.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {task.type}
                  </p >

                  <p className="mt-3 text-sm text-slate-500">
                    截止时间：{task.deadline}
                  </p >
                </div>
              </div>

              {/* 状态 */}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {task.status}
              </span>
            </div>

            {/* 操作按钮 */}
            <div className="mt-5 flex justify-end">
              <Link
                href="/student/experiment"
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700"
              >
                {task.status === "已完成" ? "查看报告 →" : "开始实验 →"}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}