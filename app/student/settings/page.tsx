"use client";

import React from "react";
import { createClient } from "@/lib/supabase/browser";

type UserProfile = {
    name: string | null;
    student_id: string | null;
};

type ClassInfo = {
    id: number;
    name: string;
};

export default function SettingsPage() {
    const [profile, setProfile] = React.useState<UserProfile | null>(null);
    const [classInfo, setClassInfo] = React.useState<ClassInfo | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function loadSettings() {
            const supabase = createClient();

            if (!supabase) {
                setLoading(false);
                return;
            }

            try {
                const {
                    data: { user },
                    error: authError,
                } = await supabase.auth.getUser();

                if (authError) throw authError;
                if (!user) {
                    setLoading(false);
                    return;
                }

                // 获取学生个人信息
                const { data: userProfile, error: profileError } =
                    await supabase
                        .from("users")
                        .select("name, student_id")
                        .eq("id", user.id)
                        .maybeSingle();

                if (profileError) {
                    console.error("读取个人信息失败:", profileError);
                } else {
                    setProfile(userProfile);
                }

                // 获取学生所在班级
                const { data: memberData, error: classError } =
                    await supabase
                        .from("class_members")
                        .select("class_id, classes(id, name)")
                        .eq("student_id", user.id);

                if (classError) {
                    console.error("读取班级信息失败:", classError);
                } else if (memberData && memberData.length > 0) {
                    const firstClass = memberData[0].classes;

                    if (Array.isArray(firstClass)) {
                        setClassInfo(firstClass[0] ?? null);
                    } else {
                        setClassInfo(firstClass ?? null);
                    }
                }
            } catch (error) {
                console.error("加载设置页面失败:", error);
            } finally {
                setLoading(false);
            }
        }

        loadSettings();
    }, []);

    const userName = profile?.name?.trim() || "同学";
    const studentId = profile?.student_id?.trim() || "未设置";

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    设置
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    管理你的账户和智实验使用偏好
                </p>
            </div>

            {/* 个人信息 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                    个人信息
                </h2>

                <div className="mt-5 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                        {userName.charAt(0)}
                    </div>

                    <div>
                        <p className="font-semibold text-slate-900">
                            {loading ? "加载中..." : userName}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            学号：{loading ? "加载中..." : studentId}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            {loading
                                ? "加载中..."
                                : classInfo?.name || "暂未加入班级"}
                        </p>
                    </div>
                </div>
            </div>

            {/* 账户设置 */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        账户设置
                    </h2>
                </div>

                <button
                    onClick={() =>
                    (window.location.href =
                        "/student/settings/password")
                    }
                    className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-slate-50"
                >
                    <div>
                        <p className="font-medium text-slate-800">
                            修改密码
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            修改你的登录密码
                        </p>
                    </div>

                    <span className="text-slate-400">›</span>
                </button>

                <button
                    onClick={() =>
                    (window.location.href =
                        "/student/settings/notifications")
                    }
                    className="flex w-full items-center justify-between border-t border-slate-100 px-6 py-4 text-left transition hover:bg-slate-50"
                >
                    <div>
                        <p className="font-medium text-slate-800">
                            通知设置
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            管理实验任务和系统通知
                        </p>
                    </div>

                    <span className="text-slate-400">›</span>
                </button>
            </div>

            {/* 显示设置 */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        显示设置
                    </h2>
                </div>

                <div className="flex items-center justify-between px-6 py-4">
                    <div>
                        <p className="font-medium text-slate-800">
                            界面主题
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            当前使用浅色主题
                        </p>
                    </div>

                    <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
                        浅色
                    </span>
                </div>
            </div>

            {/* 其他 */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        其他
                    </h2>
                </div>

                <button
                    onClick={() =>
                    (window.location.href =
                        "/student/settings/about")
                    }
                    className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-slate-50"
                >
                    <div>
                        <p className="font-medium text-slate-800">
                            关于智实验
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            大学物理实验智能导师平台
                        </p>
                    </div>

                    <span className="text-slate-400">›</span>
                </button>

                <button
                    onClick={async () => {
                        const supabase = createClient();

                        if (supabase) {
                            await supabase.auth.signOut();
                        }

                        window.location.replace("/login");
                    }}
                    className="flex w-full items-center justify-between border-t border-slate-100 px-6 py-4 text-left transition hover:bg-slate-50"
                >
                    <div>
                        <p className="font-medium text-red-500">
                            退出登录
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            返回登录页面
                        </p>
                    </div>

                    <span className="text-red-300">›</span>
                </button>
            </div>
        </div>
    );
}