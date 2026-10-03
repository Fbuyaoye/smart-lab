# 学生端对接约定

教师端和学生端共享 Supabase 项目。学生端登录后使用当前用户 ID 作为 `student_id`，不要从表单或 URL 接收学生 ID。

先完成 `003_security_and_integrity.sql`。普通注册默认学生，`user_metadata.role` 不决定权限；教师必须由管理员授权。

## 班级

```ts
await supabase.rpc("join_class", { p_invite_code: inviteCode });
await supabase.from("class_members").select("class_id, classes(id, name, teacher_id)");
```

## 任务

学生只能查询自己已加入班级的任务：

```ts
await supabase
  .from("tasks")
  .select("id, deadline, classes(name), experiments(id, name, principle, key_points, procedure)")
  .order("deadline", { ascending: true });
```

## 报告

报告保存到 `reports`，数据字段使用 JSON：

```ts
const report = {
  task_id: taskId,
  student_id: user.id,
  raw_data: { rows: [] },
  calculation: { formulas: [], results: {} },
  final_content: "",
  status: "draft",
};
```

学生可以创建或更新 `draft`、`submitted` 报告。提交时将 `status` 更新为 `submitted`，数据库自动记录 `submitted_at`。教师评分后，学生可以读取自己的 `teacher_score`、`teacher_comment`、`ai_suggestion` 和 `graded_at`。

更新已有报告时只传内容字段和 `status`，不要更改 `id`、`task_id`、`student_id` 或 `created_at`。不要复制整行作为更新参数。`created_at`、`submitted_at` 和 `graded_at` 由数据库维护，客户端提供的提交和批改时间会被覆盖。退回草稿会清空提交时间，再次提交会记录新的提交时间；已批改报告不能由学生修改。

为了发现没有更新到记录的情况，更新后请求返回记录并检查错误：

```ts
const { data, error } = await supabase.from("reports")
  .update({ raw_data: report.raw_data, calculation: report.calculation,
    final_content: report.final_content, status: "submitted" })
  .eq("id", reportId).select("id,status,submitted_at").single();
if (error) throw error;
```

目前 `deadline` 只用于展示，不限制逾期提交；所有教师共享实验知识库的编辑权限。这两项是当前规则，如需限制应另行调整数据库策略。

## 教师端接收与展示

当前学生端提交的是 `public.reports` 中的结构化记录和报告正文，不是 Storage 附件。教师进入 `/teacher/reports` 即可读取有权限的报告，无需新增存储桶或修改数据库结构。

- `raw_data.rows`：测量数据，每行包含 `x`、`y`；表头取 `xLabel`、`yLabel`。没有 `rows` 时可展示 `validData`。
- `calculation`：展示 `formula`、`calculatedRows`、`deriveLabel`、`averageValue`、`calculationUnit` 和 `calculationTitle`。
- `calculation.fit`：展示拟合模型、方程、参数、指标和警告。显示时会处理浮点尾数，数据库原值不变。
- `final_content`：学生最终报告正文；`ai_content` 作为单独折叠的学生端 AI 生成稿，不能代替最终报告。
- `status = submitted`：在教师端显示“待批改”。教师保存评分后更新同一条记录的 `teacher_score`、`teacher_comment` 和 `status`；`graded_at` 由数据库维护。

页面可见时每 30 秒刷新，切回页面时也会刷新，并提供手动刷新按钮。刷新不会覆盖教师尚未保存的评分和评语。加载错误与空列表分开提示，刷新失败时保留上次成功加载的内容。

### 学生已提交但教师看不到

教师必须属于报告关联的任务和班级：`reports.task_id → tasks.class_id → classes.teacher_id`，且教师在 `public.users.role` 中为 `teacher`。在管理控制台看到报告不等于任意登录账号均可读取它；不要关闭 RLS 来解决空列表。

管理员可在 SQL Editor 运行 `supabase/check_report_delivery.sql`，将其中 `report_id` 改成需要检查的报告 ID。检查结果用于确认应该使用哪个教师账号登录，不会更改报告、角色或班级归属。同时确认教师端部署的 `NEXT_PUBLIC_SUPABASE_URL` 与学生端使用同一个项目，并已配置该项目的 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。

验收时先由所属教师打开报告，检查测量表、平均值、拟合方程与正文；学生再提交另一份报告，确认刷新后出现。教师保存评分后，用学生账号读取同一报告确认评分和评语；用其他班级教师验证无法读取该报告。前端本地校验不能替代这些登录后的线上验收。
