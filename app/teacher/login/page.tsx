"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function TeacherLoginPage() {
  const router = useRouter(); const supabase = createClient();
  const [email,setEmail] = useState(""); const [password,setPassword] = useState(""); const [error,setError] = useState(""); const [loading,setLoading] = useState(false);
  const [accessError,setAccessError] = useState("");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "teacher-only") {
      setAccessError("该账号已登录，但还没有教师权限。请让管理员把 public.users.role 设置为 teacher，然后退出并重新登录。");
    }
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); if (!supabase) { setError("尚未配置 Supabase 环境变量，请先复制 .env.example 为 .env.local。"); return; }
    setLoading(true); const { error: signInError } = await supabase.auth.signInWithPassword({ email, password }); setLoading(false);
    if (signInError) { setError(signInError.message); return; } router.push("/teacher"); router.refresh();
  }
  return <main className="login-shell"><section className="login-card"><p className="eyebrow">教师端登录</p><h1>欢迎回来</h1><p className="muted">使用 Supabase Auth 创建的教师账号登录。</p>{(error || accessError) && <div className="alert error">{error || accessError}</div>}<form className="form" onSubmit={submit}><div className="field"><label htmlFor="email">邮箱</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div><div className="field"><label htmlFor="password">密码</label><input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div><button className="button" disabled={loading}>{loading ? "登录中…" : "登录教师端"}</button></form><p className="muted small" style={{ marginTop:20 }}><Link href="/">返回首页</Link></p></section></main>;
}
