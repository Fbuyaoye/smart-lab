"use client";
import { CurveFitWorkbench } from "@smart-lab/curve-fit-toolkit";
import { useMemo, useState } from "react";
//import "./curve-fit.css";
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

//import { CurveFitWorkbench } from "@smart-lab/curve-fit-toolkit";

export default function AnalysisPage() {
    return (
        <main className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6">
                    <p className="text-sm font-medium text-blue-600">
                        数据分析工具包
                    </p>

                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                        实验数据分析
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        输入实验数据，自由选择拟合方式，快速获得数据分析结果。
                    </p>
                </div>

                <CurveFitWorkbench />
            </div>
        </main>
    );
}