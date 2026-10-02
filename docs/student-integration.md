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
