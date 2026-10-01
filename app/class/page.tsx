export default function ClassPage() {
  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <h1 className="text-3xl font-bold">我的班级</h1>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">
          大学物理实验 1 班
        </h2>

        <p className="mt-2 text-zinc-500">
          任课教师：王老师
        </p >

        <p className="mt-4">
          当前班级人数：32 人
        </p >
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">
          加入班级
        </h2>

        <input
          className="mt-4 w-full rounded-lg border border-zinc-300 px-4 py-3"
          placeholder="请输入班级邀请码"
        />

        <button className="mt-4 rounded-lg bg-blue-500 px-5 py-2 text-white">
          加入班级
        </button>
      </div>
    </main>
  );
}