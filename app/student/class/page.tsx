"use client";

import React from "react";
import { createClient } from "@/lib/supabase/browser";

type ClassInfo = {
    id: number;
    name: string;
    teacher_id: string | null;
};

export default function ClassPage() {
    const [classInfo, setClassInfo] = React.useState<ClassInfo | null>(null);
    const [inviteCode, setInviteCode] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [joining, setJoining] = React.useState(false);
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");

    React.useEffect(() => {
        async function loadClass() {
            const supabase = createClient();

            if (!supabase) {
                setError("Supabase 未配置");
                setLoading(false);
                return;
            }

            try {
                // 获取当前登录学生
                const {
                    data: { user },
                    error: authError,
                } = await supabase.auth.getUser();

                if (authError) throw authError;

                if (!user) {
                    setError("当前没有登录用户");
                    setLoading(false);
                    return;
                }

                // 查询当前学生加入的班级
                const { data, error: classError } = await supabase
                    .from("class_members")
                    .select(
                        "class_id, classes(id, name, teacher_id)"
                    )
                    .eq("student_id", user.id);

                if (classError) throw classError;

                if (!data || data.length === 0) {
                    setClassInfo(null);
                    setLoading(false);
                    return;
                }

                const firstClass = data[0].classes;

                if (Array.isArray(firstClass)) {
                    setClassInfo(firstClass[0] ?? null);
                } else {
                    setClassInfo(firstClass ?? null);
                }
            } catch (err) {
                console.error("加载班级失败:", err);

                if (err instanceof Error) {
                    setError("加载班级失败：" + err.message);
                } else {
                    setError("加载班级失败");
                }
            } finally {
                setLoading(false);
            }
        }

        loadClass();
    }, []);

    async function handleJoinClass() {
        if (!inviteCode.trim()) {
            setError("请输入班级邀请码");
            return;
        }

        const supabase = createClient();

        if (!supabase) {
            setError("Supabase 未配置");
            return;
        }

        setJoining(true);
        setError("");
        setMessage("");

        try {
            const { error: joinError } = await supabase.rpc(
                "join_class",
                {
                    p_invite_code: inviteCode.trim(),
                }
            );

            if (joinError) {
                console.error("加入班级失败:", joinError);
                setError("加入班级失败：" + joinError.message);
                return;
            }

            setMessage("加入班级成功！");
            setInviteCode("");

            // 重新读取班级
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { data, error: classError } = await supabase
                .from("class_members")
                .select(
                    "class_id, classes(id, name, teacher_id)"
                )
                .eq("student_id", user.id);

            if (classError) throw classError;

            if (data && data.length > 0) {
                const firstClass = data[0].classes;

                if (Array.isArray(firstClass)) {
                    setClassInfo(firstClass[0] ?? null);
                } else {
                    setClassInfo(firstClass ?? null);
                }
            }
        } catch (err) {
            console.error("加入班级异常:", err);

            if (err instanceof Error) {
                setError("加入班级失败：" + err.message);
            } else {
                setError("加入班级失败");
            }
        } finally {
            setJoining(false);
        }
    }

    return (
        <main className="min-h-screen bg-zinc-100 p-8">
            <h1 className="text-3xl font-bold text-slate-800">我的班级</h1>

            {loading && (
                <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                    <p className="text-zinc-500">
                        正在加载班级信息...
                    </p>
                </div>
            )}

            {!loading && error && (
                <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-6 text-red-600">
                    {error}
                </div>
            )}

            {!loading && !error && classInfo && (
                <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                    <h2 className="text-xl font-semibold text-zinc-800">
                        {classInfo.name}
                    </h2>

                    <p className="mt-2 text-zinc-600">
                        任课教师：{classInfo.teacher_id || "暂未设置"}
                    </p>

                    <p className="mt-4 text-slate-700">
                        当前已加入该班级
                    </p>
                </div>
            )}

            {!loading && !error && !classInfo && (
                <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                    <h2 className="text-xl font-semibold text-zinc-800">
                        暂未加入班级
                    </h2>

                    <p className="mt-2 text-slate-700">
                        请使用老师提供的班级邀请码加入班级。
                    </p>
                </div>
            )}

            {message && (
                <div className="mt-6 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-600">
                    {message}
                </div>
            )}

            <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                <h2 className="text-xl font-semibold text-zinc-800">
                    加入班级
                </h2>

                <input
                    className="mt-4 w-full rounded-lg border border-zinc-300 px-4 py-3"
                    placeholder="请输入班级邀请码"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                />

                <button
                    className="mt-4 rounded-lg bg-blue-500 px-5 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleJoinClass}
                    disabled={joining}
                >
                    {joining ? "加入中..." : "加入班级"}
                </button>
            </div>
        </main>
    );
}