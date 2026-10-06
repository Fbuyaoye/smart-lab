# 实验报告工作台

独立的 React + TypeScript 实验报告组件，匹配 Smart Lab 学生端的浅灰背景、白色面板与蓝色操作风格。它不直接修改现有学生端。

## 已实现

- 实验信息：实验名称、课程、学生、学号、班级、教师和实验日期。
- 标准实验报告结构：目的、原理、仪器、步骤、数据处理、结果、误差分析、结论。
- AI 生成报告草稿，生成后仍可逐段编辑。
- 导出 A4 排版 PDF，文件名使用“实验名称-学生姓名.pdf”。
- 生成边界提示：AI 不能替代原始记录、教师审核或最终结论。

## 预览

```bash
cd /Users/mac/work/smartLab/smart-lab-report-toolkit
npm install
npm run dev
```

预览页使用演示生成器，不会调用外部 AI。

## 接入学生端

```tsx
"use client";

import { ExperimentReportWorkbench } from "@smart-lab/experiment-report-toolkit";
import "@smart-lab/experiment-report-toolkit/style.css";

export default function ReportPage() {
  return (
    <ExperimentReportWorkbench
      experimentId={task.experiment.knowledge_id}
      experimentName={task.experiment.name}
      rawData={rows}
      analysisSummary={analysisSummary}
    />
  );
}
```

默认会请求同域 `POST /api/ai/report`。该路由应在学生端服务端实现，并把数据转发到 AI 服务；浏览器端不能保存 `GLM_API_KEY` 或 `AI_SERVICE_TOKEN`。

AI 服务已提供 `POST /v1/ai/report-draft`，它通过当前实验的知识库、原始数据、数据分析摘要和学生备注生成八个报告章节，不依赖算法规格。将 AI 服务的 [Next.js 代理样例](/Users/mac/work/smartLab/smart-lab-ai-service-new/integration/nextjs/app/api/ai/report/route.ts) 复制到学生端的 `app/api/ai/report/route.ts`，并在学生端服务端环境变量中配置：

```env
AI_SERVICE_URL=http://127.0.0.1:8787
AI_SERVICE_TOKEN=与AI服务的INTERNAL_API_TOKEN一致
```

具体实验页必须传 `experimentId={task.experiment.knowledge_id}`，该值应是知识库 ID，例如 `photoelectric-effect`，不是 Supabase 的自增数字 `experiments.id`。

## 验证

```bash
npm run typecheck
npm test
npm run build
```
