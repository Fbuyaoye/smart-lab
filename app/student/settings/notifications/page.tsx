"use client";

import React from "react";

export default function NotificationsPage() {
    const [settings, setSettings] = React.useState({
        task: true,
        deadline: true,
        report: true,
        system: false,
    });

    const [saved, setSaved] = React.useState(false);

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));

        setSaved(false);
    };

    const handleSave = () => {
        setSaved(true);
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
                    通知设置
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    管理实验任务和系统通知
                </p >
            </div>

            {/* 通知设置 */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="font-semibold text-slate-900">
                        通知提醒
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        选择你希望接收的通知类型
                    </p >
                </div>

                <NotificationItem
                    title="实验任务提醒"
                    description="有新的实验任务发布时通知我"
                    enabled={settings.task}
                    onClick={() => toggleSetting("task")}
                />

                <NotificationItem
                    title="截止日期提醒"
                    description="实验任务即将截止时提醒我"
                    enabled={settings.deadline}
                    onClick={() => toggleSetting("deadline")}
                />

                <NotificationItem
                    title="AI 实验报告"
                    description="AI 实验报告生成完成后通知我"
                    enabled={settings.report}
                    onClick={() => toggleSetting("report")}
                />

                <NotificationItem
                    title="系统通知"
                    description="接收智实验平台的重要系统消息"
                    enabled={settings.system}
                    onClick={() => toggleSetting("system")}
                    last
                />
            </div>

            {/* 保存 */}
            <div className="flex items-center justify-between">
                <div>
                    {saved && (
                        <p className="text-sm text-green-600">
                            ✓ 设置已保存
                        </p >
                    )}
                </div>

                <button
                    onClick={handleSave}
                    className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                    保存设置
                </button>
            </div>
        </div>
    );
}

function NotificationItem({
    title,
    description,
    enabled,
    onClick,
    last = false,
}: {
    title: string;
    description: string;
    enabled: boolean;
    onClick: () => void;
    last?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-between px-6 py-5 ${
                !last ? "border-b border-slate-100" : ""
            }`}
        >
            <div className="pr-6">
                <p className="font-medium text-slate-800">
                    {title}
                </p >

                <p className="mt-1 text-sm text-slate-500">
                    {description}
                </p >
            </div>

            <button
                type="button"
                onClick={onClick}
                aria-label={`切换${title}`}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    enabled ? "bg-blue-600" : "bg-slate-300"
                }`}
            >
                <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                        enabled ? "left-6" : "left-1"
                    }`}
                />
            </button>
        </div>
    );
}