-- The leaderboard a long way down (Jonas 16.11.2026: «Jeg vil at man skal kunne scrolle nedover laaaaangt på topplisten»): top_list
-- takes the page it is asked for, off (from 0) and n (1–100, 20 as before), so the game fetches the next hundred as the list is
-- scrolled. The rows, the order and who is on the list are as in 20261116200000_rank_fs.sql; a tie is broken by the player's id, so
-- a page never repeats or skips a row. The answer has off as well. The old signature (text, int, text) is dropped: a call with only
-- kind, w and grp (the game before this, and production until the release) goes to the new one with the defaults.
--
-- The periods (Jonas 16.11.2026: «vi må også ha ukentlig, månedlig, og all-time på filter-søkene»): kg and kr take a game month as
-- h0..h1 (game hours, at most 32 days; the game counts the month from its calendar, gDate), the week as before (w); all time is 'tot'
-- (ranked by kr, as before) and the new 'tkg' (ranked by kg), both from player_tot. All time has the company's worth too (Jonas
-- 16.11.2026: «selskapsverdi MÅ vises på total»), from profiles.worth (what the profile shows every player already).
--
-- Run on the test project (xlrjbqdhdymcdjkqkulx) by Jonas before the push, in production right before the release that takes the code.

drop function if exists public.top_list(text, int, text);
drop function if exists public.top_list(text, int, text, int, int);

create or replace function public.top_list(kind text, w int default 0, grp text default 'all', off int default 0, n int default 20,
  h0 double precision default null, h1 double precision default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p text := pid(); k text := case when top_list.kind in ('kr', 'tot', 'tkg', 'fs') then top_list.kind else 'kg' end;
  mo boolean := top_list.h0 is not null and top_list.h1 is not null;
  g text := case when top_list.grp in ('open', 'lukket') then top_list.grp else 'all' end; co boolean := cheat_on();
begin
  if p is null then raise exception 'not signed in'; end if;
  off := least(greatest(coalesce(top_list.off, 0), 0), 100000); n := least(greatest(coalesce(top_list.n, 20), 1), 100);
  if mo and k in ('kg', 'kr') and (h0 <> h0 or h1 <> h1 or abs(h0) > 1e7 or h1 <= h0 or h1 - h0 > 32 * 24) then raise exception 'bad month'; end if;
  if k in ('kg', 'kr') and not mo and (w is null or w < 0 or w > 100000) then raise exception 'bad week'; end if;
  -- 'fs': the registered players by the server's sea time (players.fs, capped in pos_put), the level in years as fsOf counts it. Only the
  -- level: the skills are the player's own, and haill is never in it. A guest sees only themselves (rank among the registered), as above.
  if k = 'fs' then
    return (
      with ok as (select pl.id, pl.fs from players pl where pl.id = p or (not pl.guest and not (co and exists (select 1 from cheat_flags cf where cf.player_id = pl.id and cf.cleared_at is null)))),
      r as (select ok.id player_id, ok.fs, rank() over (order by ok.fs desc) rk from ok where ok.fs > 0 or ok.id = p)
      select jsonb_build_object(
        'kind', k, 'grp', 'all',
        'rows', coalesce((select jsonb_agg(jsonb_build_object('rank', rk, 'hid', left(md5('dsb' || a.player_id), 10), 'y', fs_years(a.fs), 'me', player_id = p,
                            'boat', coalesce((select x.boat from landings x where x.player_id = a.player_id order by x.id desc limit 1), ''),
                            'f', (select fo.no from founders fo where fo.player_id = a.player_id),
                            'user', coalesce((select nm.name from names nm where nm.player_id = a.player_id and nm.removed_at is null), '')) order by rk, a.player_id)
                          from (select * from r where fs > 0 order by rk, player_id offset off limit n) a), '[]'::jsonb),
        'off', off,
        'mine', (select jsonb_build_object('rank', rk, 'y', fs_years(fs)) from r where player_id = p and fs > 0),
        'n', (select count(*) from r where fs > 0)));
  end if;
  return (
    with ok as (select pl.id from players pl where pl.id = p or (not pl.guest and not (co and exists (select 1 from cheat_flags cf where cf.player_id = pl.id and cf.cleared_at is null)))),
    l as (select x.* from landings x where k in ('kg', 'kr') and (g = 'all' or x.acc = g) and x.player_id in (select id from ok)
            and (case when mo then x.gh >= top_list.h0 and x.gh < top_list.h1 else x.gh >= top_list.w * 168.0 and x.gh < (top_list.w + 1) * 168.0 end)),
    t as (select l.player_id, sum(least(l.kg, land_cap(l.acc))) kg, sum(least(l.kr, land_cap(l.acc) * 1000)) kr,
                 (array_agg(l.boat order by l.id desc))[1] boat, (array_agg(l.company order by l.id desc) filter (where l.company <> ''))[1] company from l group by l.player_id
          union all
          select pt.player_id, pt.kg, pt.kr,
                 (select x.boat from landings x where x.player_id = pt.player_id order by x.id desc limit 1),
                 (select x.company from landings x where x.player_id = pt.player_id and x.company <> '' order by x.id desc limit 1)
            from player_tot pt where k in ('tot', 'tkg') and pt.player_id in (select id from ok)),
    pt as (select distinct on (player_id) player_id, port from (select l.player_id, l.port, sum(l.kg) s from l group by l.player_id, l.port) a order by player_id, s desc),
    r as (select t.*, pt.port, rank() over (order by case when k in ('kg', 'tkg') then t.kg else t.kr end desc) rk from t left join pt using (player_id))
    select jsonb_build_object(
      'kind', k, 'grp', g,
      'rows', coalesce((select jsonb_agg((jsonb_build_object('rank', rk, 'hid', left(md5('dsb' || a.player_id), 10), 'boat', coalesce(boat, ''),
                          'company', coalesce(company, ''), 'port', port,
                          'kg', round(kg::numeric), 'kr', round(kr::numeric), 'me', player_id = p,
                          'f', (select fo.no from founders fo where fo.player_id = a.player_id),
                          'user', coalesce((select nm.name from names nm where nm.player_id = a.player_id and nm.removed_at is null), ''))
                          || case when k in ('tot', 'tkg') then jsonb_build_object('worth', (select pf.worth from profiles pf where pf.player_id = a.player_id)) else '{}'::jsonb end) order by rk, a.player_id)
                        from (select * from r order by rk, player_id offset off limit n) a), '[]'::jsonb),
      'off', off,
      'mine', (select jsonb_build_object('rank', rk, 'kg', round(kg::numeric), 'kr', round(kr::numeric))
                     || case when k in ('tot', 'tkg') then jsonb_build_object('worth', (select pf.worth from profiles pf where pf.player_id = p)) else '{}'::jsonb end from r where player_id = p),
      'n', (select count(*) from t)));
end $$;
revoke all on function public.top_list(text, int, text, int, int, double precision, double precision) from public, anon, authenticated;
grant execute on function public.top_list(text, int, text, int, int, double precision, double precision) to authenticated;
