# Supabase 线上只读检查记录

**最新状态：用户执行修复后，17 项 SQL 汇总检查全部 PASS；2026-10-02 22:14（Asia/Shanghai）匿名 API 复查也符合预期。下文保留修复前记录，最新验收详见文末。**

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

## 收到管理员 preflight 结果后的结论

用户后续提供的结构 JSON 确认六张表均存在且 RLS 已开启，16 条策略、9 个函数和5个已启用触发器与 001/002 对应。以下问题不再只是 API 推测：

- `handle_new_user` 使用 `raw_user_meta_data.role` 授予教师权限，注册者可自行填写该字段；这是需要优先修复的角色提升漏洞。
- 六张表的 `authenticated_has_truncate` 均为 true。TRUNCATE 不受 RLS 保护，属于过度授权；此次未测试或声称存在可直接通过普通 REST 调用的 TRUNCATE 入口。
- 报告时间函数使用 `coalesce(new.*_at, now())`，会接受客户端指定时间，且普通更新不保护时间字段。
- 报告保护函数未限制修改任务/学生归属，也未限制教师修改学生报告内容；没有任务关联保护触发器。
- `is_class_teacher` 不复核当前教师角色，角色撤销后仍可能通过已有班级关系保留权限。
- 匿名用户持有业务表 SELECT 及所列函数 EXECUTE 权限。RLS 当前阻止了探测中的匿名数据返回；不能把表级授权等同于已经发生数据泄露。

对应修复为已有 `003_security_and_integrity.sql`，无需重跑 001/002。执行后运行 `verify_repair.sql` 获取单一汇总表，并人工核实现有教师身份。该 preflight 不含用户记录、报告或实验数据，因此尚不能判断历史数据是否受影响。

## 修复后验收：2026-10-02 22:14（Asia/Shanghai）

用户提供的 `verify_repair.sql` 结果共17项，`problem_count` 全部为0、`result` 全部为 PASS。该结果确认检查范围内的表/RLS、表和函数授权、search_path、触发器绑定、可信注册角色来源、索引与用户资料符合预期；教师角色 metadata 一致性、实验重名及报告关联/时间检查未发现异常。此处 SQL 结果由用户提供，并非代理通过管理员连接自行查询。

代理随后重新执行 `scripts/check-supabase.ps1`，直接获得以下只读 API 结果：

| 检查 | HTTP | 结果 |
| --- | --- | --- |
| 认证设置 | 200 | 正常 |
| 六张业务表匿名查询 | 401 / 42501 | 全部 permission denied，符合修复预期 |
| 报告时间列匿名查询 | 401 / 42501 | permission denied |
| `is_teacher` 匿名调用 | 401 / 42501 | permission denied |

上述权限拒绝是预期行为，不代表数据库连接失败。目前无需重复执行修复迁移。尚未运行登录用户的完整业务验收：教师创建班级/发布任务、学生加入/提交报告、教师批改，以及另一学生和另一教师的跨账号访问隔离。请按 `database-repair.md` 第5节使用测试账号验收；SQL 全 PASS 不意味着数据库一定已有业务数据，也不能证明所有实际教师身份已经人工核实。
