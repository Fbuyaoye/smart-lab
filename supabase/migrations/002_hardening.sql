-- Existing deployments can apply this migration after 001_init.sql.

alter table public.reports
  add column if not exists submitted_at timestamptz,
  add column if not exists graded_at timestamptz;

create index if not exists reports_submitted_at_idx on public.reports(submitted_at);
create index if not exists reports_graded_at_idx on public.reports(graded_at);

-- Teachers need the names of students in their own classes when reviewing reports.
drop policy if exists "teachers view students in own classes" on public.users;
create policy "teachers view students in own classes" on public.users
for select using (
  exists (
    select 1
    from public.class_members cm
    join public.classes c on c.id = cm.class_id
    where cm.student_id = users.id
      and c.teacher_id = auth.uid()
  )
);

-- A student may create or edit report content only. Teacher-owned fields and
-- the graded state are reserved for the teacher policies below.
drop policy if exists "students insert own reports" on public.reports;
create policy "students insert own reports" on public.reports
for insert with check (
  student_id = auth.uid()
  and status in ('draft', 'submitted')
  and teacher_score is null
  and teacher_comment is null
  and ai_suggestion is null
  and exists (
    select 1 from public.tasks t
    where t.id = reports.task_id and public.is_class_member(t.class_id)
  )
);

drop policy if exists "students update own reports" on public.reports;
create policy "students update own reports" on public.reports
for update using (student_id = auth.uid())
with check (
  student_id = auth.uid()
  and status in ('draft', 'submitted')
  and exists (
    select 1 from public.tasks t
    where t.id = reports.task_id and public.is_class_member(t.class_id)
  )
);

-- Do not allow a teacher to mark an unsubmitted draft as graded.
create or replace function public.protect_teacher_fields()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'graded' and old.status not in ('submitted', 'graded') then
    raise exception '只有已提交报告可以批改';
  end if;
  if auth.uid() = old.student_id then
    if new.teacher_score is distinct from old.teacher_score
      or new.teacher_comment is distinct from old.teacher_comment
      or new.ai_suggestion is distinct from old.ai_suggestion then
      raise exception '学生不能修改教师批改字段';
    end if;
    if old.status = 'graded' then raise exception '已批改报告不能再由学生修改'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.protect_report_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'submitted' and old.status is distinct from 'submitted' then
    new.submitted_at = coalesce(new.submitted_at, now());
  end if;
  if new.status = 'graded' and old.status is distinct from 'graded' then
    new.graded_at = coalesce(new.graded_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists set_report_timestamps on public.reports;
create trigger set_report_timestamps
before update on public.reports
for each row execute procedure public.protect_report_timestamps();

-- The insert path has no old row, so set submission time when a report is
-- created already submitted.
create or replace function public.set_report_insert_timestamp()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'submitted' then new.submitted_at = coalesce(new.submitted_at, now()); end if;
  if new.status = 'graded' then new.graded_at = coalesce(new.graded_at, now()); end if;
  return new;
end;
$$;

drop trigger if exists set_report_insert_timestamps on public.reports;
create trigger set_report_insert_timestamps
before insert on public.reports
for each row execute procedure public.set_report_insert_timestamp();

-- Backfill timestamps for rows created before this migration.
update public.reports set submitted_at = created_at
where status in ('submitted', 'graded') and submitted_at is null;
update public.reports set graded_at = created_at
where status = 'graded' and graded_at is null;
