-- HS5b (27.11.2026, Jonas' økt; docs/planer/haill-saldo.md, docs/systemer/skyen-og-felles-verden.md): the check of the kroner reads
-- what the company is worth, not the current account alone.
--
-- Jonas 27.11.2026: «Sjekk juksemerkingen på detstorebla.no/admin. Finn ut hva som har skjedd i de forskjellige tilfellene», and then
-- «Kjør på med rettingen av sjekken.» All twelve open marks were of the kind 'cash', and all twelve were false. The books inside each
-- save (S.ledger and S.stats.y) showed every krone accounted for; what the server saw as a jump was
--   * money moved from the savings account or the tax account to the current account (ten of the twelve: 273 959 to 1 201 218 kr),
--   * a loan paid out, or a vessel bought with a loan and a trade-in (the «5 % of the price must have been there» rule knew no trade-in),
--   * the type of the boat stood in changing in a fleet of two (42 marks on one account: 375 000 kr «more fleet» at every change).
-- The summary of a save had only cash, the bound vessel's type and the number of vessels. The game now sends, beside them
-- (core/03-simulation.js saveWorth, ui/10f-cloud.js saveSum):
--   bank    the savings and the tax account together, kr
--   debt    the loans (Kystbanken and Kystfondet), kr
--   types   every vessel's type
--   licv    what the rights are worth now (on the vessels and the free ones, structure quotas in full), kr
--
-- The check, at every save as before (the trigger on saves is the same; nothing is refused and the player is told nothing):
--   W     = cash + bank − debt. Money moved between the accounts, a loan paid out and an instalment leave it as it was.
--   in    = the list price (cheat_vt) of each vessel in the new summary that the one before did not have: money that must have been
--           there, so a boat bought with money written in between two saves shows. A vessel the broker's ledger handed over since
--           the save before is not counted (a boat bought from another player can cost 40 % of her valuation): that one, by her
--           type, not another one beside her.
--   out   = the list price of each vessel that is gone (a sale to the yard or a trade-in gives 70 % of it; the rest is room for what
--           was refunded with her), and what the rights' value fell by (a right sold to the register gives 90 % of its valuation).
--   rise  = W now − W before + in − out, against the save before AND every kept save (save_hist), the lowest of them: a save taken
--           back from the settings stands against itself. A first save stands against a new game's 15 000 kr, and every later one
--           also against a new game as it is (15 000 kr and a wooden boat; there every other vessel and the rights' whole value
--           count as in), so «Start på nytt» from a company with more debt than its boat is worth is no rise.
-- What is left of the rise is explained as before by the landings since the save before (twice the species' highest price), the
-- broker's and the quota market's payouts, and 30 kr per kg of hold and real hour since the save before, now over every vessel's
-- hold. New: a bucket of one such hour (cheat_cash.tok: one hold of the fleet at 30 kr a kg, full at the start and filled as time
-- goes) takes what comes in one piece while the game is being played (a mission paid 908 600 kr to a 21 m vessel in one posting, and
-- the hours since the save before were 0.01). A sjark's bucket is 195 000 kr and a wooden boat's 15 000, so a million written in is
-- still marked up to a fleet of about 23 tonnes of hold; a 15 m vessel's bucket is 840 000 kr and a 21 m vessel's 1 650 000, and with the
-- 300 000 kr a day a million goes through there, as a mission of that size does (ten million does not).
-- The rest is added up per account and leaks away with 300 000 kr a day, and above 300 000 the account is marked, as before.
--
-- A summary without the new fields (a game that has not been updated yet, or a save without a cash) cannot be read this way and
-- marks nothing; the last one that could be read is kept with its time (cheat_cash.base), so such a save between two does not hide
-- a rise, and the hours and the landings are counted from that one (a second device with an older game, fished on for six hours).
-- A correction from the admin (fixes) that is open or was done since the save before is not a rise: the game saves first and
-- answers fix_done after (ui/10w-fix.js).
-- Only additions: three columns, four small functions, and the bodies of the two trigger functions (no signature a released game calls).

alter table public.cheat_cash add column if not exists base jsonb;
alter table public.cheat_cash add column if not exists tok double precision;
alter table public.cheat_cash add column if not exists tok_at timestamptz;

create or replace function public.cheat_num(j jsonb, k text) returns bigint language sql immutable set search_path = '' as $$
  select case when (j ->> k) ~ '^-?[0-9]{1,15}(\.[0-9]{1,6})?$' then round((j ->> k)::numeric)::bigint end $$;
-- can the check read this summary: the cash, the accounts and the loans as numbers, and one to forty vessel types
create or replace function public.cheat_sum_ok(j jsonb) returns boolean language sql immutable set search_path = '' as $$
  select coalesce(public.cheat_kr(j) is not null and public.cheat_num(j, 'bank') is not null and public.cheat_num(j, 'debt') is not null
    and case when jsonb_typeof(j -> 'types') = 'array' then jsonb_array_length(j -> 'types') between 1 and 40 else false end, false) $$;
create or replace function public.cheat_w(j jsonb) returns bigint language sql immutable set search_path = '' as $$
  select public.cheat_kr(j) + public.cheat_num(j, 'bank') - public.cheat_num(j, 'debt') $$;
-- the step from summary a to summary b (both readable): what the vessels that came count, what the vessels and the rights that went
-- explain, and the rise that is left. mkt is the types the broker handed over since the save before (one of each is let in);
-- licin counts the whole of b's rights as in (against a new game, which has none)
create or replace function public.cheat_step(a jsonb, b jsonb, mkt jsonb, licin boolean, out rise bigint, out a_in bigint, out a_out bigint)
language plpgsql stable set search_path = public as $$
declare la bigint := coalesce(cheat_num(a, 'licv'), 0); lb bigint := coalesce(cheat_num(b, 'licv'), 0);
begin
  select coalesce(sum(greatest(coalesce(y.n, 0) - coalesce(x.n, 0) - coalesce(m.n, 0), 0) * coalesce((select v.price from cheat_vt v where v.vtype = coalesce(x.t, y.t)), 0)), 0)::bigint,
         coalesce(sum(greatest(coalesce(x.n, 0) - coalesce(y.n, 0), 0) * coalesce((select v.price from cheat_vt v where v.vtype = coalesce(x.t, y.t)), 0)), 0)::bigint
    into a_in, a_out
    from (select left(e, 16) t, count(*) n from jsonb_array_elements_text(a -> 'types') e group by 1) x
    full join (select left(e, 16) t, count(*) n from jsonb_array_elements_text(b -> 'types') e group by 1) y on y.t = x.t
    left join (select left(e, 16) t, count(*) n from jsonb_array_elements_text(case when jsonb_typeof(mkt) = 'array' then mkt else '[]'::jsonb end) e group by 1) m on m.t = coalesce(x.t, y.t);
  if licin then a_in := a_in + greatest(lb - la, 0); end if;
  a_out := a_out + greatest(la - lb, 0);
  rise := cheat_w(b) - cheat_w(a) + a_in - a_out;
end $$;

create or replace function public.saves_cheat_check() returns trigger language plpgsql security definer set search_path = public as $$
declare first boolean := (tg_op = 'INSERT'); osum jsonb; pl players; cc cheat_cash; since timestamptz; mkt jsonb; b record; st record; prior boolean;
  rise bigint; ain bigint := 0; aout bigint := 0; bsum jsonb; bkind text; hrs double precision; rate double precision; cap double precision;
  land double precision := 0; led bigint := 0; rest double precision; tok double precision; used double precision; u double precision; acc double precision;
begin
  if first then osum := null; else
    if new.player_id is distinct from old.player_id then return null; end if;
    osum := old.summary;
  end if;
  if not cheat_sum_ok(new.summary) then   -- not readable: keep the last one that was, so the next has something to stand against
    if cheat_sum_ok(osum) then
      insert into cheat_cash (player_id, base) values (new.player_id, osum || jsonb_build_object('_at', extract(epoch from coalesce(old.updated_at, now()))))
        on conflict (player_id) do update set base = excluded.base;
    end if;
    return null;
  end if;
  select * into pl from players where id = new.player_id;
  if coalesce(pl.game_admin, false) then return null; end if;
  select * into cc from cheat_cash c where c.player_id = new.player_id;
  since := case when first then coalesce(pl.created_at, now()) else coalesce(old.updated_at, now()) end;
  -- (the save before could not be read: the time runs from the last one that could, cheat_cash.base)
  if not first and not cheat_sum_ok(osum) and cheat_sum_ok(cc.base) and (cc.base ->> '_at') ~ '^[0-9]{1,12}(\.[0-9]+)?$' then
    since := least(since, to_timestamp((cc.base ->> '_at')::double precision));
  end if;
  if exists (select 1 from fixes f where f.player_id = new.player_id and f.revoked_at is null and (f.done_at is null or f.done_at > since - interval '15 minutes')) then return null; end if;
  -- (a boat handed over is in the game before broker_done says so: every row not yet done, and the ones done since the save before)
  select coalesce(jsonb_agg(g.data ->> 'type'), '[]'::jsonb) into mkt from broker_ledger g where g.player_id = new.player_id and g.kind = 'boat'
     and (g.done_at is null or g.done_at > since - interval '15 minutes');
  prior := cheat_sum_ok(osum) or cheat_sum_ok(cc.base) or exists (select 1 from save_hist h where h.player_id = new.player_id and cheat_sum_ok(h.summary));
  for b in
    select 'prev'::text k, osum s where cheat_sum_ok(osum)
    union all select 'kept', cc.base where not cheat_sum_ok(osum) and cheat_sum_ok(cc.base)
    union all select 'start', new.summary || jsonb_build_object('cash', 15000, 'bank', 0, 'debt', 0) where first
    -- (a new game as it is, for an account the check has read before: «Start på nytt» is never a rise)
    union all select 'new', jsonb_build_object('cash', 15000, 'bank', 0, 'debt', 0, 'types', jsonb_build_array('trebat'), 'licv', 0) where not first and prior
    union all select 'hist', h.summary from save_hist h where h.player_id = new.player_id and cheat_sum_ok(h.summary)
  loop
    select * into st from cheat_step(b.s, new.summary, mkt, b.k = 'new');
    if rise is null or st.rise < rise then rise := st.rise; ain := st.a_in; aout := st.a_out; bsum := b.s; bkind := b.k; end if;
  end loop;
  if rise is null or rise <= 0 then return null; end if;   -- (null: the first readable save of an account that has saved before)
  hrs := least(greatest(extract(epoch from (now() - since)) / 3600.0, 0), 21 * 24);
  select coalesce(sum(greatest(coalesce((select v.hold from cheat_vt v where v.vtype = left(e, 16)), 0), 500)), 500) * 30.0 into rate
    from jsonb_array_elements_text(new.summary -> 'types') e;
  cap := rate * hrs;
  if rise <= cap then return null; end if;
  select coalesce(sum(l.kg * 2 * coalesce((select s.kr from cheat_sp s where s.sp = l.sp), 150)), 0) into land
    from landings l where l.player_id = new.player_id and l.at > since - interval '15 minutes';
  select coalesce(sum(g.kr), 0) into led from broker_ledger g where g.player_id = new.player_id and g.kr > 0
     and (g.done_at is null or g.done_at > since - interval '15 minutes');
  rest := rise - (land + led + cap);
  if rest <= 0 then return null; end if;
  -- the bucket: one hour of the fleet's hold at 30 kr a kg, full at the start, for what comes in one piece
  tok := least(rate, coalesce(cc.tok, rate) + rate * greatest(extract(epoch from (now() - coalesce(cc.tok_at, now()))) / 3600.0, 0));
  used := least(tok, rest); u := rest - used;
  acc := greatest(coalesce(cc.kr, 0) - 300000.0 * greatest(extract(epoch from (now() - coalesce(cc.at, now()))) / 86400.0, 0), 0) + u;
  insert into cheat_cash (player_id, kr, at, tok, tok_at) values (new.player_id, acc, now(), tok - used, now())
    on conflict (player_id) do update set kr = excluded.kr, at = excluded.at, tok = excluded.tok, tok_at = excluded.tok_at;
  if acc > 300000 then
    perform cheat_flag(new.player_id, 'cash', round(acc - 300000)::bigint, jsonb_build_object('v', 2, 'base', bkind,
      'cash0', cheat_kr(bsum), 'cash1', cheat_kr(new.summary), 'bank0', cheat_num(bsum, 'bank'), 'bank1', cheat_num(new.summary, 'bank'),
      'debt0', cheat_num(bsum, 'debt'), 'debt1', cheat_num(new.summary, 'debt'), 'w0', cheat_w(bsum), 'w1', cheat_w(new.summary),
      'in', ain, 'out', aout, 'rise', rise, 'hours', round(hrs::numeric, 2), 'land', round(land), 'ledger', led, 'cap', round(cap), 'bucket', round(used),
      'unexplained', round(u), 'day', round(acc), 'first', first, 'market', jsonb_array_length(mkt) > 0,
      'types0', left(coalesce((select string_agg(left(e, 16), ',') from jsonb_array_elements_text(bsum -> 'types') e), ''), 200),
      'types1', left(coalesce((select string_agg(left(e, 16), ',') from jsonb_array_elements_text(new.summary -> 'types') e), ''), 200)));
  end if;
  return null;
exception when others then return null;   -- a check must never stop a save
end $$;

-- the older, advisory list («Mistenkelige pengehopp» under Økonomi in /admin; 20261017120000_turokonomi.sql, as in 20261107140000_broker.sql)
-- had the same fault: it read the cash alone. With two summaries that can be read, the rise is that of the cash with the accounts less
-- the loans; the rest is as it was (cash0 and cash1 are still the cash, delta the rise that was held against the limit)
create or replace function public.saves_cash_check() returns trigger language plpgsql security definer set search_path = public as $$
declare c0 bigint; c1 bigint; d bigint; ex bigint; br bigint; ok boolean;
begin
  c0 := nullif(old.summary->>'cash', '')::bigint; c1 := nullif(new.summary->>'cash', '')::bigint;
  if c0 is null or c1 is null then return new; end if;
  d := case when cheat_sum_ok(old.summary) and cheat_sum_ok(new.summary) then cheat_w(new.summary) - cheat_w(old.summary) else c1 - c0 end;
  if d < 300000 then return new; end if;
  select coalesce(consent, false) into ok from players where id = new.player_id; if not coalesce(ok, false) then return new; end if;
  select coalesce(sum(case when kind = 'sale' then coalesce((data->>'kr')::bigint, 0) when kind = 'tur_done' then coalesce((data->>'pay')::bigint, 0) else 0 end), 0)
    into ex from events where player_id = new.player_id and kind in ('sale', 'tur_done') and ts > coalesce(old.updated_at, now() - interval '1 day') - interval '10 minutes';
  select coalesce(sum(g.kr), 0) into br from broker_ledger g where g.player_id = new.player_id and g.kr > 0 and g.done_at > coalesce(old.updated_at, now() - interval '1 day') - interval '10 minutes';
  ex := ex + br;
  -- other income the events do not carry (a boat or quota sold, insurance) is why the margin is wide
  if d > greatest(300000, 2 * ex + 200000) then
    insert into cash_flags (player_id, cash0, cash1, delta, explained, game_dt, note)
      values (new.player_id, c0, c1, d, ex, coalesce(new.game_t, 0) - coalesce(old.game_t, 0), 'cash rose more than the logged landings and missions');
  end if;
  return new;
exception when others then return new;   -- a check must never stop a save
end $$;

revoke all on function public.cheat_num(jsonb, text), public.cheat_sum_ok(jsonb), public.cheat_w(jsonb), public.cheat_step(jsonb, jsonb, jsonb, boolean),
  public.saves_cheat_check(), public.saves_cash_check() from public, anon, authenticated;
