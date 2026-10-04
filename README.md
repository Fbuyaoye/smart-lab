# 大学物理实验知识库

这是“智实验”AI 助手使用的可维护知识库，不是重新训练一个大模型。AI 回答时应先从当前实验的资料中检索，再将检索到的内容连同学生问题交给模型。

当前已根据课程清单建立 20 个实验的目录和资料模板。实验名称是课程索引，资料正文保持待补充状态，避免在没有指导书的情况下编造公式、步骤或判定阈值。

## 目录

```text
documents/experiments.json  实验目录、别名、资料与检测规则模板
schema.json                 每个实验资料的字段规范
scripts/build-index.mjs     从资料构建本地检索索引
scripts/search.mjs          本地关键词检索，用于调试资料覆盖情况
index.json                  自动生成的检索索引，不手工编辑
```

## 导入每项实验资料

在 `documents/experiments.json` 中，找到对应实验，在下列字段中补入已审核的教学资料：

- `objective`：实验目的
- `principle`：实验原理及符号定义
- `apparatus`：仪器与量程
- `procedure`：规范操作步骤和安全注意事项
- `dataRequirements`：数据列名、单位、范围与有效数字
- `formulae`：公式、变量和适用条件
- `commonIssues`：常见错误与排查方法
- `reportRequirements`：报告必填项和评分点
- `detectionRules`：可由程序确定性检查的规则

所有内容必须来自本校实验指导书、教师确认材料或已审核的评分标准。每段资料填写 `sourceDocuments`，记录来源文件和页码。

## 构建和检索

无需安装额外依赖：

```bash
cd /Users/mac/Documents/Codex/2026-10-02/users-mac-work-smartlab/outputs/smart-lab-knowledge-base
node scripts/build-index.mjs
node scripts/search.mjs "霍尔效应 误差"
```

## 接入 AI 服务

学生端 AI 助手将请求中的 `experimentId` 传至 AI 服务。服务端应：

1. 从本知识库取得相同 `id` 的实验资料。
2. 检索与问题最相关的资料片段。
3. 将片段、实验名称和问题传给模型。
4. 若没有足够资料，回复“当前实验资料尚未录入完整，请向教师确认”，而不是猜测。

报告检测分为两层：`detectionRules` 做缺失字段、单位、范围、公式和拟合指标等确定性检测；AI 只辅助检查步骤、结论和误差分析是否与资料相符。
