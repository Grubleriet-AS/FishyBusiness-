-- The launch (Jonas 16.11.2026: «Jeg skal lansere spillet i morgen»): the leaderboard in kilos, in kroner and in total, the founders'
-- badge for the first hundred who land fish, and the profile page that every player can open for any other.
--
--   landings.kr            the value of each landed row (the game sends it with land_put; 0 for the rows from before)
--   land_put(...)          as in 20261110160000_cheat_flags.sql, with each item's kr, and the founders' count after the landing
--   top_list(kind, w, grp) kind 'kg': the game week's kilos (as world_top), 'kr': the game week's value, 'tot': all the value landed since
--                          the start, every group. The top 20 with the public id (hid, as pos_world's id), the player's name, the boat,
--                          the founders' number, and the caller's own place. Haill is never in it (docs/engasjement.md).
--   founders, founders_cfg.start
--                          Jonas 16.11.2026: «de 100 første som leverer fisk får merket», counted from the moment he turns it on in
--                          the admin page (admin_founders_set). Accounts made before that moment are the test accounts and never count,
--                          nor guests or the game's admin. The number is kept for good; turning it off stops the count only.
--   profiles, prof_put(d)  what the profile shows that only the game knows: the boats, the fleet's value, the company's worth, the form,
--                          the milestones and the records. Open to all (Jonas 16.11.2026: «Alt åpent, ikke valgbart»).
--   avatars, av_put(img), av_mine()
--                          the profile picture, shown to others only when the admin has approved it (Jonas 16.11.2026: «Eget bilde
--                          med godkjenning»; players from 13 years); admin_av_list(), admin_av_set(hid, ok)
--   profile_get(hid)       one player's profile: name, sea time, founders' number, the picture if approved, the boats and the worth,
--                          the catch landed in all and the place on the total list. Never a guest's; haill never.

-- ---------- 1. the value of a landing ----------
alter table public.landings add column if not exists kr real not null default 0;
alter table public.landings drop constraint if exists landings_kr_check;
alter table public.landings add constraint landings_kr_check check (kr >= 0 and kr <= 100000000);

-- ---------- 2. the founders ----------
-- (the start in a table of its own: world_cfg's key list is set again by older files when they are run again)
create table if not exists public.founders_cfg (one boolean primary key default true check (one), start timestamptz);
insert into public.founders_cfg (one, start) values (true, null) on conflict (one) do nothing;
alter table public.founders_cfg enable row level security;
revoke all on public.founders_cfg from anon, authenticated;

create table if not exists public.founders (
  player_id text primary key references public.players(id) on delete cascade,
  no smallint not null unique check (no between 1 and 100),
  at timestamptz not null default now()
);
alter table public.founders enable row level security;
revoke all on public.founders from anon, authenticated;

-- after a landing: the player becomes a founder if the count is on, there is room, and the account was made after it was turned on
create or replace function public.founder_take(p text) returns void language plpgsql security definer set search_path = public as $$
declare f timestamptz; n int;
begin
  select c.start into f from founders_cfg c;
  if f is null or now() < f then return; end if;
  if exists (select 1 from founders where player_id = p) then return; end if;
  if not exists (select 1 from players pl where pl.id = p and not pl.guest and not coalesce(pl.game_admin, false) and pl.created_at >= f) then return; end if;
  perform pg_advisory_xact_lock(hashtext('dsb_founders'));
  select count(*) into n from founders;
  if n >= 100 then return; end if;
  insert into founders (player_id, no) values (p, n + 1) on conflict do nothing;
end $$;
revoke all on function public.founder_take(text) from public, anon, authenticated;

create or replace function public.admin_founders() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare f timestamptz;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select c.start into f from founders_cfg c;
  return jsonb_build_object('from', f, 'n', (select count(*) from founders),
    'list', coalesce((select jsonb_agg(jsonb_build_object('no', fo.no, 'at', fo.at, 'name', coalesce(nm.name, ''), 'who', left(md5('dsb' || fo.player_id), 10)) order by fo.no)
                      from founders fo left join names nm on nm.player_id = fo.player_id and nm.removed_at is null), '[]'::jsonb));
end $$;
-- on: counted from now (an earlier start is kept); off: no one more is counted, those counted keep their number
create or replace function public.admin_founders_set(on_ boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if on_ is null then raise exception 'bad value'; end if;
  if on_ then
    update founders_cfg set start = now() where start is null;
  else
    update founders_cfg set start = null;
  end if;
  return admin_founders();
end $$;
revoke all on function public.admin_founders(), public.admin_founders_set(boolean) from public, anon, authenticated;
grant execute on function public.admin_founders(), public.admin_founders_set(boolean) to authenticated;

-- ---------- 3. land_put with the value and the founders (as 20261110160000_cheat_flags.sql otherwise) ----------
create or replace function public.land_put(gh double precision, y int, port text, acc text, items jsonb, boat text default '', company text default '', ev text default '', reg text default '') returns void
language plpgsql security definer set search_path = public as $$
declare p text := pid(); r jsonb; e text := left(regexp_replace(coalesce(land_put.ev, ''), '[^a-z0-9_]', '', 'g'), 16);
  rg text := case when land_put.reg in ('nord', 'midt', 'vest', 'sor') then land_put.reg else '' end;
  pt text := left(regexp_replace(coalesce(land_put.port, ''), '[^A-Za-z0-9ÆØÅæøå_-]', '', 'g'), 40); yy int; tot double precision; any_ boolean := false;
begin
  if p is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from players where id = p) then raise exception 'no player'; end if;
  if gh is null or gh <> gh or abs(gh) > 1e7 then raise exception 'bad time'; end if;
  if gh > world_gh() + 24 then raise exception 'ahead of the clock'; end if;
  yy := extract(year from timestamp '2027-03-01 06:00' + make_interval(secs => gh * 3600))::int;
  if yy < 2026 or yy > 2200 then raise exception 'bad time'; end if;
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) > 24 then raise exception 'bad rows'; end if;
  if (select count(*) from landings where player_id = p and at > now() - interval '1 hour') > 400 then raise exception 'too many'; end if;
  begin
    select sum(least((i ->> 'kg')::real, 100000)) into tot from jsonb_array_elements(items) i where coalesce((i ->> 'kg')::real, 0) > 0;
    perform cheat_land(p, tot);
  exception when others then null;   -- a check must never stop a landing
  end;
  for r in select * from jsonb_array_elements(items) loop
    if coalesce((r ->> 'kg')::real, 0) > 0 then
      any_ := true;
      insert into landings (player_id, gh, y, port, sp, acc, kg, kgq, boat, company, ev, reg, kr)
        values (p, land_put.gh, yy, pt, left(regexp_replace(coalesce(r ->> 'sp', ''), '[^a-z0-9_]', '', 'g'), 16),
                case when land_put.acc in ('open', 'lukket') then land_put.acc else 'none' end,
                least((r ->> 'kg')::real, 100000), least(greatest(coalesce((r ->> 'kgq')::real, 0), 0), 100000),
                left(btrim(regexp_replace(coalesce(land_put.boat, ''), '[<>&"''`\\]', '', 'g')), 24),
                left(btrim(regexp_replace(coalesce(land_put.company, ''), '[<>&"''`\\]', '', 'g')), 40), e, rg,
                -- (at most 1 000 kr a kilo: no fish the game sells is worth more; a broken number counts as nothing)
                least(greatest(coalesce(case when jsonb_typeof(r -> 'kr') = 'number' then (r ->> 'kr')::real end, 0), 0), least((r ->> 'kg')::real, 100000) * 1000));
    end if;
  end loop;
  if any_ then
    begin perform founder_take(p); exception when others then null; end;   -- (nor may the badge)
  end if;
end $$;

-- ---------- 4. the leaderboard in three kinds ----------
create or replace function public.top_list(kind text, w int default 0, grp text default 'open') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p text := pid(); k text := case when top_list.kind in ('kr', 'tot') then top_list.kind else 'kg' end;
  g text := case when top_list.grp = 'lukket' then 'lukket' else 'open' end; cap real := case when top_list.grp = 'lukket' then 60000 else 10000 end; co boolean := cheat_on();
begin
  if p is null then raise exception 'not signed in'; end if;
  if k <> 'tot' and (w is null or w < 0 or w > 100000) then raise exception 'bad week'; end if;
  return (
    with l as (select x.* from landings x
                 where (k = 'tot' or (x.acc = g and x.gh >= top_list.w * 168.0 and x.gh < (top_list.w + 1) * 168.0))
                   and (x.player_id = p or (not exists (select 1 from players gp where gp.id = x.player_id and gp.guest)
                        and not (co and exists (select 1 from cheat_flags cf where cf.player_id = x.player_id and cf.cleared_at is null))))),
    t as (select l.player_id, sum(least(l.kg, cap)) kg, sum(least(l.kr, cap * 1000)) kr, (array_agg(l.boat order by l.id desc))[1] boat,
                 (array_agg(l.company order by l.id desc))[1] company from l group by l.player_id),
    pt as (select distinct on (player_id) player_id, port from (select l.player_id, l.port, sum(l.kg) s from l group by l.player_id, l.port) a order by player_id, s desc),
    r as (select t.*, pt.port, rank() over (order by case when k = 'kg' then t.kg else t.kr end desc) rk from t left join pt using (player_id))
    select jsonb_build_object(
      'kind', k, 'grp', g,
      'rows', coalesce((select jsonb_agg(jsonb_build_object('rank', rk, 'hid', left(md5('dsb' || a.player_id), 10), 'boat', boat,
                          'company', case when g = 'lukket' or k = 'tot' then company else '' end, 'port', port,
                          'kg', round(kg::numeric), 'kr', round(kr::numeric), 'me', player_id = p,
                          'f', (select fo.no from founders fo where fo.player_id = a.player_id),
                          'user', coalesce((select nm.name from names nm where nm.player_id = a.player_id and nm.removed_at is null), '')) order by rk, kg desc)
                        from (select * from r order by rk limit 20) a), '[]'::jsonb),
      'mine', (select jsonb_build_object('rank', rk, 'kg', round(kg::numeric), 'kr', round(kr::numeric)) from r where player_id = p),
      'n', (select count(*) from t)));
end $$;
revoke all on function public.top_list(text, int, text) from public, anon, authenticated;
grant execute on function public.top_list(text, int, text) to authenticated;

-- ---------- 5. the profile's own figures ----------
create table if not exists public.profiles (
  player_id text primary key references public.players(id) on delete cascade,
  fleet smallint not null default 1 check (fleet between 0 and 500),
  value bigint not null default 0 check (value between 0 and 100000000000),
  worth bigint not null default 0 check (worth between -100000000000 and 100000000000),
  company text not null default '' check (char_length(company) <= 40),
  form text not null default 'ENK' check (form in ('ENK', 'AS')),
  ach smallint not null default 0 check (ach between 0 and 10000),
  boats jsonb not null default '[]'::jsonb check (jsonb_typeof(boats) = 'array' and octet_length(boats::text) <= 2000),
  recs jsonb not null default '[]'::jsonb check (jsonb_typeof(recs) = 'array' and octet_length(recs::text) <= 1500),
  at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;

-- the game's figures for the profile, at most every 30 seconds; a guest's are not kept
create or replace function public.prof_put(d jsonb) returns void language plpgsql security definer set search_path = public as $$
declare p text := pid(); clean text := '[<>&"''`\\]';
begin
  if p is null then raise exception 'not signed in'; end if;
  if is_guest() then return; end if;
  if not exists (select 1 from players where id = p) then raise exception 'no player'; end if;
  if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text) > 4000 then raise exception 'bad profile'; end if;
  if exists (select 1 from profiles where player_id = p and at > now() - interval '30 seconds') then return; end if;
  insert into profiles (player_id, fleet, value, worth, company, form, ach, boats, recs, at)
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
    now())
  on conflict (player_id) do update set fleet = excluded.fleet, value = excluded.value, worth = excluded.worth, company = excluded.company,
    form = excluded.form, ach = excluded.ach, boats = excluded.boats, recs = excluded.recs, at = excluded.at;
end $$;
revoke all on function public.prof_put(jsonb) from public, anon, authenticated;
grant execute on function public.prof_put(jsonb) to authenticated;

-- ---------- 6. the profile picture, approved by the admin ----------
create table if not exists public.avatars (
  player_id text primary key references public.players(id) on delete cascade,
  img text not null check (char_length(img) <= 200000 and img ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'),
  state text not null default 'wait' check (state in ('wait', 'ok', 'no')),
  at timestamptz not null default now(),
  seen_at timestamptz
);
alter table public.avatars enable row level security;
revoke all on public.avatars from anon, authenticated;

create or replace function public.av_put(img text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p text := pid();
begin
  if p is null then raise exception 'not signed in'; end if;
  if is_guest() then raise exception 'guest'; end if;
  if img is null or char_length(img) > 200000 or img !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' then raise exception 'bad image'; end if;
  if exists (select 1 from avatars where player_id = p and at > now() - interval '1 minute') then raise exception 'too soon'; end if;
  insert into avatars (player_id, img, state, at, seen_at) values (p, img, 'wait', now(), null)
    on conflict (player_id) do update set img = excluded.img, state = 'wait', at = now(), seen_at = null;
  return jsonb_build_object('state', 'wait');
end $$;
-- the caller's own picture and where it stands (wait, ok, no), or null
create or replace function public.av_mine() returns jsonb language sql stable security definer set search_path = public as $$
  select (select jsonb_build_object('img', a.img, 'state', a.state, 'at', a.at) from avatars a where a.player_id = pid()) $$;
create or replace function public.admin_av_list() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('who', left(md5('dsb' || a.player_id), 10), 'name', coalesce(nm.name, ''), 'img', a.img, 'state', a.state, 'at', a.at) order by a.at)
                   from avatars a left join names nm on nm.player_id = a.player_id and nm.removed_at is null where a.state = 'wait'), '[]'::jsonb);
end $$;
create or replace function public.admin_av_set(who text, ok boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update avatars set state = case when ok then 'ok' else 'no' end, seen_at = now() where left(md5('dsb' || player_id), 10) = who;
end $$;
revoke all on function public.av_put(text), public.av_mine(), public.admin_av_list(), public.admin_av_set(text, boolean) from public, anon, authenticated;
grant execute on function public.av_put(text), public.av_mine(), public.admin_av_list(), public.admin_av_set(text, boolean) to authenticated;

-- ---------- 7. one player's profile, by the public id ----------
create index if not exists players_hid on public.players ((left(md5('dsb' || id), 10)));
create or replace function public.profile_get(hid text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p text := pid(); q text; co boolean := cheat_on();
begin
  if p is null then raise exception 'not signed in'; end if;
  select pl.id into q from players pl where left(md5('dsb' || pl.id), 10) = profile_get.hid and (not pl.guest or pl.id = p);
  if q is null then return null; end if;
  return (
    with mine as (select sum(least(l.kg, 60000)) kg, sum(least(l.kr, 60000000)) kr, count(distinct l.port) ports from landings l where l.player_id = q),
    tot as (select l.player_id, sum(least(l.kr, case when l.acc = 'lukket' then 60000000 else 10000000 end)) kr from landings l
              where l.player_id = q or (not exists (select 1 from players gp where gp.id = l.player_id and gp.guest)
                    and not (co and exists (select 1 from cheat_flags cf where cf.player_id = l.player_id and cf.cleared_at is null)))
              group by l.player_id),
    rk as (select player_id, rank() over (order by kr desc) r from tot)
    select jsonb_build_object(
      'hid', profile_get.hid, 'me', q = p,
      'user', coalesce((select nm.name from names nm where nm.player_id = q and nm.removed_at is null), ''),
      'fs', (select round(pl.fs::numeric) from players pl where pl.id = q),
      'since', (select pl.created_at from players pl where pl.id = q),
      'f', (select fo.no from founders fo where fo.player_id = q),
      'img', (select a.img from avatars a where a.player_id = q and a.state = 'ok'),
      'boat', (select pr.boat from presence pr where pr.player_id = q), 'vtype', (select pr.vtype from presence pr where pr.player_id = q),
      'prof', (select jsonb_build_object('fleet', pf.fleet, 'value', pf.value, 'worth', pf.worth, 'company', pf.company, 'form', pf.form, 'ach', pf.ach,
                                         'boats', pf.boats, 'recs', pf.recs, 'at', pf.at) from profiles pf where pf.player_id = q),
      'kg', (select round(coalesce(kg, 0)::numeric) from mine), 'kr', (select round(coalesce(kr, 0)::numeric) from mine), 'ports', (select ports from mine),
      'rank', (select r from rk where player_id = q), 'n', (select count(*) from tot)));
end $$;
revoke all on function public.profile_get(text) from public, anon, authenticated;
grant execute on function public.profile_get(text) to authenticated;
