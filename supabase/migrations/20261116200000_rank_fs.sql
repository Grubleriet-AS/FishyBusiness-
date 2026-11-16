-- RANK1-c (steg 134, docs/planer/rank1.md kap. 3 og 4; Jonas 16.11.2026, V4 A: «Fane i topplista»): the leaderboard's fourth kind, 'fs',
-- the tab Fartstid. The registered players by the server's sea time (players.fs, the points the game sends with pos_put, capped there at
-- 5 000 an hour), highest first, with the user name, the level in years and the caller's own place. Guests and the marked accounts
-- (cheat_on) are out as on the other lists; a guest sees only themselves. No column about haill or the skills: the skills are the
-- player's own (Jonas 16.11.2026), and haill is never shown to others (docs/engasjement.md).
--
--   fs_years(p)            the whole years of sea time for p points, as fsOf in src/js/core/09e-fartstid.js: fsNeed(n) = 1e6 · (n/40)^2.8
--                          up to 40, then the step of the last year for each year after (the stars), at most 400
--   top_list(kind, w, grp) as in 20261116120000_lansering.sql, and kind 'fs': rows {rank, hid, user, boat, y, f, me}, mine {rank, y}, n
--
-- Run on the test project (xlrjbqdhdymcdjkqkulx) by Jonas before the push, in production right before the release that takes the code.

create or replace function public.fs_years(p double precision) returns int
language sql immutable set search_path = public as $$
  select case
    when p is null or p <= 0 or p <> p then 0
    when p < 1e6 then (select max(n) from generate_series(0, 40) n where n = 0 or p >= 1e6 * power(n / 40.0, 2.8))
    else least(400, 40 + floor((p - 1e6) / (1e6 - 1e6 * power(39 / 40.0, 2.8)))::int)
  end
$$;
revoke all on function public.fs_years(double precision) from public, anon, authenticated;

create or replace function public.top_list(kind text, w int default 0, grp text default 'all') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p text := pid(); k text := case when top_list.kind in ('kr', 'tot', 'fs') then top_list.kind else 'kg' end;
  g text := case when top_list.grp in ('open', 'lukket') then top_list.grp else 'all' end; co boolean := cheat_on();
begin
  if p is null then raise exception 'not signed in'; end if;
  if k <> 'tot' and (w is null or w < 0 or w > 100000) then raise exception 'bad week'; end if;
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
                          from (select * from r where fs > 0 order by rk, player_id limit 20) a), '[]'::jsonb),
        'mine', (select jsonb_build_object('rank', rk, 'y', fs_years(fs)) from r where player_id = p and fs > 0),
        'n', (select count(*) from r where fs > 0)));
  end if;
  return (
    with ok as (select pl.id from players pl where pl.id = p or (not pl.guest and not (co and exists (select 1 from cheat_flags cf where cf.player_id = pl.id and cf.cleared_at is null)))),
    l as (select x.* from landings x where k <> 'tot' and (g = 'all' or x.acc = g) and x.gh >= top_list.w * 168.0 and x.gh < (top_list.w + 1) * 168.0 and x.player_id in (select id from ok)),
    t as (select l.player_id, sum(least(l.kg, land_cap(l.acc))) kg, sum(least(l.kr, land_cap(l.acc) * 1000)) kr,
                 (array_agg(l.boat order by l.id desc))[1] boat, (array_agg(l.company order by l.id desc) filter (where l.company <> ''))[1] company from l group by l.player_id
          union all
          select pt.player_id, pt.kg, pt.kr,
                 (select x.boat from landings x where x.player_id = pt.player_id order by x.id desc limit 1),
                 (select x.company from landings x where x.player_id = pt.player_id and x.company <> '' order by x.id desc limit 1)
            from player_tot pt where k = 'tot' and pt.player_id in (select id from ok)),
    pt as (select distinct on (player_id) player_id, port from (select l.player_id, l.port, sum(l.kg) s from l group by l.player_id, l.port) a order by player_id, s desc),
    r as (select t.*, pt.port, rank() over (order by case when k = 'kg' then t.kg else t.kr end desc) rk from t left join pt using (player_id))
    select jsonb_build_object(
      'kind', k, 'grp', g,
      'rows', coalesce((select jsonb_agg(jsonb_build_object('rank', rk, 'hid', left(md5('dsb' || a.player_id), 10), 'boat', coalesce(boat, ''),
                          'company', coalesce(company, ''), 'port', port,
                          'kg', round(kg::numeric), 'kr', round(kr::numeric), 'me', player_id = p,
                          'f', (select fo.no from founders fo where fo.player_id = a.player_id),
                          'user', coalesce((select nm.name from names nm where nm.player_id = a.player_id and nm.removed_at is null), '')) order by rk, kg desc)
                        from (select * from r order by rk limit 20) a), '[]'::jsonb),
      'mine', (select jsonb_build_object('rank', rk, 'kg', round(kg::numeric), 'kr', round(kr::numeric)) from r where player_id = p),
      'n', (select count(*) from t)));
end $$;
revoke all on function public.top_list(text, int, text) from public, anon, authenticated;
grant execute on function public.top_list(text, int, text) to authenticated;
