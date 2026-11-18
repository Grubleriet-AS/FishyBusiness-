-- shop-checkout {verify} (tilbakemelding #185, 18.11.2026): back from Stripe, or the game opened anew, the game asks whether its purchase
-- is paid, and the function asks Stripe and books a paid session the webhook has not (shop_paid). This is the limit on how often Stripe
-- is asked, so no player can keep the function asking: at most once every 5 seconds per purchase, only an open purchase made the last
-- 24 hours (a Checkout session runs out after 24 hours), and only among the player's five newest. Run on the test project first, then in
-- production before shop-checkout with verify is deployed (without it the function asks Stripe nothing and answers open).
--
--   purchases.verify_at        when Stripe was last asked about it through verify
--   shop_verify_slot(sid, p)   'ask': Stripe may be asked now (verify_at set); 'wait': asked within 5 s; 'old': not open-and-new enough
--                              to ask; 'gone': not this player's (or no such purchase); else the purchase's own status ('paid', ...)

alter table public.purchases add column if not exists verify_at timestamptz;

create or replace function public.shop_verify_slot(sid text, p text) returns text
language plpgsql security definer set search_path = public as $$
declare u purchases;
begin
  select * into u from purchases where id = shop_verify_slot.sid;
  if u.id is null or p is null or u.player_id is distinct from shop_verify_slot.p then return 'gone'; end if;
  if u.status <> 'open' then return u.status; end if;
  if u.created_at < now() - interval '24 hours'
     or u.id not in (select x.id from purchases x where x.player_id = shop_verify_slot.p order by x.created_at desc limit 5) then return 'old'; end if;
  update purchases set verify_at = now()
   where id = u.id and status = 'open' and (verify_at is null or verify_at < now() - interval '5 seconds');
  if not found then return 'wait'; end if;
  return 'ask';
end $$;
revoke all on function public.shop_verify_slot(text, text) from public, anon, authenticated;
grant execute on function public.shop_verify_slot(text, text) to service_role;
