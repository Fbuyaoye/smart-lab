import { createRoot } from "react-dom/client";
import { ExperimentReportWorkbench } from "./ExperimentReportWorkbench";
import type { GenerateReport } from "./types";

const demoGenerate: GenerateReport = async ({ metadata, analysisSummary, studentNotes }) => {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return { draft: {
    purpose: `完成“${metadata.experimentName}”的测量与数据处理，理解实验现象及相应物理规律。`,
    dataAnalysis: analysisSummary,
    results: "本次数据已完成整理。请根据计算结果补充最终测得量、单位和有效数字。",
    errorAnalysis: studentNotes ? `结合实验记录，可能需要关注：${studentNotes}` : "请结合读数、仪器精度、环境条件和操作过程分析本次误差来源。",
    conclusion: "请依据本次实验数据，补充经过核对的实验结论。",
  } };
};

createRoot(document.getElementById("root")!).render(
  <main style={{ background: "#f6f8fc", minHeight: "100vh", padding: "34px clamp(18px, 4vw, 56px)" }}>
    <ExperimentReportWorkbench
      experimentName="用伏安法测电阻"
      rawData={[{ x: 0.1, y: 0.5 }, { x: 0.2, y: 1.0 }, { x: 0.3, y: 1.5 }, { x: 0.4, y: 2.0 }]}
      analysisSummary="以电流 I 为横坐标、电压 U 为纵坐标进行线性拟合。请将实际拟合斜率、截距、R² 和单位写入报告。"
      generate={demoGenerate}
    />
  </main>,
);
