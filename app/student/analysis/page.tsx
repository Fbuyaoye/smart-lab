"use client";

import { useMemo, useState } from "react";

type DataRow = {
    id: number;
    x: string;
    y: string;
};

const initialData: DataRow[] = [
    { id: 1, x: "0.50", y: "0.10" },
    { id: 2, x: "1.00", y: "0.20" },
    { id: 3, x: "1.50", y: "0.30" },
    { id: 4, x: "2.00", y: "0.40" },
];

const fitOptions = [
    "线性拟合",
    "二次拟合",
    "指数拟合",
    "对数拟合",
    "幂函数拟合",
];

export default function AnalysisPage() {
    const [data, setData] = useState<DataRow[]>(initialData);

    const [xName, setXName] = useState("X");
    const [yName, setYName] = useState("Y");

    const [fitType, setFitType] = useState("线性拟合");

    const [hasFitted, setHasFitted] = useState(false);

    // 有效数据
    const validData = useMemo(() => {
        return data.filter(
            (row) =>
                Number.isFinite(Number(row.x)) &&
                Number.isFinite(Number(row.y))
        );
    }, [data]);

    // 修改数据
    const updateRow = (
        id: number,
        field: "x" | "y",
        value: string
    ) => {
        setData((rows) =>
            rows.map((row) =>
                row.id === id
                    ? { ...row, [field]: value }
                    : row
            )
        );

        setHasFitted(false);
    };

    // 添加数据
    const addRow = () => {
        setData((rows) => [
            ...rows,
            {
                id: Date.now(),
                x: "",
                y: "",
            },
        ]);
    };

    // 删除数据
    const deleteRow = (id: number) => {
        setData((rows) =>
            rows.filter((row) => row.id !== id)
        );

        setHasFitted(false);
    };

    // 图表数据
    const chartData = validData.map((row) => ({
        x: Number(row.x),
        y: Number(row.y),
    }));

    // 图表范围
    const maxX = Math.max(
        ...chartData.map((point) => point.x),
        1
    );

    const maxY = Math.max(
        ...chartData.map((point) => point.y),
        1
    );

    const minX = Math.min(
        ...chartData.map((point) => point.x),
        0
    );

    const minY = Math.min(
        ...chartData.map((point) => point.y),
        0
    );

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // 开始拟合
    // 现在这里只做演示，真正算法之后接 C 的模块
    const handleFit = () => {
        if (validData.length < 2) {
            alert("至少需要 2 组有效数据才能进行拟合。");
            return;
        }

        setHasFitted(true);
    };

    return (
        <main className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">

                {/* 页面标题 */}
                <div>
                    <p className="text-sm font-medium text-blue-600">
                        数据分析工具包
                    </p>

                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                        实验数据分析
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        输入实验数据，自由选择变量和拟合方式，快速获得数据分析结果。
                    </p>
                </div>

                {/* 分析设置 */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                    <h2 className="text-base font-semibold text-slate-900">
                        分析设置
                    </h2>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">

                        {/* X */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">
                                X 轴变量
                            </label>

                            <input
                                value={xName}
                                onChange={(e) =>
                                    setXName(e.target.value)
                                }
                                placeholder="例如：电压 U / V"
                                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        {/* Y */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">
                                Y 轴变量
                            </label>

                            <input
                                value={yName}
                                onChange={(e) =>
                                    setYName(e.target.value)
                                }
                                placeholder="例如：电流 I / A"
                                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        {/* 拟合方式 */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">
                                拟合方式
                            </label>

                            <select
                                value={fitType}
                                onChange={(e) => {
                                    setFitType(e.target.value);
                                    setHasFitted(false);
                                }}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                {fitOptions.map((option) => (
                                    <option
                                        key={option}
                                        value={option}
                                    >
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>
                </section>

                {/* 数据表 */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                        <div>
                            <h2 className="text-base font-semibold text-slate-900">
                                实验数据
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                当前共 {data.length} 组数据，
                                有效数据 {validData.length} 组
                            </p>
                        </div>

                        <button
                            onClick={addRow}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                            + 添加数据
                        </button>

                    </div>

                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">

                        <table className="w-full text-sm">

                            <thead className="bg-slate-50 text-left text-slate-500">

                                <tr>

                                    <th className="px-4 py-3 font-medium">
                                        序号
                                    </th>

                                    <th className="px-4 py-3 font-medium">
                                        {xName || "X"}
                                    </th>

                                    <th className="px-4 py-3 font-medium">
                                        {yName || "Y"}
                                    </th>

                                    <th className="px-4 py-3 text-right font-medium">
                                        操作
                                    </th>

                                </tr>

                            </thead>

                            <tbody className="divide-y divide-slate-100">

                                {data.map((row, index) => (

                                    <tr key={row.id}>

                                        <td className="px-4 py-3 text-slate-500">
                                            {index + 1}
                                        </td>

                                        <td className="px-4 py-3">

                                            <input
                                                value={row.x}
                                                onChange={(e) =>
                                                    updateRow(
                                                        row.id,
                                                        "x",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="例如 1.00"
                                                className="w-full max-w-56 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            />

                                        </td>

                                        <td className="px-4 py-3">

                                            <input
                                                value={row.y}
                                                onChange={(e) =>
                                                    updateRow(
                                                        row.id,
                                                        "y",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="例如 0.20"
                                                className="w-full max-w-56 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            />

                                        </td>

                                        <td className="px-4 py-3 text-right">

                                            <button
                                                onClick={() =>
                                                    deleteRow(row.id)
                                                }
                                                className="text-sm text-slate-400 hover:text-red-500"
                                            >
                                                删除
                                            </button>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                    {/* 开始拟合 */}
                    <div className="mt-5 flex justify-end">

                        <button
                            onClick={handleFit}
                            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                            开始拟合
                        </button>

                    </div>

                </section>

                {/* 图表 + 拟合结果 */}
                <div className="grid gap-6 lg:grid-cols-2">

                    {/* 图表 */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                        <div className="flex items-center justify-between gap-3">

                            <div>
                                <h2 className="text-base font-semibold text-slate-900">
                                    数据图表
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {xName || "X"} - {yName || "Y"}
                                </p>
                            </div>

                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                                {fitType}
                            </span>

                        </div>

                        <div className="relative mt-5 h-72 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-4">

                            <svg
                                viewBox="0 0 500 280"
                                className="h-full w-full"
                                preserveAspectRatio="none"
                            >

                                {/* X轴 */}
                                <line
                                    x1="50"
                                    y1="230"
                                    x2="470"
                                    y2="230"
                                    stroke="#cbd5e1"
                                    strokeWidth="1"
                                />

                                {/* Y轴 */}
                                <line
                                    x1="50"
                                    y1="30"
                                    x2="50"
                                    y2="230"
                                    stroke="#cbd5e1"
                                    strokeWidth="1"
                                />

                                {/* 数据点 */}
                                {chartData.map(
                                    (point, index) => (

                                        <circle
                                            key={index}
                                            cx={
                                                50 +
                                                ((point.x - minX) /
                                                    rangeX) *
                                                    400
                                            }
                                            cy={
                                                230 -
                                                ((point.y - minY) /
                                                    rangeY) *
                                                    180
                                            }
                                            r="5"
                                            fill="#2563eb"
                                        />

                                    )
                                )}

                            </svg>

                            {/* X轴名称 */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-slate-400">
                                {xName || "X"}
                            </div>

                            {/* Y轴名称 */}
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-400">
                                {yName || "Y"}
                            </div>

                        </div>

                    </section>

                    {/* 拟合结果 */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                        <h2 className="text-base font-semibold text-slate-900">
                            拟合结果
                        </h2>

                        {!hasFitted ? (

                            <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">

                                输入至少 2 组有效数据后，
                                点击“开始拟合”查看结果。

                            </div>

                        ) : (

                            <div className="mt-5 space-y-4">

                                {/* 拟合方式 */}
                                <div className="rounded-xl bg-slate-50 p-4">

                                    <p className="text-sm text-slate-500">
                                        拟合方式
                                    </p>

                                    <p className="mt-2 text-lg font-semibold text-slate-900">
                                        {fitType}
                                    </p>

                                </div>

                                {/* 拟合方程 */}
                                <div className="rounded-xl bg-slate-50 p-4">

                                    <p className="text-sm text-slate-500">
                                        拟合方程
                                    </p>

                                    <p className="mt-2 text-lg font-semibold text-slate-900">
                                        y = 0.200x + 0.000
                                    </p>

                                </div>

                                {/* R² */}
                                <div className="grid gap-4 sm:grid-cols-2">

                                    <div className="rounded-xl bg-slate-50 p-4">

                                        <p className="text-sm text-slate-500">
                                            拟合优度 R²
                                        </p>

                                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                                            0.9987
                                        </p>

                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-4">

                                        <p className="text-sm text-slate-500">
                                            有效数据
                                        </p>

                                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                                            {validData.length} 组
                                        </p>

                                    </div>

                                </div>

                            </div>

                        )}

                        {/* AI分析 */}
                        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">

                            <p className="text-sm font-medium text-blue-900">
                                AI 数据分析
                            </p>

                            <p className="mt-2 text-sm leading-6 text-blue-800">
                                后续接入 AI 模块后，可以根据实验数据、
                                拟合结果和实验背景自动生成分析结论。
                            </p>

                        </div>

                    </section>

                </div>

            </div>
        </main>
    );
}