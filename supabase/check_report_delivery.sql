-- Read-only administrator diagnostic. Set report_id to the submitted report.
-- This does not bypass or change application RLS policies.
with target as (select 1::bigint as report_id)
select
  target.report_id as requested_report_id,
  r.id as found_report_id,
  r.status,
  r.submitted_at,
  r.task_id,
  t.class_id,
  c.name as class_name,
  c.teacher_id as teacher_account_to_sign_in,
  teacher.name as teacher_name,
  teacher.role as teacher_role,
  exists (
    select 1 from public.class_members cm
    where cm.class_id = t.class_id and cm.student_id = r.student_id
  ) as student_is_class_member,
  case
    when r.id is null then 'Report not found'
    when t.id is null then 'Task not found'
    when c.id is null then 'Class not found'
    when teacher.role is distinct from 'teacher' then 'Class owner does not have teacher role'
    when r.status = 'draft' then 'Draft only; student has not submitted'
    else 'Use teacher_account_to_sign_in to review this report'
  end as delivery_check
from target
left join public.reports r on r.id = target.report_id
left join public.tasks t on t.id = r.task_id
left join public.classes c on c.id = t.class_id
left join public.users teacher on teacher.id = c.teacher_id;
