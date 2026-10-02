"use client";
//import React from "react";
import Link from "next/link";
//import{createClient}from"@/lib/supabase/browser";
const Tasks = [
  {
    title: "测量金属丝的电阻率",
    description: "请完成实验数据记录，并提交实验报告。",
    experiment: "大学物理实验 · 第一次实验",
  },
  {
    title: "验证牛顿第二定律",
    description: "完成实验数据采集，并分析实验结果。",
    experiment: "大学物理实验 · 第二次实验",
  },
  {
    title: "测量重力加速度",
    description: "完成实验并提交实验报告。",
    experiment: "大学物理实验 · 第三次实验",
  },
];

export default function TasksPage() {
 // const supabase = createClient();
  //const[tasks,setTasks]=React.useState<any[]>([]);
  //const[loading,setLoading]=React.useState(true);
   // React.useEffect(() => {
   // async function loadTasks() {
   //   const { data, error } = await supabase
   //     .from("tasks")
   //     .select(`
   //       id,
   //       deadline,
   //       classes(name),
   //       experiments(id, name, principle, key_points, procedure)
   //     `)
   //     .order("deadline", { ascending: true });

   //   if (error) {
    //    console.error("加载任务失败:", error);
     // } else {
    //    setTasks(data ?? []);
    //  }

    //  setLoading(false);
   // }

  //  loadTasks();
 // }, []);
  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <h1 className="text-3xl font-bold">学生任务</h1>

      <div className="mt-6 space-y-4">
        {Tasks.map((task) => (
          <div
            key={task.title}
            className="rounded-2xl bg-white p-6 shadow"
          >
            <h2 className="text-xl font-semibold">
              {task.title}
            </h2>

            <p className="mt-2 text-zinc-500">
              {task.experiment}
            </p >

            <p className="mt-4">
              {task.description}
            </p >

            <Link
             href="/student/experiment"
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