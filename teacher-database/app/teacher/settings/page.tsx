"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const MIN_PASSWORD_LENGTH = 8;

export default function TeacherSettingsPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supabase) {
      setError("尚未配置 Supabase 环境变量，请先检查 .env.local。");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`新密码至少需要 ${MIN_PASSWORD_LENGTH} 个字符。`);
      return;
    }
    if (password !== confirmation) {
      setError("两次输入的新密码不一致。");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message.includes("timed out")
          ? "连接超时，请检查网络后重试。"
          : updateError.message);
        return;
      }
      setPassword("");
      setConfirmation("");
      setMessage("密码修改成功，下次登录请使用新密码。");
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.name === "TimeoutError"
        ? "连接 Supabase 超时，请检查网络后重试。"
        : "无法连接 Supabase，请检查网络连接后重试。");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <header className="topbar">
      <div>
        <p className="eyebrow">Account settings</p>
        <h1>账号设置</h1>
        <p className="muted">修改教师账号的登录密码。</p>
      </div>
    </header>
    <section className="card settings-card">
      <div className="card-header"><h2>修改密码</h2></div>
      {error && <div className="alert error" role="alert">{error}</div>}
      {message && <div className="alert success" role="status">{message}</div>}
      <form className="form" onSubmit={submit} aria-busy={loading}>
        <div className="field">
          <label htmlFor="new-password">新密码</label>
          <input id="new-password" name="new-password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <span className="muted small">至少 {MIN_PASSWORD_LENGTH} 个字符。</span>
        </div>
        <div className="field">
          <label htmlFor="confirm-password">确认新密码</label>
          <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </div>
        <div className="form-actions">
          <button className="button" type="submit" disabled={loading}>{loading ? "保存中…" : "保存新密码"}</button>
          <Link className="button secondary" href="/teacher">返回总览</Link>
        </div>
      </form>
    </section>
  </>;
}
