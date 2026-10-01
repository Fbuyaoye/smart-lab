"use client";

import { useState } from "react";

export default function ExperimentPage() {
  const [voltage, setVoltage] = useState("");
  const [current, setCurrent] = useState("");
  const [resistance, setResistance] = useState<number | null>(null);
  const [error, setError] = useState("");
  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <h1 className="text-3xl font-bold text-black">实验报告</h1>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold text-black">实验数据</h2>

        <div className="mt-6">
          <label className="block text-sm font-medium">
            电压 U（V）
          </label>

          <input
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
            placeholder="请输入电压"
            value={voltage}
            onChange={(e) => setVoltage(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium">
            电流 I（A）
          </label>

          <input
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
            placeholder="请输入电流"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <button
          className="mt-6 rounded-lg bg-blue-500 px-5 py-2 text-white"
          onClick={() => {
            const u = parseFloat(voltage);
            const i = parseFloat(current);
            if(voltage === "" || current === ""){
                setError("电压或电流不能为空");
                return;
            }
            setError("");
            if(i==0){
                setError("电流不能为零");
                return;
            }
            setError("");
            const resistance=u/i;
            setResistance(resistance);
          }}
        >
          计算
        </button>
        {
            error && <p className="mt-3 text-red-500">{error}</p>
        }
        {
            resistance !== null && (
                <p className="mt-4 text-black">电阻 R = {resistance.toFixed(2)} Ω</p>
            )
        }
      </div>
    </main>
  );
}