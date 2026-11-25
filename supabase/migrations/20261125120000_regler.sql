-- Regelverket i klartekst, the measuring (steg 153, K5 of docs/planer/regler-i-klartekst.md, 25.11.2026). The game sends, from players who
-- share usage statistics: land_conf {kg, acc} (a landing with something confiscated, in three sizes, by the group), why_shown {code} (the
-- reason a grey button showed), mer_open {k} (a «Mer» fold opened, by the page), vis_alt {on} («Vis alt» in the settings), buy_noacc {k}
-- (a purchase that took the quota from the boat traded in, made after the question) and bladb {} (blad B reached); sale and km_reg were
-- there before. For the admin's funnel: sums and distinct players only, never who, which boat or where. Additions only: one new function.
create or replace function public.admin_regler(weeks int default 8) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(weeks => greatest(1, least(coalesce(admin_regler.weeks, 8), 52)));
begin
  if not is_admin() then raise exception 'not admin'; end if;
  return jsonb_build_object(
    'sales', (select count(*) from events where kind = 'sale' and ts >= since),
    'sellers', (select count(distinct player_id) from events where kind = 'sale' and ts >= since),
    'conf', (select count(*) from events where kind = 'land_conf' and ts >= since),
    'conf_players', (select count(distinct player_id) from events where kind = 'land_conf' and ts >= since),
    'conf_by', coalesce((select jsonb_object_agg(k, n) from (
        select coalesce(data ->> 'acc', '?') || ':' || coalesce(data ->> 'kg', '?') k, count(*) n
        from events where kind = 'land_conf' and ts >= since group by 1) x), '{}'::jsonb),
    'why', coalesce((select jsonb_object_agg(k, jsonb_build_object('n', n, 'p', p)) from (
        select left(data ->> 'code', 24) k, count(*) n, count(distinct player_id) p
        from events where kind = 'why_shown' and data ? 'code' and ts >= since group by 1) x), '{}'::jsonb),
    'mer', coalesce((select jsonb_object_agg(k, jsonb_build_object('n', n, 'p', p)) from (
        select left(data ->> 'k', 24) k, count(*) n, count(distinct player_id) p
        from events where kind = 'mer_open' and data ? 'k' and ts >= since group by 1) x), '{}'::jsonb),
    'vis_on', (select count(distinct player_id) from events where kind = 'vis_alt' and data ->> 'on' = '1' and ts >= since),
    'vis_off', (select count(distinct player_id) from events where kind = 'vis_alt' and data ->> 'on' = '0' and ts >= since),
    'noacc', (select count(*) from events where kind = 'buy_noacc' and ts >= since),
    'noacc_players', (select count(distinct player_id) from events where kind = 'buy_noacc' and ts >= since),
    'bladb', (select count(distinct player_id) from events where kind = 'bladb' and ts >= since),
    'right', (select count(distinct player_id) from events where kind = 'km_reg' and data ->> 'kind' = 'right' and ts >= since),
    -- the days from blad B to the first right bought at the yard, for the players who did both in the period: the median
    'days', (select percentile_cont(0.5) within group (order by d) from (
        select extract(epoch from (r.t - b.t)) / 86400.0 d
        from (select player_id, min(ts) t from events where kind = 'bladb' and ts >= since group by 1) b
        join (select player_id, min(ts) t from events where kind = 'km_reg' and data ->> 'kind' = 'right' and ts >= since group by 1) r on r.player_id = b.player_id
        where r.t >= b.t) x));
end $$;
revoke all on function public.admin_regler(int) from public, anon;
grant execute on function public.admin_regler(int) to authenticated;
