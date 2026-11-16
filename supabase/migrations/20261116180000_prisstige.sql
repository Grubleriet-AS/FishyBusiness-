-- The price ladder and the season pack (Jonas 16.11.2026: the 79 kr booster sells best in Laksebaronen and the players ask for dearer
-- ones; «Kjør på med det du foreslo, men husk at haill er basert på det at det er best når det er ferskt … Jeg er også enig i at en
-- samlepakke kan være et alternativ»). One effect, four lengths, the same prices on every kind; haill in packs of 1, 3 and 8 (each
-- switched on when the player wants, as before); and the season pack with its content known before it is bought. Raised the same evening
-- (Jonas: «Laksebaronen selger boostere som bare varer 8 timer til 79kr stykk»; «Vi må ikke bli for billige»; «Greit, kjør det ut»):
-- 2 / 8 / 24 hours and 3 days for 29 / 79 / 149 / 299 kr, haill 39 kr, 3 for 99, 8 for 229, luxury luck 79 kr, the season pack 249 kr.
-- Safe to run again, and over the first version of this file (its products are switched off below).
--
--   grants.n            a purchase may now give several grants (a pack of haill, the season pack): n numbers them, unique per purchase
--   shop_paid(sid, pi)  as in 20261007100000_designs.sql, but a product with data.items gives one grant for each item, and an item (or
--                       the product) with data.n gives n grants; the purchase's own data (the boat) goes into each
--   products            the new ones; the trims and Skippertak of before are no longer sold (their grants stay good: the game keeps
--                       their keys, core/03-simulation.js BOOSTS and core/15-energy.js SKIP, «old»)

alter table public.grants add column if not exists n smallint not null default 0;
alter table public.grants drop constraint if exists grants_purchase_id_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'grants_purchase_n_key') then
    alter table public.grants add constraint grants_purchase_n_key unique (purchase_id, n);
  end if;
end $$;

create or replace function public.shop_paid(sid text, pi text) returns boolean
language plpgsql security definer set search_path = public as $$
declare u purchases; d jsonb; k text; it jsonb; i int; m int; c int := 0;
begin
  update purchases set status = 'paid', paid_at = coalesce(paid_at, now()), payment_intent = coalesce(shop_paid.pi, payment_intent)
   where id = shop_paid.sid and status in ('open', 'failed', 'expired') returning * into u;
  if u.id is null then return false; end if;
  select data, kind into d, k from products where id = u.product_id;
  if u.player_id is not null then
    for it in select value from jsonb_array_elements(case when jsonb_typeof(d -> 'items') = 'array' then d -> 'items' else jsonb_build_array(coalesce(d, '{}'::jsonb)) end) loop
      m := least(greatest(coalesce((it ->> 'n')::int, 1), 1), 20);
      for i in 1 .. m loop
        insert into grants (player_id, product_id, purchase_id, n, data)
          values (u.player_id, u.product_id, u.id, c, ((it - 'n') - 'items') || coalesce(u.data, '{}'))
          on conflict (purchase_id, n) do nothing;
        c := c + 1;
      end loop;
    end loop;
    if k = 'skin' then
      insert into entitlements (player_id, product_id, source) values (u.player_id, u.product_id, 'stripe:' || u.id) on conflict (player_id, product_id) do nothing;
    end if;
  end if;
  return true;
end $$;
revoke all on function public.shop_paid(text, text) from public, anon, authenticated;

insert into public.products (id, kind, name_no, name_en, price_nok, data) values
  ('haill', 'booster', 'Haill', 'Luck', 39, '{"give":"haill","type":"haill"}'),
  ('luksus', 'booster', 'Luksushaill', 'Luxury luck', 79, '{"give":"haill","type":"luksus"}'),
  ('haill_3', 'booster', 'Haill × 3', 'Luck × 3', 99, '{"give":"haill","type":"haill","n":3}'),
  ('haill_8', 'booster', 'Haill × 8', 'Luck × 8', 229, '{"give":"haill","type":"haill","n":8}'),
  ('trim_2', 'booster', 'Turbotrim, 2 timer (dobbel fart)', 'Turbo tune, 2 hours (double speed)', 29, '{"give":"trim","k":"t2"}'),
  ('trim_8', 'booster', 'Turbotrim, 8 timer (dobbel fart)', 'Turbo tune, 8 hours (double speed)', 79, '{"give":"trim","k":"t8"}'),
  ('trim_24', 'booster', 'Turbotrim, 24 timer (dobbel fart)', 'Turbo tune, 24 hours (double speed)', 149, '{"give":"trim","k":"t24"}'),
  ('trim_72', 'booster', 'Turbotrim, 3 døgn (dobbel fart)', 'Turbo tune, 3 days (double speed)', 299, '{"give":"trim","k":"t72"}'),
  ('skip_2', 'booster', 'Skippertak, 2 timer', 'Skippertak, 2 hours', 29, '{"give":"skip","k":"s2"}'),
  ('skip_8', 'booster', 'Skippertak, 8 timer', 'Skippertak, 8 hours', 79, '{"give":"skip","k":"s8"}'),
  ('skip_24', 'booster', 'Skippertak, 24 timer', 'Skippertak, 24 hours', 149, '{"give":"skip","k":"s24"}'),
  ('skip_72', 'booster', 'Skippertak, 3 døgn', 'Skippertak, 3 days', 299, '{"give":"skip","k":"s72"}'),
  ('pakke_sesong', 'booster', 'Sesongpakken: 4 haill, Turbotrim og Skippertak i 24 timer', 'The season pack: 4 luck, Turbo tune and Skippertak for 24 hours', 249,
    '{"items":[{"give":"haill","type":"haill","n":4},{"give":"trim","k":"t24"},{"give":"skip","k":"s24"}]}')
on conflict (id) do update set kind = excluded.kind, name_no = excluded.name_no, name_en = excluded.name_en, price_nok = excluded.price_nok, active = true, data = excluded.data;

-- the first version of this file's lengths and packs, if it was run (the test project): no longer sold
update public.products set active = false where id in ('haill_2', 'haill_4', 'trim_4', 'trim_12', 'skip_4', 'skip_12');

-- the trims and Skippertak of before: no longer sold (a grant already bought stays good)
update public.products set active = false where id in ('trim_pump', 'trim_ic', 'trim_turbo', 'skip_light', 'skip', 'skip_max');
