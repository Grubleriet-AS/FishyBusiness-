# Driften billig og stabil (plan, 17.11.2026)

**Status:** D1 og D2 er bygd (steg 137, 17.11.2026). D3 og D4 står i køen som steg 138.

## Hva Jonas ba om

Jonas 17.11.2026: «Jeg vil at driften og kostnadene av spillet skal være så billige men stabile som mulig, uten at det går på bekostning av brukerne.» Han trodde feilene den dagen kom av «tekniske problemer» hos Supabase.

## Hva som skjedde 17.11.2026 (målt i økta, bare lest)

- **Databasen hang fra 11:45 til 12:15 UTC.** Svartida ved Supabase-inngangen gikk fra 55–70 ms til 50–130 s i snitt. Det kom rundt 1 000 svar med 5xx (504, så 520–525), pg_cron rakk ikke å starte jobbene sine, og Postgres startet på nytt kl. 12:14:45. Etter det var alt normalt (rundt 55 ms, ingen 5xx).
- Ingen spørring varte over 7,7 s (`pg_stat_statements`), så det var ikke en tung spørring fra oss. Forløpet passer med en feil hos Supabase, men statussiden deres (status.supabase.com) kan ikke leses fra en økt, så det er **ikke bekreftet**.
- **Trafikken har økt kraftig:** rundt 2 000 forespørsler i timen 16.11 kveld og 45 000 kl. 11 17.11, med 84 spillere den siste timen og 204 det siste døgnet. Databasen er 69 MB, har 21 av 60 tilkoblinger i bruk og 100 % treff i bufferet. Innstillingene (60 tilkoblinger, `shared_buffers` 320 MB) tyder på compute-størrelsen Micro. Det er ikke sett i dashbordet.
- **Kallene det siste døgnet:** `save_beat` 48 000, `pos_put` 37 000, `pos_world` 36 000, `hails_get` 16 000 og `save_put4` 16 000. De tre første er over halvparten av alt.
- **401:** rundt 1 400 svar siden 16.11 kl. 15, mest `pos_put` (922) og `save_put4` (139). Det ser ut som klienter som går videre med en innlogging som har gått ut. Hvem og hvorfor er ikke funnet.
- **Varslet om at noe er nede** (`uptime_tick`, `err_alert`) går som pg_cron inne i databasen. Når databasen står, varsler ingenting. 17.11 startet ikke jobbene i det hele tatt mellom 11:50 og omstarten.

## Hva som finnes i dag

- `ui/10f-cloud.js`: `cloudRpc` (fetch uten tidsavbrudd; en feil kastes som `fn status`), `cloudBeat` (`save_beat` hvert 5. s mens siden er synlig; holder rede på at én enhet styrer om gangen), `cloudSaveSoon` hvert 30. s, `cloudToken` og `guestToken`.
- `ui/10h-world.js`: `worldTick` (`pos_put` og `pos_world` hvert 15. s, også når reléet er oppe), `gearSync`, og reléet `RT` (`rtWant`, `rtOpen`, `rtRetry` med eksponentiell tilbaketrekking).
- `ui/10n-hail.js`: `hails_get` hvert 15. s.
- `tools/server/rt/server.mjs`: reléet på `ubuntu-8gb-hel1-1` sender posisjoner til båter i nærheten 1–5 ganger i sekundet. `pos_put` hvert 15. s er beholdt for AIS langt unna, topplistene og spill som ikke når reléet.
- `docs/systemer/tilbakemelding-og-admin.md`: `uptime_tick` og `err_alert`.

## Fasene (én økt hver)

**D1. Færre kall mot databasen.** `ui/10f-cloud.js` og `ui/10h-world.js`.
- `save_beat`: fra hvert 5. s til hvert 15. s (V1).
- `pos_put` og `pos_world` hvert 60. s mens reléet er åpent og hvert 15. s ellers (V2). Båtene i nærheten går live gjennom reléet uansett. En endring i `worldSig` (båten legger fra, stopper eller får ny rute) sender som i dag med en gang.
- Ventet virkning: rundt 45 % færre kall, regnet fra tallene over. Det måles i edge-loggen dagen etter utrullingen.
- Tester: `rttest.py` og `worldtest.py` (dekker `10h-world.js`), og testen for to enheter som tar spillet fra hverandre (finnes med `grep save_beat tests/`).

**D2. Spillet tåler at Supabase er nede.** `ui/10f-cloud.js` `cloudRpc`.
- Tidsavbrudd på 15 s (`AbortController`).
- Etter 5xx eller tidsavbrudd venter hver funksjon dobbelt så lenge før neste forsøk, opptil 2 minutter. Første svar som går gjennom, nullstiller ventetida. Lagringen ligger på enheten imens, som i dag.
- 401: ny token én gang og så ett nytt forsøk. Er svaret fortsatt 401, sendes ingenting før innloggingen er fornyet (ingen løkke). Årsaken til 401 finnes først i loggene (hvilken innlogging, gjest eller WorkOS, og etter hvor lang søvn).
- Tester: en test der skyen svarer 503 og 401 og henger (Playwright-ruting), og som teller kallene. Den skal ses rød mot dagens kode først.

**D3. Varsel når databasen selv er nede.**
- Et lite systemd-timerskript på spillets server spør Supabase hvert minutt, og varsler etter to bom på rad og når det går igjen (V3). Ingen spillerdata, bare ja/nei og svartid.
- I tillegg abonnerer Jonas på status.supabase.com (gratis, e-post).

**D4. Driftstall fra serveren.** Et skript, `tools/server/status.sh`, som bare leser: CPU, minne, disk, I/O-ventetid, reléets `/stats`, Caddy-feil og trafikken i timen. Jonas kjører det med SSH og limer inn svaret, eller timeren fra D3 skriver det til en fil reléet viser til admin. Det er dette som ville gitt en tabell som Laksebaronens.

## Valgene

- **V1, `save_beat`:** A) hvert 15. s (anbefalt: en tredjedel av kallene, og den andre enheten merker at spillet er flyttet innen 15 s i stedet for 5); B) beholde 5 s; C) la reléet si fra om bytte av enhet med en gang (mest arbeid, og reléet må vite om lagringene).
- **V2, `pos_put` og `pos_world` når reléet er oppe:** A) hvert 60. s (anbefalt: båtene langt unna på AIS oppdateres hvert minutt, de nære er live uansett); B) hvert 30. s; C) som i dag.
- **V3, hvordan varselet når Jonas:** A) push gjennom ntfy.sh, gratis app, uten konto og uten spillerdata (anbefalt: virker selv når Supabase er nede); B) e-post gjennom Hetzner-serveren (trenger en avsender som ikke blir spam); C) bare status.supabase.com.
- **Compute:** behold Micro nå (anbefalt). Gå opp til Small når p95-svartida ligger over 300 ms ved vanlig last, eller når dashbordet i Supabase viser CPU eller minne over 70 % over tid. Det koster ekte penger og er Jonas' valg.

## Antatt eller usikkert

- At 17.11 var Supabases feil, er ikke bekreftet (statussiden kan ikke leses fra økta).
- Compute-størrelsen er lest ut av innstillingene, ikke sett i dashbordet.
- Årsaken til 401 er ikke funnet.
- Besparelsen i D1 er regnet, ikke målt.
- Prisene hos Supabase og Hetzner er ikke slått opp. Kostnaden i kroner før og etter står derfor ikke her.

## Hva planen ikke gjør

- Endrer ikke grafikken, spillet eller hva spillerne ser, bortsett fra at AIS-båtene langt unna oppdateres sjeldnere.
- Flytter ikke lagringsporten av den lille serveren (den står for seg av sikkerhetsgrunner, `docs/systemer/publisering.md`).
- Rører ikke ekte penger eller `src/legal/`.
- Legges ikke over lanseringslinja eller i porten (køen er frossen der). Stegene går under linja, med mindre Jonas sier noe annet.

## Status

- 17.11.2026: planen er skrevet. Jonas valgte V1 A, V2 A og V3 A, og «Kjør på D1 og D2 nå».
- 17.11.2026, steg 137 (D1–D2), rullet ut til testutgaven:
  - `save_beat` går hvert 15. s (`BEAT_MS`), og grensene i `cloudClaim` og `cloudPassed` er hevet like mye (35 s, 45 s og 35 s).
  - Mens reléet er åpent, sender 15-sekundersrunden i `worldTick` bare når det har gått et minutt (`WORLD_RT_MS`). En endring (`worldSig`) og en side som kommer tilbake, sender med en gang.
  - Båtene langt unna gjettes videre i 125 s før de bremser (`PT_MAX`, var 35), og serveren holder på en rapport i to minutter.
  - `cloudRpc` har et tidsavbrudd på 15 s (60 s for hele lagringer). Kallene i `RPC_BG` venter 5 s etter 5xx, 401, 408, 429, tidsavbrudd eller nettfeil, så dobbelt så lenge hver gang, opptil 2 minutter, og første svar som går gjennom, nullstiller ventetida. Det spilleren gjør, og den siste lagringen med `keep`, holdes aldri tilbake. Ved 401 tvinges ny token (høyst én gang i minuttet), og kallet prøves én gang til. En gjest får ikke lenger en ny gjestekonto når fornyingen svarer 429.
  - `tests/nedetest.py` (LITE, COVER for `10f-cloud.js` og `10h-world.js`): 12 sjekker. Den var rød mot koden før (503 og 401 sendt hver gang, ingen ventetid) og er grønn etter.
  - **Ikke målt ennå:** hvor mange kall det sparer. Det leses i edge-loggen dagen etter slippet, mot 48 000 `save_beat`, 37 000 `pos_put` og 36 000 `pos_world` i døgnet 16.–17.11.
