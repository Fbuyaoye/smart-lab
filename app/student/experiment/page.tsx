"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    fitCurve,
    type FitResult,
} from "@smart-lab/curve-fit-toolkit";
import { createClient } from "@/lib/supabase/browser";

type DataRow = {
    id: number;
    x: string;
    y: string;
};

type Point = {
    x: number;
    y: number;
};

type FitModel = "linear" | null;

type Experiment = {
    id: number;
    name: string;
    principle: string | null;
    key_points: string | null;
    procedure: string | null;
};

type Task = {
    id: number;
    experiment_id: number;
    deadline: string | null;
};

type ExperimentConfig = {
    key: string;

    xLabel: string;
    yLabel: string;

    xPlaceholder: string;
    yPlaceholder: string;

    relation: string;
    formula: string;

    fitModel: FitModel;

    calculationTitle: string;
    calculationDescription: string;

    deriveLabel?: string;
    calculationUnit?: string;

    deriveValue?: (x: number, y: number) => number | null;

    sampleData: DataRow[];

    reportDescription: string;
};

/* =========================================================
   七个实验配置
   ========================================================= */

const EXPERIMENT_CONFIGS: ExperimentConfig[] = [
    {
        key: "resistance",

        xLabel: "电流 I / A",
        yLabel: "电压 U / V",

        xPlaceholder: "例如 0.20",
        yPlaceholder: "例如 1.02",

        relation: "U-I 线性关系",
        formula: "U = RI + b",

        fitModel: "linear",

        calculationTitle: "电阻计算",
        calculationDescription:
            "以电流 I 为横坐标、电压 U 为纵坐标进行线性拟合，拟合直线斜率对应待测电阻。",

        deriveLabel: "单次电阻",
        calculationUnit: "Ω",

        deriveValue: (x, y) => {
            if (x === 0) return null;
            return y / x;
        },

        sampleData: [
            { id: 1, x: "0.10", y: "0.50" },
            { id: 2, x: "0.20", y: "1.00" },
            { id: 3, x: "0.30", y: "1.50" },
            { id: 4, x: "0.40", y: "2.00" },
            { id: 5, x: "0.50", y: "2.50" },
        ],

        reportDescription:
            "通过伏安法测量电阻，根据 U-I 数据进行线性拟合，并利用拟合关系分析待测电阻。",
    },

    {
        key: "pendulum",

        xLabel: "摆长 L / m",
        yLabel: "周期平方 T² / s²",

        xPlaceholder: "例如 0.40",
        yPlaceholder: "例如 1.62",

        relation: "T²-L 线性关系",
        formula: "T² = (4π²/g)L + b",

        fitModel: "linear",

        calculationTitle: "重力加速度计算",
        calculationDescription:
            "将单摆周期平方 T² 与摆长 L 建立线性关系，由拟合直线斜率进一步计算重力加速度。",

        deriveLabel: "T²/L",
        calculationUnit: "s²/m",

        deriveValue: (x, y) => {
            if (x === 0) return null;
            return y / x;
        },

        sampleData: [
            { id: 1, x: "0.20", y: "0.81" },
            { id: 2, x: "0.30", y: "1.22" },
            { id: 3, x: "0.40", y: "1.62" },
            { id: 4, x: "0.50", y: "2.03" },
            { id: 5, x: "0.60", y: "2.43" },
        ],

        reportDescription:
            "通过改变单摆摆长并测量对应周期，建立 T²-L 线性关系，由拟合斜率求取重力加速度。",
    },

    {
        key: "lens",

        xLabel: "1/u / m⁻¹",
        yLabel: "1/v / m⁻¹",

        xPlaceholder: "例如 0.50",
        yPlaceholder: "例如 0.50",

        relation: "1/u-1/v 线性关系",
        formula: "1/v = -1/u + 1/f",

        fitModel: "linear",

        calculationTitle: "焦距计算",
        calculationDescription:
            "根据薄透镜成像关系，将物距和像距倒数进行线性化处理，通过拟合结果分析透镜焦距。",

        deriveLabel: "1/f",
        calculationUnit: "m⁻¹",

        deriveValue: (x, y) => {
            return x + y;
        },

        sampleData: [
            { id: 1, x: "0.50", y: "0.50" },
            { id: 2, x: "0.40", y: "0.60" },
            { id: 3, x: "0.33", y: "0.67" },
            { id: 4, x: "0.25", y: "0.75" },
            { id: 5, x: "0.20", y: "0.80" },
        ],

        reportDescription:
            "通过测量物距和像距，根据薄透镜成像关系进行线性化拟合，并分析透镜焦距。",
    },

    {
        key: "prism",

        xLabel: "顶角 A / °",
        yLabel: "最小偏向角 δmin / °",

        xPlaceholder: "例如 60",
        yPlaceholder: "例如 40",

        relation: "棱镜顶角与最小偏向角关系",
        formula: "n = sin[(A + δmin)/2] / sin(A/2)",

        fitModel: null,

        calculationTitle: "棱镜折射率计算",
        calculationDescription:
            "根据棱镜顶角 A 和最小偏向角 δmin，利用最小偏向角公式计算棱镜材料折射率。",

        deriveLabel: "折射率 n",

        deriveValue: (x, y) => {
            const A = (x * Math.PI) / 180;
            const delta = (y * Math.PI) / 180;

            const denominator = Math.sin(A / 2);

            if (denominator === 0) {
                return null;
            }

            return (
                Math.sin((A + delta) / 2) /
                denominator
            );
        },

        sampleData: [
            { id: 1, x: "60", y: "40" },
            { id: 2, x: "60", y: "40.2" },
            { id: 3, x: "60", y: "39.8" },
            { id: 4, x: "60", y: "40.1" },
        ],

        reportDescription:
            "通过分光计测量棱镜顶角和最小偏向角，根据最小偏向角公式计算棱镜材料的折射率。",
    },

    {
        key: "liquid-crystal",

        xLabel: "电压 U / V",
        yLabel: "透射光强 I",

        xPlaceholder: "例如 0.50",
        yPlaceholder: "例如 0.30",

        relation: "透射光强随驱动电压变化",
        formula: "I = I(U)",

        fitModel: null,

        calculationTitle: "液晶电光效应分析",
        calculationDescription:
            "记录不同驱动电压下的透射光强，观察液晶电光效应的变化规律，不强制套用统一拟合模型。",

        sampleData: [
            { id: 1, x: "0.0", y: "0.10" },
            { id: 2, x: "1.0", y: "0.16" },
            { id: 3, x: "2.0", y: "0.28" },
            { id: 4, x: "3.0", y: "0.47" },
            { id: 5, x: "4.0", y: "0.68" },
        ],

        reportDescription:
            "通过记录不同驱动电压下液晶透射光强的变化，分析液晶材料的电光效应特性。",
    },

    {
        key: "meter",

        xLabel: "标准值",
        yLabel: "被校表读数",

        xPlaceholder: "例如 0.50",
        yPlaceholder: "例如 0.49",

        relation: "标准值-被校表读数线性关系",
        formula: "y = kx + b",

        fitModel: "linear",

        calculationTitle: "电表校准分析",
        calculationDescription:
            "将标准仪表读数与被校电表读数进行比较，通过校准曲线分析仪表的线性关系和测量误差。",

        deriveLabel: "读数误差",

        deriveValue: (x, y) => {
            return y - x;
        },

        sampleData: [
            { id: 1, x: "0.20", y: "0.19" },
            { id: 2, x: "0.40", y: "0.39" },
            { id: 3, x: "0.60", y: "0.59" },
            { id: 4, x: "0.80", y: "0.79" },
            { id: 5, x: "1.00", y: "0.98" },
        ],

        reportDescription:
            "通过标准仪表与被校电表之间的数据对比，建立校准关系并分析仪表的测量误差。",
    },

    {
        key: "viscosity",

        xLabel: "钢球半径平方 r² / m²",
        yLabel: "终端速度 v / (m·s⁻¹)",

        xPlaceholder: "例如 1.00e-6",
        yPlaceholder: "例如 0.010",

        relation: "终端速度与半径平方的线性关系",
        formula:
            "v = [2(ρs-ρl)g/(9η)]r²",

        fitModel: "linear",

        calculationTitle: "液体粘滞系数分析",
        calculationDescription:
            "在满足斯托克斯定律适用条件时，终端速度 v 与钢球半径平方 r² 成线性关系，可由拟合斜率进一步分析粘滞系数。",

        deriveLabel: "v/r²",
        calculationUnit: "m⁻¹·s⁻¹",

        deriveValue: (x, y) => {
            if (x === 0) return null;
            return y / x;
        },

        sampleData: [
            { id: 1, x: "1.0e-6", y: "0.0020" },
            { id: 2, x: "2.0e-6", y: "0.0040" },
            { id: 3, x: "3.0e-6", y: "0.0060" },
            { id: 4, x: "4.0e-6", y: "0.0080" },
            { id: 5, x: "5.0e-6", y: "0.0100" },
        ],

        reportDescription:
            "通过测量不同钢球的终端速度，建立终端速度与钢球半径平方之间的关系，并据此分析液体粘滞系数。",
    },
];

/* =========================================================
   根据实验名称选择配置
   ========================================================= */

function getExperimentConfig(
    name: string
): ExperimentConfig {
    if (name.includes("伏安法测电阻")) {
        return EXPERIMENT_CONFIGS[0];
    }

    if (name.includes("单摆")) {
        return EXPERIMENT_CONFIGS[1];
    }

    if (name.includes("薄透镜")) {
        return EXPERIMENT_CONFIGS[2];
    }

    if (
        name.includes("三棱镜") ||
        name.includes("分光计")
    ) {
        return EXPERIMENT_CONFIGS[3];
    }

    if (name.includes("液晶电光效应")) {
        return EXPERIMENT_CONFIGS[4];
    }

    if (name.includes("电表的改装")) {
        return EXPERIMENT_CONFIGS[5];
    }

    if (name.includes("落球法")) {
        return EXPERIMENT_CONFIGS[6];
    }

    return EXPERIMENT_CONFIGS[0];
}

/* =========================================================
   工具函数
   ========================================================= */

function formatNumber(
    value: number | null | undefined,
    digits = 4
) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
    ) {
        return "—";
    }

    return Number(value.toFixed(digits)).toString();
}

function createPoints(
    rows: DataRow[]
): Point[] {
    return rows
        .map((row) => ({
            x: Number(row.x),
            y: Number(row.y),
        }))
        .filter(
            (point) =>
                Number.isFinite(point.x) &&
                Number.isFinite(point.y)
        );
}

/* =========================================================
   页面
   ========================================================= */

export default function ExperimentPage() {
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [taskId, setTaskId] =
        useState<number | null>(null);

    const [task, setTask] =
        useState<Task | null>(null);

    const [experiment, setExperiment] =
        useState<Experiment | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [activeTab, setActiveTab] =
        useState("principle");

    const [data, setData] =
        useState<DataRow[]>([]);

    const [aiReport, setAiReport] =
        useState("");

    const [generatingReport, setGeneratingReport] =
        useState(false);

    const [submitted, setSubmitted] =
        useState(false);

    /* =======================================================
      taskId
      ======================================================= */

    useEffect(() => {
        async function resolveTaskId() {
            if (!supabase) {
                setError("Supabase 未配置");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");

            // ① 如果 URL 已经带 taskId，直接使用
            const value = searchParams.get("taskId");

            if (value) {
                const id = Number(value);

                if (!Number.isFinite(id)) {
                    setError("taskId 无效");
                    setLoading(false);
                    return;
                }

                setTaskId(id);
                return;
            }

            // ② 没有 taskId，自动寻找当前学生的第一个未完成任务

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                setError("登录状态已失效，请重新登录");
                setLoading(false);
                return;
            }

            // 获取当前学生所在的班级
            const {
                data: memberships,
                error: memberError,
            } = await supabase
                .from("class_members")
                .select("class_id")
                .eq("student_id", user.id);

            if (
                memberError ||
                !memberships ||
                memberships.length === 0
            ) {
                setError("当前学生还没有加入班级");
                setLoading(false);
                return;
            }

            const classIds = memberships.map(
                (item) => item.class_id
            );

            // 获取这些班级的实验任务
            const {
                data: tasks,
                error: taskError,
            } = await supabase
                .from("tasks")
                .select("id, experiment_id, deadline")
                .in("class_id", classIds)
                .order("deadline", {
                    ascending: true,
                    nullsFirst: false,
                });

            if (
                taskError ||
                !tasks ||
                tasks.length === 0
            ) {
                setError("当前没有可用的实验任务");
                setLoading(false);
                return;
            }

            // 获取当前学生自己的实验报告
            const {
                data: reports,
                error: reportError,
            } = await supabase
                .from("reports")
                .select("task_id, status")
                .eq("student_id", user.id);

            if (reportError) {
                console.error(
                    "加载实验报告状态失败：",
                    reportError
                );

                setError(
                    "加载实验完成状态失败：" +
                    reportError.message
                );

                setLoading(false);
                return;
            }

            // 已经提交/批改完成的任务视为已完成
            const completedTaskIds = new Set(
                (reports ?? [])
                    .filter(
                        (report) =>
                            report.status === "submitted" ||
                            report.status === "graded"
                    )
                    .map((report) => report.task_id)
            );

            // 找到第一个没有提交的任务
            const firstIncompleteTask = tasks.find(
                (task) =>
                    !completedTaskIds.has(task.id)
            );

            if (!firstIncompleteTask) {
                setError(
                    "所有实验任务都已经完成"
                );
                setLoading(false);
                return;
            }

            setTaskId(firstIncompleteTask.id);
        }

        resolveTaskId();
    }, [searchParams, supabase]);
    /* =======================================================
       加载任务和实验
       ======================================================= */

    useEffect(() => {
        async function loadExperiment() {
            if (!supabase || !taskId) {
                return;
            }

            setLoading(true);
            setError("");

            const {
                data: taskData,
                error: taskError,
            } = await supabase
                .from("tasks")
                .select(
                    "id, experiment_id, deadline"
                )
                .eq("id", taskId)
                .single();

            if (taskError || !taskData) {
                console.error(taskError);

                setError(
                    "加载实验任务失败：" +
                    (taskError?.message ??
                        "未找到任务")
                );

                setLoading(false);
                return;
            }

            setTask(taskData as Task);

            const {
                data: experimentData,
                error: experimentError,
            } = await supabase
                .from("experiments")
                .select(
                    "id, name, principle, key_points, procedure"
                )
                .eq(
                    "id",
                    taskData.experiment_id
                )
                .single();

            if (
                experimentError ||
                !experimentData
            ) {
                console.error(experimentError);

                setError(
                    "加载实验信息失败：" +
                    (experimentError?.message ??
                        "未找到实验")
                );

                setLoading(false);
                return;
            }

            setExperiment(
                experimentData as Experiment
            );

            setLoading(false);
        }

        loadExperiment();
    }, [taskId, supabase]);

    /* =======================================================
       当前实验配置
       ======================================================= */

    const config = useMemo(() => {
        return getExperimentConfig(
            experiment?.name ?? ""
        );
    }, [experiment]);

    /* =======================================================
       根据实验切换示例数据
       ======================================================= */

    useEffect(() => {
        setData(
            config.sampleData.map((row) => ({
                ...row,
            }))
        );

        setAiReport("");
        setSubmitted(false);
    }, [config.key]);

    /* =======================================================
       有效数据
       ======================================================= */

    const validData = useMemo(
        () => createPoints(data),
        [data]
    );

    /* =======================================================
       调用你的 curve-fit-toolkit
       ======================================================= */

    const fitResult = useMemo<FitResult | null>(() => {
        if (
            config.fitModel === null ||
            validData.length < 2
        ) {
            return null;
        }

        try {
            return fitCurve(
                validData,
                config.fitModel
            );
        } catch (error) {
            console.error(
                "数据拟合失败：",
                error
            );

            return null;
        }
    }, [
        validData,
        config.fitModel,
    ]);

    /* =======================================================
       单组数据计算
       ======================================================= */

    const calculatedRows = useMemo(() => {
        if (!config.deriveValue) {
            return [];
        }

        return validData.map((point) => ({
            ...point,
            value: config.deriveValue!(
                point.x,
                point.y
            ),
        }));
    }, [validData, config]);

    /* =======================================================
       平均计算值
       ======================================================= */

    const averageValue = useMemo(() => {
        const values = calculatedRows
            .map((row) => row.value)
            .filter(
                (value): value is number =>
                    value !== null &&
                    Number.isFinite(value)
            );

        if (values.length === 0) {
            return null;
        }

        return (
            values.reduce(
                (sum, value) => sum + value,
                0
            ) / values.length
        );
    }, [calculatedRows]);

    /* =======================================================
       数据操作
       ======================================================= */

    function updateRow(
        id: number,
        field: "x" | "y",
        value: string
    ) {
        setData((current) =>
            current.map((row) =>
                row.id === id
                    ? {
                        ...row,
                        [field]: value,
                    }
                    : row
            )
        );
    }

    function addRow() {
        setData((current) => [
            ...current,
            {
                id:
                    current.length > 0
                        ? Math.max(
                            ...current.map(
                                (row) => row.id
                            )
                        ) + 1
                        : 1,
                x: "",
                y: "",
            },
        ]);
    }

    function deleteRow(id: number) {
        setData((current) =>
            current.filter(
                (row) => row.id !== id
            )
        );
    }

    /* =======================================================
       AI 报告
       ======================================================= */

    async function generateAIReport() {
        setGeneratingReport(true);

        await new Promise((resolve) =>
            setTimeout(resolve, 700)
        );

        const fitText = fitResult
            ? `本实验采用${fitResult.model}拟合，拟合方程为：${fitResult.equation}。`
            : "本实验主要依据实验关系和物理公式进行数据分析，不强制采用统一拟合模型。";

        const warningText =
            fitResult &&
                fitResult.warnings.length > 0
                ? `拟合提示：${fitResult.warnings.join(
                    "；"
                )}`
                : "";

        const resultText =
            averageValue !== null
                ? `根据当前数据得到的${config.deriveLabel ?? "计算结果"}平均值约为 ${formatNumber(
                    averageValue
                )}${config.calculationUnit
                    ? ` ${config.calculationUnit}`
                    : ""
                }。`
                : "当前数据暂未得到统一的单值计算结果。";

        const report = `
实验名称：${experiment?.name ?? "未命名实验"}

实验关系：${config.relation}

实验公式：${config.formula}

${config.reportDescription}

本次共录入 ${validData.length} 组有效实验数据。

${fitText}

${resultText}

${warningText}

实验结果应结合实验原理、仪器精度和测量误差进行进一步分析。
    `.trim();

        setAiReport(report);
        setGeneratingReport(false);
    }

    /* =======================================================
       提交
       ======================================================= */

    async function handleSubmit() {
        if (!supabase) {
            setError("Supabase 未配置");
            return;
        }

        if (!taskId) {
            setError("当前实验任务不存在");
            return;
        }

        if (validData.length === 0) {
            setError("请至少录入一组有效实验数据后再提交");
            return;
        }

        try {
            setError("");

            /* =====================================================
               1. 获取当前登录学生
               ===================================================== */

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!user) {
                setError("登录状态已失效，请重新登录");
                return;
            }

            /* =====================================================
               2. 整理原始实验数据
               ===================================================== */

            const rawData = {
                rows: data,
                validData,
                xLabel: config.xLabel,
                yLabel: config.yLabel,
            };

            /* =====================================================
               3. 整理数据计算结果
               ===================================================== */

            const calculation = {
                calculationTitle: config.calculationTitle,
                formula: config.formula,
                deriveLabel: config.deriveLabel ?? null,
                calculationUnit: config.calculationUnit ?? null,
                calculatedRows,
                averageValue,
                fit: fitResult
                    ? {
                        model: fitResult.model,
                        equation: fitResult.equation,
                        parameters: fitResult.parameters,
                        metrics: fitResult.metrics,
                        warnings: fitResult.warnings,
                    }
                    : null,
            };

            /* =====================================================
               4. 检查当前学生是否已经有这份实验报告
               ===================================================== */

            const {
                data: existingReport,
                error: existingReportError,
            } = await supabase
                .from("reports")
                .select("id")
                .eq("task_id", taskId)
                .eq("student_id", user.id)
                .maybeSingle();

            if (existingReportError) {
                throw existingReportError;
            }

            /* =====================================================
               5. 已有报告 → 更新
               没有报告 → 新建
               ===================================================== */

            if (existingReport) {
                const { error: updateError } = await supabase
                    .from("reports")
                    .update({
                        raw_data: rawData,
                        calculation,
                        ai_content: aiReport || null,
                        final_content: aiReport || null,
                        status: "submitted",
                    })
                    .eq("id", existingReport.id)
                    .eq("student_id", user.id);

                if (updateError) {
                    throw updateError;
                }
            } else {
                const { error: insertError } = await supabase
                    .from("reports")
                    .insert({
                        task_id: taskId,
                        student_id: user.id,
                        raw_data: rawData,
                        calculation,
                        ai_content: aiReport || null,
                        final_content: aiReport || null,
                        status: "submitted",
                    });

                if (insertError) {
                    throw insertError;
                }
            }

            /* =====================================================
               6. 数据库写入成功后，再显示“提交成功”
               ===================================================== */

            setSubmitted(true);

        } catch (err) {
            console.error("提交实验失败：", err);

            if (err instanceof Error) {
                setError("提交实验失败：" + err.message);
            } else {
                setError("提交实验失败，请稍后重试");
            }

            setSubmitted(false);
        }
    }

    /* =======================================================
       Loading
       ======================================================= */

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl">
                    <div className="rounded-2xl bg-white p-8 shadow-sm">
                        正在加载实验……
                    </div>
                </div>
            </main>
        );
    }

    /* =======================================================
       Error
       ======================================================= */

    if (error || !experiment) {
        return (
            <main className="min-h-screen bg-slate-50 p-8">
                <div className="mx-auto max-w-7xl">
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">
                        {error || "实验不存在"}
                    </div>
                </div>
            </main>
        );
    }

    /* =======================================================
       Tabs
       ======================================================= */

    const tabs = [
        {
            id: "principle",
            label: "实验原理",
        },
        {
            id: "data",
            label: "数据记录",
        },
        {
            id: "calculation",
            label: "数据计算",
        },
        {
            id: "fitting",
            label: "拟合分析",
        },
        {
            id: "report",
            label: "AI实验报告",
        },
        {
            id: "submit",
            label: "提交实验",
        },
    ];

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl p-6 md:p-8">

                {/* =================================================
            标题
            ================================================= */}

                <div className="mb-6">
                    <div className="text-sm font-medium text-blue-600">
                        大学物理实验
                    </div>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                        {experiment.name}
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        {config.relation}
                    </p>
                </div>

                {/* =================================================
            实验信息
            ================================================= */}

                <div className="mb-6 grid gap-4 md:grid-cols-3">

                    <InfoCard
                        title="实验关系"
                        value={config.relation}
                    />

                    <InfoCard
                        title="数据变量"
                        value={`${config.xLabel} → ${config.yLabel}`}
                    />

                    <InfoCard
                        title="数据分析方式"
                        value={
                            config.fitModel
                                ? "线性拟合"
                                : "实验关系曲线"
                        }
                    />

                </div>

                {/* =================================================
            Tabs
            ================================================= */}

                <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() =>
                                setActiveTab(tab.id)
                            }
                            className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-medium transition ${activeTab === tab.id
                                ? "bg-blue-600 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* =================================================
            实验原理
            ================================================= */}

                {activeTab === "principle" && (
                    <section className="space-y-6">

                        <ContentCard title="实验原理">
                            <p className="whitespace-pre-wrap leading-8 text-slate-600">
                                {experiment.principle ||
                                    "暂无实验原理说明。"}
                            </p>
                        </ContentCard>

                        <ContentCard title="核心公式">
                            <div className="rounded-xl bg-slate-50 p-6 text-center">
                                <div className="text-2xl font-semibold text-slate-900">
                                    {config.formula}
                                </div>
                            </div>
                        </ContentCard>

                        <ContentCard title="实验要点">
                            <p className="whitespace-pre-wrap leading-8 text-slate-600">
                                {experiment.key_points ||
                                    "暂无实验要点。"}
                            </p>
                        </ContentCard>

                        <ContentCard title="实验步骤">
                            <p className="whitespace-pre-wrap leading-8 text-slate-600">
                                {experiment.procedure ||
                                    "暂无实验步骤。"}
                            </p>
                        </ContentCard>

                    </section>
                )}

                {/* =================================================
            数据记录
            ================================================= */}

                {activeTab === "data" && (
                    <ContentCard title="实验数据记录">

                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">

                            <div>
                                <p className="text-sm text-slate-500">
                                    当前实验数据：
                                </p>

                                <p className="mt-1 font-medium text-slate-900">
                                    {config.xLabel} →{" "}
                                    {config.yLabel}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={addRow}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                + 添加数据
                            </button>

                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full min-w-[700px] border-collapse">

                                <thead>
                                    <tr className="border-b border-slate-200 text-left text-sm text-slate-500">

                                        <th className="px-4 py-3">
                                            序号
                                        </th>

                                        <th className="px-4 py-3">
                                            {config.xLabel}
                                        </th>

                                        <th className="px-4 py-3">
                                            {config.yLabel}
                                        </th>

                                        <th className="px-4 py-3">
                                            操作
                                        </th>

                                    </tr>
                                </thead>

                                <tbody>
                                    {data.map((row, index) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-slate-100"
                                        >

                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {index + 1}
                                            </td>

                                            <td className="px-4 py-3">
                                                <input
                                                    value={row.x}
                                                    onChange={(event) =>
                                                        updateRow(
                                                            row.id,
                                                            "x",
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder={
                                                        config.xPlaceholder
                                                    }
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                                                />
                                            </td>

                                            <td className="px-4 py-3">
                                                <input
                                                    value={row.y}
                                                    onChange={(event) =>
                                                        updateRow(
                                                            row.id,
                                                            "y",
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder={
                                                        config.yPlaceholder
                                                    }
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                                                />
                                            </td>

                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        deleteRow(row.id)
                                                    }
                                                    className="text-sm text-red-500 hover:text-red-700"
                                                >
                                                    删除
                                                </button>
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>

                            </table>
                        </div>

                        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                            当前共有{" "}
                            <strong>
                                {validData.length}
                            </strong>{" "}
                            组有效数据。
                        </div>

                    </ContentCard>
                )}

                {/* =================================================
            数据计算
            ================================================= */}

                {activeTab === "calculation" && (
                    <section className="space-y-6">

                        <ContentCard title={config.calculationTitle}>

                            <p className="leading-8 text-slate-600">
                                {config.calculationDescription}
                            </p>

                            <div className="mt-5 rounded-xl bg-slate-50 p-5">
                                <div className="text-sm text-slate-500">
                                    实验公式
                                </div>

                                <div className="mt-2 text-xl font-semibold text-slate-900">
                                    {config.formula}
                                </div>
                            </div>

                        </ContentCard>

                        {config.deriveValue &&
                            calculatedRows.length > 0 && (
                                <ContentCard title="数据计算结果">

                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[650px] border-collapse">

                                            <thead>
                                                <tr className="border-b border-slate-200 text-left text-sm text-slate-500">

                                                    <th className="px-4 py-3">
                                                        序号
                                                    </th>

                                                    <th className="px-4 py-3">
                                                        {config.xLabel}
                                                    </th>

                                                    <th className="px-4 py-3">
                                                        {config.yLabel}
                                                    </th>

                                                    <th className="px-4 py-3">
                                                        {config.deriveLabel}
                                                    </th>

                                                </tr>
                                            </thead>

                                            <tbody>
                                                {calculatedRows.map(
                                                    (row, index) => (
                                                        <tr
                                                            key={index}
                                                            className="border-b border-slate-100"
                                                        >

                                                            <td className="px-4 py-3">
                                                                {index + 1}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {formatNumber(
                                                                    row.x
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {formatNumber(
                                                                    row.y
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3 font-medium">
                                                                {formatNumber(
                                                                    row.value
                                                                )}
                                                                {config.calculationUnit
                                                                    ? ` ${config.calculationUnit}`
                                                                    : ""}
                                                            </td>

                                                        </tr>
                                                    )
                                                )}
                                            </tbody>

                                        </table>
                                    </div>

                                    <div className="mt-6 rounded-xl bg-green-50 p-5">

                                        <div className="text-sm text-green-700">
                                            平均结果
                                        </div>

                                        <div className="mt-2 text-2xl font-bold text-green-800">
                                            {formatNumber(
                                                averageValue
                                            )}
                                            {config.calculationUnit
                                                ? ` ${config.calculationUnit}`
                                                : ""}
                                        </div>

                                    </div>

                                </ContentCard>
                            )}

                        {!config.deriveValue && (
                            <ContentCard title="说明">
                                <div className="rounded-xl bg-amber-50 p-5 leading-7 text-amber-800">
                                    本实验主要通过实验关系曲线分析数据，
                                    不对单组数据强制计算一个统一物理量。
                                </div>
                            </ContentCard>
                        )}

                    </section>
                )}

                {/* =================================================
            拟合分析
            ================================================= */}

                {activeTab === "fitting" && (
                    <section className="space-y-6">

                        <ContentCard title="拟合分析">

                            <div className="grid gap-4 md:grid-cols-2">

                                <div className="rounded-xl bg-slate-50 p-5">
                                    <div className="text-sm text-slate-500">
                                        数据关系
                                    </div>

                                    <div className="mt-2 font-semibold text-slate-900">
                                        {config.relation}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-5">
                                    <div className="text-sm text-slate-500">
                                        对应公式
                                    </div>

                                    <div className="mt-2 font-semibold text-slate-900">
                                        {config.formula}
                                    </div>
                                </div>

                            </div>

                        </ContentCard>

                        <ContentCard title="实验数据曲线">

                            {validData.length < 2 ? (
                                <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">
                                    至少需要两组有效数据才能生成曲线。
                                </div>
                            ) : (
                                <DataChart
                                    points={validData}
                                    fittedPoints={
                                        fitResult?.fittedPoints ??
                                        []
                                    }
                                    xLabel={config.xLabel}
                                    yLabel={config.yLabel}
                                    showFit={
                                        fitResult !== null
                                    }
                                />
                            )}

                        </ContentCard>

                        {fitResult && (
                            <ContentCard title="拟合结果">

                                <div className="grid gap-4 md:grid-cols-2">

                                    <div className="rounded-xl bg-slate-50 p-5">
                                        <div className="text-sm text-slate-500">
                                            拟合模型
                                        </div>

                                        <div className="mt-2 text-lg font-semibold text-slate-900">
                                            {fitResult.model}
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-5">
                                        <div className="text-sm text-slate-500">
                                            拟合方程
                                        </div>

                                        <div className="mt-2 text-lg font-semibold text-slate-900">
                                            {fitResult.equation}
                                        </div>
                                    </div>

                                </div>

                                {fitResult.warnings.length >
                                    0 && (
                                        <div className="mt-5 rounded-xl bg-amber-50 p-5 text-sm leading-7 text-amber-800">
                                            {fitResult.warnings.map(
                                                (warning, index) => (
                                                    <div key={index}>
                                                        {warning}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}

                                <div className="mt-5 rounded-xl bg-blue-50 p-5 text-sm leading-7 text-blue-800">
                                    {config.key ===
                                        "resistance" && (
                                            <>
                                                伏安法中，U-I 拟合直线的斜率对应待测电阻。
                                            </>
                                        )}

                                    {config.key ===
                                        "pendulum" && (
                                            <>
                                                单摆实验中，T²-L 拟合直线的斜率与重力加速度 g 有关。
                                            </>
                                        )}

                                    {config.key ===
                                        "lens" && (
                                            <>
                                                薄透镜实验中，通过线性化关系可以进一步由拟合参数分析透镜焦距。
                                            </>
                                        )}

                                    {config.key ===
                                        "meter" && (
                                            <>
                                                电表改装实验中，拟合结果用于分析标准值与被校表读数之间的校准关系。
                                            </>
                                        )}

                                    {config.key ===
                                        "viscosity" && (
                                            <>
                                                落球法中，终端速度与钢球半径平方之间建立线性关系后，可结合相关物理参数进一步求取粘滞系数。
                                            </>
                                        )}
                                </div>

                            </ContentCard>
                        )}

                        {!fitResult && (
                            <ContentCard title="实验关系说明">

                                <div className="rounded-xl bg-amber-50 p-5 leading-7 text-amber-800">
                                    当前实验不强制使用统一的数学拟合模型。
                                    上方曲线用于展示实验数据的实际变化关系，
                                    避免为了生成拟合直线而引入没有物理依据的模型。
                                </div>

                            </ContentCard>
                        )}

                    </section>
                )}

                {/* =================================================
            AI报告
            ================================================= */}

                {activeTab === "report" && (
                    <section className="space-y-6">

                        <ContentCard title="AI 实验报告">

                            <p className="leading-7 text-slate-600">
                                AI 将根据当前实验名称、实验关系、实验公式、实验数据和分析结果生成实验报告。
                            </p>

                            <button
                                type="button"
                                onClick={generateAIReport}
                                disabled={generatingReport}
                                className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {generatingReport
                                    ? "正在生成……"
                                    : "生成实验报告"}
                            </button>

                        </ContentCard>

                        {aiReport && (
                            <ContentCard title="实验报告">

                                <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-6 leading-8 text-slate-700">
                                    {aiReport}
                                </div>

                            </ContentCard>
                        )}

                    </section>
                )}

                {/* =================================================
            提交
            ================================================= */}

                {activeTab === "submit" && (
                    <section className="space-y-6">

                        <ContentCard title="提交实验">

                            <p className="leading-7 text-slate-600">
                                提交前请确认实验数据、数据计算、曲线分析和实验报告均已完成。
                            </p>

                            <div className="mt-6 grid gap-4 md:grid-cols-3">

                                <StatusCard
                                    title="有效数据"
                                    value={`${validData.length} 组`}
                                />

                                <StatusCard
                                    title="数据分析"
                                    value={
                                        fitResult
                                            ? "拟合完成"
                                            : "关系分析完成"
                                    }
                                />

                                <StatusCard
                                    title="AI报告"
                                    value={
                                        aiReport
                                            ? "已生成"
                                            : "未生成"
                                    }
                                />

                            </div>

                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitted}
                                className="mt-8 rounded-xl bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitted ? "已提交" : "提交实验"}
                            </button>

                        </ContentCard>

                        {submitted && (
                            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-green-800">
                                <div className="font-semibold">
                                    实验提交成功
                                </div>

                                <div className="mt-2 text-sm">
                                    当前实验数据、分析和报告已经完成提交流程。
                                </div>
                            </div>
                        )}

                    </section>
                )}

            </div>
        </main>
    );
}

/* =========================================================
   信息卡
   ========================================================= */

function InfoCard({
    title,
    value,
}: {
    title: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
                {title}
            </div>

            <div className="mt-2 font-semibold text-slate-900">
                {value}
            </div>
        </div>
    );
}

/* =========================================================
   内容卡
   ========================================================= */

function ContentCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
                {title}
            </h2>

            <div className="mt-5">
                {children}
            </div>
        </div>
    );
}

/* =========================================================
   状态卡
   ========================================================= */

function StatusCard({
    title,
    value,
}: {
    title: string;
    value: string;
}) {
    return (
        <div className="rounded-xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">
                {title}
            </div>

            <div className="mt-2 text-lg font-semibold text-slate-900">
                {value}
            </div>
        </div>
    );
}

/* =========================================================
   SVG 曲线
   ========================================================= */

function DataChart({
    points,
    fittedPoints,
    xLabel,
    yLabel,
    showFit,
}: {
    points: Point[];
    fittedPoints: Point[];
    xLabel: string;
    yLabel: string;
    showFit: boolean;
}) {
    const width = 900;
    const height = 460;

    const paddingLeft = 80;
    const paddingRight = 40;
    const paddingTop = 40;
    const paddingBottom = 70;

    const plotWidth =
        width -
        paddingLeft -
        paddingRight;

    const plotHeight =
        height -
        paddingTop -
        paddingBottom;

    const allPoints = [
        ...points,
        ...(showFit ? fittedPoints : []),
    ];

    const xs = allPoints.map(
        (point) => point.x
    );

    const ys = allPoints.map(
        (point) => point.y
    );

    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);

    if (minX === maxX) {
        minX -= 1;
        maxX += 1;
    }

    if (minY === maxY) {
        minY -= 1;
        maxY += 1;
    }

    const xRange = maxX - minX;
    const yRange = maxY - minY;

    function xToSvg(x: number) {
        return (
            paddingLeft +
            ((x - minX) / xRange) *
            plotWidth
        );
    }

    function yToSvg(y: number) {
        return (
            paddingTop +
            plotHeight -
            ((y - minY) / yRange) *
            plotHeight
        );
    }

    return (
        <div className="overflow-x-auto">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-auto w-full min-w-[760px]"
            >
                {/* 网格 */}
                <line
                    x1={paddingLeft}
                    y1={paddingTop}
                    x2={paddingLeft}
                    y2={
                        height -
                        paddingBottom
                    }
                    stroke="currentColor"
                    className="text-slate-300"
                />

                <line
                    x1={paddingLeft}
                    y1={
                        height -
                        paddingBottom
                    }
                    x2={
                        width -
                        paddingRight
                    }
                    y2={
                        height -
                        paddingBottom
                    }
                    stroke="currentColor"
                    className="text-slate-300"
                />

                {/* 拟合曲线 */}
                {showFit &&
                    fittedPoints.length >= 2 && (
                        <polyline
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-blue-500"
                            points={fittedPoints
                                .map(
                                    (point) =>
                                        `${xToSvg(
                                            point.x
                                        )},${yToSvg(
                                            point.y
                                        )}`
                                )
                                .join(" ")}
                        />
                    )}

                {/* 实验数据 */}
                {points.map(
                    (point, index) => (
                        <circle
                            key={index}
                            cx={xToSvg(point.x)}
                            cy={yToSvg(point.y)}
                            r="6"
                            fill="currentColor"
                            className="text-slate-800"
                        />
                    )
                )}

                {/* X轴标题 */}
                <text
                    x={width / 2}
                    y={height - 20}
                    textAnchor="middle"
                    className="fill-slate-600 text-sm"
                >
                    {xLabel}
                </text>

                {/* Y轴标题 */}
                <text
                    x="20"
                    y={height / 2}
                    textAnchor="middle"
                    transform={`rotate(-90 20 ${height / 2
                        })`}
                    className="fill-slate-600 text-sm"
                >
                    {yLabel}
                </text>

                {/* X最小值 */}
                <text
                    x={paddingLeft}
                    y={
                        height -
                        paddingBottom +
                        25
                    }
                    className="fill-slate-400 text-xs"
                >
                    {formatNumber(minX)}
                </text>

                {/* X最大值 */}
                <text
                    x={
                        width -
                        paddingRight
                    }
                    y={
                        height -
                        paddingBottom +
                        25
                    }
                    textAnchor="end"
                    className="fill-slate-400 text-xs"
                >
                    {formatNumber(maxX)}
                </text>

                {/* Y最大值 */}
                <text
                    x={paddingLeft - 10}
                    y={paddingTop}
                    textAnchor="end"
                    className="fill-slate-400 text-xs"
                >
                    {formatNumber(maxY)}
                </text>

                {/* Y最小值 */}
                <text
                    x={paddingLeft - 10}
                    y={
                        height -
                        paddingBottom
                    }
                    textAnchor="end"
                    className="fill-slate-400 text-xs"
                >
                    {formatNumber(minY)}
                </text>
            </svg>
        </div>
    );
}