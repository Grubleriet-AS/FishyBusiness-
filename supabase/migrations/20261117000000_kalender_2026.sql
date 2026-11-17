-- The calendar moves to 2026 (16.11.2026, docs/planer/kalender-2026.md; Jonas: «jeg vil at spillet starter fra 1.januar fra nå», so new
-- players come in at the start of 2026 and play the year with its real quotas, «slik at de ikke kommer rett inn i 2027»). The world's
-- hours (world_gh) and minutes (game_min) are untouched: only the date an hour is called moves, as in the game (core/01-world.js
-- EPOCH_WORLD): game hour 0 was 1 March 2027 06:00 and is 21 April 2025 06:00, which makes it 1 January 2026 06:00 at 17.11.2026
-- 03:00 UTC in real time. Here:
--   1. every function that works a year out of the world's hours (km_year and land_put today) gets the new start, read from the
--      database as it stands, so whichever version of a function is there is the one changed. land_put took no landing before 2026;
--      the hours before the new year are 2025 now, so it takes them from 2025.
--      Every function and table that took no year before 2026 takes 2025 too (world_get, the events, world_year's check): the
--      hours up to the new year, and everything played until now, are 2025.
--   2. what is stored by year follows, as the saves do in the game (calMigrate: 2027 is 2025): world_year and landings. world_agg is a
--      cache of the year's shared picture and is emptied.
-- Safe to run again: the second time no function has the old start, and nothing is moved. Run on the test project first by hand
-- (Jonas), in production just before the release that carries the code.
do $$
declare r record; n int := 0;
begin
  for r in select c.conrelid::regclass t, c.conname, pg_get_constraintdef(c.oid) d from pg_constraint c
            where c.contype = 'c' and c.connamespace = 'public'::regnamespace and pg_get_constraintdef(c.oid) like '%>= 2026%' loop
    execute format('alter table %s drop constraint %I', r.t, r.conname);
    execute format('alter table %s add constraint %I %s', r.t, r.conname, replace(r.d, '>= 2026', '>= 2025'));
  end loop;
  for r in select p.oid, p.prosrc like '%2027-03-01 06:00%' moved from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
            where ns.nspname = 'public' and p.prokind = 'f' and (p.prosrc like '%2027-03-01 06:00%' or p.prosrc like '%< 2026 or%') loop
    execute replace(replace(pg_get_functiondef(r.oid), '2027-03-01 06:00', '2025-04-21 06:00'), '< 2026 or', '< 2025 or');
    if r.moved then n := n + 1; end if;
  end loop;
  if n > 0 then
    update public.world_year set y = y - 2 where y >= 2027;
    update public.landings set y = y - 2 where y >= 2027;
    delete from public.world_agg where y is not null;
  end if;
  raise notice 'kalender_2026: % function(s) moved', n;
end $$;
