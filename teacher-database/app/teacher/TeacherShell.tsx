"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default function TeacherShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/teacher/login") return <>{children}</>;

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><strong>智实验</strong><span>教师工作台</span></div><nav className="nav" aria-label="教师端导航"><Link href="/teacher">总览</Link><Link href="/teacher/classes">班级管理</Link><Link href="/teacher/tasks">任务管理</Link><Link href="/teacher/tasks/new">发布任务</Link><Link href="/teacher/reports">报告检查</Link><Link href="/teacher/settings">账号设置</Link></nav><div className="sidebar-footer"><LogoutButton /><span>大学物理实验智能导师平台</span></div></aside><main className="main"><div className="content">{children}</div></main></div>;
}
