-- The player's own skills on the profile (Jonas 16.11.2026: «Ferdigheter skal vises inne i spillerprofilen»). The skills came with RANK1
-- (core/09e-fartstid.js FSK, fsSkills: juksa, line, garn, teiner, sløying, ising and krabbesortering, 1–5) after the profile was made, so
-- the profile showed only the milestones and the biggest fish under «Ferdigheter». Now the game sends them with the profile's other
-- figures, and everyone sees them (Jonas: «Alt åpent, ikke valgbart»).
--
--   profiles.sk         the seven skills, one decimal, 0–5; only the known keys are kept
--   prof_put(d)         as in 20261116120000_lansering.sql, with d.sk
--   profile_get(hid)    as there, with prof.sk
--
-- A game from before sends no sk: the column is then {} and the profile shows no bars for that player. Safe to run again.

alter table public.profiles add column if not exists sk jsonb not null default '{}'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_sk_check') then
    alter table public.profiles add constraint profiles_sk_check check (jsonb_typeof(sk) = 'object' and octet_length(sk::text) <= 400);
  end if;
end $$;

create or replace function public.prof_put(d jsonb) returns boolean language plpgsql security definer set search_path = public as $$
declare p text := pid(); clean text := '[<>&"''`\\]';
begin
  if p is null then raise exception 'not signed in'; end if;
  if is_guest() then return false; end if;
  if not exists (select 1 from players where id = p) then raise exception 'no player'; end if;
  if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text) > 4000 then raise exception 'bad profile'; end if;
  if exists (select 1 from profiles where player_id = p and at > now() - interval '30 seconds') then return false; end if;   -- (held back: the game tries again)
  insert into profiles (player_id, fleet, value, worth, company, form, ach, boats, recs, sk, at)
  values (p,
    least(greatest(coalesce((d ->> 'fleet')::numeric, 1), 0), 500)::smallint,
    least(greatest(coalesce((d ->> 'value')::numeric, 0), 0), 100000000000)::bigint,
    least(greatest(coalesce((d ->> 'worth')::numeric, 0), -100000000000), 100000000000)::bigint,
    left(btrim(regexp_replace(coalesce(d ->> 'company', ''), clean, '', 'g')), 40),
    case when d ->> 'form' = 'AS' then 'AS' else 'ENK' end,
    least(greatest(coalesce((d ->> 'ach')::numeric, 0), 0), 10000)::smallint,
    coalesce((select jsonb_agg(jsonb_build_object('n', left(btrim(regexp_replace(coalesce(b ->> 'n', ''), clean, '', 'g')), 24),
                                                  't', left(regexp_replace(coalesce(b ->> 't', ''), '[^a-z0-9_]', '', 'g'), 16)))
              from (select b from jsonb_array_elements(case when jsonb_typeof(d -> 'boats') = 'array' then d -> 'boats' else '[]'::jsonb end) b limit 20) bb), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('sp', left(regexp_replace(coalesce(x ->> 'sp', ''), '[^a-z0-9_]', '', 'g'), 16),
                                                  'kg', least(greatest(coalesce((x ->> 'kg')::numeric, 0), 0), 1000)))
              from (select x from jsonb_array_elements(case when jsonb_typeof(d -> 'recs') = 'array' then d -> 'recs' else '[]'::jsonb end) x limit 6) xx), '[]'::jsonb),
    coalesce((select jsonb_object_agg(k, round(least(greatest((d -> 'sk' ->> k)::numeric, 0), 5), 1))
              from unnest(array['juksa', 'line', 'garn', 'teiner', 'sloy', 'is', 'sort']) k where jsonb_typeof(d -> 'sk' -> k) = 'number'), '{}'::jsonb),
    now())
  on conflict (player_id) do update set fleet = excluded.fleet, value = excluded.value, worth = excluded.worth, company = excluded.company,
    form = excluded.form, ach = excluded.ach, boats = excluded.boats, recs = excluded.recs, sk = excluded.sk, at = excluded.at;
  return true;
end $$;
revoke all on function public.prof_put(jsonb) from public, anon, authenticated;
grant execute on function public.prof_put(jsonb) to authenticated;

create or replace function public.profile_get(hid text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p text := pid(); q text; co boolean := cheat_on();
begin
  if p is null then raise exception 'not signed in'; end if;
  if profile_get.hid = 'me' then q := p;   -- (the caller's own, who does not know the public id)
  else select pl.id into q from players pl where left(md5('dsb' || pl.id), 10) = profile_get.hid and (not pl.guest or pl.id = p); end if;
  if q is null then return null; end if;
  return (
    with mine as (select pt.kg, pt.kr, pt.ports from player_tot pt where pt.player_id = q),
    tot as (select pt.player_id, pt.kr from player_tot pt join players gp on gp.id = pt.player_id
              where pt.player_id = q or (not gp.guest and not (co and exists (select 1 from cheat_flags cf where cf.player_id = pt.player_id and cf.cleared_at is null)))),
    rk as (select player_id, r from (select player_id, rank() over (order by kr desc) r from tot) z where player_id = q)
    select jsonb_build_object(
      'hid', left(md5('dsb' || q), 10), 'me', q = p,
      'user', coalesce((select nm.name from names nm where nm.player_id = q and nm.removed_at is null), ''),
      'fs', (select round(pl.fs::numeric) from players pl where pl.id = q),
      'since', (select pl.created_at from players pl where pl.id = q),
      'f', (select fo.no from founders fo where fo.player_id = q),
      'img', (select a.img from avatars a where a.player_id = q and a.state = 'ok'),
      'boat', (select pr.boat from presence pr where pr.player_id = q), 'vtype', (select pr.vtype from presence pr where pr.player_id = q),
      'prof', (select jsonb_build_object('fleet', pf.fleet, 'value', pf.value, 'worth', pf.worth, 'company', pf.company, 'form', pf.form, 'ach', pf.ach,
                                         'boats', pf.boats, 'recs', pf.recs, 'sk', pf.sk, 'at', pf.at) from profiles pf where pf.player_id = q),
      'kg', (select round(coalesce(kg, 0)::numeric) from mine), 'kr', (select round(coalesce(kr, 0)::numeric) from mine), 'ports', (select ports from mine),
      'rank', (select r from rk where player_id = q), 'n', (select count(*) from tot)));
end $$;
revoke all on function public.profile_get(text) from public, anon, authenticated;
grant execute on function public.profile_get(text) to authenticated;
