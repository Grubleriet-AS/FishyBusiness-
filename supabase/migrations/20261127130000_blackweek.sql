-- Black Week (Jonas 27.11.2026, docs/planer/svart-fredag.md: «Vi må lage et Black Friday tilbud på spillet!»; the choices: a bigger
-- pack and a gift, no price put down, «Bare Black Week», 499 kr, Turbotrim 2 hours as the gift; 10 haill, so what the card says is
-- saved holds against the cheapest way to buy the same). Only additions, and safe to run again.
--
--   products            pakke_blackweek: Turbotrim and Skippertak for 3 days and 10 haill, 499 kr (905 kr the cheapest way otherwise, core/03-simulation.js
--                       PACKS.blackweek). data.until is the end of Monday 30.11.2026 Norwegian time: the game takes the card away then
--   shop_quote(product) as in 20261110170000_shop_gate.sql, and a product whose data.until has passed is not sold: the end of the
--                       offer holds with nobody there to switch it off, and it is never prolonged (the card names the last day)
--   the gift            a Turbotrim of 2 hours, a grant of the product trim_2 with no purchase, marked in its data (bw, and comp: the
--                       game's word for a gift from us, with no price). The product is one every version of the game knows, so a
--                       page that stood open over the release names it rightly too (a product of its own came out as its id there)
--   grants_bw_gift      one gift per account, whatever gives it
--   bw_gift()           a trigger: an account that gets its welcome gift (reg_luksus, tm_hello at the first hello of an account) while
--                       the offer lasts gets the Black Week gift too, so those who register in the period are not left out. Whatever
--                       goes wrong in it is swallowed: it stands on the way every new account comes in, and must never stop one
--   the accounts here   one gift each, while the offer lasts (run after the end, the file gives nobody anything)
--
-- The game gives the gift at the next start or claim (ui/10i-shop.js shopClaim4, a trim «given with no boat»), and data.comp makes the
-- confirmation say it is a gift from us.

insert into public.products (id, kind, name_no, name_en, price_nok, data) values
  ('pakke_blackweek', 'booster', 'Black Week-pakken: 10 haill, Turbotrim og Skippertak i 3 døgn', 'The Black Week pack: 10 luck, Turbo tune and Skippertak for 3 days', 499,
    '{"items":[{"give":"haill","type":"haill","n":10},{"give":"trim","k":"t72"},{"give":"skip","k":"s72"}],"until":"2026-11-30T23:00:00Z"}')
on conflict (id) do update set kind = excluded.kind, name_no = excluded.name_no, name_en = excluded.name_en, price_nok = excluded.price_nok, active = true, data = excluded.data;

create or replace function public.shop_quote(product text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p text := pid(); r products;
begin
  if p is null then raise exception 'not signed in'; end if;
  if is_guest() then raise exception 'guest'; end if;
  if not exists (select 1 from players where id = p) then raise exception 'no player'; end if;
  if shop_closed(p) then raise exception 'closed'; end if;
  select * into r from products where id = shop_quote.product and active;
  if r.id is null then raise exception 'no such product'; end if;
  if r.data ? 'until' and now() >= (r.data ->> 'until')::timestamptz then raise exception 'no such product'; end if;
  if (select count(*) from purchases where player_id = p and created_at > now() - interval '1 hour') >= 30 then raise exception 'too many'; end if;
  return jsonb_build_object('pid', p, 'id', r.id, 'name_no', r.name_no, 'name_en', r.name_en, 'price_nok', r.price_nok, 'data', r.data);
end $$;
-- (the rights stay as they are: «or replace» keeps them, and the signed-in player calls it through shop-checkout, 20261006040000_shop.sql)

create unique index if not exists grants_bw_gift on public.grants (player_id) where (data ? 'bw');

create or replace function public.bw_gift() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into grants (player_id, product_id, data)
      select new.player_id, 'trim_2', '{"give":"trim","k":"t2","comp":true,"bw":true}'::jsonb from products k
       where k.id = 'pakke_blackweek' and now() < (k.data ->> 'until')::timestamptz
    on conflict do nothing;
  exception when others then null;
  end;
  return null;
end $$;
revoke all on function public.bw_gift() from public, anon, authenticated;
drop trigger if exists bw_gift on public.grants;
create trigger bw_gift after insert on public.grants
  for each row when (new.product_id = 'reg_luksus') execute function public.bw_gift();

-- the accounts that are here (a WorkOS sign-in, user_…; a guest is a Supabase anonymous user whose id is a uuid, and gets the gift
-- with the welcome gift when it registers, above)
insert into public.grants (player_id, product_id, data)
  select p.id, 'trim_2', '{"give":"trim","k":"t2","comp":true,"bw":true}'::jsonb from public.players p, public.products k
   where k.id = 'pakke_blackweek' and now() < (k.data ->> 'until')::timestamptz
     and p.id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
on conflict do nothing;
