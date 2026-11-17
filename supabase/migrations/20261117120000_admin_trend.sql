-- The admin's status page (17.11.2026; Jonas: «ett dashboard med noen grafer … der jeg kjapt skjønte hva statusen i spillet var, som
-- feks linjediagram med daglige nye registreringer»). One read-only call with a row per day (Norwegian date) for the chosen period and
-- the period before it, so the page can draw the lines and say whether each number goes up or down:
--   new       players whose first session began that day (a guest who registers later keeps its sessions, guest_merge)
--   reg       accounts (WorkOS, not guests) created that day
--   active    players with a session that day
--   sessions, hours   sessions begun that day and their active time
--   sales, kr        landings (events 'sale') and their value in the game's kroner
--   rev, payers      paid purchases that day (kroner, Stripe) and the distinct payers
-- and the totals before the first day (players, accounts), so the page can draw the running count. Only sums, never who.
-- No table, no write, nothing in the game. Safe to run again.
create or replace function public.admin_trend(days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare n int := greatest(1, least(coalesce(admin_trend.days, 30), 400)); zone text := 'Europe/Oslo';
        d1 date := (now() at time zone 'Europe/Oslo')::date; d0 date; t0 timestamptz;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  d0 := d1 - (2 * n - 1); t0 := (d0::timestamp) at time zone zone;
  return (
    with dd as (select generate_series(d0, d1, interval '1 day')::date d),
    f as (select player_id, (min(started_at) at time zone zone)::date d from sessions group by player_id),
    fn as (select d, count(*) c from f where d >= d0 group by 1),
    s as (select (started_at at time zone zone)::date d, count(*) c, count(distinct player_id) p, round(sum(active_s) / 3600.0, 2) h
          from sessions where started_at >= t0 group by 1),
    e as (select (ts at time zone zone)::date d, count(*) c, coalesce(sum(case when data ->> 'kr' ~ '^-?[0-9]+(\.[0-9]+)?$' then (data ->> 'kr')::numeric end), 0) kr
          from events where ts >= t0 and kind = 'sale' group by 1),
    r as (select (created_at at time zone zone)::date d, count(*) c from players
          where created_at >= t0 and id like 'user\_%' and not guest group by 1),
    pay as (select (paid_at at time zone zone)::date d, coalesce(sum(amount_nok), 0) kr, count(distinct player_id) p from purchases
            where status = 'paid' and paid_at >= t0 group by 1)
    select jsonb_build_object(
      'generated', now(), 'days', n, 'from', d0, 'to', d1,
      'base', jsonb_build_object(
        'players', (select count(*) from f where f.d < d0),
        'reg', (select count(*) from players where created_at < t0 and id like 'user\_%' and not guest)),
      'rows', coalesce((select jsonb_agg(jsonb_build_object('day', dd.d,
          'new', coalesce(fn.c, 0), 'reg', coalesce(r.c, 0),
          'active', coalesce(s.p, 0), 'sessions', coalesce(s.c, 0), 'hours', coalesce(s.h, 0),
          'sales', coalesce(e.c, 0), 'kr', round(coalesce(e.kr, 0)), 'rev', coalesce(pay.kr, 0), 'payers', coalesce(pay.p, 0)) order by dd.d)
        from dd left join fn on fn.d = dd.d left join s on s.d = dd.d left join e on e.d = dd.d left join r on r.d = dd.d left join pay on pay.d = dd.d), '[]'::jsonb)));
end $$;
revoke all on function public.admin_trend(int) from public, anon;
grant execute on function public.admin_trend(int) to authenticated;
