-- Read-only verification after 003. Run the entire file as postgres.
-- One result table; no account names, email addresses, or report content.
-- PASS checks structure/grants/data only, not a logged-in end-to-end test.
with expected_tables(name) as (
  values ('users'), ('classes'), ('class_members'), ('experiments'), ('tasks'), ('reports')
), table_state as (
  select e.name, c.oid, c.relrowsecurity
  from expected_tables e
  left join pg_namespace n on n.nspname = 'public'
  left join pg_class c on c.relnamespace = n.oid and c.relname = e.name and c.relkind = 'r'
), expected_functions(signature, application_rpc) as (
  values ('public.handle_new_user()', false), ('public.protect_user_role()', false),
    ('public.protect_teacher_fields()', false), ('public.protect_report_timestamps()', false),
    ('public.set_report_insert_timestamp()', false), ('public.protect_task_relationships()', false),
    ('public.is_teacher()', true), ('public.is_class_teacher(bigint)', true),
    ('public.is_class_member(bigint)', true), ('public.join_class(text)', true)
), function_state as (
  select e.signature, e.application_rpc, p.oid, p.proconfig
  from expected_functions e left join pg_proc p on p.oid = to_regprocedure(e.signature)
), expected_triggers(table_name, trigger_name, function_name) as (
  values
    ('auth.users', 'on_auth_user_created', 'public.handle_new_user()'),
    ('public.users', 'protect_user_role', 'public.protect_user_role()'),
    ('public.reports', 'protect_report_teacher_fields', 'public.protect_teacher_fields()'),
    ('public.reports', 'set_report_timestamps', 'public.protect_report_timestamps()'),
    ('public.reports', 'set_report_insert_timestamps', 'public.set_report_insert_timestamp()'),
    ('public.tasks', 'protect_task_relationships', 'public.protect_task_relationships()')
), checks(sort_order, check_name, problem_count) as (
  select 1, '业务表缺失或 RLS 未开启', count(*)
  from table_state where oid is null or not relrowsecurity
  union all
  select 2, '匿名仍有业务表权限', count(*) from table_state
  where has_table_privilege('anon', oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  union all
  select 3, '登录用户仍有 TRUNCATE/REFERENCES/TRIGGER 权限', count(*) from table_state
  where has_table_privilege('authenticated', oid, 'TRUNCATE,REFERENCES,TRIGGER')
  union all
  select 4, '函数缺失或匿名仍可执行', count(*) from function_state
  where oid is null or has_function_privilege('anon', oid, 'EXECUTE')
  union all
  select 5, '登录用户的函数执行权限不符', count(*) from function_state
  where oid is null or has_function_privilege('authenticated', oid, 'EXECUTE') is distinct from application_rpc
  union all
  select 6, '函数未固定空 search_path', count(*) from function_state
  where oid is null or not coalesce('search_path=""' = any(proconfig), false)
  union all
  select 7, '触发器缺失、未启用或绑定错误', count(*)
  from expected_triggers e left join pg_trigger t
    on t.tgrelid = to_regclass(e.table_name) and t.tgname = e.trigger_name and not t.tgisinternal
  where t.oid is null or t.tgenabled not in ('O', 'A')
    or t.tgfoid is distinct from to_regprocedure(e.function_name)::oid
  union all
  select 8, '注册函数未切换可信角色来源', count(*)
  from (select pg_get_functiondef(to_regprocedure('public.handle_new_user()')) as body) f
  where body is null or position('raw_app_meta_data' in body) = 0
    or body ~ 'raw_user_meta_data\s*->>\s*''role'''
  union all
  select 9, '用户角色列仍可由登录用户更新',
    case when has_column_privilege('authenticated', 'public.users', 'role', 'UPDATE') then 1 else 0 end
  union all
  select 10, '缺少任务实验外键索引',
    case when exists (
      select 1 from pg_index i where i.indexrelid = to_regclass('public.tasks_experiment_id_idx')
        and i.indrelid = to_regclass('public.tasks') and i.indisvalid and i.indisready
    ) then 0 else 1 end
  union all
  select 11, 'Auth 账号缺少用户资料', count(*) from auth.users a
  left join public.users u on u.id = a.id where u.id is null
  union all
  select 12, '现有教师需人工核实授权来源', count(*) from public.users u
  join auth.users a on a.id = u.id
  where u.role = 'teacher' and (a.raw_app_meta_data->>'role') is distinct from 'teacher'
  union all
  select 13, '可信教师 metadata 与用户资料角色不一致', count(*) from auth.users a
  join public.users u on u.id = a.id
  where a.raw_app_meta_data->>'role' = 'teacher' and u.role <> 'teacher'
  union all
  select 14, '重复的实验名称组数', count(*)
  from (select name from public.experiments group by name having count(*) > 1) duplicates
  union all
  select 15, '报告角色、班级关系或时间异常', count(*)
  from public.reports r join public.tasks t on t.id = r.task_id
  join public.users u on u.id = r.student_id
  left join public.class_members cm on cm.class_id = t.class_id and cm.student_id = r.student_id
  where u.role <> 'student' or cm.id is null
    or (r.status = 'draft' and (r.submitted_at is not null or r.graded_at is not null))
    or (r.status in ('submitted', 'graded') and r.submitted_at is null)
    or (r.status = 'graded' and r.graded_at is null)
    or (r.status <> 'graded' and r.graded_at is not null)
    or r.submitted_at > now() or r.graded_at > now()
    or r.submitted_at < r.created_at or r.graded_at < r.submitted_at
  union all
  select 16, '班级负责人不是教师', count(*) from public.classes c
  join public.users u on u.id = c.teacher_id where u.role <> 'teacher'
  union all
  select 17, '班级成员不是学生', count(*) from public.class_members cm
  join public.users u on u.id = cm.student_id where u.role <> 'student'
)
select sort_order as no, check_name, problem_count,
  case when problem_count = 0 then 'PASS'
    when sort_order >= 12 then 'REVIEW' else 'FAIL' end as result
from checks order by sort_order;
