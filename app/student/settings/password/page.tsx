"use client";

import React from "react";
import { createClient } from "@/lib/supabase/browser";

export default function PasswordSettingsPage() {
    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [error, setError] = React.useState("");
    const [success, setSuccess] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("请填写完整信息");
            setSuccess("");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("两次输入的新密码不一致");
            setSuccess("");
            return;
        }

        if (newPassword.length < 6) {
            setError("新密码长度不能少于 6 位");
            setSuccess("");
            return;
        }

        const supabase = createClient();

        if (!supabase) {
            setError("Supabase 未配置");
            setSuccess("");
            return;
        }

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            // 获取当前登录用户
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!user?.email) {
                setError("当前没有登录用户");
                return;
            }

            // 验证当前密码
            const { error: verifyError } =
                await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: currentPassword,
                });

            if (verifyError) {
                setError("当前密码错误");
                return;
            }

            // 修改密码
            const { error: updateError } =
                await supabase.auth.updateUser({
                    password: newPassword,
                });

            if (updateError) {
                console.error("修改密码失败:", updateError);
                setError("密码修改失败：" + updateError.message);
                return;
            }

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            setSuccess("密码修改成功！");
        } catch (err) {
            console.error("修改密码异常:", err);

            if (err instanceof Error) {
                setError("密码修改失败：" + err.message);
            } else {
                setError("密码修改失败，请稍后重试");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-6">
            {/* 返回 */}
            <button
                onClick={() => window.history.back()}
                className="text-sm text-slate-500 transition hover:text-blue-600"
            >
                ← 返回设置
            </button>

            {/* 标题 */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    修改密码
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    修改你的智实验登录密码
                </p>
            </div>

            {/* 表单 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            当前密码
                        </label>

                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) =>
                                setCurrentPassword(e.target.value)
                            }
                            placeholder="请输入当前密码"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            新密码
                        </label>

                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) =>
                                setNewPassword(e.target.value)
                            }
                            placeholder="请输入新密码"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            确认新密码
                        </label>

                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(e.target.value)
                            }
                            placeholder="请再次输入新密码"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                    </div>

                    {error && (
                        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">
                            {success}
                        </div>
                    )}
                </div>

                {/* 按钮 */}
                <div className="mt-8 flex justify-end gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        取消
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "保存中..." : "保存修改"}
                    </button>
                </div>
            </div>

            {/* 提示 */}
            <div className="rounded-2xl bg-blue-50 p-5">
                <p className="text-sm font-medium text-blue-800">
                    密码安全提示
                </p>

                <p className="mt-1 text-sm leading-6 text-blue-600">
                    建议使用包含字母、数字的密码，并避免使用过于简单的密码。
                </p>
            </div>
        </div>
    );
}