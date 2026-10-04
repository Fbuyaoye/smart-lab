# AI 实验助教工具包

独立的 React + TypeScript 学生端 AI 助手组件，后续可嵌入智实验学生端，不修改现有项目。

## 功能

- 中文实验问答对话界面，匹配智实验现有的蓝色、白色卡片和圆角风格。
- 实验原理、操作步骤、误差分析、数据处理与报告表达四类快捷问题。
- 多轮对话历史，提交时最多发送最近 10 条消息。
- 发送中、服务异常、清空对话和字符限制状态。
- 浏览器端只调用项目自己的 `/api/ai/qa`，不会包含 GLM 密钥或服务间令牌。

## 预览

```bash
cd /Users/mac/Documents/Codex/2026-10-02/users-mac-work-smartlab/outputs/smart-lab-ai-assistant-toolkit
npm install
npm run dev
```

预览页面使用明确标记的演示回答。生产环境必须接入项目服务端接口。

## 接入学生端

```tsx
"use client";

import { AssistantWorkbench } from "@smart-lab/ai-assistant-toolkit";

export default function KnowledgeQaPage() {
  return (
    <AssistantWorkbench experimentName="通用物理实验问答" />
  );
}
```

在具体实验页面传入实验信息即可限定知识库范围：

```tsx
<AssistantWorkbench
  experimentId={task.experiment.id}
  experimentName={task.experiment.name}
/>
```

默认调用同域的 `POST /api/ai/qa`，请求格式：

```json
{
  "question": "如何判断数据异常？",
  "history": [
    { "role": "assistant", "content": "..." },
    { "role": "student", "content": "..." }
  ]
}
```

`experimentId` 为可选字段：省略时会从全部实验资料中检索；传入时只检索对应实验。

接口需返回：

```json
{ "answer": "AI 的中文回答" }
```

## 服务端转发示例

Next.js 项目应在服务端转发到独立 AI 服务，GLM 密钥和服务间令牌均不可传给浏览器：

```ts
// app/api/ai/qa/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(`${process.env.AI_SERVICE_URL}/v1/ai/qa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_SERVICE_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
```

`/v1/ai/qa` 已支持通用和实验限定两种模式。知识库中需要持续导入经教师审核的指导书内容，AI 才能基于资料回答，而不是凭空编造。
