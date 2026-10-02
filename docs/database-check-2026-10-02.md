# Supabase 线上只读检查记录

项目：`cvznriztyfugjrgubobj`  
时间：2026-10-02 15:59（Asia/Shanghai）  
身份：用户提供的 publishable key，无登录用户 JWT。

## 实测结果

| 检查 | HTTP | 结果 |
| --- | --- | --- |
| `/auth/v1/settings` | 200 | 项目认证 API 接受所提供的 key |
| 六张表：users、classes、class_members、experiments、tasks、reports | 200 | 每表匿名查询 `limit=1`，均返回空数组 |
| reports 的 id、submitted_at、graded_at 列 | 200 | `limit=0` 查询通过，接口识别这些列 |
| GET `/rest/v1/rpc/is_teacher` | 200 | 匿名可调用，返回 false |
| REST 根目录结构端点 | 401 | 要求 secret API key，公开 key 无权获取 |

检查过程中没有创建账号、调用加入班级 RPC、插入、更新或删除线上数据。使用系统代理的 PowerShell 请求成功；Node fetch 发生连接重置或超时，不能将这类客户端网络失败判断为数据库故障。

## 可以确认的结论

- URL 与 key 可以配合访问项目 API，本地缺少连接配置的问题已修复，配置保存在 Git 忽略的 `.env.local`。
- 业务表和报告时间列已通过 Data API 暴露，无需凭空假设项目是空库。
- 本次匿名探测未返回业务记录。空表与 RLS 过滤都可能产生空数组，不能仅凭此断言 RLS 已正确开启。
- 线上权限不符合本地迁移 003 的预期：003 应撤销匿名对业务表的 SELECT 及对 `is_teacher` 的 EXECUTE，而实测两者都成功。可能尚未执行 003，也可能之后权限又被修改；仅凭 API 无法判断迁移历史。

## 尚未核实

完整 RLS 策略、函数体与 search_path、触发器、TRUNCATE 权限、教师角色来源、历史数据一致性、实验重复数据、登录后的教师/学生隔离均需管理员诊断或测试账号。没有执行任何线上 SQL 修复，不能把本地应用构建通过当作数据库权限测试通过。

下一步在控制台执行 `supabase/preflight.sql`，返回一个不含业务记录的结构 JSON；确认与 001/002 相符后执行 003，再按 `docs/database-repair.md` 进行详细诊断和角色验收。

重复本次匿名检查：在 PowerShell 7 中运行 `./scripts/check-supabase.ps1`。003 正确应用后，六张表及 RPC 的匿名请求应返回权限错误（通常 HTTP 401、PostgreSQL 错误码 42501），认证设置端点仍可正常返回。脚本不会记录业务行内容或密钥。
