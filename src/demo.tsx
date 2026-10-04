import { createRoot } from "react-dom/client";
import { useState } from "react";
import { TeacherReviewWorkbench } from "./TeacherReviewWorkbench";
import type { AiReview, TeacherReport } from "./types";
import "./review.css";

const initialReports: TeacherReport[] = [
  {
    id: 101,
    studentName: "陈同学",
    studentNumber: "2024001001",
    className: "物理实验 1 班",
    experimentName: "光电效应",
    experimentId: "photoelectric-effect",
    submittedAt: "2026-10-04 10:20",
    status: "submitted",
    rawData: [
      { frequency: "5.49e14 Hz", stoppingVoltage: "-0.42 V" },
      { frequency: "5.84e14 Hz", stoppingVoltage: "-0.57 V" },
      { frequency: "6.17e14 Hz", stoppingVoltage: "-0.71 V" },
      { frequency: "6.50e14 Hz", stoppingVoltage: "-0.86 V" }
    ],
    calculation: { fittingFormula: "U = -4.12e-15 f + 1.84", slope: "-4.12e-15 V s", rSquared: 0.986 },
    finalContent: "实验目的：测定普朗克常量并了解光电效应规律。\n\n数据处理：以遏止电压 U 为纵轴、入射光频率 f 为横轴进行线性拟合，相关系数 R² 为 0.986。\n\n结论：遏止电压随入射光频率升高而增大，实验结果与光电效应方程的线性关系基本一致。误差主要来自电压读数波动和滤光片标称波长误差。"
  },
  {
    id: 102,
    studentName: "林同学",
    studentNumber: "2024001016",
    className: "物理实验 1 班",
    experimentName: "伏安特性",
    experimentId: "voltammetry",
    submittedAt: "2026-10-03 16:42",
    status: "graded",
    rawData: [{ voltage: "0.5 V", current: "11.2 mA" }, { voltage: "1.0 V", current: "21.8 mA" }],
    calculation: { resistance: "45.7 Ω", relativeError: "3.2%" },
    finalContent: "根据伏安曲线计算待测电阻，测量值与标称值接近。分析发现高电压区电流读数的离散程度较大。",
    teacherScore: 88,
    teacherComment: "数据整理清楚，建议在误差分析中说明电表内阻的影响。"
  },
  {
    id: 103,
    studentName: "王同学",
    studentNumber: "2024002012",
    className: "物理实验 2 班",
    experimentName: "霍尔效应",
    experimentId: "hall-effect",
    status: "draft",
    rawData: [],
    calculation: {},
    finalContent: ""
  }
];

const demoReview: AiReview = {
  dataQuality: "数据点数量满足当前记录要求，但第 4 组读数需复核单位。",
  calculationConsistency: "拟合结果已列出，建议补充斜率的物理含义与单位。",
  conclusionConsistency: "结论方向与数据趋势一致，但需要引用具体测量结果。",
  suggestions: ["核对第 4 组数据的单位和有效数字。", "在计算部分补充拟合公式与 R²。", "结论中写明测得量、单位和误差来源。"],
  riskLevel: "medium"
};

function Demo() {
  const [reports, setReports] = useState(initialReports);
  return <div className="teacher-review-demo">
    <TeacherReviewWorkbench
      reports={reports}
      requestAiReview={async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        return { review: demoReview };
      }}
      onSave={async ({ reportId, score, comment, aiReview }) => {
        setReports((current) => current.map((report) => report.id === reportId ? { ...report, status: "graded", teacherScore: score, teacherComment: comment, aiReview } : report));
      }}
    />
  </div>;
}

createRoot(document.getElementById("root")!).render(<Demo />);
