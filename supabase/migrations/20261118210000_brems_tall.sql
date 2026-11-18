-- The numbers the emergency brake reads after a release (live-drift fase 4, 18.11.2026; Jonas: «Automatisk nødbrems i servervakta som
-- overvåker telemetrien i 2 timer etter hvert slipp, ruller tilbake til forrige utgavemappe hvis feilraten passerer tersklene»).
--
-- tools/server/vakt/brems.py on the game's server calls this with the game's publishable key (the one in every player's page), so it
-- gives counts only: for the new edition since it went out, and for the edition before over the day before that, the sessions, the
-- sessions with a severe fault (a crash, a black or one-coloured 3D picture, NaN in the camera or the boat) and the severe faults' own
-- messages with their numbers taken out (the game's own text, never a player's, and never who). The windows are held to the last 3 and
-- 48 hours, so nothing older can be read this way. Expand only: a new function. Idempotent.
create or replace function public.brems_tall(ny text, gml text, siden timestamptz, gml_fra timestamptz) returns jsonb
language sql stable security definer set search_path = public as $$
  with w as (
    select greatest(least(brems_tall.siden, now()), now() - interval '3 hours') s,
           greatest(least(brems_tall.gml_fra, brems_tall.siden, now()), now() - interval '48 hours') g),
  win as (
    select brems_tall.ny v, w.s fra, now() til from w
    union all select brems_tall.gml, w.g, w.s from w),
  bad as (
    select win.v, coalesce(e.session_id::text, 'e' || e.id) k, left(regexp_replace(e.msg, '\m[0-9]+([.,][0-9]+)?\M', '#', 'g'), 120) m
      from win join errors e on e.version = win.v and e.ts >= win.fra and e.ts < win.til
     where e.src = 'crash' or e.msg like 'Krasj%' or e.msg like '3D svart skjerm%' or e.msg like '3D bildet er én farge%'
        or e.msg like '%NaN i kameraet%' or e.msg like '%NaN i egen båt%'),
  per as (
    select win.v,
           (select count(*) from sessions s where s.version = win.v and s.started_at >= win.fra and s.started_at < win.til) okter,
           (select count(distinct b.k) from bad b where b.v = win.v) alvorlige,
           (select coalesce(jsonb_agg(jsonb_build_object('melding', x.m, 'okter', x.n) order by x.n desc), '[]'::jsonb)
              from (select b.m, count(distinct b.k) n from bad b where b.v = win.v group by b.m order by 2 desc limit 10) x) signaturer
      from win)
  select jsonb_build_object(
    'ny', (select jsonb_build_object('versjon', v, 'okter', okter, 'alvorlige', alvorlige, 'signaturer', signaturer) from per where v = brems_tall.ny limit 1),
    'gml', (select jsonb_build_object('versjon', v, 'okter', okter, 'alvorlige', alvorlige, 'signaturer', signaturer) from per where v = brems_tall.gml limit 1),
    'fra', (select s from w), 'gml_fra', (select g from w))
$$;
revoke all on function public.brems_tall(text, text, timestamptz, timestamptz) from public;
grant execute on function public.brems_tall(text, text, timestamptz, timestamptz) to anon, authenticated, service_role;
