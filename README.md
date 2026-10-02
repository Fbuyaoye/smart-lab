# 智实验教师端

这是大学物理实验智能导师平台的教师端与数据库基础实现，覆盖：

- Supabase Auth 登录
- 教师班级管理和邀请码
- 从实验知识库发布任务
- 报告列表、AI 辅助检查、教师评分和评语
- PostgreSQL 表结构、关联关系、RLS 权限和学生加入班级 RPC

## 本地启动

```bash
npm install
copy .env.example .env.local
npm run dev
```

在 Supabase SQL Editor 依次执行：

1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/002_hardening.sql`
3. `supabase/migrations/003_security_and_integrity.sql`
4. `supabase/seed.sql`

然后在 Supabase Auth 中创建账号。普通注册默认学生，user metadata 只用于姓名：

```json
{"name":"教师姓名"}
```

教师角色必须由管理员授权，不能通过 `user_metadata.role` 自行申请。
已有数据库的升级、教师授权 SQL、线上诊断和验收步骤见 [数据库检查与修复操作说明](docs/database-repair.md)。
已有部署不要重跑旧迁移覆盖权限；按说明只执行尚未应用的迁移。

## 分支

当前开发分支：`codex/teacher-database`

## 远程开发注意事项

- `.env.local` 不得提交到 GitHub。
- DeepSeek Key 只在服务端 API Route 使用。
- 生产环境部署前应确认 Supabase 的 RLS 已开启，并用教师、学生两个账号分别走完整流程。

## 教师端验收顺序

1. 在 Supabase Auth 创建教师和学生测试账号，并按数据库修复说明给教师授权。用户 metadata 可设置 `{"name":"姓名"}`。
2. 教师登录后创建班级，记录邀请码；学生调用 `join_class` 加入班级。
3. 教师发布实验任务；学生端按 `tasks -> reports` 约定保存草稿并将状态更新为 `submitted`。
4. 教师在“报告检查”查看学生报告，生成 AI 建议并保存评分。`submitted_at` 和 `graded_at` 由数据库触发器写入。
5. 用学生账号确认不能读取其他学生报告、不能写入教师评分或将报告标为 `graded`。

学生端接入时应使用同一个 Supabase 项目和 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，不要把 DeepSeek Key 放到浏览器端。
