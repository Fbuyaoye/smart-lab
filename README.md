# Smart Lab 教师作业批改工具包

面向大学物理实验教师的实验报告批改界面。它提供报告队列、报告正文与原始数据查看、AI 结构化审阅、教师评分和评语保存能力。

AI 的职责是发现数据、计算和结论中的可疑点，**不会给出最终分数或通过/不通过结论**；教师保存的分数与评语才是正式批改结果。

## 本地预览

```bash
npm install
npm run dev
```

终端会显示访问地址。预览页使用三份本地模拟报告和模拟 AI 审阅结果，不依赖账号、数据库或模型密钥。

## 接入现有教师端

将工具包安装到教师端项目后，在页面中传入报告列表和保存回调：

```tsx
import { TeacherReviewWorkbench } from "@smart-lab/teacher-review-toolkit";
import "@smart-lab/teacher-review-toolkit/style.css";

<TeacherReviewWorkbench
  reports={reports}
  onSave={async ({ reportId, score, comment, aiReview }) => {
    await saveTeacherReview({ reportId, score, comment, aiReview });
  }}
/>
```

`reports` 中每项应符合 `TeacherReport` 类型。`experimentId` 必须使用 AI 知识库登记的稳定标识，例如 `photoelectric-effect`、`hall-effect`，不要直接传 Supabase 的自增数字 ID。

## 接入 AI 审阅

默认会调用教师端的 `POST /api/ai/review`，请求数据为：

```json
{
  "experimentId": "photoelectric-effect",
  "rawData": [],
  "calculation": {},
  "finalContent": "学生实验报告正文"
}
```

该 Next.js 代理样例位于 AI 服务项目的 `integration/nextjs/app/api/ai/review/route.ts`。代理再请求 AI 服务的 `POST /v1/ai/review-draft`，需由教师端服务端配置 `AI_SERVICE_URL` 和 `AI_SERVICE_TOKEN`，不能把模型密钥或内部服务令牌放到浏览器代码中。

AI 返回格式：

```ts
{
  review: {
    dataQuality: string;
    calculationConsistency: string;
    conclusionConsistency: string;
    suggestions: string[];
    riskLevel: "low" | "medium" | "high";
  };
}
```

若教师端的接口路径不同，使用 `requestAiReview={createAiReviewClient("/你的接口")}` 覆盖默认请求即可。

## 验证

```bash
npm run typecheck
npm test
npm run build
```
