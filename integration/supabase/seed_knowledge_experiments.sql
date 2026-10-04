-- This list mirrors knowledge-base/index.json. It creates selectable records
-- only; populate principle, procedure and other teaching fields after review.
insert into public.experiments (name, knowledge_id) values
  ('空气比热容比的测定', 'air-specific-heat-ratio'),
  ('光电效应', 'photoelectric-effect'),
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
  ('伏安特性', 'voltammetry'),
  ('电表改装', 'meter-modification'),
  ('落球法测粘滞系数', 'falling-ball-viscosity'),
  ('三线摆、扭摆实验', 'trifilar-torsion-pendulum'),
  ('声速测量', 'speed-of-sound'),
  ('波尔共振', 'forced-resonance'),
  ('霍尔效应', 'hall-effect'),
  ('磁场测量（霍尔法）', 'hall-magnetic-field')
on conflict (knowledge_id) where knowledge_id is not null do update
  set name = excluded.name;
