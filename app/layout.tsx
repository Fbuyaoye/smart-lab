import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "智实验 | 大学物理实验智能导师平台",
  description: "大学物理实验教师端与学生端平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
