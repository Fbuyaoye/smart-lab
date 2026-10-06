"use client";

import { CurveFitWorkbench } from "@smart-lab/curve-fit-toolkit";
import "@smart-lab/curve-fit-toolkit/style.css";

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
                        独立的数据拟合与分析工具，可直接输入实验数据进行分析。
                    </p>
                </div>

                <CurveFitWorkbench />
            </div>
        </main>
    );
}