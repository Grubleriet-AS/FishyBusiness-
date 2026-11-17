-- A guest who registers keeps the fish on the all-time leaderboard (17.11.2026; Jonas asked whether the leaderboard still works after
-- the release, and four new players were missing from «Totalt» and their profiles said 0 kg). guest_merge moved the guest's landings to
-- the account but not its total (player_tot, 20261116120000_lansering.sql), which went with the guest's row (on delete cascade). Here:
--   1. guest_merge counts the account's total again from its landings, after the guest's are moved (the same sums and caps as land_put
--      and the first fill in lansering.sql), so nothing is counted twice whatever the account had;
--   2. every player's total is counted again from the landings once, which mends the accounts merged until now.
-- Safe to run again. No change in the game.
do $$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p where p.proname = 'guest_merge' and p.pronamespace = 'public'::regnamespace;
  if d is not null and d not like '%player_tot%' then
    execute replace(d, '  update landings set player_id = p where player_id = g;',
      '  update landings set player_id = p where player_id = g;
  -- the all-time total follows the landings (17.11.2026, 20261117020000_gjest_totalt.sql): counted again for the account, once
  insert into player_tot (player_id, kg, kr, ports)
    select l.player_id, sum(least(l.kg, land_cap(l.acc))), sum(least(l.kr, land_cap(l.acc) * 1000)), count(distinct l.port) from landings l where l.player_id = p group by l.player_id
    on conflict (player_id) do update set kg = excluded.kg, kr = excluded.kr, ports = excluded.ports;');
  end if;
end $$;
insert into public.player_tot (player_id, kg, kr, ports)
  select l.player_id, sum(least(l.kg, land_cap(l.acc))), sum(least(l.kr, land_cap(l.acc) * 1000)), count(distinct l.port) from public.landings l group by l.player_id
  on conflict (player_id) do update set kg = excluded.kg, kr = excluded.kr, ports = excluded.ports;
