-- Stable identifiers let the teacher review toolkit address the AI knowledge base
-- without exposing or depending on Supabase's generated numeric IDs.
alter table public.experiments
  add column if not exists knowledge_id text;

create unique index if not exists experiments_knowledge_id_unique_idx
  on public.experiments (knowledge_id)
  where knowledge_id is not null;

update public.experiments
set knowledge_id = mapping.knowledge_id
from (values
  ('用伏安法测电阻', 'resistance-voltammetry'),
  ('单摆法测重力加速度', 'simple-pendulum-gravity'),
  ('薄透镜焦距测量', 'thin-lens-focal-length'),
  ('光电效应', 'photoelectric-effect'),
  ('伏安特性', 'voltammetry'),
  ('霍尔效应', 'hall-effect'),
  ('空气比热容比的测定', 'air-specific-heat-ratio'),
  ('示波器的使用', 'oscilloscope'),
  ('液晶电光效应', 'liquid-crystal-electro-optic'),
  ('拉伸法测杨氏模量', 'tensile-young-modulus'),
  ('动力学法测杨氏模量', 'dynamic-young-modulus'),
  ('电位差计', 'potentiometer'),
  ('弗兰克-赫兹实验', 'franck-hertz'),
  ('磁滞回线', 'hysteresis-loop'),
  ('牛顿环、劈尖', 'newtons-rings-wedge'),
  ('光栅衍射实验', 'grating-diffraction'),
  ('分光计的使用', 'spectrometer'),
  ('电表改装', 'meter-modification'),
  ('落球法测粘滞系数', 'falling-ball-viscosity'),
  ('三线摆、扭摆实验', 'trifilar-torsion-pendulum'),
  ('声速测量', 'speed-of-sound'),
  ('波尔共振', 'forced-resonance'),
  ('磁场测量（霍尔法）', 'hall-magnetic-field')
) as mapping(name, knowledge_id)
where public.experiments.name = mapping.name
  and (public.experiments.knowledge_id is null or public.experiments.knowledge_id = mapping.knowledge_id)
  and not exists (
    select 1 from public.experiments existing
    where existing.knowledge_id = mapping.knowledge_id
      and existing.id <> public.experiments.id
  );

comment on column public.experiments.knowledge_id is
  'Stable AI knowledge-base identifier, for example photoelectric-effect.';

notify pgrst, 'reload schema';
