-- The race's speed guard knows the trims of the price ladder (27.11.2026, found by the control of steg 154). lop_trim gave a factor
-- only to the old trims (pump, ic, turbo): Turbotrim of 2, 8, 24 hours and 3 days (t2 … t72, sold since 16.11.2026, double speed,
-- core/03-simulation.js BOOSTS) counted as no trim, so an honest run with one on could be marked as too fast (lop_leg, cheat_flag).
-- The Black Week gift puts a Turbotrim on every account, which made it matter for all. As in 20261113200000_kapplop.sql, with the
-- new keys; the same arguments and rights. Safe to run again.
create or replace function public.lop_trim(p text) returns double precision language sql stable set search_path = public as $$
  select greatest(1, coalesce((select max(case g.data ->> 'k' when 'pump' then 1.5 when 'ic' then 1.75 when 'turbo' then 2
      when 't2' then 2 when 't8' then 2 when 't24' then 2 when 't72' then 2 else 1 end)
    from grants g where g.player_id = p and g.data ->> 'give' = 'trim'), 1)) $$;
