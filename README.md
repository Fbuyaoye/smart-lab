# Smart Lab AI 服务

这是大学物理实验智能导师平台的独立 TypeScript 后端，负责 AI 问答、报告辅助和确定性数据算法。它不修改，也不依赖现有的学生端或教师端项目。

## 接口能力

- `GET /health`：查看服务与 AI 配置状态。
- `GET /v1/experiments`：获取已注册的真实验列表。
- `POST /v1/analysis`：校验实验数据并运行确定性算法。
- `POST /v1/ai/qa`：根据当前实验的知识库回答学生问题。
- `POST /v1/ai/report`：先运行算法，再生成供学生修改的报告草稿。
- `POST /v1/ai/review`：先运行算法，再生成不给最终评分的审阅建议。

## 为什么默认没有实验算法

现有资料中有演示实验，但真实验的公式、数据字段、单位和判定阈值需要由教师确认。错误公式比没有公式更危险，因此未知的 `experimentId` 会被服务拒绝。接入数据分析前，请在 `src/specs/index.ts` 注册一个审核通过的真实验定义。

```ts
import type { ExperimentSpec } from "../domain.js";

const realExperiment: ExperimentSpec = {
  id: "real-experiment-id",
  version: 1,
  name: "真实验名称",
  fields: [
    { key: "x", label: "自变量测量值", unit: "单位", required: true },
    { key: "y", label: "因变量测量值", unit: "单位", required: true },
  ],
  analysis: {
    kind: "linear-regression",
    xKey: "x",
    yKey: "y",
    minRows: 3,
    minR2: 0.98,
  },
  aiContext: {
    principle: "填写教师审核通过的实验原理。",
    procedure: "填写教师审核通过的实验步骤。",
    commonIssues: "填写常见错误、单位和注意事项。",
  },
  reportSections: ["实验目的", "实验方法", "数据处理", "误差分析", "实验结论"],
};

registerExperiment(realExperiment);
```

算法输出是唯一可信的数值来源；AI 只解释结果，不能修改或重新计算数值。

## 本机运行

```bash
npm install
cp .env.example .env
npm run dev
```

在 `.env` 中设置随机且足够长的 `INTERNAL_API_TOKEN`。浏览器不能直接调用本服务，应由学生端或教师端的服务端路由携带 `Authorization: Bearer <INTERNAL_API_TOKEN>` 转发请求。

浏览器请访问 [http://localhost:8787/health](http://localhost:8787/health)，不要访问 `0.0.0.0:8787`。本服务是后端接口，不提供聊天页面。

## GLM 模式

`AI_MODE=glm` 时，服务端使用 `GLM_API_KEY` 调用智谱 GLM。默认模型是 `glm-4-flash`，默认接口为智谱的 Chat Completions 地址。密钥只存在于服务端，绝不能放在浏览器代码或提交到 Git。

## 本地 AI 模式

`AI_MODE=local` 时，可训练并运行轻量的朴素贝叶斯意图识别模型。回答仅从当前实验的知识库片段中组织，报告和审阅使用本地模板，不会调用外部 AI 服务。

```bash
npm run train:local
npm run dev
```

训练样本位于 `training/intent-training.json`。补充经过教师审核的学生提问样本后，重新运行 `npm run train:local` 即可训练模型。它不是通用大语言模型，不能补造缺失的操作步骤、公式或评分结论。

## 公网部署

目录中已包含 `Dockerfile`，可部署到 Railway、Render 或任意支持 Docker 的云平台。不要上传或提交 `.env`；请在云平台的环境变量面板中配置：

```text
AI_MODE=glm
GLM_API_KEY=你的智谱密钥
GLM_MODEL=glm-4-flash
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
INTERNAL_API_TOKEN=随机且足够长的服务间令牌
ALLOWED_ORIGIN=https://你的学生端域名
```

Docker 镜像已打包当前知识库索引。云平台会提供 `PORT`，不必固定为 `8787`。学生端应通过服务端代理调用公网 AI 服务；可复制的 Next.js 路由样例位于 `integration/nextjs/`。

## 请求示例

注册真实验后，可调用确定性分析接口：

```bash
curl http://localhost:8787/v1/analysis \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"experimentId":"real-experiment-id","rows":[{"x":1,"y":2},{"x":2,"y":4},{"x":3,"y":6}]}'
```

## 验证

```bash
npm run typecheck
npm test
```
