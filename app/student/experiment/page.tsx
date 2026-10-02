"use client";

import { useMemo, useState } from "react";

type DataRow = {
    id: number;
    voltage: string;
    current: string;
};

type Tab =
    | "principle"
    | "data"
    | "calculation"
    | "fitting"
    | "report"
    | "submit";

const initialData: DataRow[] = [
    { id: 1, voltage: "0.50", current: "0.10" },
    { id: 2, voltage: "1.00", current: "0.20" },
    { id: 3, voltage: "1.50", current: "0.30" },
    { id: 4, voltage: "2.00", current: "0.40" },
];

export default function ExperimentPage() {
    const [activeTab, setActiveTab] = useState<Tab>("principle");

    const [data, setData] = useState<DataRow[]>(initialData);

    const [report, setReport] = useState("");

    const updateRow = (
        id: number,
        field: "voltage" | "current",
        value: string
    ) => {
        setData((rows) =>
            rows.map((row) =>
                row.id === id ? { ...row, [field]: value } : row
            )
        );
    };

    const addRow = () => {
        const newId =
            data.length > 0
                ? Math.max(...data.map((row) => row.id)) + 1
                : 1;

        setData([
            ...data,
            {
                id: newId,
                voltage: "",
                current: "",
            },
        ]);
    };

    const deleteRow = (id: number) => {
        setData((rows) => rows.filter((row) => row.id !== id));
    };

    // 有效数据
    const validData = useMemo(() => {
        return data
            .map((row) => ({
                u: Number(row.voltage),
                i: Number(row.current),
            }))
            .filter(
                (row) =>
                    Number.isFinite(row.u) &&
                    Number.isFinite(row.i) &&
                    row.i !== 0
            );
    }, [data]);

    // 每组电阻
    const resistanceValues = useMemo(() => {
        return validData.map((row) => row.u / row.i);
    }, [validData]);

    // 平均电阻
    const averageResistance = useMemo(() => {
        if (resistanceValues.length === 0) {
            return null;
        }

        return (
            resistanceValues.reduce((sum, value) => sum + value, 0) /
            resistanceValues.length
        );
    }, [resistanceValues]);

    // 暂时使用前端计算的线性拟合
    // 后续替换成 C 提供的真实拟合接口
    const fittingResult = useMemo(() => {
        if (validData.length < 2) {
            return null;
        }

        const n = validData.length;

        const sumX = validData.reduce((sum, row) => sum + row.i, 0);
        const sumY = validData.reduce((sum, row) => sum + row.u, 0);
        const sumXY = validData.reduce(
            (sum, row) => sum + row.i * row.u,
            0
        );
        const sumXX = validData.reduce(
            (sum, row) => sum + row.i * row.i,
            0
        );

        const denominator = n * sumXX - sumX * sumX;

        if (denominator === 0) {
            return null;
        }

        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        const meanY = sumY / n;

        const ssRes = validData.reduce((sum, row) => {
            const predicted = slope * row.i + intercept;
            return sum + Math.pow(row.u - predicted, 2);
        }, 0);

        const ssTot = validData.reduce(
            (sum, row) => sum + Math.pow(row.u - meanY, 2),
            0
        );

        const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

        return {
            slope,
            intercept,
            r2,
        };
    }, [validData]);

    // 拟合图绘制范围
    const plotData = useMemo(() => {
        if (!fittingResult || validData.length < 2) {
            return null;
        }

        const xs = validData.map((row) => row.i);
        const ys = validData.map((row) => row.u);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        // 给坐标轴留一点边距
        const xPadding = (maxX - minX || 1) * 0.12;
        const yPadding = (maxY - minY || 1) * 0.12;

        const xMin = Math.max(0, minX - xPadding);
        const xMax = maxX + xPadding;

        const yMin = Math.max(0, minY - yPadding);
        const yMax = maxY + yPadding;

        const chartLeft = 90;
        const chartRight = 840;
        const chartTop = 50;
        const chartBottom = 370;

        const scaleX = (x: number) =>
            chartLeft +
            ((x - xMin) / (xMax - xMin || 1)) *
            (chartRight - chartLeft);

        const scaleY = (y: number) =>
            chartBottom -
            ((y - yMin) / (yMax - yMin || 1)) *
            (chartBottom - chartTop);

        // 根据真实拟合方程计算拟合线两个端点
        const fitY1 =
            fittingResult.slope * xMin +
            fittingResult.intercept;

        const fitY2 =
            fittingResult.slope * xMax +
            fittingResult.intercept;

        return {
            xMin,
            xMax,
            yMin,
            yMax,
            chartLeft,
            chartRight,
            chartTop,
            chartBottom,
            scaleX,
            scaleY,
            fitX1: scaleX(xMin),
            fitY1: scaleY(fitY1),
            fitX2: scaleX(xMax),
            fitY2: scaleY(fitY2),
        };
    }, [validData, fittingResult]);

    const generateReport = () => {
        setReport(
            "本实验通过测量金属丝两端的电压和通过金属丝的电流，根据欧姆定律计算电阻，并通过实验数据进行线性拟合。当前报告为演示版本，后续将接入 DeepSeek 自动生成完整实验报告。"
        );
    };

    const tabs = [
        { id: "principle" as Tab, label: "实验原理" },
        { id: "data" as Tab, label: "实验数据" },
        { id: "calculation" as Tab, label: "数据计算" },
        { id: "fitting" as Tab, label: "拟合曲线" },
        { id: "report" as Tab, label: "AI实验报告" },
        { id: "submit" as Tab, label: "提交实验" },
    ];

    return (
        <div className="mx-auto max-w-6xl">
            {/* 页面标题 */}
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

            {/* 功能切换 */}
            <div className="mt-7 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="flex min-w-max items-center gap-1">
                    {tabs.map((tab, index) => (
                        <div key={tab.id} className="flex items-center">
                            {/* 在不同阶段之间增加分隔线 */}
                            {(index === 1 || index === 4) && (
                                <div className="mx-2 h-6 w-px bg-slate-200" />
                            )}

                            <button
                                onClick={() => setActiveTab(tab.id)}
                                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${activeTab === tab.id
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ================= 实验原理 ================= */}
            {activeTab === "principle" && (
                <div className="mt-6 space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-7">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-600">
                                01
                            </div>

                            <div>
                                <h2 className="font-semibold text-slate-800">
                                    实验目的
                                </h2>
                                <p className="mt-1 text-xs text-slate-400">
                                    本实验需要完成的主要任务
                                </p>
                            </div>
                        </div>

                        <p className="mt-5 text-sm leading-8 text-slate-500">
                            测量金属丝两端的电压和通过金属丝的电流，
                            根据欧姆定律计算金属丝的电阻，并进一步完成实验数据处理。
                        </p>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-7">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-600">
                                02
                            </div>

                            <h2 className="font-semibold text-slate-800">
                                实验原理
                            </h2>
                        </div>

                        <div className="mt-6 rounded-xl bg-slate-50 p-6">
                            <p className="text-center text-xl font-semibold text-slate-800">
                                R = U / I
                            </p>

                            <p className="mt-4 text-center text-sm text-slate-500">
                                其中 U 为金属丝两端电压，I 为通过金属丝的电流。
                            </p>
                        </div>

                        <div className="mt-6">
                            <p className="text-sm font-medium text-slate-700">
                                实验流程
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-4">
                                {[
                                    "准备实验器材",
                                    "连接实验电路",
                                    "测量实验数据",
                                    "完成数据处理",
                                ].map((item, index) => (
                                    <div
                                        key={item}
                                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                                    >
                                        <span className="text-xs font-semibold text-blue-600">
                                            0{index + 1}
                                        </span>

                                        <p className="mt-2 text-sm font-medium text-slate-700">
                                            {item}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* ================= 实验数据 ================= */}
            {activeTab === "data" && (
                <div className="mt-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-7">
                        {/* 标题 */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="font-semibold text-slate-800">
                                        实验数据
                                    </h2>

                                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600">
                                        {validData.length} 组有效数据
                                    </span>
                                </div>

                                <p className="mt-1 text-sm text-slate-400">
                                    输入实验过程中测量得到的电压和电流数据
                                </p>
                            </div>

                            <button
                                onClick={addRow}
                                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
                            >
                                + 添加数据
                            </button>
                        </div>

                        {/* 数据表 */}
                        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="w-20 px-5 py-4 text-left font-medium text-slate-500">
                                            序号
                                        </th>

                                        <th className="px-5 py-4 text-left font-medium text-slate-500">
                                            电压 U
                                            <span className="ml-1 text-xs text-slate-400">
                                                / V
                                            </span>
                                        </th>

                                        <th className="px-5 py-4 text-left font-medium text-slate-500">
                                            电流 I
                                            <span className="ml-1 text-xs text-slate-400">
                                                / A
                                            </span>
                                        </th>

                                        <th className="w-24 px-5 py-4 text-right font-medium text-slate-500">
                                            操作
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {data.map((row, index) => {
                                        const u = Number(row.voltage);
                                        const i = Number(row.current);

                                        const valid =
                                            Number.isFinite(u) &&
                                            Number.isFinite(i) &&
                                            row.voltage !== "" &&
                                            row.current !== "" &&
                                            i !== 0;

                                        return (
                                            <tr
                                                key={row.id}
                                                className="border-t border-slate-100 transition hover:bg-slate-50/70"
                                            >
                                                <td className="px-5 py-4">
                                                    <span className="text-xs font-semibold text-slate-400">
                                                        {String(index + 1).padStart(2, "0")}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-3">
                                                    <input
                                                        value={row.voltage}
                                                        onChange={(e) =>
                                                            updateRow(
                                                                row.id,
                                                                "voltage",
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:bg-white"
                                                        placeholder="请输入电压"
                                                    />
                                                </td>

                                                <td className="px-5 py-3">
                                                    <input
                                                        value={row.current}
                                                        onChange={(e) =>
                                                            updateRow(
                                                                row.id,
                                                                "current",
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:bg-white"
                                                        placeholder="请输入电流"
                                                    />
                                                </td>

                                                <td className="px-5 py-3 text-right">
                                                    {valid ? (
                                                        <span className="mr-3 text-xs text-green-500">
                                                            ✓
                                                        </span>
                                                    ) : null}

                                                    <button
                                                        onClick={() => deleteRow(row.id)}
                                                        className="text-xs text-slate-400 transition hover:text-red-500"
                                                    >
                                                        删除
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* 数据状态 */}
                        <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm text-green-600">
                                ✓
                            </div>

                            <div>
                                <p className="text-sm font-medium text-green-700">
                                    数据记录正常
                                </p>

                                <p className="mt-0.5 text-xs text-green-600/80">
                                    当前共有 {validData.length} 组有效实验数据，可进行后续计算和拟合。
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* ================= 数据计算 ================= */}
            {activeTab === "calculation" && (
                <div className="mt-6 space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-7">
                        <h2 className="font-semibold text-slate-800">
                            数据计算
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                            根据实验数据自动计算每组电阻
                        </p>

                        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-5 py-4 text-left font-medium text-slate-500">
                                            序号
                                        </th>
                                        <th className="px-5 py-4 text-left font-medium text-slate-500">
                                            U / V
                                        </th>
                                        <th className="px-5 py-4 text-left font-medium text-slate-500">
                                            I / A
                                        </th>
                                        <th className="px-5 py-4 text-left font-medium text-slate-500">
                                            R / Ω
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {data.map((row, index) => {
                                        const u = Number(row.voltage);
                                        const i = Number(row.current);

                                        const r =
                                            Number.isFinite(u) &&
                                                Number.isFinite(i) &&
                                                i !== 0
                                                ? u / i
                                                : null;

                                        return (
                                            <tr
                                                key={row.id}
                                                className="border-t border-slate-100"
                                            >
                                                <td className="px-5 py-4 text-slate-500">
                                                    {index + 1}
                                                </td>

                                                <td className="px-5 py-4 text-slate-700">
                                                    {row.voltage || "-"}
                                                </td>

                                                <td className="px-5 py-4 text-slate-700">
                                                    {row.current || "-"}
                                                </td>

                                                <td className="px-5 py-4 font-medium text-blue-600">
                                                    {r !== null
                                                        ? r.toFixed(4)
                                                        : "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-blue-100 bg-white p-7">
                        <p className="text-sm font-medium text-blue-600">
                            平均结果
                        </p>

                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-sm text-slate-500">
                                平均电阻 R =
                            </span>

                            <span className="text-4xl font-bold text-slate-900">
                                {averageResistance !== null
                                    ? averageResistance.toFixed(4)
                                    : "--"}
                            </span>

                            <span className="text-sm text-slate-500">
                                Ω
                            </span>
                        </div>

                        <p className="mt-3 text-sm text-slate-400">
                            根据各组实验数据自动计算。
                        </p>
                    </section>
                </div>
            )}

            {/* ================= 拟合曲线 ================= */}
            {activeTab === "fitting" && (
                <div className="mt-6 space-y-6">
                    {/* 页面标题 */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-7">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-semibold text-slate-800">
                                        拟合曲线
                                    </h2>

                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                                        线性拟合
                                    </span>
                                </div>

                                <p className="mt-2 text-sm text-slate-400">
                                    根据当前实验数据自动生成 U-I 拟合曲线
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <p className="text-xs text-slate-400">
                                    有效数据
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                    {validData.length} 组
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 拟合图 */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-7">
                        {fittingResult ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-800">
                                            U-I 关系图
                                        </h3>

                                        <p className="mt-1 text-xs text-slate-400">
                                            横轴为电流 I，纵轴为电压 U
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                                            实验数据
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="h-0.5 w-5 bg-blue-400" />
                                            拟合直线
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="relative h-[420px] overflow-hidden rounded-xl bg-white">
                                        <svg
                                            viewBox="0 0 900 430"
                                            className="h-full w-full"
                                            preserveAspectRatio="none"
                                        >
                                            {/* 横向网格 */}
                                            {[0, 1, 2, 3, 4].map((index) => (
                                                <line
                                                    key={`horizontal-${index}`}
                                                    x1="90"
                                                    y1={50 + index * 80}
                                                    x2="840"
                                                    y2={50 + index * 80}
                                                    stroke="#e2e8f0"
                                                    strokeWidth="1"
                                                />
                                            ))}

                                            {/* 纵向网格 */}
                                            {[0, 1, 2, 3, 4, 5].map((index) => (
                                                <line
                                                    key={`vertical-${index}`}
                                                    x1={90 + index * 150}
                                                    y1="50"
                                                    x2={90 + index * 150}
                                                    y2="370"
                                                    stroke="#e2e8f0"
                                                    strokeWidth="1"
                                                />
                                            ))}

                                            {/* Y轴 */}
                                            <line
                                                x1="90"
                                                y1="50"
                                                x2="90"
                                                y2="370"
                                                stroke="#94a3b8"
                                                strokeWidth="2"
                                            />

                                            {/* X轴 */}
                                            <line
                                                x1="90"
                                                y1="370"
                                                x2="840"
                                                y2="370"
                                                stroke="#94a3b8"
                                                strokeWidth="2"
                                            />

                                            {/* 数据点 */}
                                            {plotData &&
                                                validData.map((row, index) => {
                                                    const x = plotData.scaleX(row.i);
                                                    const y = plotData.scaleY(row.u);

                                                    return (
                                                        <g key={index}>
                                                            <circle
                                                                cx={x}
                                                                cy={y}
                                                                r="7"
                                                                fill="#2563eb"
                                                            />

                                                            <circle
                                                                cx={x}
                                                                cy={y}
                                                                r="11"
                                                                fill="none"
                                                                stroke="#bfdbfe"
                                                                strokeWidth="2"
                                                            />
                                                        </g>
                                                    );
                                                })}

                                            {/* 拟合线 */}
                                            {plotData && (
                                                <line
                                                    x1={plotData.fitX1}
                                                    y1={plotData.fitY1}
                                                    x2={plotData.fitX2}
                                                    y2={plotData.fitY2}
                                                    stroke="#60a5fa"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                />
                                            )}
                                            {plotData && (
                                                <text
                                                    x="820"
                                                    y="75"
                                                    textAnchor="end"
                                                    fontSize="15"
                                                    fontWeight="600"
                                                    fill="#2563eb"
                                                >
                                                    U = {fittingResult.slope.toFixed(4)}I{" "}
                                                    {fittingResult.intercept >= 0 ? "+" : "-"}{" "}
                                                    {Math.abs(fittingResult.intercept).toFixed(4)}
                                                </text>
                                            )}

                                            {/* X轴数字刻度 */}
                                            {plotData &&
                                                Array.from({ length: 5 }).map((_, index) => {
                                                    const value =
                                                        plotData.xMin +
                                                        ((plotData.xMax - plotData.xMin) * index) / 4;

                                                    const x = plotData.scaleX(value);

                                                    return (
                                                        <g key={`x-tick-${index}`}>
                                                            <line
                                                                x1={x}
                                                                y1="370"
                                                                x2={x}
                                                                y2="378"
                                                                stroke="#94a3b8"
                                                                strokeWidth="1"
                                                            />
                                                            <text
                                                                x={x}
                                                                y="398"
                                                                textAnchor="middle"
                                                                fontSize="12"
                                                                fill="#64748b"
                                                            >
                                                                {value.toFixed(2)}
                                                            </text>
                                                        </g>
                                                    );
                                                })}

                                            {/* Y轴数字刻度 */}
                                            {plotData &&
                                                Array.from({ length: 5 }).map((_, index) => {
                                                    const value =
                                                        plotData.yMin +
                                                        ((plotData.yMax - plotData.yMin) * index) / 4;

                                                    const y = plotData.scaleY(value);

                                                    return (
                                                        <g key={`y-tick-${index}`}>
                                                            <line
                                                                x1="82"
                                                                y1={y}
                                                                x2="90"
                                                                y2={y}
                                                                stroke="#94a3b8"
                                                                strokeWidth="1"
                                                            />
                                                            <text
                                                                x="74"
                                                                y={y + 4}
                                                                textAnchor="end"
                                                                fontSize="12"
                                                                fill="#64748b"
                                                            >
                                                                {value.toFixed(2)}
                                                            </text>
                                                        </g>
                                                    );
                                                })}
                                            {/* X轴标题 */}
                                            <text
                                                x="465"
                                                y="410"
                                                textAnchor="middle"
                                                fontSize="14"
                                                fill="#64748b"
                                            >
                                                电流 I / A
                                            </text>

                                            {/* Y轴标题 */}
                                            <text
                                                x="25"
                                                y="210"
                                                textAnchor="middle"
                                                fontSize="14"
                                                fill="#64748b"
                                                transform="rotate(-90 25 210)"
                                            >
                                                电压 U / V
                                            </text>
                                        </svg>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex h-[420px] items-center justify-center rounded-2xl bg-slate-50">
                                <div className="text-center">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                                        —
                                    </div>

                                    <p className="mt-4 text-sm font-medium text-slate-600">
                                        暂时无法进行拟合
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        至少需要两组有效实验数据
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* 拟合结果 */}
                    {fittingResult && (
                        <section>
                            <div className="mb-4">
                                <h3 className="font-semibold text-slate-800">
                                    拟合结果
                                </h3>

                                <p className="mt-1 text-xs text-slate-400">
                                    系统根据实验数据计算得到
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                {/* 方程 */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                                    <p className="text-xs font-medium text-slate-400">
                                        拟合方程
                                    </p>

                                    <p className="mt-4 text-lg font-semibold text-slate-800">
                                        U ={" "}
                                        {fittingResult.slope.toFixed(4)}
                                        I{" "}
                                        {fittingResult.intercept >= 0
                                            ? "+"
                                            : "-"}{" "}
                                        {Math.abs(
                                            fittingResult.intercept
                                        ).toFixed(4)}
                                    </p>

                                    <p className="mt-3 text-xs text-slate-400">
                                        线性模型
                                    </p>
                                </div>

                                {/* 斜率 */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                                    <p className="text-xs font-medium text-slate-400">
                                        斜率
                                    </p>

                                    <div className="mt-3 flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-blue-600">
                                            {fittingResult.slope.toFixed(4)}
                                        </span>

                                        <span className="text-sm text-slate-400">
                                            Ω
                                        </span>
                                    </div>

                                    <p className="mt-3 text-xs text-slate-400">
                                        U-I 曲线斜率对应实验电阻
                                    </p>
                                </div>

                                {/* R² */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                                    <p className="text-xs font-medium text-slate-400">
                                        拟合优度 R²
                                    </p>

                                    <div className="mt-3 flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-blue-600">
                                            {fittingResult.r2.toFixed(4)}
                                        </span>
                                    </div>

                                    <p className="mt-3 text-xs text-slate-400">
                                        越接近 1 表示线性拟合程度越高
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 数据质量 */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
                                ✓
                            </div>

                            <div>
                                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${fittingResult && fittingResult.r2 >= 0.95
                                                ? "bg-green-50 text-green-600"
                                                : "bg-amber-50 text-amber-600"
                                                }`}
                                        >
                                            {fittingResult && fittingResult.r2 >= 0.95
                                                ? "✓"
                                                : "!"}
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-800">
                                                {fittingResult && fittingResult.r2 >= 0.95
                                                    ? "数据线性相关性良好"
                                                    : "数据线性相关性较弱"}
                                            </h3>

                                            <p className="mt-1 text-sm leading-6 text-slate-400">
                                                当前共有 {validData.length} 组有效实验数据，
                                                R² ={" "}
                                                {fittingResult
                                                    ? fittingResult.r2.toFixed(4)
                                                    : "--"}
                                                。
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <p className="mt-1 text-sm leading-6 text-slate-400">
                                    当前共有 {validData.length} 组有效实验数据，
                                    系统已经完成 U-I 线性拟合。
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* ================= AI报告 ================= */}
            {activeTab === "report" && (
                <div className="mt-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-7">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">✦</span>

                                    <h2 className="font-semibold text-slate-800">
                                        AI 实验报告
                                    </h2>
                                </div>

                                <p className="mt-2 text-sm text-slate-400">
                                    根据实验目的、步骤、数据和分析结果生成实验报告草稿。
                                </p>
                            </div>

                            <button
                                onClick={generateReport}
                                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                            >
                                生成报告
                            </button>
                        </div>

                        <div className="mt-6 min-h-72 rounded-xl border border-slate-200 bg-slate-50 p-6">
                            {report ? (
                                <p className="whitespace-pre-line text-sm leading-8 text-slate-600">
                                    {report}
                                </p>
                            ) : (
                                <div className="flex min-h-60 items-center justify-center text-sm text-slate-400">
                                    点击右上角“生成报告”，AI
                                    将根据当前实验数据生成报告。
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* ================= 提交实验 ================= */}
            {activeTab === "submit" && (
                <div className="mt-6 space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-7">
                        <h2 className="font-semibold text-slate-800">
                            实验完成情况
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                            提交实验前，请确认各项内容已经完成。
                        </p>

                        <div className="mt-6 space-y-3">
                            {[
                                [
                                    "实验数据",
                                    validData.length >= 2,
                                    `已录入 ${validData.length} 组有效数据`,
                                ],
                                [
                                    "数据计算",
                                    averageResistance !== null,
                                    "电阻计算完成",
                                ],
                                [
                                    "拟合曲线",
                                    fittingResult !== null,
                                    "线性拟合完成",
                                ],
                                [
                                    "AI实验报告",
                                    report !== "",
                                    "实验报告已生成",
                                ],
                            ].map(([title, completed, description]) => (
                                <div
                                    key={String(title)}
                                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-5 py-4"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">
                                            {title}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-400">
                                            {description}
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${completed
                                            ? "bg-green-50 text-green-600"
                                            : "bg-slate-100 text-slate-400"
                                            }`}
                                    >
                                        {completed ? "已完成" : "未完成"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-blue-100 bg-white p-7">
                        <h2 className="font-semibold text-slate-800">
                            提交实验
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            提交后，实验数据和实验报告将进入教师端，供教师查看和批阅。
                        </p>

                        <button
                            onClick={() =>
                                alert("提交功能将在连接 Supabase 后接入")
                            }
                            className="mt-6 w-full rounded-xl bg-blue-600 py-3.5 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                            提交实验
                        </button>
                    </section>
                </div>
            )}
        </div>
    );
}