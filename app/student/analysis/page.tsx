"use client";

import { useMemo, useState } from "react";

type DataRow = {
    id: number;
    voltage: string;
    current: string;
};

const initialData: DataRow[] = [
    { id: 1, voltage: "0.50", current: "0.10" },
    { id: 2, voltage: "1.00", current: "0.20" },
    { id: 3, voltage: "1.50", current: "0.30" },
    { id: 4, voltage: "2.00", current: "0.40" },
];

export default function AnalysisPage() {
    const [data, setData] = useState<DataRow[]>(initialData);

    const averageR = useMemo(() => {
        const values = data
            .map((row) => {
                const u = Number(row.voltage);
                const i = Number(row.current);
                return Number.isFinite(u) && Number.isFinite(i) && i !== 0
                    ? u / i
                    : null;
            })
            .filter((value): value is number => value !== null);

        return values.length
            ? values.reduce((sum, value) => sum + value, 0) / values.length
            : null;
    }, [data]);

    const updateRow = (id: number, field: "voltage" | "current", value: string) => {
        setData((rows) =>
            rows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
        );
    };

    const addRow = () => {
        setData((rows) => [
            ...rows,
            { id: Date.now(), voltage: "", current: "" },
        ]);
    };

    const deleteRow = (id: number) => {
        setData((rows) => rows.filter((row) => row.id !== id));
    };

    const chartData = data
        .map((row) => ({
            x: Number(row.voltage),
            y: Number(row.current),
        }))
        .filter(
            (point) =>
                Number.isFinite(point.x) &&
                Number.isFinite(point.y)
        );

    const maxX = Math.max(...chartData.map((p) => p.x), 1);
    const maxY = Math.max(...chartData.map((p) => p.y), 1);

    return (
        <main className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div>
                    <p className="text-sm font-medium text-blue-600">数据分析</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                        实验数据分析
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        录入实验数据，查看计算结果与拟合分析。
                    </p>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">
                                测量金属丝的电阻率
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                当前共 {data.length} 组实验数据
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
                                    <th className="px-4 py-3 font-medium">序号</th>
                                    <th className="px-4 py-3 font-medium">电压 U / V</th>
                                    <th className="px-4 py-3 font-medium">电流 I / A</th>
                                    <th className="px-4 py-3 font-medium">电阻 R / Ω</th>
                                    <th className="px-4 py-3 text-right font-medium">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.map((row, index) => {
                                    const u = Number(row.voltage);
                                    const i = Number(row.current);
                                    const resistance =
                                        Number.isFinite(u) && Number.isFinite(i) && i !== 0
                                            ? (u / i).toFixed(3)
                                            : "—";

                                    return (
                                        <tr key={row.id}>
                                            <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    value={row.voltage}
                                                    onChange={(e) =>
                                                        updateRow(row.id, "voltage", e.target.value)
                                                    }
                                                    placeholder="例如 1.00"
                                                    className="w-full max-w-40 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    value={row.current}
                                                    onChange={(e) =>
                                                        updateRow(row.id, "current", e.target.value)
                                                    }
                                                    placeholder="例如 0.20"
                                                    className="w-full max-w-40 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800">
                                                {resistance}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => deleteRow(row.id)}
                                                    className="text-sm text-slate-400 hover:text-red-500"
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
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">拟合曲线</h2>
                                <p className="mt-1 text-sm text-slate-500">当前为前端演示图表区域</p>
                            </div>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                                线性拟合
                            </span>
                        </div>

                        <div className="relative mt-5 h-72 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <svg
                                viewBox="0 0 500 280"
                                className="h-full w-full"
                                preserveAspectRatio="none"
                            >
                                {/* 坐标轴 */}
                                <line
                                    x1="50"
                                    y1="230"
                                    x2="470"
                                    y2="230"
                                    stroke="#cbd5e1"
                                    strokeWidth="1"
                                />

                                <line
                                    x1="50"
                                    y1="30"
                                    x2="50"
                                    y2="230"
                                    stroke="#cbd5e1"
                                    strokeWidth="1"
                                />

                                {/* 拟合/趋势线 */}
                                {chartData.length >= 2 && (
                                    <line
                                        x1={50 + (chartData[0].x / maxX) * 400}
                                        y1={230 - (chartData[0].y / maxY) * 180}
                                        x2={
                                            50 +
                                            (chartData[chartData.length - 1].x / maxX) * 400
                                        }
                                        y2={
                                            230 -
                                            (chartData[chartData.length - 1].y / maxY) * 180
                                        }
                                        stroke="#60a5fa"
                                        strokeWidth="2"
                                    />
                                )}

                                {/* 实验数据点 */}
                                {chartData.map((point, index) => (
                                    <circle
                                        key={index}
                                        cx={50 + (point.x / maxX) * 400}
                                        cy={230 - (point.y / maxY) * 180}
                                        r="5"
                                        fill="#2563eb"
                                    />
                                ))}
                            </svg>

                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-slate-400">
                                电压 U / V
                            </div>

                            <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-400">
                                电流 I / A
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-base font-semibold text-slate-900">分析结果</h2>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-sm text-slate-500">有效数据组数</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">
                                    {data.filter(
                                        (row) =>
                                            Number.isFinite(Number(row.voltage)) &&
                                            Number.isFinite(Number(row.current)) &&
                                            Number(row.current) !== 0
                                    ).length}
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-sm text-slate-500">平均电阻</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">
                                    {averageR === null ? "—" : `${averageR.toFixed(3)} Ω`}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <p className="text-sm font-medium text-blue-900">数据分析结论</p>
                            <p className="mt-2 text-sm leading-6 text-blue-800">
                                当前实验数据呈现较好的线性关系。后续接入真实拟合算法后，
                                系统将自动计算拟合直线、斜率、相关系数及实验误差。
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
