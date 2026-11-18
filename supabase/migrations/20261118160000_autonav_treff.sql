-- Autonav's catch from the players (18.11.2026, docs/planer/autonav-null-treff.md «Fangsten»; Jonas: «hvordan skal vi da fange opp
-- mønstre for hvor ekte spillere grunnstøter, går gjennom kaier, kræsjer i havner og alt sånt?»).
-- The game sends anv_trip (a route's trip begun and ended) and anv_hit (what the hull touched: land, the bottom, a quay, a pier, a
-- breakwater, a floating dock, a mark, a bridge, a vessel lying still) through tm_batch, which stores events only for a player who has
-- said yes (players.consent). agent_autonav(days) is the autonav routine's view of them, with the groundings (aground): the day, the kind,
-- the event's data and the build's version, at most 20 000 rows, and never the player, the session or a name. Only for service_role
-- (the Edge Function feedback-agent, op 'autonav'); nothing new is stored, and no table changes.
create or replace function public.agent_autonav(days int default 7) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('day', to_char(e.ts at time zone 'Europe/Oslo', 'YYYY-MM-DD'), 'kind', e.kind, 'data', e.data, 'version', s.version) x
    from events e left join sessions s on s.id = e.session_id
    where e.kind in ('anv_hit', 'anv_trip', 'aground') and e.ts >= now() - make_interval(days => greatest(1, least(coalesce(days, 7), 90)))
    order by e.ts desc limit 20000) q
$$;
revoke all on function public.agent_autonav(int) from public, anon, authenticated;
grant execute on function public.agent_autonav(int) to service_role;
