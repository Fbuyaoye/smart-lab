# Supabase 实验与 AI 知识库映射

## 问题

`public.experiments.id` 是自增数据库主键，会随着插入顺序变化，不能作为 AI 知识库的稳定实验标识。AI 知识库使用字符串键，例如 `photoelectric-effect`。

## 执行顺序

1. 在 Supabase SQL Editor 执行 `migrations/003_add_experiment_knowledge_id.sql`。
2. 执行 `seed_knowledge_experiments.sql`，导入与当前知识库一致的 20 个实验。
3. 教师在后台为每项实验补充、审核 `principle`、`procedure`、`key_points` 和 `common_issues`。

已有的演示实验可以保留，但其 `knowledge_id` 为 `NULL` 时，学生端不应把它用于实验限定问答。

## 学生端请求

任务查询需要选择嵌套实验的 `id,name,knowledge_id`。数据库主键 `id` 继续用于任务、报告等关系；只有 `knowledge_id` 传给 AI：

```ts
const body = {
  question,
  history,
  ...(task.experiments.knowledge_id
    ? { experimentId: task.experiments.knowledge_id }
    : {}),
};
```

- “知识问答”页不传 `experimentId`，检索整个知识库。
- 具体实验页传 `task.experiments.knowledge_id`，检索当前实验资料。
- 不要传 `task.experiments.id`，例如 `1`、`2`、`3`；这类自增 ID 与知识库 ID 没有稳定对应关系。

## `specs/index.ts` 的职责

`POST /v1/ai/qa` 只依赖知识库，不依赖 `src/specs/index.ts`。因此 20 个实验完成上述映射后即可用于问答。

`src/specs/index.ts` 只供以下接口使用：

- `POST /v1/analysis`
- `POST /v1/ai/report`
- `POST /v1/ai/review`

这些接口必须等拿到每个真实验经教师确认的数据字段、单位、公式和阈值后再单独注册，不能用占位或猜测公式。
