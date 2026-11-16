# Kalenderen flyttes til 1. januar 2026 (plan 16.11.2026)

Status: **plan, ikke bygd.** Venter på Jonas' klarsignal og valgene nederst.

## Hva Jonas ba om

Jonas 16.11.2026, kvelden spillet ble sluppet offentlig: «kan vi skru tilbake datoen i spillet til 1.Januar 2026 uten at det går ut over så masse?» Og grunnen: «jeg tenker det går greit om alle spillere beholder det de har av penger og alt sånt. eneste grunnen er at jeg vil at nye spillere skal komme inn på starten av 2026 å få spille sesongen ut, slik at de ikke kommer rett inn i 2027 og nye priser og reguleringer».

## Hva som finnes i dag

- **Klokka** (`core/01-world.js`): spillminutt 0 var 05.10.2026 15:00 UTC i ekte tid (`WORLD_T0`), og går seks ganger ekte tid (`GAME_RATE`). Kalenderen er bare en etikett på minuttet: `gDate(H) = EPOCH + H timer`, med `EPOCH` = 1. mars 2027 06:00. Spilldatoen 16.11.2026 er rundt 10. november 2027. Et spillår er om lag 61 ekte døgn.
- **Alt i lagringene er spillminutter** (`S.t`, når redskap ble satt, når mannskap ble hyret, salg, verftsjobber, planer). Ingenting av det er en dato.
- **2026 er det ekte året i koden.** `core/03d-quota.js` har de vedtatte tallene for 2026 (`REG26`, `tacOf` med `y <= 2026`, `SNOREG[2026]` fra J-237-2025, `q26`/`grp26` for havtillatelsene, `bkTacF`). Fra 2027 regner spillet seg fram til kvoter og priser selv (`stockYear`, `OPENF.ov`, kvoteprisen `KPKL` som glir fra 15.11.2027). Spillet startet 1. mars 2027, så ingen spiller har noen gang spilt på de ekte 2026-tallene.
- **Det som er lagret med årstall i en lagring:** `S.quota.y`, `S.openUsed.y`, `S.stats.y[år]` (regnskapsårene), `S.tx.y` (skatteåret), og i tillatelsen `lic.since`, `lic.st[].from/until`, `lic.coop.y`, `lic.flex.y`.
- **Serveren** regner året fra samme start fire steder (`timestamp '2027-03-01 06:00'` i `km_year`, og i `land_put`/`world_year` i `guest_world`, `cheat_flags` og `lansering`), og har rader merket med år i `world_year` og `landings.y`. Spillminuttet (`game_min`) og `world_gh` er uten dato og røres ikke.
- **Testene** kjører med egen klokke fra minutt 0 på en lokal server, altså fra 1. mars 2027; 208 testfiler regner med 2027 eller 2028.

## Slik gjøres det: bare kalenderen flyttes, ikke klokka

Spillminuttet fortsetter å telle som før. Det eneste som endres, er hvilken dato et minutt heter: fra et valgt øyeblikk M0 er spilldatoen 1. januar 2026 00:00, og alt før og etter følger av det. Da er hver lagring gyldig som den er: penger, båter, redskap i sjøen, mannskapets avtaler og verftsjobber har samme tid igjen som før. Historikken får nye datoer, alle flyttet like langt (det som skjedde for ti spilldøgn siden, står som 22. desember 2025).

Det som følger av flyttingen, og som er meningen:

- **Nytt kvoteår for alle.** 2026 begynner med fulle kvoter og de ekte 2026-reglene.
- **Årsskiftet kjøres én gang.** Det som er spilt til nå, blir «2025»: regnskapsåret og skatteåret lukkes som ved et vanlig nyttår.
- **Sesongen hopper** fra november til januar: mørketid, skreien på vei inn, snøkrabbesesongen åpen.

## Fasene

**K1, kalenderen i spillet og i lagringene (én økt).**
- `core/01-world.js`: kalenderforskyvningen legges i `gDate` bare når den felles klokka er på (`WCLOCK.on`). Et lokalt bygg, og dermed testene, står som i dag fra 1. mars 2027, så de 208 testfilene ikke må skrives om.
- Lagringene: årstallene over flyttes med samme forskyvning (2027 blir 2025; en eldre lagring som ligger foran klokka og har 2028, blir 2026), én gang, merket i lagringen. `ui/02-format-state.js` (migreringen) og `core/03-simulation.js`, `core/03d-quota.js`.
- De to datoene som står som faste tall, flyttes med: `KPKL.start` (kvoteprisens glid) og månedsmidlene i `core/03j-felt.js`.
- Tester: ny enhetstest for forskyvningen og migreringen av en lagring (sett rød først), `mig2test`, `kvtest`, `boktest`, `simday`, `selltest`; lagringsporten med de ekte lagringene, begge veier.

**K2, serveren (samme slipp, migrering kjørt rett før).**
- Én migrering: de fire stedene året regnes, får samme forskyvning, og radene i `world_year` og `landings.y` flyttes fra 2027 til 2025. `sqltest`.
- Kjøres på testprosjektet av Jonas først, i produksjon rett før slippet.

**K3, slippet og beskjeden til spillerne.**
- Patchnotat og en melding i spillet om at året er 2026 og at kvotene er nye.
- Etter slippet: sjekk i produksjon at `km_year()` gir 2026, og at en ekte lagring åpner med penger, båter og redskap som før.

## Valg

1. **Når er nyttår?**
   **A (anbefalt): et fast tidspunkt du velger, for eksempel fredag kl. 18.** Da kan spillerne få vite det på forhånd, og M0 er kjent når koden bygges.
   B: så snart det er bygd og testet, uten varsel.
   C: vent til spillet selv når 1. januar (rundt 25. november i ekte tid), og bytt bare årstallet fra 2028 til 2026 da. Ingen sesong hopper, men nye spillere denne uka kommer inn i november og desember 2027.

2. **Hva skjer når 2026 er spilt ferdig, om lag to måneder etter nyttår?**
   **A (anbefalt): spillet går videre til 2027 som i dag,** med kvoter og priser det regner fram selv. Nye spillere kommer da inn i 2027, og samme spørsmål kommer igjen.
   B: året går saktere, så 2026 varer lenger. Det endrer hele rytmen i spillet (turer, sesonger, mannskapets hvile) og er et eget, stort steg; ikke med her.
   C: 2026 spilles om igjen hvert år med de samme ekte tallene. Enkelt for nye spillere, men bestandene og prisene utvikler seg ikke.

## Antatt og usikkert

- **At årstallene i lista over er alle som er lagret.** Lista er funnet med søk etter `yearH`, `.y` og årstall i `core/`; K1 går gjennom hele `S` i en ekte lagring før migreringen skrives.
- **Gamle versjoner i nettleseren.** En spiller som ikke har oppdatert, ser november 2027 til siden lastes på nytt («Ny versjon er ute»). Serveren regner året selv i `land_put`, så landingene havner i riktig år uansett.
- **Mannskapets alder og avtaler** regnes fra datoen og flytter seg med kalenderen; fristene i spillminutter er uendret. Ikke sett i en ekte lagring ennå.
- **Tidevann, sol og måne** følger datoen og regnes ut, så de flytter seg riktig av seg selv. Ikke målt.
- **Skreisesongen i januar–april 2026** er aldri spilt med 2026-tallene på ekte lagringer; balansen der er bare dekket av `kvtest` og `calib`.

## Hva planen ikke gjør

- Den nullstiller ikke klokka og rører ikke penger, båter, redskap, haill eller noe annet spillerne eier.
- Den endrer ikke farten på klokka.
- Den endrer ikke kappløpet og ukene på topplista, som følger ekte tid.
