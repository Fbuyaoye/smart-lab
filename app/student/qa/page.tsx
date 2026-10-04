"use client";

import React from "react";
import { createClient } from "@/lib/supabase/browser";
type Message = {
    role: "user" | "assistant";
    content: string;
};

export default function KnowledgeQA() {
    const [question, setQuestion] = React.useState("");
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [experimentName, setExperimentName] = React.useState("");
    const [knowledgeId, setKnowledgeId] = React.useState("");
    const supabase = createClient();

    React.useEffect(() => {
        async function loadUser() {
            if (!supabase) return;

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                setError(userError.message);
                return;
            }

            if (!user) {
                setError("登录状态已失效，请重新登录");
                return;
            }

            console.log("当前登录学生:", user.id);
            const { data: memberships, error: memberError } = await supabase
                .from("class_members")
                .select("class_id")
                .eq("student_id", user.id);

            if (memberError) {
                setError(memberError.message);
                return;
            }

            const classIds = memberships?.map((item) => item.class_id) ?? [];

            if (classIds.length === 0) {
                setError("当前学生没有加入任何班级");
                return;
            }

            console.log("当前学生班级:", classIds);
            const { data: tasks, error: taskError } = await supabase
                .from("tasks")
                .select("id, experiment_id, deadline")
                .in("class_id", classIds)
                .order("deadline", { ascending: true });

            if (taskError) {
                setError(taskError.message);
                return;
            }

            console.log("当前学生任务:", tasks);
            if (!tasks || tasks.length === 0) {
                setError("当前没有可用的实验任务");
                return;
            }

            const { data: reports, error: reportError } = await supabase
                .from("reports")
                .select("task_id, status")
                .eq("student_id", user.id);

            if (reportError) {
                setError(reportError.message);
                return;
            }

            const completedTaskIds = new Set(
                (reports ?? [])
                    .filter(
                        (report) =>
                            report.status === "submitted" ||
                            report.status === "graded"
                    )
                    .map((report) => report.task_id)
            );

            const currentTask = tasks.find(
                (task) => !completedTaskIds.has(task.id)
            );

            if (!currentTask) {
                setError("当前没有未完成的实验任务");
                return;
            }

            console.log("当前未完成任务:", currentTask);

            const { data: experiment, error: experimentError } = await supabase
                .from("experiments")
                .select("id, name, knowledge_id")
                .eq("id", currentTask.experiment_id)
                .single();

            if (experimentError) {
                setError(experimentError.message);
                return;
            }

            console.log("当前实验:", experiment);
            setExperimentName(experiment.name);
            setKnowledgeId(experiment.knowledge_id)
            if (!experiment.knowledge_id) {
                setError("当前实验资料尚未录入完整，请向教师确认");
                return;
            }

        }

        loadUser();
    }, []);
    async function askAI(text?: string) {
        const currentQuestion = (text ?? question).trim();

        if (!currentQuestion || loading || !knowledgeId) return;

        setError("");
        setQuestion("");

        const newMessages: Message[] = [
            ...messages,
            {
                role: "user",
                content: currentQuestion,
            },
        ];

        setMessages(newMessages);
        setLoading(true);

        try {
            const response = await fetch("/api/ai/qa", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    experimentId: knowledgeId,
                    question: currentQuestion,
                    history: messages,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "AI 服务请求失败");
            }

            const answer =
                data.answer ||
                data.content ||
                data.message ||
                "AI 暂时没有返回回答。";

            setMessages([
                ...newMessages,
                {
                    role: "assistant",
                    content: answer,
                },
            ]);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "暂时无法连接 AI 服务"
            );
        } finally {
            setLoading(false);
        }
    }
    const quickQuestions: Record<string, string[]> = {
        spectrometer: [
            "分光计的基本原理是什么？",
            "如何正确调节分光计？",
            "什么是最小偏向角？",
            "如何通过实验数据计算三棱镜的折射率？",
        ],

        "liquid-crystal": [
            "液晶电光效应的基本原理是什么？",
            "液晶电光效应是如何产生的？",
            "实验中如何测量液晶的电光特性？",
            "如何减小实验误差？",
        ],

        meter: [
            "如何进行电表的改装？",
            "中值1000Ω欧姆表的原理是什么？",
            "欧姆表应该如何进行校准？",
            "实验中有哪些主要误差来源？",
        ],

        viscosity: [
            "落球法测粘滞系数的基本原理是什么？",
            "为什么小球下落后可以达到匀速？",
            "如何通过实验数据计算液体的粘滞系数？",
            "实验中如何减小测量误差？",
        ],
    };

    const currentQuickQuestions = quickQuestions[knowledgeId] ?? [];
    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    知识问答
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    有什么物理实验问题，问问 AI 实验助教
                </p>
            </div>

            {/* AI 助教 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                        🤖
                    </div>

                    <div>
                        <h2 className="font-semibold text-slate-900">
                            AI 实验助教
                        </h2>
                        <p className="text-sm text-slate-500">
                            当前实验：{experimentName || "正在加载实验…"}
                        </p>
                    </div>
                </div>

                {/* 对话区域 */}
                <div className="mt-6 space-y-4">
                    {messages.length === 0 && (
                        <div className="max-w-2xl rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                            你好！我是你的 AI 实验助教，可以帮助你理解实验原理、
                            分析实验数据，也可以解答大学物理实验中的常见问题。
                        </div>
                    )}

                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={
                                message.role === "user"
                                    ? "ml-auto max-w-2xl rounded-2xl bg-blue-600 p-4 text-sm leading-6 text-white"
                                    : "max-w-2xl rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                            }
                        >
                            {message.content}
                        </div>
                    ))}

                    {loading && (
                        <div className="max-w-2xl rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                            AI 正在思考……
                        </div>
                    )}
                </div>

                {/* 常见问题 */}
                <div className="mt-6">
                    <p className="mb-3 text-sm font-medium text-slate-700">
                        你可以这样问：
                    </p>

                    <div className="flex flex-wrap gap-2">
                        {currentQuickQuestions.map((item) => (
                            <button
                                key={item}
                                onClick={() => askAI(item)}
                                disabled={loading}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 输入框 */}
                <div className="mt-6 flex gap-3">
                    <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                askAI();
                            }
                        }}
                        placeholder="请输入你的物理实验问题……"
                        disabled={loading}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                    />

                    <button
                        onClick={() => askAI()}
                        disabled={loading || !question.trim()}
                        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "发送中…" : "发送"}
                    </button>
                </div>

                {/* 错误 */}
                {error && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}