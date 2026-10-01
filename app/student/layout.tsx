import Link from "next/link";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 左侧导航栏 */}
      <aside className="w-64 bg-white border-r border-slate-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600">
            🧪 智实验
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            大学物理实验智能导师
          </p >
        </div>

        <nav className="px-4 space-y-2">
          <Link
            href="/student"
            className="block rounded-lg px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
          >
            🏠 首页
          </Link>

          <Link
            href="/student/tasks"
            className="block rounded-lg px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
          >
            📋 我的任务
          </Link>

          <Link
            href="/student/experiment"
            className="block rounded-lg px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
          >
            🧪 实验
          </Link>

          <Link
            href="/student/analysis"
            className="block rounded-lg px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
          >
            📊 数据分析
          </Link>

          <Link
            href="/student/qa"
            className="block rounded-lg px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
          >
            💬 知识问答
          </Link>

          <Link
            href="/student/class"
            className="block rounded-lg px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
          >
            👥 我的班级
          </Link>

          <Link
            href="/student/settings"
            className="block rounded-lg px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
          >
            ⚙️ 设置
          </Link>
        </nav>
      </aside>

      {/* 右侧区域 */}
      <div className="flex flex-1 flex-col">
        {/* 顶部栏 */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
          <div>
            <p className="text-sm text-slate-400">
              大学物理实验智能导师平台
            </p >
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
              👤
            </div>

            <span className="text-sm font-medium text-slate-700">
              张三同学
            </span>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}