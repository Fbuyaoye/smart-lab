create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'teacher')),
  name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id bigint primary key generated always as identity,
  name text not null,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  teacher_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  id bigint primary key generated always as identity,
  class_id bigint not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table if not exists public.experiments (
  id bigint primary key generated always as identity,
  name text not null,
  principle text,
  key_points text,
  procedure text,
  common_issues text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id bigint primary key generated always as identity,
  class_id bigint not null references public.classes(id) on delete cascade,
  experiment_id bigint not null references public.experiments(id) on delete restrict,
  deadline timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id bigint primary key generated always as identity,
  task_id bigint not null references public.tasks(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  raw_data jsonb not null default '{}'::jsonb,
  calculation jsonb not null default '{}'::jsonb,
  ai_content text,
  final_content text,
  teacher_score numeric check (teacher_score is null or (teacher_score >= 0 and teacher_score <= 100)),
  teacher_comment text,
  ai_suggestion text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'graded')),
  created_at timestamptz not null default now(),
  unique (task_id, student_id)
);

create index if not exists classes_teacher_id_idx on public.classes(teacher_id);
create index if not exists class_members_student_id_idx on public.class_members(student_id);
create index if not exists class_members_class_id_idx on public.class_members(class_id);
create index if not exists tasks_class_id_idx on public.tasks(class_id);
create index if not exists reports_task_id_idx on public.reports(task_id);
create index if not exists reports_student_id_idx on public.reports(student_id);
create index if not exists reports_status_idx on public.reports(status);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, role, name)
  values (new.id, case when new.raw_user_meta_data->>'role' = 'teacher' then 'teacher' else 'student' end, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.join_class(p_invite_code text)
returns public.classes
language plpgsql
security definer set search_path = public
as $$
declare target_class public.classes;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'student') then
    raise exception '只有学生账号可以加入班级';
  end if;
  select * into target_class from public.classes where invite_code = upper(trim(p_invite_code));
  if target_class.id is null then raise exception '邀请码无效'; end if;
  insert into public.class_members (class_id, student_id) values (target_class.id, auth.uid()) on conflict do nothing;
  return target_class;
end;
$$;
grant execute on function public.join_class(text) to authenticated;

create or replace function public.is_teacher()
returns boolean
language sql
security definer set search_path = public
as $$ select exists (select 1 from public.users where id = auth.uid() and role = 'teacher'); $$;

create or replace function public.is_class_teacher(p_class_id bigint)
returns boolean
language sql
security definer set search_path = public
as $$ select exists (select 1 from public.classes where id = p_class_id and teacher_id = auth.uid()); $$;

create or replace function public.is_class_member(p_class_id bigint)
returns boolean
language sql
security definer set search_path = public
as $$ select exists (select 1 from public.class_members where class_id = p_class_id and student_id = auth.uid()); $$;

alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.experiments enable row level security;
alter table public.tasks enable row level security;
alter table public.reports enable row level security;

drop policy if exists "users view own profile" on public.users;
create policy "users view own profile" on public.users for select using (auth.uid() = id);
drop policy if exists "users update own profile" on public.users;
create policy "users update own profile" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.protect_user_role()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then
    raise exception '用户不能自行修改角色';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_user_role on public.users;
create trigger protect_user_role before update on public.users for each row execute procedure public.protect_user_role();

drop policy if exists "teachers manage own classes" on public.classes;
create policy "teachers manage own classes" on public.classes for all using (public.is_teacher() and teacher_id = auth.uid()) with check (public.is_teacher() and teacher_id = auth.uid());
drop policy if exists "students view joined classes" on public.classes;
create policy "students view joined classes" on public.classes for select using (public.is_class_member(classes.id));

drop policy if exists "members view own membership" on public.class_members;
create policy "members view own membership" on public.class_members for select using (student_id = auth.uid());
drop policy if exists "teachers view class membership" on public.class_members;
create policy "teachers view class membership" on public.class_members for select using (public.is_class_teacher(class_members.class_id));

drop policy if exists "authenticated users view experiments" on public.experiments;
create policy "authenticated users view experiments" on public.experiments for select using (auth.uid() is not null);
drop policy if exists "teachers manage experiments" on public.experiments;
create policy "teachers manage experiments" on public.experiments for all using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "teachers manage own tasks" on public.tasks;
create policy "teachers manage own tasks" on public.tasks for all using (public.is_class_teacher(tasks.class_id)) with check (public.is_class_teacher(tasks.class_id));
drop policy if exists "students view class tasks" on public.tasks;
create policy "students view class tasks" on public.tasks for select using (public.is_class_member(tasks.class_id));

drop policy if exists "students view own reports" on public.reports;
create policy "students view own reports" on public.reports for select using (student_id = auth.uid());
drop policy if exists "students insert own reports" on public.reports;
create policy "students insert own reports" on public.reports for insert with check (student_id = auth.uid() and exists (select 1 from public.tasks t where t.id = reports.task_id and public.is_class_member(t.class_id)));
drop policy if exists "students update own reports" on public.reports;
create policy "students update own reports" on public.reports for update using (student_id = auth.uid()) with check (student_id = auth.uid() and exists (select 1 from public.tasks t where t.id = reports.task_id and public.is_class_member(t.class_id)));
drop policy if exists "teachers view class reports" on public.reports;
create policy "teachers view class reports" on public.reports for select using (exists (select 1 from public.tasks t where t.id = reports.task_id and public.is_class_teacher(t.class_id)));
drop policy if exists "teachers grade class reports" on public.reports;
create policy "teachers grade class reports" on public.reports for update using (exists (select 1 from public.tasks t where t.id = reports.task_id and public.is_class_teacher(t.class_id))) with check (exists (select 1 from public.tasks t where t.id = reports.task_id and public.is_class_teacher(t.class_id)));

create or replace function public.protect_teacher_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.student_id then
    if new.teacher_score is distinct from old.teacher_score or new.teacher_comment is distinct from old.teacher_comment or new.ai_suggestion is distinct from old.ai_suggestion then
      raise exception '学生不能修改教师批改字段';
    end if;
    if old.status = 'graded' then raise exception '已批改报告不能再由学生修改'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_report_teacher_fields on public.reports;
create trigger protect_report_teacher_fields before update on public.reports for each row execute procedure public.protect_teacher_fields();
