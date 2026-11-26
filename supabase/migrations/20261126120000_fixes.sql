-- An admin's correction delivered to one player's game (26.11.2026; Jonas, about a player who traded in his plastsjark for a kyst21 that
-- cannot fish inside the baseline and asked to have the purchase undone: «Gi han tilbake båten og pengene som om kjøpet aldri fant sted»,
-- and «lag et verktøy som løser dette på en ok måte for oss begge»).
-- The game holds the save, so the correction is done there, as the shop's grants are: the admin writes a row here (admin_fix_add, the
-- tab «Korrigering» in /admin), the player's game asks for its open rows at start and every ten minutes (fix_pending, ui/10w-fix.js),
-- does what the row says in its own state (core/03-simulation.js undoBuyApply) and answers with what it did (fix_done). Nothing reads or
-- writes a save on the server, so a player who is playing gets it at once, and no save is written over.
-- Kinds: 'undo_buy' {from, to, kr?}: the vessel followed, of type `to`, goes back to type `from` as delivered; the refund (kr, or the
-- price of `to` less 70 % of the price of `from`) pays down the loans first and the rest goes to the account.
-- Only additions: a new table and new functions.

create table if not exists public.fixes (
  id bigint generated always as identity primary key,
  player_id text not null references public.players(id) on delete cascade,
  kind text not null check (kind in ('undo_buy')),
  data jsonb not null default '{}',
  note text,                                   -- the line the player reads in the game (Norwegian; the game has its own when empty)
  created_at timestamptz not null default now(),
  done_at timestamptz,
  result jsonb,                                -- what the game did (undoBuyApply's answer), or why it could not
  revoked_at timestamptz
);
create index if not exists fixes_open on public.fixes (player_id) where done_at is null and revoked_at is null;
alter table public.fixes enable row level security;
revoke all on public.fixes from anon, authenticated;

-- the game: its own open corrections
create or replace function public.fix_pending() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'kind', f.kind, 'data', f.data, 'note', f.note) order by f.id), '[]'::jsonb)
    from fixes f where f.player_id = pid() and f.done_at is null and f.revoked_at is null
$$;
-- the game: one done, with what it did (a 'wait' answer, such as «not in port», is kept on the row and the row stays open)
create or replace function public.fix_done(fid bigint, res jsonb, done boolean) returns void
language sql security definer set search_path = public as $$
  update fixes set result = fix_done.res, done_at = case when fix_done.done then now() else null end
   where id = fix_done.fid and player_id = pid() and done_at is null and revoked_at is null
$$;

-- the admin: the account (the WorkOS id «user_…» or the public id the admin shows, md5 of 'dsb' and the id, ten characters)
create or replace function public.fix_who(who text) returns text
language sql stable security definer set search_path = public as $$
  select p.id from players p where p.id = fix_who.who or left(md5('dsb' || p.id), 10) = fix_who.who limit 1
$$;
-- the admin: what the account is now and which vessel types it has sailed lately (to fill in «from» and «to»), and its corrections
create or replace function public.admin_fix_find(who text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p text;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  p := fix_who(who); if p is null then return jsonb_build_object('found', false); end if;
  return jsonb_build_object('found', true, 'id', p, 'pub', left(md5('dsb' || p), 10),
    'save', (select jsonb_build_object('saved_at', s.saved_at, 'summary', s.summary, 'device', s.device_name) from saves s where s.player_id = p),
    'types', coalesce((select jsonb_agg(jsonb_build_object('type', x.t, 'first', x.a, 'last', x.b) order by x.b desc) from (
        select e.data ->> 'boat' t, min(e.ts) a, max(e.ts) b from events e
         where e.player_id = p and e.kind = 'anv_trip' and e.data ->> 'how' = 'autonav' and e.ts > now() - interval '14 days' and e.data ? 'boat'
         group by 1) x), '[]'::jsonb),
    'buys', coalesce((select jsonb_agg(e.ts order by e.ts desc) from events e where e.player_id = p and e.kind = 'buy_moment' and e.ts > now() - interval '30 days'), '[]'::jsonb),
    'fixes', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'kind', f.kind, 'data', f.data, 'note', f.note, 'at', f.created_at, 'done', f.done_at, 'result', f.result, 'revoked', f.revoked_at) order by f.id desc)
        from fixes f where f.player_id = p), '[]'::jsonb));
end $$;
create or replace function public.admin_fix_add(who text, kind text, data jsonb, note text) returns bigint
language plpgsql security definer set search_path = public as $$
declare p text; i bigint;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  p := fix_who(who); if p is null then raise exception 'no such account'; end if;
  if exists (select 1 from fixes f where f.player_id = p and f.done_at is null and f.revoked_at is null) then raise exception 'the account has an open correction'; end if;
  insert into fixes (player_id, kind, data, note) values (p, admin_fix_add.kind, coalesce(admin_fix_add.data, '{}'::jsonb), nullif(trim(admin_fix_add.note), '')) returning id into i;
  return i;
end $$;
create or replace function public.admin_fix_revoke(fid bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update fixes set revoked_at = now() where id = admin_fix_revoke.fid and done_at is null and revoked_at is null;
end $$;

revoke all on function public.fix_pending(), public.fix_done(bigint, jsonb, boolean), public.fix_who(text), public.admin_fix_find(text),
  public.admin_fix_add(text, text, jsonb, text), public.admin_fix_revoke(bigint) from public, anon, authenticated;
grant execute on function public.fix_pending(), public.fix_done(bigint, jsonb, boolean) to authenticated;
grant execute on function public.admin_fix_find(text), public.admin_fix_add(text, text, jsonb, text), public.admin_fix_revoke(bigint) to authenticated;
