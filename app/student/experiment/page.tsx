"use client";
import Link from "next/link";
import { useState } from "react";

export default function ExperimentPage() {
  const [voltage, setVoltage] = useState("");
  const [current, setCurrent] = useState("");
  const [resistance, setResistance] = useState<number | null>(null);
  const [error, setError] = useState("");

  const calculateResistance = () => {
    const u = parseFloat(voltage);
    const i = parseFloat(current);

    if (voltage === "" || current === "") {
      setError("请先填写完整的实验数据");
      return;
    }

    if (isNaN(u) || isNaN(i)) {
      setError("请输入有效的数字");
      return;
    }

    if (i === 0) {
      setError("电流不能为零");
      return;
    }

    setError("");
    setResistance(u / i);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              测量金属丝的电阻率
            </h1>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
              进行中
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            电学实验 · 实验任务
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            01
          </div>
          <h2 className="font-semibold text-slate-800">实验目的</h2>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          测量金属丝两端的电压和通过金属丝的电流，
          根据欧姆定律计算金属丝的电阻，并进一步完成实验数据处理。
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-600">
              02
            </div>
            <h2 className="font-semibold text-slate-800">实验步骤</h2>
          </div>

          <div className="mt-6 space-y-5">
            {[
              ["01", "准备实验器材", "检查实验仪器是否正常。"],
              ["02", "连接实验电路", "按照实验要求连接电路。"],
              ["03", "测量实验数据", "记录电压和电流测量值。"],
              ["04", "数据处理", "计算实验结果并分析误差。"],
            ].map(([number, title, description]) => (
              <div key={number} className="flex gap-4">
                <span className="text-sm font-semibold text-blue-600">
                  {number}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-sm font-medium text-blue-600">
              03
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">数据记录</h2>
              <p className="mt-1 text-xs text-slate-400">
                输入实验测得的数据
              </p>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                电压 U
              </label>
              <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-400 focus-within:bg-white">
                <input
                  className="w-full bg-transparent py-3 outline-none text-slate-800"
                  placeholder="请输入数值"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                />
                <span className="text-sm text-slate-400">V</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                电流 I
              </label>
              <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-400 focus-within:bg-white">
                <input
                  className="w-full bg-transparent py-3 outline-none text-slate-800"
                  placeholder="请输入数值"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
                <span className="text-sm text-slate-400">A</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <button
            onClick={calculateResistance}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            计算电阻
          </button>
        </div>
      </div>

      {resistance !== null && (
        <section className="rounded-2xl border border-blue-100 bg-white p-7 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
        <p className="text-sm font-medium text-blue-600">
          计算结果
        </p >

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-sm text-slate-500">
            电阻 R =
          </span>

          <span className="text-3xl font-bold text-slate-900">
            {resistance.toFixed(3)}
          </span>

          <span className="text-sm text-slate-500">
            Ω
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-400">
          根据 R = U / I 自动计算
        </p >
      </div>

      <Link
        href="/student/analysis"
        className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
      >
        进入数据分析 →
      </Link>

    </div>
    </section>
    )}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">✦</span>
              <h2 className="font-semibold text-slate-800">AI 实验报告</h2>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              根据实验目的、步骤和数据，自动生成实验报告草稿。
            </p>
          </div>

          <button
            onClick={() => alert("AI实验报告功能即将接入")}
            className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
          >
            生成报告 →
          </button>
        </div>
      </div>
    </div>
  );
}
