-- The invite link (tilbakemelding #132, Jonas 17.11.2026: «Ønske om vervelenke må vi ordne. Vi kan også gjerne gi spilleren takk-haill
-- for vervinger som skaper registrerte brukere», and on when: «Når vennen har levert fisk», at most five rewarded a month).
--
-- Each registered player has a short code of their own (ref_mine makes it the first time it is asked for); the link is
-- detstorebla.no/?verv=<code>. The game keeps the code on the friend's device (localStorage dsb_ref) and hands it in with ref_claim once
-- the friend is registered (not a guest). The one who invited gets one takk-haill (the same 12 hours of full luck as for feedback,
-- HAILL.takk) the first time the friend has a landing on the account (a guest's landings come along with guest_merge), at most five a
-- month (Oslo time); one over the five is marked and gives nothing. An account may be invited once, only in its first 14 days, never by
-- itself. Nothing is for sale: the product is not active, and no real money is in it (engasjement.md: «et enkelt "inviter en venn"»).

insert into public.products (id, kind, name_no, name_en, price_nok, data, active) values
  ('ref_haill', 'booster', 'Takk-haill for en venn', 'Thank-you luck for a friend', 0, '{"give":"haill","type":"takk","reward":true,"ref":true}', false)
on conflict (id) do update set name_no = excluded.name_no, name_en = excluded.name_en, price_nok = excluded.price_nok, data = excluded.data, active = false;

create table if not exists public.ref_codes (
  player_id text primary key,
  code text not null unique,
  created_at timestamptz not null default now()
);
alter table public.ref_codes enable row level security;
revoke all on public.ref_codes from anon, authenticated;

create table if not exists public.referrals (
  friend_id text primary key,                 -- one inviter per account, for good
  referrer_id text not null,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,                    -- the takk-haill given
  over_at timestamptz                         -- the friend landed in a month the inviter had had five: nothing given
);
create index if not exists referrals_referrer on public.referrals (referrer_id, rewarded_at);
alter table public.referrals enable row level security;
revoke all on public.referrals from anon, authenticated;

-- the reward, when the friend has landed: called by ref_claim and by the trigger on landings
create or replace function public.ref_check(f text) returns void language plpgsql security definer set search_path = public as $$
declare r public.referrals; m timestamptz := date_trunc('month', now() at time zone 'Europe/Oslo') at time zone 'Europe/Oslo'; lg text;
begin
  select * into r from referrals where friend_id = f and rewarded_at is null and over_at is null for update;
  if not found then return; end if;
  if not exists (select 1 from landings where player_id = f and kg > 0) then return; end if;
  if (select count(*) from referrals where referrer_id = r.referrer_id and rewarded_at >= m) >= 5 then
    update referrals set over_at = now() where friend_id = f; return;
  end if;
  insert into grants (player_id, product_id, data) values (r.referrer_id, 'ref_haill', '{"give":"haill","type":"takk","reward":true,"ref":true}'::jsonb);
  update referrals set rewarded_at = now() where friend_id = f;
  if exists (select 1 from push_subs s where s.player_id = r.referrer_id) then
    select coalesce(max(s.lang), 'no') into lg from push_subs s where s.player_id = r.referrer_id;
    insert into push_queue (player_id, send_at, tag, title, body, kind, expires_at) values (r.referrer_id, now(), 'dsb-verv-' || md5(f),
      case when lg like 'en%' then 'Your friend has landed fish' else 'Vennen din har levert fisk' end,
      case when lg like 'en%' then 'Thank you for inviting them. 12 hours of full luck are waiting in the Luck app.'
           else 'Takk for at du inviterte. 12 timer med fullt haill venter i Haill-appen.' end, 'srv', now() + interval '24 hours');
  end if;
end $$;
revoke all on function public.ref_check(text) from public, anon, authenticated;

create or replace function public.ref_landing() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from referrals where friend_id = new.player_id and rewarded_at is null and over_at is null) then perform ref_check(new.player_id); end if;
  return null;
end $$;
revoke all on function public.ref_landing() from public, anon, authenticated;
drop trigger if exists landings_ref on public.landings;
create trigger landings_ref after insert or update of player_id on public.landings for each row execute function public.ref_landing();

-- the player's own link and how it has gone (registered players only: a guest's grant would be lost when the guest is merged away)
create or replace function public.ref_mine() returns jsonb language plpgsql security definer set search_path = public as $$
declare p text := pid(); c text; m timestamptz := date_trunc('month', now() at time zone 'Europe/Oslo') at time zone 'Europe/Oslo';
begin
  if p is null or is_guest() then raise exception 'not signed in'; end if;
  select code into c from ref_codes where player_id = p;
  while c is null loop
    c := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    insert into ref_codes (player_id, code) values (p, c) on conflict do nothing;
    select code into c from ref_codes where player_id = p;
  end loop;
  return jsonb_build_object('code', c, 'max', 5,
    'month', (select count(*) from referrals where referrer_id = p and rewarded_at >= m),
    'total', (select count(*) from referrals where referrer_id = p and rewarded_at is not null),
    'waiting', (select count(*) from referrals where referrer_id = p and rewarded_at is null and over_at is null));
end $$;

-- the friend hands in the code: 'ok', or why not (the game forgets the code on any answer)
create or replace function public.ref_claim(code text) returns text language plpgsql security definer set search_path = public as $$
declare p text := pid(); r text;
begin
  if p is null or is_guest() then raise exception 'not signed in'; end if;
  select player_id into r from ref_codes where ref_codes.code = lower(btrim(ref_claim.code));
  if r is null then return 'unknown'; end if;
  if r = p then return 'self'; end if;
  if exists (select 1 from referrals where friend_id = p) then return 'had'; end if;
  if (select created_at from players where id = p) < now() - interval '14 days' then return 'old'; end if;
  insert into referrals (friend_id, referrer_id) values (p, r) on conflict do nothing;
  perform ref_check(p);
  return 'ok';
end $$;

revoke all on function public.ref_mine(), public.ref_claim(text) from public, anon;
grant execute on function public.ref_mine(), public.ref_claim(text) to authenticated;
