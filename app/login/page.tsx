"use client";

import React from "react";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
    const supabase = createClient();
    const [studentId, setStudentId] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [error, setError] = React.useState("");

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6">
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">

                {/* 左侧：项目介绍 */}
                <section
                    className="relative hidden overflow-hidden bg-slate-900 p-10 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between"
                    style={{
                        backgroundImage: "url('/image/lab-bg.webp')",
                        backgroundSize: "cover",
                        backgroundPosition: "40% 50%",
                    }}
                >
                    {/* 深色渐变遮罩，让文字更清晰 */}
                    <div className="absolute inset-0 bg-slate-950/60" />


                    {/* 蓝色氛围渐变 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-950/50 via-blue-900/20 to-slate-950/70" />


                    {/* 内容 */}
                    <div className="relative z-10">
                        {/* Logo */}
                        <div className="mb-12 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
                                🧪
                            </div>

                            <div>
                                <div className="text-xl font-bold">
                                    智实验
                                </div>

                                <div className="text-xs text-blue-100">
                                    Smart Lab
                                </div>
                            </div>
                        </div>

                        {/* 主标题 */}
                        <div>
                            <p className="mb-4 text-sm font-medium tracking-[0.2em] text-blue-100">
                                UNIVERSITY PHYSICS LAB
                            </p >

                            <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
                                让物理实验
                                <br />
                                更简单、更智能
                            </h1>

                            <p className="mt-6 max-w-md text-base leading-7 text-blue-100">
                                集实验任务、数据处理、拟合分析与智能报告于一体的大学物理实验学习平台。
                            </p >
                        </div>
                    </div>

                    {/* 底部功能 */}
                    <div className="relative z-10 grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                            <div className="mb-2 text-xl">📊</div>

                            <div className="text-sm font-medium">
                                数据分析
                            </div>

                            <div className="mt-1 text-xs text-blue-100">
                                自动计算与拟合
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                            <div className="mb-2 text-xl">🤖</div>

                            <div className="text-sm font-medium">
                                AI 助教
                            </div>

                            <div className="mt-1 text-xs text-blue-100">
                                智能生成报告
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                            <div className="mb-2 text-xl">🧑‍🔬</div>

                            <div className="text-sm font-medium">
                                实验学习
                            </div>

                            <div className="mt-1 text-xs text-blue-100">
                                全流程辅助
                            </div>
                        </div>
                    </div>
                </section>
                {/* 右侧：登录 */}
                <section className="flex w-full items-center justify-center px-6 py-10 sm:px-12 lg:w-1/2">

                    <div className="w-full max-w-md">

                        {/* 移动端 Logo */}
                        <div className="mb-8 lg:hidden">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl shadow-lg shadow-blue-200">
                                🧪
                            </div>

                            <h1 className="text-3xl font-bold text-slate-900">
                                智实验
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                大学物理实验智能导师平台
                            </p >
                        </div>

                        {/* 登录标题 */}
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                                欢迎回来
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                登录智实验，开始今天的实验学习
                            </p >
                        </div>

                        {/* 表单 */}
                        <div className="space-y-5">

                            {/* 学号 */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    学号
                                </label>

                                <input
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    placeholder="请输入学号"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                />
                            </div>

                            {/* 密码 */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    密码
                                </label>

                                <input
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition
                                    placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"

                                    type="password"

                                    placeholder="请输入密码"

                                    value={password}

                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            {/* 错误提示 */}
                            {error && (
                                <div
                                    className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                                    {error}
                                </div>
                            )}
                            {/* 登录按钮 */}
                            <button
                                className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-medium text-white shadow-lg
                                shadow-blue-200 transition hover:bg-blue-700
                                hover:shadow-xl active:scale-[0.98]"
                                onClick={async () => {
                                    if (studentId === "" || password === "") {
                                        setError("学号或密码不能为空");
                                        return;
                                    }

                                    if (!supabase) {
                                        setError("Supabase 未配置");
                                        return;
                                    }

                                    setError("");

                                    const { error } = await supabase.auth.signInWithPassword({
                                        email: studentId,
                                        password,
                                    });

                                    if (error) {
                                        console.error("登录失败:", error);
                                        setError(error.message);
                                        return;
                                    }

                                    window.location.href = "/student";
                                }}
                            >
                                登录
                            </button>
                        </div>
                        {/* 底部 */}
                        <div className="mt-10 border-t border-slate-100 pt-6 text-center">
                            <p
                                className="text-xs text-slate-400">
                                大学物理实验 · 智能学习助手
                            </p >
                        </div>
                    </div>
                </section>
            </div>
        </main >
    );
}