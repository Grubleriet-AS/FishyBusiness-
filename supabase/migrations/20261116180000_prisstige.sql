-- The price ladder and the season pack (Jonas 16.11.2026: the 79 kr booster sells best in Laksebaronen and the players ask for dearer
-- ones; «Kjør på med det du foreslo, men husk at haill er basert på det at det er best når det er ferskt … Jeg er også enig i at en
-- samlepakke kan være et alternativ»). One effect, four lengths, 29 / 49 / 79 / 129 kr on every kind; haill in packs of 1, 2, 4 and 8
-- (each switched on when the player wants, as before); and the season pack for 149 kr with its content known before it is bought.
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
  ('haill_2', 'booster', 'Haill × 2', 'Luck × 2', 49, '{"give":"haill","type":"haill","n":2}'),
  ('haill_4', 'booster', 'Haill × 4', 'Luck × 4', 79, '{"give":"haill","type":"haill","n":4}'),
  ('haill_8', 'booster', 'Haill × 8', 'Luck × 8', 129, '{"give":"haill","type":"haill","n":8}'),
  ('trim_4', 'booster', 'Turbotrim, 4 timer (dobbel fart)', 'Turbo tune, 4 hours (double speed)', 29, '{"give":"trim","k":"t4"}'),
  ('trim_12', 'booster', 'Turbotrim, 12 timer (dobbel fart)', 'Turbo tune, 12 hours (double speed)', 49, '{"give":"trim","k":"t12"}'),
  ('trim_24', 'booster', 'Turbotrim, 24 timer (dobbel fart)', 'Turbo tune, 24 hours (double speed)', 79, '{"give":"trim","k":"t24"}'),
  ('trim_72', 'booster', 'Turbotrim, 3 døgn (dobbel fart)', 'Turbo tune, 3 days (double speed)', 129, '{"give":"trim","k":"t72"}'),
  ('skip_4', 'booster', 'Skippertak, 4 timer', 'Skippertak, 4 hours', 29, '{"give":"skip","k":"s4"}'),
  ('skip_12', 'booster', 'Skippertak, 12 timer', 'Skippertak, 12 hours', 49, '{"give":"skip","k":"s12"}'),
  ('skip_24', 'booster', 'Skippertak, 24 timer', 'Skippertak, 24 hours', 79, '{"give":"skip","k":"s24"}'),
  ('skip_72', 'booster', 'Skippertak, 3 døgn', 'Skippertak, 3 days', 129, '{"give":"skip","k":"s72"}'),
  ('pakke_sesong', 'booster', 'Sesongpakken: 4 haill, Turbotrim og Skippertak i 24 timer', 'The season pack: 4 luck, Turbo tune and Skippertak for 24 hours', 149,
    '{"items":[{"give":"haill","type":"haill","n":4},{"give":"trim","k":"t24"},{"give":"skip","k":"s24"}]}')
on conflict (id) do update set kind = excluded.kind, name_no = excluded.name_no, name_en = excluded.name_en, price_nok = excluded.price_nok, active = true, data = excluded.data;

-- the trims and Skippertak of before: no longer sold (a grant already bought stays good)
update public.products set active = false where id in ('trim_pump', 'trim_ic', 'trim_turbo', 'skip_light', 'skip', 'skip_max');
