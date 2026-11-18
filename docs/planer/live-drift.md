# Live-drift: lav churn, trygg automatisk feilretting (18.11.2026)

Jonas 18.11.2026, etter lanseringen: «Spillet er nå live med aktive brukere, ekte inntekter og høy betalingsvilje. Målet fremover er lavest mulig churn, raskest mulig oppstart og stabil flyt i mobilnettleser, sterk organisk bransjekonkurranse på topplista, og en helautomatisk, trygg feilrettingsflyt som gir meg arbeidsro som soloutvikler.» Planen ble godkjent samme dag med fire justeringer (står under «Jonas' justeringer»), og fase 1 startet med en gang.

## Det som styrte planen (funnene 18.11.2026)

1. Unntaket fra 17.11.2026 lot en automatisk retting i ekte penger gå rett til spillerne (`CLAUDE.md`, `tools/autofix/gate.py`, `slipp.yml`).
2. `gate.py` slapp gjennom `ui/02-format-state.js` (lagringsformatet, `kystfiske_v2`) og hele `src/js/core/`.
3. `slipp.py` kjente to av de fem filene for ekte penger; `10u-hopp.js`, `06j-hopp.js` og `10j-paint.js` ble ikke merket.
4. `autofix.yml` slipper til spillerne i samme jobb som den ruller ut til testutgaven, uten å se på testutgaven først.
5. To låser (`fb/kjorer`, `plan/kjorer`): tilbakemeldingsrutinen og arbeidsrutinen kunne skrive kode samtidig.
6. Lukkerunden («rett også feil utenfor steget») gjaldt rutinene og ga sidefeil i det delte JS-skopet.
7. Ingen automatisk nødbrems: tilbakerulling krevde en økt.
8. Migreringene på testprosjektet kjøres for hånd, og ingen sperre stopper destruktiv SQL eller en endret `save_put4`.

## Jonas' justeringer (18.11.2026)

1. **PR-låsen:** fristen er **24 timer** (ikke 72). En middels- eller høyrisiko-PR som venter på klikket hans, blokkerer **bare nye middels/høyrisiko-PR-er**, aldri lavrisiko-rettinger som kan gå automatisk gjennom porten.
2. **Migreringene i produksjon kjøres fra Hetzner-serveren** (lagringsportens server, som alt har nøkkelen) i selve slippet.
3. **Ikke vekk Opus hver time for en tom kø.** Klyngeskriptet kjører billig og deterministisk først (eller en lettere modell på triagen), og Opus brukes først når det faktisk ligger en teknisk feil som skal rettes.
4. **Tre presiseringer i reglene:**
   - Synlig status: bare kjøpte spillfordeler (haill) synes aldri for andre. Kosmetikk (båtfarger, flagg) og abonnementsstatus skal synes på kartet og topplista.
   - Rød test først gjelder all logikk, data og samspill; rene CSS- og tekstjusteringer verifiseres med bygg og visuell sjekk (`risiko.py`: `css_tekst`).
   - Når en rettet feil kommer fra en innsendt spillerrapport og slippes til produksjon, får spilleren automatisk en bekreftelse og en luksushaill i spillet (takk-haillen `fb_haill`, som i dag gis når Jonas lagrer `planned`/`fixed` i `/admin`).

## Risikoklassene (`tools/ci/risiko.py`, fase 1)

| Klasse | Hva | Hva som skjer |
|---|---|---|
| **lav** | `src/js/ui/**` (unntatt filene under), `src/styles.css`, tester som bare får linjer, `docs/`. Høyst 150 linjer og 6 filer. | Ut av seg selv gjennom porten (`autofix.yml`), alene til spillerne. |
| **middels** | `src/js/core/**`, `view3d`, `vessel3d.js`, mannskapet, `src/index.html`, `build.mjs`, `src/data/`, alt som ikke er klassifisert. | Ferdig testet PR med merkelappen `venter-pa-jonas`; Jonas trykker «Merge». |
| **høy** | Ekte penger (`10i-shop`, `10q-buymoment`, `10u-hopp`, `06j-hopp`, `10j-paint`, `shop_*`, Stripe), kontoer og lagret spillerdata (`10f-cloud`, `02-format-state`, `account-delete`, `kystfiske_v2`, `save_put*`), `supabase/`, `src/legal/`, `src/admin/`, `src/pwa/`, feilfella, tilbakemeldingen, testoppsettet, `.github/`, `.claude/`, rutinene, portene og serveren. | Ferdig testet PR; går aldri ut uten Jonas' klikk. Et slipp av arbeidsgrenen som rører dem, trenger `jonas-har-sett`. |

## Rutinene

| I dag | Etter planen |
|---|---|
| Tilbakemeldinger fra spillerne (hver time, Opus) | **Feilrettingen**: samme planlagte oppgave, ny prompt (fase 2). Trinn a (klyngeskriptet, billig) avgjør om Opus trengs. |
| Arbeidsrutinen (av) | Beholdes av til Jonas slår den på; deler låsen `auto/kjorer`; slipper ikke lenger selv (fase 5). |
| Nattlig + Ukentlig regresjon | Slås sammen og flyttes til GitHub Actions (`regresjon.yml`), uten KI (fase 5). |
| Sjekk første kjøring av Arbeidsrutinen | Slettet 18.11.2026. |
| Slippet om natta (i arbeidsrutinen) | `slipp-natt.yml` i GitHub Actions, uten KI (fase 5). |
| Koordinatoren | Interaktiv, som før. |

## Tretrinnsflyten (fase 2)

**a) Triage, bare lesing.** `tools/triage/klynge.py` slår sammen feillista (samme melding og samme sted i koden, tall og id-er tatt bort) og kobler tilbakemeldinger til feil ved versjon, enhet, veiledningssteg og tid. Hver klynge får typen `teknisk`, `ønske` eller `balanse`, og poeng = alvor × spillere × frafallsvekt (×2 første time eller veiledningen, ×1,5 betalende og over 20 timer). Ønsker og balanse rettes aldri; de går i «Til Jonas: ønsker og balanse» i rapporten i `/admin`, aldri i git. Skriptet kjører uten modell; Opus startes bare når det finnes en teknisk klynge som kan tas (justering 3).

**b) Fiks, isolert.** Låsen `auto/kjorer` (erstatter `fb/kjorer` og `plan/kjorer`). PR-låsen etter justering 1: en åpen middels/høy-PR fra rutinen yngre enn 24 timer stopper bare nye middels/høy-rettinger; lavrisiko går som før; eldre enn 24 timer lukkes den og står i oversikten. Rød test først (unntatt `css_tekst`), minste retting, ingenting utenfor feilen og ingen nye navn på toppnivå i det delte skopet, høyst to forsøk, så gis den opp uten PR. Ingen skriving i `koen.md`, `docs/systemer/` eller backloggen.

**c) Porten etter risiko (GitHub Actions, uten KI).** Lav: ut av seg selv, men først bygget som går til spillerne (main + rettingen) lagt på `test.detstorebla.no/auto/` og prøvd der. Middels og høy: ferdig testet PR; Jonas' «Merge» er godkjenningen, og workflowen tar resten. Belønningen (justering 4): når rettingen er i `main` og PR-en nevner `tilbakemelding #N`, settes saken `fixed` med svar og takk-haill automatisk.

**Nødbrems (fase 4):** på Hetzner, som en del av vakta (`tools/server/vakt/`). Følger med to timer etter hvert slipp; krasj, svart skjerm eller oppstartsfeil per økt over 2 × forrige versjon i minst 5 økter, eller en ny alvorlig feil i minst 3 økter, bytter tilbake til forrige utgave (egne mapper per utgave, pekeren byttes), setter en sperre mot nye automatiske slipp og sender push. Tallene er startverdier.

## Migreringer (fase 3)

- Bare tillegg i automatiske spor: ny tabell, ny kolonne med standardverdi, ny funksjon. En sjekk i CI sperrer `DROP TABLE/COLUMN/FUNCTION` (uten ny versjon), `TRUNCATE`, `RENAME`, endret kolonnetype og `DELETE`/`UPDATE` utenfor funksjoner.
- `save_put4` endres aldri; en ny signatur er `save_put5` ved siden av, og den gamle tas bort først etter 30 dager uten kall fra eldre versjoner, i en økt med Jonas.
- Testprosjektet får migreringene automatisk når de kommer på arbeidsgrenen. Produksjonen får dem fra Hetzner-serveren i selve slippet, rett før `main` flyttes (justering 2).

## Fasene

1. **Tette hullene** (18.11.2026): `tools/ci/risiko.py`, porten og slippet etter risiko, unntaket for ekte penger fjernet, `CLAUDE.md` og bakgrunnen, porten for de første brukerne til arkivet, den utdaterte påminnelsen slettet.
2. **Feilrettingen:** klyngeskriptet, låsen, PR-låsen, rød test i porten, prøven på `/auto/`, belønningen, ny prompt på oppgaven.
3. **Migreringene:** sjekken i CI, testprosjektet automatisk, produksjonen fra Hetzner i slippet.
4. **Nødbremsen.**
5. **Regresjonen og nattslippet til Actions**, arbeidsrutinen tilpasset.

## Status

- Fase 1: ferdig 18.11.2026 (PR #118, flettet av Jonas).
- Fase 2: bygd 18.11.2026 (PR mot arbeidsgrenen, høy risiko: migrering, Edge Function, porten). `tools/triage/klynge.py`, `prlaas.py`, `laas.py`, takk-haillen (`agent_fixed`), rød test først i porten, `tools/feilretting/RUTINE.md`. Den planlagte oppgaven heter «Feilrettingen», kjører på Sonnet 5.5 med Opus som agent for rettingene, og **står av** til kjeden er prøvd (Jonas 18.11.2026: «la den fortsatt stå på pause til hele kjeden er verifisert og testet»). **Prøven på `test.detstorebla.no/auto/` før slippet** er flyttet til fase 4 sammen med utgavemappene på serveren, som den trenger.
- Sluppet 18.11.2026 18:30 UTC (`98e7cdfd`, PR #121): `agent_fixed` kjørt i produksjon (bare `service_role` kan kalle den), `feedback-agent` versjon 8 deployet og prøvd (`tech` svarer, `fixed` på en tilbakemelding som ikke finnes gir «no feedback»). Migreringen var kjørt på testprosjektet av Jonas samme dag («sql success»).
- Før Feilrettingen slås på: (1) PR-en flettet; (2) migreringen `20261118200000_agent_fixed.sql` kjørt på testprosjektet (Jonas, for hånd til fase 3) og Edge Function `feedback-agent` deployet der; (3) én kjøring for hånd mot produksjonen, der `klynge.py` leser og `--belonn` ikke finner noe sluppet ennå; (4) slippet som tar med migreringen og funksjonen.
- **Opus-taket (18.11.2026):** den første kjøringen for hånd kostet 2,71 dollar (Opus 2,40), og klyngeskriptet sa «Opus trengs» igjen rett etterpå: med mange spillere kommer det hele tiden nye feil. Jonas valgte «Tak: 4 i døgnet» (rundt 10–12 dollar i døgnet). Telles på låsens historikk (`laas.py teller`), gjelder feilrettinger og steg fra køen til sammen.
- **Første kjøring for hånd (18.11.2026 18:31–18:45 UTC):** triagen noterte fire nye tilbakemeldinger (to tekniske, to til «Til Jonas: ønsker og balanse»); Opus-agenten undersøkte hengene i 3D (`klynge:3d38e0da`), fant ingen bevist årsak, rørte ikke grafikken og ga opp uten PR; låsen ble tatt og gitt fra seg. Saken #124 (`trenger-jonas`) ble åpnet etterpå fra hovedøkta (kjøringen var før PR #123): hengmeldingen trenger mer diagnostikk (`hangWatch` i `ui/10f-cloud.js`, høy risiko), en oppgave for en økt med Jonas.
- **Én planlagt rutine (18.11.2026):** Jonas: «Du avgjør hva som er best». «Arbeidsrutinen» og «Feilrettingen» er slått sammen til «Driften» (`tools/drift/RUTINE.md`): slippet om natta, feilrettingen og ett steg fra køen, i den rekkefølgen, med én Opus-agent per kjøring. Den gamle oppgaven «Arbeidsrutinen» står avslått med navnet «Arbeidsrutinen (erstattet av Driften)», så kjøringene dens ikke slettes. Slippet om natta er dermed i gang igjen når Driften slås på (det sto stille mens arbeidsrutinen var av). Regresjonsrutinene står som før til fase 5.
- **Fase 3: bygd 18.11.2026** (PR mot arbeidsgrenen, høy risiko: workflows og serveren). `tools/ci/migsjekk.py`, `.github/workflows/migreringer.yml`, `tools/server/gate/migrer.py` og `dsb-migrer` i `setup.sh`, «migreringer: hetzner» i `slipp.yml`, `slipp.py --auto` uten stopp for «ok»-migreringer, og filteret som tar ut tekst i anførsler fra feilmeldingen i en `trenger-jonas`-sak. **I drift 18.11.2026 19:41 UTC:** PR #126 flettet; hemmeligheten `SUPABASE_TEST_DB_URL` lagt inn av Jonas (testprosjektets Session pooler, `aws-1-eu-west-1`); `setup.sh` kjørt på nytt på `ubuntu-4gb-hel1-10` (psql 18, `dsb-migrer.path` `active`, lagringsporten og nøkkelen beholdt), og produksjonens tilkobling i `/etc/dsb-migrer.env` (Session pooler `aws-0-eu-west-1`; produksjonen og testprosjektet ligger på hver sin pooler) svarte på en lesende spørring. Første ekte kjøring kommer med neste migrering.
- **Opus-taket senket til 2 (18.11.2026):** den første planlagte kjøringen av Driften kostet 5,48 dollar (Opus-agenten for `save_put4`, PR #127). Jonas: «Senk taket på Opus-kjøringer i «Driften» fra 4 til 2 per døgn (og når Rutinen: på senere slås på, skal maksimalt 1 av de 2 daglige kjøringene kunne brukes på nye steg fra køen, slik at 1 plass alltid holdes i reserve for feilretting)». `OPUS_TAK = 2`, `STEG_TAK = 1`, `RESERVE = 1` i `klynge.py`; et steg tas bare når ingen Opus-kjøring er brukt det siste døgnet.
- **`concurrently` og `vacuum` er «jonas» i migsjekk (18.11.2026):** Jonas: «CREATE INDEX CONCURRENTLY [skal ikke] klassifiseres som «ok» … siden Hetzner-kjøreren pakker migreringer inn i en transaksjon». I det automatiske sporet: `create index if not exists`.
- **Fase 4: bygd 18.11.2026** (PR mot arbeidsgrenen, høy risiko: workflows, serveren, en migrering). Utgavemappene og pekeren (`tools/server/utgave.py`), prøven på `/auto/` (`tools/release/autoprove.py`, `autofix.yml`), nødbremsen (`tools/server/vakt/brems.py`, `brems_tall`), sperren (`nodbrems.json` i `autofix.yml`, `slipp.yml`, `slipp.py`) og reverserings-PR-en (`tools/triage/brems.py`, Driften punkt 2b). Det Jonas må gjøre: flette PR-en, slippe den (migreringen `brems_tall` går fra serveren i slippet), og kjøre `tools/server/setup.sh` på spillserveren (`ubuntu-8gb-hel1-1`) etterpå. `AUTO_FIX_SLIPP=off` kan tas bort når det er gjort.
- **Fase 4 i drift 18.11.2026:** `tools/server/setup.sh` kjørt på spillserveren 20:26 UTC (dagens versjon `54b32e860572` gjort om til første utgave, `dsb-utgave.path` og `dsb-brems.timer` `active`, Caddy validerte og lastet `/auto/`-blokken; Caddy advarer om at en sti i en nettstedsadresse er foreldet, så blokken skrives om til `handle` en gang). Slippet `5b94846e` 20:46 UTC: `brems_tall` kjørt fra Hetzner (første migrering derfra), lagringsporten holdt, og bygget `ed9dffd0a988` gikk inn gjennom `neste/` og pekerbyttet. Testprosjektet fikk `brems_tall` av `migreringer.yml` etter at Jonas rettet passordet i `SUPABASE_TEST_DB_URL` (og PR #130 gjør en feilet migrering rød). Igjen: Jonas sletter `AUTO_FIX_SLIPP` når han vil ha lavrisiko-rettinger rett ut igjen.

