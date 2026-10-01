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
2. `supabase/seed.sql`

然后在 Supabase Auth 中创建教师账号。创建账号时可在 user metadata 设置：

```json
{"role":"teacher","name":"教师姓名"}
```

## 分支

当前开发分支：`codex/teacher-database`

## 远程开发注意事项

- `.env.local` 不得提交到 GitHub。
- DeepSeek Key 只在服务端 API Route 使用。
- 生产环境部署前应确认 Supabase 的 RLS 已开启，并用教师、学生两个账号分别走完整流程。
