-- Read-only catalog snapshot. Works before 001 and before 002 as well.
-- Run the whole query in SQL Editor and share the single JSON result.
with expected(name) as (
  values ('users'), ('classes'), ('class_members'), ('experiments'), ('tasks'), ('reports')
), tables as (
  select e.name, c.oid is not null as table_exists, c.relrowsecurity as rls_enabled,
    case when c.oid is not null then has_table_privilege('anon', c.oid, 'SELECT') end as anon_has_select,
    case when c.oid is not null then has_table_privilege('authenticated', c.oid, 'TRUNCATE') end as authenticated_has_truncate
  from expected e
  left join pg_namespace n on n.nspname = 'public'
  left join pg_class c on c.relnamespace = n.oid and c.relname = e.name and c.relkind = 'r'
), report_columns as (
  select a.attname as name, format_type(a.atttypid, a.atttypmod) as type
  from pg_attribute a
  where a.attrelid = to_regclass('public.reports') and a.attnum > 0 and not a.attisdropped
), functions as (
  select p.proname as name, pg_get_function_identity_arguments(p.oid) as arguments,
    p.proconfig as settings, p.prosecdef as security_definer,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in (
    'handle_new_user', 'protect_user_role', 'protect_teacher_fields',
    'protect_report_timestamps', 'set_report_insert_timestamp', 'protect_task_relationships',
    'is_teacher', 'is_class_teacher', 'is_class_member', 'join_class'
  ) and p.prokind = 'f'
), policies as (
  select tablename, policyname, roles, cmd, qual, with_check
  from pg_policies where schemaname = 'public' and tablename in (select name from expected)
), triggers as (
  select n.nspname as schema, c.relname as table_name, t.tgname as name,
    t.tgenabled as enabled, pg_get_triggerdef(t.oid) as definition
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal and (
    (n.nspname = 'public' and c.relname in (select name from expected))
    or (n.nspname = 'auth' and c.relname = 'users' and t.tgname = 'on_auth_user_created')
  )
)
select jsonb_build_object(
  'tables', coalesce((select jsonb_agg(to_jsonb(t) order by t.name) from tables t), '[]'::jsonb),
  'report_columns', coalesce((select jsonb_agg(to_jsonb(c) order by c.name) from report_columns c), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(to_jsonb(f) order by f.name) from functions f), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(p) order by p.tablename, p.policyname) from policies p), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(to_jsonb(t) order by t.schema, t.table_name, t.name) from triggers t), '[]'::jsonb)
) as database_preflight;
