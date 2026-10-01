# 学生端对接约定

教师端和学生端共享 Supabase 项目。学生端登录后使用当前用户 ID 作为 `student_id`，不要从表单或 URL 接收学生 ID。

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
