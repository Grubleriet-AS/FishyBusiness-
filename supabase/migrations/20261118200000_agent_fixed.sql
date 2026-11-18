-- The thank-you when a fix of a player's report is out with the players (18.11.2026, docs/planer/live-drift.md fase 2; Jonas: «Når en
-- feilretting som stammer fra en innsendt spillerrapport faktisk slippes til produksjon, skal spilleren automatisk få en bekreftelse og
-- en luksushaill i spillet»).
--
-- The fix routine (tools/triage/klynge.py --belonn) calls this through the Edge Function feedback-agent (op 'fixed') when the PR its
-- note names is merged and its commit is on main, the players' version. The feedback gets the status «Fikset» and a short confirmation
-- in the player's language, and, if it has not had it before, the same takk-haill as when Jonas sets «Kommer» or «Fikset» in /admin
-- (20261006140000_feedback_reward.sql: one grant of fb_haill per feedback, and a push if the player has them on).
--
-- Only for a feedback the agent or Jonas has marked as planned (a fix on its way in a PR), never one Jonas has closed (no) or answered
-- as fixed already. Expand only (CLAUDE.md, 18.11.2026): a new function; admin_feedback_set and the tables are unchanged. Idempotent.
create or replace function public.agent_fixed(fid bigint, pr text, ver text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare f feedback; lg text; rewarded boolean := false;
begin
  select * into f from feedback where id = agent_fixed.fid for update;
  if not found then raise exception 'no feedback %', fid; end if;
  if f.status in ('fixed', 'no') then return jsonb_build_object('ok', false, 'why', 'status ' || f.status); end if;
  if coalesce(f.ai_status, '') <> 'planned' and f.status <> 'planned' then return jsonb_build_object('ok', false, 'why', 'not planned'); end if;
  lg := coalesce((select p.lang from players p where p.id = f.player_id), (select max(s.lang) from push_subs s where s.player_id = f.player_id), 'no');
  update feedback set status = 'fixed', handled_at = now(), ai_status = 'fixed',
         reply = case when lg like 'en%'
           then 'Thank you! The fault you reported is fixed in the game now.' || case when f.rewarded_at is null then ' 12 hours of full luck are waiting for you in the Luck app.' else '' end
           else 'Takk! Feilen du meldte, er rettet i spillet nå.' || case when f.rewarded_at is null then ' 12 timer med fullt haill venter på deg i Haill-appen.' else '' end end,
         ai_note = left(coalesce(ai_note || ' · ', '') || 'Rettet og sluppet: ' || coalesce(left(agent_fixed.pr, 200), '?') || ', versjon ' || coalesce(left(agent_fixed.ver, 40), '?'), 4000)
   where id = f.id;
  if f.player_id is not null and f.rewarded_at is null then
    insert into grants (player_id, product_id, data) values (f.player_id, 'fb_haill', '{"give":"haill","type":"takk","reward":true}'::jsonb || jsonb_build_object('fid', f.id));
    update feedback set rewarded_at = now() where id = f.id;
    rewarded := true;
    if exists (select 1 from push_subs s where s.player_id = f.player_id) then
      insert into push_queue (player_id, send_at, tag, title, body, kind, expires_at) values (f.player_id, now(), 'dsb-takk-' || f.id,
        case when lg like 'en%' then 'Your report is fixed' else 'Feilen du meldte, er rettet' end,
        case when lg like 'en%' then 'Thank you for telling us. 12 hours of full luck are waiting in the Luck app.'
             else 'Takk for at du sa fra. 12 timer med fullt haill venter i Haill-appen.' end, 'srv', now() + interval '24 hours');
    end if;
  end if;
  return jsonb_build_object('ok', true, 'rewarded', rewarded, 'lang', case when lg like 'en%' then 'en' else 'no' end);
end $$;
revoke all on function public.agent_fixed(bigint, text, text) from public, anon, authenticated;
grant execute on function public.agent_fixed(bigint, text, text) to service_role;
