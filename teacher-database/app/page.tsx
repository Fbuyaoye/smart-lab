import Link from "next/link";

export default function HomePage() {
  return <main className="login-shell"><section className="login-card"><p className="eyebrow">智实验</p><h1>大学物理实验智能导师平台</h1><p className="muted">教师端 MVP 已准备好，先从登录开始。</p><Link className="button" href="/teacher/login">进入教师端</Link></section></main>;
}
