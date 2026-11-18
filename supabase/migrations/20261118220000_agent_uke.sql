-- The week's numbers for the weekly report (live-drift, 18.11.2026; tools/triage/ukesrapport.py). Jonas, passing on a review the same
-- evening: «legge til andel feilfrie økter uke for uke som hovedtall øverst i rapporten», and «Vis både andel feilfrie økter (blant
-- brukere med samtykke) og totalt antall krasj/heng uavhengig av samtykke … slik at vi ikke får en blindsone på brukere uten samtykke».
--
-- For the last 7 days and the 7 before: the sessions (players with consent: only they have sessions), the sessions with a crash, a hang
-- or a severe 3D fault (black or one-coloured picture, NaN in the camera or the boat), and so the share of sessions without any; and the
-- crashes, hangs and severe 3D faults counted from the error list itself, which also has those sent without consent (with no player and
-- no session). Counts only, never who. Through the Edge Function feedback-agent (op 'uke') with its token: service_role only.
-- Expand only: a new function. Idempotent.
create or replace function public.agent_uke() returns jsonb
language sql stable security definer set search_path = public as $$
  with win as (
    select 'denne' k, now() - interval '7 days' fra, now() til
    union all select 'forrige', now() - interval '14 days', now() - interval '7 days'),
  sx as (
    select win.k, s.id from win join sessions s on s.started_at >= win.fra and s.started_at < win.til),
  e as (
    select win.k, er.session_id,
           (er.src = 'crash' or er.msg like 'Krasj%') krasj,
           (er.src = 'hang' or er.msg like 'Heng%') heng,
           (er.msg like '3D svart skjerm%' or er.msg like '3D bildet er én farge%' or er.msg like '%NaN i kameraet%' or er.msg like '%NaN i egen båt%') alvorlig3d
      from win join errors er on er.ts >= win.fra and er.ts < win.til),
  per as (
    select win.k,
           (select count(*) from sx where sx.k = win.k) okter,
           (select count(distinct sx.id) from sx join e on e.k = sx.k and e.session_id = sx.id where sx.k = win.k and (e.krasj or e.heng or e.alvorlig3d)) okter_med_feil,
           (select count(*) from e where e.k = win.k and e.krasj) krasj,
           (select count(*) from e where e.k = win.k and e.heng) heng,
           (select count(*) from e where e.k = win.k and e.alvorlig3d) alvorlig3d,
           (select count(*) from e where e.k = win.k and (e.krasj or e.heng or e.alvorlig3d) and e.session_id is null) uten_okt
      from win)
  select jsonb_object_agg(per.k, jsonb_build_object('okter', per.okter, 'okter_med_feil', per.okter_med_feil,
           'feilfrie', case when per.okter > 0 then round(1 - per.okter_med_feil::numeric / per.okter, 4) end,
           'krasj', per.krasj, 'heng', per.heng, 'alvorlig3d', per.alvorlig3d, 'uten_okt', per.uten_okt))
    from per
$$;
revoke all on function public.agent_uke() from public, anon, authenticated;
grant execute on function public.agent_uke() to service_role;
