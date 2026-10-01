"use client";

import React from "react";

export default function AboutPage() {
    return (
        <div className="max-w-3xl space-y-6">
            {/* 返回 */}
            <button
                onClick={() => window.history.back()}
                className="text-sm text-slate-500 transition hover:text-blue-600"
            >
                ← 返回设置
            </button>

            {/* 项目介绍 */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-8 py-10 text-white">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                            🧪
                        </div>

                        <div>
                            <h1 className="text-3xl font-bold">
                                智实验
                            </h1>

                            <p className="mt-1 text-sm text-blue-100">
                                SMART LAB
                            </p >
                        </div>
                    </div>

                    <p className="mt-8 max-w-2xl text-sm leading-7 text-blue-50">
                        大学物理实验智能导师平台，集实验任务、
                        数据处理、拟合分析与智能问答于一体，
                        为大学生提供更加便捷、智能的实验学习体验。
                    </p >
                </div>

                {/* 功能 */}
                <div className="p-8">
                    <h2 className="text-lg font-semibold text-slate-900">
                        平台功能
                    </h2>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <Feature
                            icon="📋"
                            title="实验任务"
                            description="查看和完成教师发布的实验任务"
                        />

                        <Feature
                            icon="📊"
                            title="数据分析"
                            description="自动计算实验数据并进行拟合分析"
                        />

                        <Feature
                            icon="🤖"
                            title="AI 实验助教"
                            description="解答实验原理与数据分析问题"
                        />

                        <Feature
                            icon="📝"
                            title="智能报告"
                            description="辅助生成规范的实验报告"
                        />
                    </div>
                </div>
            </div>

            {/* 项目信息 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                    项目信息
                </h2>

                <div className="mt-5 space-y-4 text-sm">
                    <InfoRow
                        label="平台名称"
                        value="智实验"
                    />

                    <InfoRow
                        label="平台版本"
                        value="v1.0"
                    />

                    <InfoRow
                        label="项目类型"
                        value="大学物理实验智能导师平台"
                    />

                    <InfoRow
                        label="技术栈"
                        value="Next.js · React · Tailwind CSS"
                    />
                </div>
            </div>

            {/* 底部 */}
            <div className="pb-4 text-center text-sm text-slate-400">
                智实验 · 让物理实验更简单、更智能
            </div>
        </div>
    );
}

function Feature({
    icon,
    title,
    description,
}: {
    icon: string;
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-2xl">{icon}</div>

            <p className="mt-3 font-medium text-slate-800">
                {title}
            </p >

            <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
            </p >
        </div>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-6 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
            <span className="text-slate-500">
                {label}
            </span>

            <span className="text-right font-medium text-slate-800">
                {value}
            </span>
        </div>
    );
}