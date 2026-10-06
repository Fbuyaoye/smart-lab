-- Apply after 001_init.sql and 002_hardening.sql. Safe to rerun.
begin;

-- user_metadata is editable by the account owner. Only an administrator can
-- assign app_metadata; ordinary registrations must remain students.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, role, name)
  values (
    new.id,
    case when new.raw_app_meta_data->>'role' = 'teacher' then 'teacher' else 'student' end,
    coalesce(new.raw_user_meta_data->>'name', '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

-- Accounts that predate the signup trigger otherwise cannot join classes.
-- Preserve existing profiles and roles: historical teachers require review.
insert into public.users (id, role, name)
select id,
  case when raw_app_meta_data->>'role' = 'teacher' then 'teacher' else 'student' end,
  coalesce(raw_user_meta_data->>'name', '')
from auth.users
on conflict (id) do nothing;

create or replace function public.protect_user_role()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception '用户 ID 和创建时间不能修改';
  end if;
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception '用户角色只能由管理员修改';
  end if;
  return new;
end;
$$;

create or replace function public.is_teacher()
returns boolean
language sql stable
security definer set search_path = ''
as $$ select exists (select 1 from public.users where id = auth.uid() and role = 'teacher'); $$;

create or replace function public.is_class_teacher(p_class_id bigint)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select public.is_teacher() and exists (
    select 1 from public.classes where id = p_class_id and teacher_id = auth.uid()
  );
$$;

create or replace function public.is_class_member(p_class_id bigint)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'student')
    and exists (select 1 from public.class_members where class_id = p_class_id and student_id = auth.uid());
$$;

create or replace function public.join_class(p_invite_code text)
returns public.classes
language plpgsql
security definer set search_path = ''
as $$
declare target_class public.classes;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'student') then
    raise exception '只有学生账号可以加入班级';
  end if;
  select * into target_class from public.classes where invite_code = upper(trim(p_invite_code));
  if target_class.id is null then raise exception '邀请码无效'; end if;
  insert into public.class_members (class_id, student_id)
  values (target_class.id, auth.uid()) on conflict (class_id, student_id) do nothing;
  return target_class;
end;
$$;

-- A demoted teacher must not retain access to former students' profiles.
drop policy if exists "teachers view students in own classes" on public.users;
create policy "teachers view students in own classes" on public.users
for select to authenticated using (
  exists (
    select 1 from public.class_members cm
    where cm.student_id = users.id and public.is_class_teacher(cm.class_id)
  )
);

create or replace function public.protect_teacher_fields()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.task_id is distinct from old.task_id
    or new.student_id is distinct from old.student_id
    or new.created_at is distinct from old.created_at then
    raise exception '报告 ID、任务、学生和创建时间不能修改';
  end if;
  if new.status = 'graded' and old.status not in ('submitted', 'graded') then
    raise exception '只有已提交报告可以批改';
  end if;
  if auth.uid() = old.student_id then
    if new.teacher_score is distinct from old.teacher_score
      or new.teacher_comment is distinct from old.teacher_comment
      or new.ai_suggestion is distinct from old.ai_suggestion
      or new.status = 'graded' then
      raise exception '学生不能修改教师批改字段或批改状态';
    end if;
    if old.status = 'graded' then raise exception '已批改报告不能再由学生修改'; end if;
  elsif auth.uid() is not null then
    if new.raw_data is distinct from old.raw_data
      or new.calculation is distinct from old.calculation
      or new.ai_content is distinct from old.ai_content
      or new.final_content is distinct from old.final_content then
      raise exception '教师不能修改学生报告内容';
    end if;
    if new.status is distinct from old.status and new.status <> 'graded' then
      raise exception '教师只能将已提交报告标记为已批改';
    end if;
  end if;
  return new;
end;
$$;

-- Always derive lifecycle times on the server; never accept client timestamps.
create or replace function public.set_report_insert_timestamp()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.created_at = now();
  new.submitted_at = case when new.status in ('submitted', 'graded') then now() else null end;
  new.graded_at = case when new.status = 'graded' then now() else null end;
  return new;
end;
$$;

create or replace function public.protect_report_timestamps()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.submitted_at = case
    when new.status = 'draft' then null
    when new.status = 'submitted' and old.status <> 'submitted' then now()
    else old.submitted_at end;
  new.graded_at = case
    when new.status = 'graded' and old.status <> 'graded' then now()
    when new.status = 'graded' then old.graded_at
    else null end;
  return new;
end;
$$;

-- Moving a task with reports would silently move the students' submissions
-- to another class or relabel them as a different experiment.
create or replace function public.protect_task_relationships()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (new.class_id is distinct from old.class_id or new.experiment_id is distinct from old.experiment_id)
    and exists (select 1 from public.reports where task_id = old.id) then
    raise exception '已有报告的任务不能更换班级或实验，请新建任务';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_task_relationships on public.tasks;
create trigger protect_task_relationships before update on public.tasks
for each row execute procedure public.protect_task_relationships();

create index if not exists tasks_experiment_id_idx on public.tasks(experiment_id);

-- RLS does not govern TRUNCATE, REFERENCES, or TRIGGER privileges.
-- Set explicit application grants instead of relying on project defaults.
revoke all privileges on table public.users, public.classes, public.class_members,
  public.experiments, public.tasks, public.reports from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.users, public.classes, public.class_members,
  public.experiments, public.tasks, public.reports to authenticated;
grant update (name) on public.users to authenticated;
grant insert, update, delete on public.classes, public.experiments, public.tasks to authenticated;
grant insert, update on public.reports to authenticated;
revoke all privileges on sequence public.classes_id_seq, public.class_members_id_seq,
  public.experiments_id_seq, public.tasks_id_seq, public.reports_id_seq from public, anon, authenticated;
grant usage, select on sequence public.classes_id_seq, public.experiments_id_seq,
  public.tasks_id_seq, public.reports_id_seq to authenticated;

revoke all privileges on function public.handle_new_user(), public.protect_user_role(),
  public.protect_teacher_fields(), public.protect_report_timestamps(),
  public.set_report_insert_timestamp(), public.protect_task_relationships(),
  public.is_teacher(), public.is_class_teacher(bigint), public.is_class_member(bigint),
  public.join_class(text) from public, anon, authenticated;
grant execute on function public.is_teacher(), public.is_class_teacher(bigint),
  public.is_class_member(bigint), public.join_class(text) to authenticated;

notify pgrst, 'reload schema';
commit;
