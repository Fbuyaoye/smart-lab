"use client";

import React from "react";

export default function KnowledgeQA() {
    const [question, setQuestion] = React.useState("");

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    知识问答
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    有什么物理实验问题，问问 AI 实验助教
                </p >
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
                            大学物理实验智能问答
                        </p >
                    </div>
                </div>

                {/* 欢迎消息 */}
                <div className="mt-6 max-w-2xl rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    你好！我是你的 AI 实验助教，可以帮助你理解实验原理、
                    分析实验数据，也可以解答大学物理实验中的常见问题。
                </div>

                {/* 常见问题 */}
                <div className="mt-6">
                    <p className="mb-3 text-sm font-medium text-slate-700">
                        你可以这样问：
                    </p >

                    <div className="flex flex-wrap gap-2">
                        {[
                            "什么是最小二乘法？",
                            "如何减小实验误差？",
                            "什么是电阻率？",
                            "为什么要进行多次测量？",
                        ].map((item) => (
                            <button
                                key={item}
                                onClick={() => setQuestion(item)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
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
                        placeholder="请输入你的物理实验问题……"
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />

                    <button
                        onClick={() => {
                            if (!question.trim()) return;
                            alert("AI 问答功能即将接入");
                        }}
                        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                        发送
                    </button>
                </div>
            </div>
        </div>
    );
}