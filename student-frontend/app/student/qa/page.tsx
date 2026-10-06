"use client";

import React from "react";
import { createClient } from "@/lib/supabase/browser";

type Message = {
    role: "user" | "assistant";
    content: string;
};

type ExperimentOption = {
    id: number;
    name: string;
    knowledge_id: string;
};

export default function KnowledgeQA() {
    const [question, setQuestion] = React.useState("");
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const [experiments, setExperiments] = React.useState<ExperimentOption[]>(
        []
    );
    const [selectedExperimentId, setSelectedExperimentId] = React.useState<
        number | null
    >(null);
    const [experimentName, setExperimentName] = React.useState("");
    const [knowledgeId, setKnowledgeId] = React.useState("");
    const [loadingExperiments, setLoadingExperiments] = React.useState(true);

    const supabase = createClient();

    /*
     * 加载所有已经接入知识库的实验
     *
     * 不再根据“未完成任务”筛选。
     * 只要 experiments 表里存在 knowledge_id，
     * 就允许学生在知识问答中选择。
     *
     * 因此之前的 3 个测试实验如果没有 knowledge_id，
     * 会自动被排除。
     */
    React.useEffect(() => {
        async function loadExperiments() {
            if (!supabase) {
                setError("Supabase 客户端初始化失败");
                setLoadingExperiments(false);
                return;
            }

            setLoadingExperiments(true);
            setError("");

            const { data, error: experimentError } = await supabase
                .from("experiments")
                .select("id, name, knowledge_id")
                .not("knowledge_id", "is", null)
                .order("id", { ascending: true });

            if (experimentError) {
                console.error("加载实验失败：", experimentError);
                setError(experimentError.message);
                setLoadingExperiments(false);
                return;
            }

            const validExperiments = (data ?? []).filter(
                (experiment): experiment is ExperimentOption =>
                    typeof experiment.id === "number" &&
                    typeof experiment.name === "string" &&
                    typeof experiment.knowledge_id === "string" &&
                    experiment.knowledge_id.trim() !== ""
            );

            if (validExperiments.length === 0) {
                setExperiments([]);
                setError("当前没有已经接入知识库的实验");
                setLoadingExperiments(false);
                return;
            }

            setExperiments(validExperiments);

            // 默认选择第一个已经接入知识库的实验
            const firstExperiment = validExperiments[0];

            setSelectedExperimentId(firstExperiment.id);
            setExperimentName(firstExperiment.name);
            setKnowledgeId(firstExperiment.knowledge_id);

            setLoadingExperiments(false);
        }

        loadExperiments();
    }, [supabase]);

    /*
     * 切换实验
     */
    function handleExperimentChange(value: string) {
        const id = Number(value);

        const selectedExperiment = experiments.find(
            (experiment) => experiment.id === id
        );

        if (!selectedExperiment) {
            return;
        }

        setSelectedExperimentId(selectedExperiment.id);
        setExperimentName(selectedExperiment.name);
        setKnowledgeId(selectedExperiment.knowledge_id);

        // 不同实验之间不要共用上一实验的对话上下文
        setMessages([]);
        setQuestion("");
        setError("");
    }

    /*
     * 快捷问题
     *
     * key 必须和数据库中的 knowledge_id 一致。
     */
    const quickQuestions: Record<string, string[]> = {
        "spectrometer": [
            "分光计的基本原理是什么？",
            "如何正确调节分光计？",
            "什么是最小偏向角？",
            "如何通过实验数据计算三棱镜的折射率？",
        ],

        "liquid-crystal-electro-optic": [
            "液晶电光效应的基本原理是什么？",
            "液晶电光效应是如何产生的？",
            "实验中如何测量液晶的电光特性？",
            "如何减小实验误差？",
        ],

        "meter-modification": [
            "如何进行电表的改装？",
            "中值1000Ω欧姆表的原理是什么？",
            "欧姆表应该如何进行校准？",
            "实验中有哪些主要误差来源？",
        ],

        "falling-ball-viscosity": [
            "落球法测粘滞系数的基本原理是什么？",
            "为什么小球下落后可以达到匀速？",
            "如何通过实验数据计算液体的粘滞系数？",
            "实验中如何减小测量误差？",
        ],

        "photoelectric-effect": [
            "光电效应的基本原理是什么？",
            "什么是光电效应的截止电压？",
            "如何通过实验测定普朗克常量？",
            "实验中有哪些主要误差来源？",
        ],

        "air-specific-heat-ratio": [
            "空气比热容比的测定原理是什么？",
            "实验中为什么需要快速放气？",
            "空气比热容比与绝热过程有什么关系？",
            "实验中有哪些主要误差来源？",
        ],

        "oscilloscope": [
            "示波器的基本工作原理是什么？",
            "如何正确调节示波器？",
            "示波器如何测量信号的周期和频率？",
            "实验中如何判断波形是否稳定？",
        ],

        "tensile-young-modulus": [
            "拉伸法测杨氏模量的基本原理是什么？",
            "为什么需要测量金属丝的直径？",
            "如何通过实验数据计算杨氏模量？",
            "实验中有哪些主要误差来源？",
        ],

        "dynamic-young-modulus": [
            "动力学法测杨氏模量的基本原理是什么？",
            "实验中为什么要测量振动频率？",
            "如何通过实验数据计算杨氏模量？",
            "如何减小实验误差？",
        ],

        "potentiometer": [
            "电位差计的基本原理是什么？",
            "为什么电位差计可以进行精确测量？",
            "实验中如何使用电位差计测量电动势？",
            "实验中有哪些主要误差来源？",
        ],

        "franck-hertz": [
            "弗兰克-赫兹实验的基本原理是什么？",
            "弗兰克-赫兹实验为什么能够证明原子能级量子化？",
            "实验曲线中的周期性峰谷说明了什么？",
            "实验中有哪些主要误差来源？",
        ],

        "hysteresis-loop": [
            "磁滞回线的基本原理是什么？",
            "什么是矫顽力和剩磁？",
            "如何通过实验测量磁滞回线？",
            "实验中有哪些主要误差来源？",
        ],

        "newtons-rings-wedge": [
            "牛顿环的形成原理是什么？",
            "为什么牛顿环可以用于测量波长？",
            "劈尖干涉的基本原理是什么？",
            "实验中如何减小测量误差？",
        ],

        "grating-diffraction": [
            "光栅衍射的基本原理是什么？",
            "光栅方程是什么？",
            "如何通过光栅衍射测量光波长？",
            "实验中有哪些主要误差来源？",
        ],

        "voltammetry": [
            "伏安特性的基本原理是什么？",
            "如何测量二极管的伏安特性？",
            "如何判断元件的伏安特性曲线？",
            "实验中有哪些主要误差来源？",
        ],

        "trifilar-torsion-pendulum": [
            "三线摆的基本原理是什么？",
            "如何利用三线摆测量物体的转动惯量？",
            "扭摆实验的基本原理是什么？",
            "实验中如何减小测量误差？",
        ],

        "speed-of-sound": [
            "声速测量实验的基本原理是什么？",
            "如何利用共振现象测量声速？",
            "实验数据应该如何处理？",
            "实验中有哪些主要误差来源？",
        ],

        "forced-resonance": [
            "波尔共振实验的基本原理是什么？",
            "什么是受迫振动和共振？",
            "如何通过实验确定共振频率？",
            "实验中有哪些主要误差来源？",
        ],

        "hall-effect": [
            "霍尔效应的基本原理是什么？",
            "霍尔电压与哪些因素有关？",
            "如何利用霍尔效应测量磁场？",
            "实验中有哪些主要误差来源？",
        ],

        "hall-magnetic-field": [
            "如何利用霍尔效应测量磁场？",
            "霍尔传感器测量磁场的基本原理是什么？",
            "如何通过实验数据确定磁场强度？",
            "实验中有哪些主要误差来源？",
        ],
    };

    const currentQuickQuestions =
        quickQuestions[knowledgeId] ?? [
            `${experimentName}的基本原理是什么？`,
            `${experimentName}的实验目的是什么？`,
            `${experimentName}的实验步骤有哪些？`,
            `${experimentName}实验中有哪些主要误差来源？`,
        ];

    /*
     * 向 AI 提问
     */
    async function askAI(text?: string) {
        const currentQuestion = (text ?? question).trim();

        if (
            !currentQuestion ||
            loading ||
            !knowledgeId ||
            !selectedExperimentId
        ) {
            return;
        }

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

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-6 py-8">
                {/* 页面标题 */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">
                        知识问答
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        针对实验原理、实验步骤、数据处理和误差分析进行智能问答
                    </p>
                </div>

                {/* 实验选择 */}
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                选择实验
                            </p>
                            <p className="mt-1 text-base font-semibold text-slate-900">
                                {loadingExperiments
                                    ? "正在加载实验…"
                                    : experimentName || "请选择实验"}
                            </p>
                        </div>

                        <select
                            value={selectedExperimentId ?? ""}
                            onChange={(event) =>
                                handleExperimentChange(event.target.value)
                            }
                            disabled={
                                loadingExperiments ||
                                experiments.length === 0 ||
                                loading
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 md:w-80"
                        >
                            {loadingExperiments ? (
                                <option value="">正在加载实验…</option>
                            ) : experiments.length === 0 ? (
                                <option value="">暂无可用实验</option>
                            ) : (
                                experiments.map((experiment) => (
                                    <option
                                        key={experiment.id}
                                        value={experiment.id}
                                    >
                                        {experiment.name}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {knowledgeId && (
                        <div className="mt-3 text-xs text-slate-400">
                            当前知识库：{knowledgeId}
                        </div>
                    )}
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* 快捷问题 */}
                {knowledgeId && !loadingExperiments && (
                    <div className="mb-6">
                        <p className="mb-3 text-sm font-medium text-slate-700">
                            你可以这样问
                        </p>

                        <div className="grid gap-3 md:grid-cols-2">
                            {currentQuickQuestions.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => askAI(item)}
                                    disabled={loading}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 对话区域 */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {/* 当前实验 */}
                    <div className="border-b border-slate-100 px-5 py-4">
                        <p className="text-xs text-slate-400">
                            当前实验
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                            {experimentName || "正在加载实验…"}
                        </p>
                    </div>

                    {/* 消息区域 */}
                    <div className="min-h-[420px] space-y-5 px-5 py-6">
                        {messages.length === 0 && !loading ? (
                            <div className="flex min-h-[330px] items-center justify-center">
                                <div className="max-w-md text-center">
                                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                                        💡
                                    </div>

                                    <h2 className="text-lg font-semibold text-slate-800">
                                        开始你的实验知识问答
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        可以询问当前实验的原理、步骤、数据处理、
                                        误差分析等问题。
                                    </p>
                                </div>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <div
                                    key={`${message.role}-${index}`}
                                    className={
                                        message.role === "user"
                                            ? "flex justify-end"
                                            : "flex justify-start"
                                    }
                                >
                                    <div
                                        className={
                                            message.role === "user"
                                                ? "max-w-[80%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-6 text-white"
                                                : "max-w-[80%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700"
                                        }
                                    >
                                        {message.content}
                                    </div>
                                </div>
                            ))
                        )}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-500">
                                    AI 正在思考…
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 输入区域 */}
                    <div className="border-t border-slate-100 p-4">
                        <div className="flex gap-3">
                            <textarea
                                value={question}
                                onChange={(event) =>
                                    setQuestion(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (
                                        event.key === "Enter" &&
                                        !event.shiftKey
                                    ) {
                                        event.preventDefault();
                                        askAI();
                                    }
                                }}
                                disabled={
                                    loading ||
                                    loadingExperiments ||
                                    !knowledgeId
                                }
                                placeholder={
                                    knowledgeId
                                        ? `请输入关于「${experimentName}」的问题…`
                                        : "请先选择实验"
                                }
                                rows={2}
                                className="min-h-[56px] flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />

                            <button
                                type="button"
                                onClick={() => askAI()}
                                disabled={
                                    loading ||
                                    loadingExperiments ||
                                    !knowledgeId ||
                                    !question.trim()
                                }
                                className="self-end rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {loading ? "发送中…" : "发送"}
                            </button>
                        </div>

                        <p className="mt-2 text-xs text-slate-400">
                            Enter 发送，Shift + Enter 换行
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}