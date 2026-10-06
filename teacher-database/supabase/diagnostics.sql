-- Read-only. Run in Supabase SQL Editor as postgres after the migrations.
-- If a query reports a missing relation, finish the schema migrations first.

-- 1. Expect six tables, all with rls_enabled = true.
select expected.name, c.oid is not null as table_exists, c.relrowsecurity as rls_enabled
from (values ('users'), ('classes'), ('class_members'), ('experiments'), ('tasks'), ('reports')) expected(name)
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = expected.name and c.relkind = 'r';

-- 2. Expect zero missing profiles.
select count(*) as missing_profiles
from auth.users a left join public.users u on u.id = a.id where u.id is null;

-- 3. REVIEW EVERY EXISTING TEACHER. A false marker needs manual verification;
-- it is not proof of abuse (old deployments used user_metadata).
select u.id, a.email, u.name, u.role,
  coalesce(a.raw_app_meta_data->>'role' = 'teacher', false) as admin_metadata_confirms_teacher,
  a.raw_user_meta_data->>'role' as untrusted_user_metadata_role
from public.users u join auth.users a on a.id = u.id
where u.role = 'teacher' or a.raw_app_meta_data->>'role' = 'teacher';

-- 4. Expect no rows: inconsistent report state, membership, or user roles.
select r.id, r.task_id, r.student_id, r.status,
  case
    when u.role <> 'student' then 'report owner is not a student'
    when cm.id is null then 'student is not in the task class'
    when r.status = 'draft' and (r.submitted_at is not null or r.graded_at is not null) then 'draft has lifecycle timestamps'
    when r.status in ('submitted', 'graded') and r.submitted_at is null then 'missing submitted_at'
    when r.status = 'graded' and r.graded_at is null then 'missing graded_at'
    when r.status <> 'graded' and r.graded_at is not null then 'unexpected graded_at'
    when r.submitted_at > now() or r.graded_at > now() then 'future lifecycle timestamp'
    when r.submitted_at < r.created_at then 'submission predates creation'
    when r.graded_at < r.submitted_at then 'grading predates submission'
  end as issue
from public.reports r
join public.tasks t on t.id = r.task_id
join public.users u on u.id = r.student_id
left join public.class_members cm on cm.class_id = t.class_id and cm.student_id = r.student_id
where u.role <> 'student' or cm.id is null
  or (r.status = 'draft' and (r.submitted_at is not null or r.graded_at is not null))
  or (r.status in ('submitted', 'graded') and r.submitted_at is null)
  or (r.status = 'graded' and r.graded_at is null)
  or (r.status <> 'graded' and r.graded_at is not null)
  or r.submitted_at > now() or r.graded_at > now()
  or r.submitted_at < r.created_at or r.graded_at < r.submitted_at;

select c.id, c.name, c.teacher_id, u.role
from public.classes c join public.users u on u.id = c.teacher_id where u.role <> 'teacher';

select cm.id, cm.student_id, u.role
from public.class_members cm join public.users u on u.id = cm.student_id where u.role <> 'student';

-- 5. Existing duplicates are reported, never deleted automatically.
select name, count(*) as copies, array_agg(id order by id) as experiment_ids
from public.experiments group by name having count(*) > 1;

-- 6. Inspect policies, including unexpected policies not shipped by this app.
select tablename, policyname, roles, cmd, qual, with_check from pg_policies
where schemaname = 'public' and tablename in ('users','classes','class_members','experiments','tasks','reports')
order by tablename, policyname;

-- 7. All anonymous privileges below must be false; all truncate flags false.
select c.relname,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_can_select,
  has_table_privilege('anon', c.oid, 'INSERT') as anon_can_insert,
  has_table_privilege('anon', c.oid, 'UPDATE') as anon_can_update,
  has_table_privilege('anon', c.oid, 'DELETE') as anon_can_delete,
  has_table_privilege('anon', c.oid, 'TRUNCATE') as anon_can_truncate,
  has_table_privilege('authenticated', c.oid, 'TRUNCATE') as authenticated_can_truncate
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('users','classes','class_members','experiments','tasks','reports');

-- 8. Only the four application RPCs should allow authenticated execution.
-- All listed functions should have a fixed search_path and deny anon.
select p.proname, p.prosecdef as security_definer, p.proconfig,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'handle_new_user', 'protect_user_role', 'protect_teacher_fields',
  'protect_report_timestamps', 'set_report_insert_timestamp', 'protect_task_relationships',
  'is_teacher', 'is_class_teacher', 'is_class_member', 'join_class'
) order by p.proname;

-- 9. Expect six enabled triggers (tgenabled = O).
select n.nspname, c.relname, t.tgname, t.tgenabled
from pg_trigger t join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal and (
  (n.nspname = 'auth' and c.relname = 'users' and t.tgname = 'on_auth_user_created')
  or (n.nspname = 'public' and c.relname in ('users','reports','tasks'))
) order by n.nspname, c.relname, t.tgname;

-- 10. The foreign-key index added by 003 should exist.
select indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename = 'tasks' and indexname = 'tasks_experiment_id_idx';
