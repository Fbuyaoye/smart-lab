# 数据库检查与修复操作说明

**当前进度：用户已执行修复，17 项验收全部 PASS；2026-10-02 22:14（Asia/Shanghai）公开 API 复查确认匿名访问已被拒绝。无需重跑下面的迁移步骤，接下来仅需第5节的业务验收。**

本项目不能通过 publishable key 直接读取 Supabase 数据库结构。请在 Supabase Dashboard 中操作：打开正确项目的 **SQL Editor**，使用能运行管理 SQL 的账号执行迁移。

本次项目：`cvznriztyfugjrgubobj`。Project URL 为 `https://cvznriztyfugjrgubobj.supabase.co`。
控制台入口：[打开 SQL Editor](https://supabase.com/dashboard/project/cvznriztyfugjrgubobj/sql)。
`.env.local` 被 Git 忽略，不随代码同步；新检出的项目需重新填写 URL 和 publishable key（也兼容 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）。部署平台的环境变量需单独填写，然后重新构建和部署。教师端 AI 批改优先配置 `AI_SERVICE_URL` 和 `AI_SERVICE_TOKEN`，默认转发到 `/v1/ai/review-draft`；模型密钥和服务间令牌只放服务端环境变量。

## 1. 先确认项目和备份

1. 在 Supabase 项目首页复制 Project URL，确认它和 `.env.local` 的 `NEXT_PUBLIC_SUPABASE_URL` 相同。前端使用 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，不要把 `service_role` key 放入 `.env.local` 或提交到 Git。
2. 进入 **Database → Backups**，确认最近备份时间；在付费计划上创建手动备份。免费计划至少把下面几张表导出保存：`users`、`classes`、`class_members`、`experiments`、`tasks`、`reports`。
3. 在 SQL Editor 点 **New query / +** 新建查询，先粘贴 `supabase/preflight.sql` 全部内容，选择 `postgres` 角色并点击 **Run**。保存或复制返回的 `database_preflight` JSON 单元格。这个查询只检查结构，即使初始化尚未完成也能执行，不包含学生报告或账号数据。
4. 已确认六张表以及 `reports.submitted_at`、`reports.graded_at` 存在时，再运行 `supabase/diagnostics.sql` 的各个编号查询，保存各自结果。可选中一个查询后点击 **Run**；一次执行全部语句时，界面可能只显示最后一组结果。

## 2. 应用修复

**针对已收到的 `cvznriztyfugjrgubobj` preflight 结果：** 六张表已开启 RLS，16 条策略、9 个函数和5个已启用触发器与 001/002 相符；角色来源仍是 `raw_user_meta_data`，登录用户仍有六张表的 TRUNCATE 权限，未见 003 的任务保护触发器。这次只需执行 **003**。不要重跑 001/002；`seed.sql` 仅在需要补充三个示例实验时执行，不是权限修复的前置步骤。

执行 003 后，新建查询并运行 `supabase/verify_repair.sql` 全文，将返回的17行结果复制回来。前11项应为 `PASS`；后6项出现 `REVIEW` 表示存在需要核对的数据，不要据此批量删数据或取消教师角色。已有教师角色不会被 003 自动撤销，必须核实其授权来源。全部 `PASS` 也不能代替教师/学生账号的业务验收。

以下顺序仅供全新项目或其他部署参考：

按以下顺序执行，每个脚本执行成功后再执行下一个：

1. `supabase/migrations/001_init.sql`（全新项目才需要；已有项目跳过已经执行过的迁移；部分表缺失时先核对 preflight，避免覆盖现有结构）。
2. `supabase/migrations/002_hardening.sql`（全新项目执行；已有项目确认以前已执行过，不要仅凭两个时间列存在就认定全部策略和触发器都已应用）。
3. `supabase/migrations/003_security_and_integrity.sql`。
4. `supabase/migrations/004_experiment_knowledge_id.sql`（接入教师端 AI 批改时执行，为实验补充稳定知识库标识）。
5. `supabase/seed.sql`。

每个文件新建一个 SQL 查询，复制文件全部内容后运行，不要只复制中间一段。003 自带 `begin/commit`，如果报错，记录完整错误并停止执行后续脚本；不要为了通过而删去出错语句。

迁移 003 可以重复执行。它会补齐缺失的用户资料、禁止用户用 `user_metadata.role` 自封教师、保护报告归属和生命周期时间，并收紧表和函数权限。`seed.sql` 按实验名称去重，可重复执行。003 依赖前两个迁移的策略和触发器，无法替代它们；对线上自行增加的策略也不会自动删除，需根据 preflight 核对。

执行后再次运行 `diagnostics.sql`。正常情况下：

- 六张业务表都存在且 `rls_enabled = true`；
- `missing_profiles = 0`；
- 报告一致性查询没有结果；
- `anon_can_*` 和两个 `*_can_truncate` 列全为 `false`；
- `tasks_experiment_id_idx` 存在。

## 3. 核对和授权教师

003 对新账号及缺失资料的账号按可信 `app_metadata` 分配角色，默认学生；已有 `public.users` 中的教师角色会保留，不会自动降权。先用诊断脚本第 3 个查询列出账号，逐个确认邮箱。确认无误后，在 SQL Editor 以 `postgres` 执行：

```sql
-- 只需替换下面的邮箱。账号不存在或匹配不唯一时整段回滚。
do $$
declare
  target_user_id uuid;
  target_email text := 'teacher@example.com';
  target_role text := 'teacher';
begin
  select id into strict target_user_id from auth.users
  where lower(email) = lower(target_email);
  if not exists (select 1 from public.users where id = target_user_id) then
    raise exception '缺少用户资料，请先完成迁移 003';
  end if;
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', target_role)
  where id = target_user_id;
  update public.users set role = target_role where id = target_user_id;
end;
$$;
```

如果要撤销教师权限，只把 `target_role` 的值改成 `student`，不要修改邮箱中的文字。不要让教师在客户端执行这些语句。授权后退出该账号并重新登录，使新的 token metadata 生效；应用权限以 `public.users.role` 为准。

## 4. 必须手动决定的数据问题

诊断脚本只报告问题，不会猜测业务含义，也不会删除数据。出现下面结果时请人工处理：

- `users` 中有旧教师，但 `auth.users.raw_app_meta_data.role` 没有 `teacher`：确认邮箱后按上面的 SQL 授权或降为学生；
- 报告所属学生不在任务班级：先核对导入错误，再决定补 `class_members` 还是删除报告；
- 一个实验名称有多个 ID：确认任务引用的 ID 后再合并，禁止直接删除被任务引用的实验；
- 班级教师不是教师角色：核对账号后修正 `public.users.role`；
- 诊断列出未知 RLS policy、匿名权限或可执行函数：截图/保存结果，先删除不需要的 policy 或 revoke 权限，再重新运行诊断。

不要直接执行 `truncate` 或 `delete from` 清空表。报告、任务和班级存在级联关系，误删无法由这套迁移恢复。

## 5. 验收流程

使用两个真实测试账号在无痕窗口完成：

1. 学生输入正确的邀请码可加入对应班级（允许加入多个班级）；无效邀请码应失败。未加入的班级及其任务应不可见。
2. 学生创建草稿并提交，检查 `submitted_at` 自动生成；客户端传入伪造时间应被数据库覆盖。
3. 教师只能看到自己班级的报告，能将 `submitted` 改成 `graded` 并写入评分；草稿不能直接批改。
4. 学生不能修改 `teacher_score`、`teacher_comment`、`ai_suggestion`、`graded` 状态、`student_id` 或 `task_id`；已批改报告不能修改。
5. 普通新注册账号即使把 `user_metadata` 填成 `{ "role": "teacher" }` 也不能访问教师端。只有管理员写入 `raw_app_meta_data` 并同步 `public.users.role` 后才可以。
6. 匿名请求不能读取或写入六张业务表。

最后再次运行 `diagnostics.sql`，把结果和迁移执行时间留档。若线上仍有错误，把对应 SQL 错误文本和 diagnostics 结果发回，不要发送任何密钥。
