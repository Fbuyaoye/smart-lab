-- Seed by name so rerunning does not duplicate rows with generated identity IDs.
begin;
lock table public.experiments in share row exclusive mode;
insert into public.experiments (name, principle, key_points, procedure, common_issues)
select seed.* from (values
  ('用伏安法测电阻', '根据欧姆定律建立电压和电流的关系。', '正确连接电路，注意电表量程和单位。', '检查电路、逐组记录电压和电流、绘制伏安特性曲线。', '电流单位错误、接线顺序错误、有效数字不统一。'),
  ('单摆法测重力加速度', '利用单摆周期与摆长的关系测量重力加速度。', '摆角应较小，周期需要多次测量取平均值。', '改变摆长，测量多个周期，进行线性拟合。', '把单次计时当作周期、长度单位混用、拟合轴选错。'),
  ('薄透镜焦距测量', '利用成像规律测量凸透镜焦距。', '区分物距、像距，记录光具座读数。', '调节清晰成像，记录物距和像距并计算焦距。', '读数视差、正负号约定混乱、忘记单位换算。')
) as seed(name, principle, key_points, procedure, common_issues)
where not exists (select 1 from public.experiments e where e.name = seed.name);
commit;

-- 普通注册账号默认为学生。教师授权步骤见 docs/database-repair.md。
-- 用户自行填写的 user_metadata.role 不授予教师权限。
