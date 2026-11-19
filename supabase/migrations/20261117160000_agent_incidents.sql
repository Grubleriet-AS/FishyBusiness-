-- The groundings and the blows, for the feedback agent (17.11.2026; Jonas: «Har du sjekket databasen for hvor mange som eventuelt har
-- gått på grunn andre steder eller kollidert?» and «vi må ha kontroll på alt sånt så vi finner ut hvorfor det skjedde»).
-- The game sends an event for every grounding (kind 'aground', ui/10f-cloud.js: where, the boat, the speed, who steered) and, from
-- this change, for every blow against a quay, a pier, a breakwater or a sea mark ('hit') and every collision with another vessel
-- ('clash'). agent_incidents() is the agent's view of them, as agent_tech is of the errors: never who, each player a short code that
-- holds only within one reading, with the version and the platform of the session. And the grounding report in the feedback (meta.ag:
-- the route's points round the place, the trail, the depths, the heading) comes along in agent_feedback's meta, so the agent can tell
-- why it happened, not only where.

create or replace function public.agent_incidents(days int default 30) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s text := md5(random()::text || clock_timestamp()::text);
begin
  return jsonb_build_object(
    'days', days,
    'totals', (select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'how', how, 'n', n, 'players', pl) order by kind, n desc), '[]'::jsonb)
               from (select e.kind, e.data ->> 'how' how, count(*) n, count(distinct e.player_id) pl from events e
                     where e.kind in ('aground', 'hit', 'clash') and e.ts > now() - make_interval(days => greatest(1, least(days, 90)))
                     group by 1, 2) t),
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('ts', r.ts, 'kind', r.kind, 'd', r.data, 'who', left(md5(coalesce(r.player_id, '') || s), 6),
                                                         'version', r.version, 'platform', r.platform) order by r.ts desc), '[]'::jsonb)
             from (select e.ts, e.kind, e.data, e.player_id, x.version, x.platform from events e left join sessions x on x.id = e.session_id
                   where e.kind in ('aground', 'hit', 'clash') and e.ts > now() - make_interval(days => greatest(1, least(days, 90)))
                   order by e.ts desc limit 3000) r));
end $$;
-- the agent's reading: what it has not been through yet, oldest first, and what it noted before (to put the same things together)
create or replace function public.agent_feedback(lim int default 40) returns jsonb language plpgsql security definer set search_path = public as $$
declare s text := md5(random()::text || clock_timestamp()::text);
begin
  return jsonb_build_object(
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'ts', f.ts, 'topic', f.topic, 'rating', f.rating, 'body', agent_scrub(f.body),
               'who', left(md5(f.player_id || s), 6),
               'played', (select case when h is null then null when h < 1 then '<1 t' when h < 5 then '1-5 t' when h < 20 then '5-20 t' when h < 100 then '20-100 t' else '100+ t' end
                          from (select sum(x.active_s) / 3600.0 h from sessions x where x.player_id = f.player_id) q),
               'earlier', (select count(*) from feedback g where g.player_id = f.player_id and g.ts < f.ts),
               'nimg', (f.img is not null)::int + (select count(*) from feedback_img i where i.fid = f.id),
               'nvid', (select count(*) from feedback_media m where m.fid = f.id and m.done),
               'meta', (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(f.meta) e(k, v)
                        where k in ('version', 'platform', 'browser', 'pwa', 'quality', 'w', 'h', 'dpr', 'view', 'lvl', 'fps', 'boat', 'st', 'port', 'pos', 't', 'tut', 'energy', 'ag')),
               'status', f.status, 'replied', f.reply is not null) order by f.ts), '[]'::jsonb)
             from (select * from feedback where ai_at is null order by ts limit greatest(1, least(lim, 100))) f),
    'left', (select count(*) from feedback where ai_at is null),
    'noted', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'ts', ts, 'topic', topic, 'note', ai_note, 'score', ai_score, 'status', status)
               order by ai_score desc nulls last), '[]'::jsonb)
             from (select * from feedback where ai_at is not null and ts > now() - interval '60 days' and status not in ('fixed', 'no')
                   order by ai_score desc nulls last limit 150) n),
    'last_run', (select jsonb_build_object('ts', ts, 'report', left(report, 6000)) from agent_runs order by ts desc limit 1));
end $$;

revoke all on function public.agent_incidents(int), public.agent_feedback(int) from public, anon, authenticated;
grant execute on function public.agent_incidents(int), public.agent_feedback(int) to service_role;
