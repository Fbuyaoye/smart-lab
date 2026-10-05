"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { getSupabaseConfig, getSupabaseConfigurationError } from "@/lib/supabase/config";

const accessMessages: Record<string, string> = {
  "teacher-only": "该账号已登录，但还没有教师权限。请让管理员把 public.users.role 设置为 teacher，然后退出并重新登录。",
  "role-check-failed": "登录成功，但服务器无法查询教师权限。请检查 Supabase 连接和 is_teacher 函数权限。",
  "auth-check-failed": "登录成功，但服务器无法验证会话。请检查 Supabase 连接后重试。",
  "auth-service-unavailable": "登录已成功，但服务器暂时无法连接 Supabase。请刷新页面重试；如果仍失败，请检查服务器网络。",
  "session-missing": "登录会话没有保存，请确认浏览器允许 localhost Cookie 后重试。",
};

export default function TeacherLoginPage() {
  const supabase = createClient();
  const supabaseConfig = getSupabaseConfig();
  const configurationError = getSupabaseConfigurationError();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("error");
    setAccessError(reason ? accessMessages[reason] ?? `登录后检查失败（${reason}）。` : "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAccessError("");
    if (!supabase) {
      setError(configurationError);
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        const retryable = signInError.name === "AuthRetryableFetchError"
          || /failed to fetch|fetch failed|network|connect|dns|timeout/i.test(signInError.message);
        setError(signInError.message.includes("timed out")
          ? "连接超时，请检查网络后重试。"
          : retryable
            ? `无法连接 Supabase 登录服务（${supabaseConfig.url}）。请确认项目未暂停、当前网络可以访问该地址，并在修改环境变量后重启或重新部署教师端。`
            : signInError.code === "invalid_credentials" || signInError.message === "Invalid login credentials"
              ? "邮箱或密码不正确，请重新输入。"
              : signInError.message);
        return;
      }
      // A new document request reads the saved session cookies and displays
      // any middleware redirect error, even when it returns to this same page.
      window.location.replace("/teacher");
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.name === "TimeoutError" ? "连接 Supabase 超时，请检查网络后重试。" : "无法连接 Supabase，请检查网络连接后重试。");
    } finally {
      setLoading(false);
    }
  }

  const visibleError = configurationError || error || accessError;
  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">教师端登录</p>
        <h1>欢迎回来</h1>
        <p className="muted">使用教师账号登录，管理实验课程。</p>
        {visibleError && <div className="alert error" role="alert">{visibleError}</div>}
        <form className="form" onSubmit={submit} aria-busy={loading}>
          <div className="field">
            <label htmlFor="email">邮箱</label>
            <input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">密码</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <button className="button" type="submit" disabled={loading || !supabase}>{loading ? "登录中…" : "登录教师端"}</button>
        </form>
        <p className="muted small" style={{ marginTop:20 }}><Link href="/">返回首页</Link></p>
      </section>
    </main>
  );
}
