# Det Store Blå (Kystfiske)

Et kystfiskespill langs hele norskekysten. Spillet heter **Det Store Blå** (detstorebla.no), også i den engelske utgaven. Repoet, lagringsnøklene (`kystfiske_v2`) og andre interne navn heter fortsatt kystfiske og **skal ikke endres** (lagringene ville forsvinne). Jonas skriver norsk; svar på norsk. Koden og kommentarene i den er på engelsk.

Dette er reglene, én linje hver. **Bakgrunnen (Jonas' ord, datoene, grunnene) står i `docs/regler-bakgrunn.md`**; slå opp der når en regel er uklar. En ny regel får den korte linja her og bakgrunnen der.

## Les først

- `docs/INDEKS.md`, så dokumentet i `docs/systemer/` for systemet du skal endre, og `docs/BACKLOG.md` («Spillarbeid som venter» øverst med `offset` og `limit`, resten med `grep`; øktstarten viser de tolv øverste).
- Les ikke mer enn oppgaven trenger. `view3d.js` og `05-phone.js` er delt i `src/js/view3d/` og `src/js/ui/phone/`: slå opp i `docs/systemer/kodekart.md`, bruk `grep`, les med `offset` og `limit`.
- Spesifikasjonen: `docs/spesifikasjon.md`. Arbeidsmåten: `docs/utviklingsplan.md`. Gamle kapittelnumre: `docs/systemer/gamle-numre.md`.

## Live-drift (18.11.2026)

Spillet er live med betalende spillere. Målet er lav churn, rask oppstart, jevn flyt i mobilnettleseren og trygg automatisk feilretting. Planen: `docs/planer/live-drift.md`.

- **Prioriter etter hva spillerne merker,** i denne rekkefølgen: (1) tapt lagring, tapte kjøp eller betaling som feiler; (2) krasj, oppstart som feiler, heng; (3) friksjon de første ti minuttene (veiledningen, første tur, første levering); (4) ytelse på mobil; (5) det som får spillere til å komme tilbake, og kjøp; (6) resten. Antall spillere som rammes, og frafallet i trakten i admin-dashbordet avgjør innen hvert nivå.
- **To arbeidsmåter.** En **interaktiv økt** (Jonas er med) planlegger og dokumenterer fullt: «Ferdig når», lukkerunden, `/kontroll`, systemdokumentet og køen. En **autonom rutine** (planlagt oppgave) er lett: én oppgave, bare filene oppgaven trenger, alt den vil si i PR-beskrivelsen og rapporten, og ingen skriving i `docs/planer/koen.md`, `docs/systemer/` eller backloggen utover det rutinefila krever.
- **En rutine retter bare oppgaven sin.** Ingen sidefeil utenfor den, ingen nye navn på toppnivå og ingen omdøping i det delte skopet (`src/js/core/` og `src/js/ui/` er ett `<script>`). Det den ser ellers, går i rapporten.
- **Risikoklassene** står ett sted: `tools/ci/risiko.py` (`lav`, `middels`, `hoy`). Porten, slippet og workflowene leser den.

## Spillet

- **Online-spill med én felles verden og én felles klokke.** Tiden går når skjermen er av og spillet er lukket (`WCLOCK`, `catchUp`). Ingenting stopper tiden eller driften fordi en skjerm er av, en fane sover eller en enhet står på pause. Bare en side som ikke har spillet (én enhet styrer om gangen), er på pause, og den sender ingenting.
- **Nasjonalt.** Alt som legges inn eller endres, gjelder hele kysten fra start. Senja er bare et eldre, mer detaljert utsnitt.
- **Rask start og jevn bildetakt på mobil går foran tung grafikk** (18.11.2026; før: «Grafikken er nesten det viktigste»). Ny grafikk legges ikke inn uten måling på en vanlig telefon; det som koster mer enn enheten tåler, faller tilbake for den enheten, ikke for alle. Spillet skal fortsatt se bra ut: ytelse hentes først uten å endre utseendet.
- **Handelssteder:** man handler tre steder og bare der: utstyrsbutikken, fiskemottaket og verftet. Fars naust (Vangshamn) er bare hjem; rorbuene selger ingenting. Alt nytt følger `docs/handelssteder.md`, som også har reglene for plassering (minst 1,5 km fra hverandre, i ly, ekte plasser, navn etter stedet, eget kartikon).
- **Én kjøpslogikk:** det som kjøpes, må henge sammen med det spilleren eier og passe båten. Regelen står ett sted (`buyGate` i `core/10-gear.js`, `equipFits`); kjøpsfunksjonen og knappene spør den.
- **Ingen ekte firma- eller organisasjonsnavn uten skriftlig avtale.** Alt heter etter stedet. Et ekte navn kommer bare gjennom sponsordataene i databasen, merket som samarbeid (`docs/planer/butikker-og-sponsorer.md`). Offentlige kilder kan nevnes. Båttypenes forbilder står bare i kommentarer og doku.
- **Båtmodeller:** bare utsiden. Ingen innredning, ingen animasjoner i båthandelen. Ingen kjøpbart redskap modellert inn, bare plassene (`hauler`, `reel`, `work`); skipets egne systemer (vinsjer, kraner, galge) er skrog og står.
- **Sjekk regelverk mot kildene** (Lovdata, Fiskeridirektoratet, Råfisklaget) før det bygges inn, og oppgi kilden.
- **Mobil og nettbrett med berøring** i nettleseren (Android og iPhone), stående og liggende.
- Tallene i spesifikasjonen og dokumentene er startverdier som justeres i spilltesting.

## Slik går en økt

- **Én økt per oppgave.** Start: indeksen, systemdokumentet, backloggen. Slutt: `/lever` og `/okt-slutt`. Det som avgjøres underveis, skrives i systemdokumentet samme dag. Agenter får én avgrenset jobb, aldri to i `src/js/` samtidig.
- **Fart foran finpuss:** endringene inn raskt, finpuss samlet etterpå.
- **Større funksjoner med uklare valg:** kort plan, vent på klarsignal (`/planlegg`). Enkle endringer bygges rett. «Snakk uten å bygge» = bygg ingenting. «Kjør på» = bygg, test, lever.
- **«Ferdig når» før bygging.** Hvert steg har tre til fem punkter som kan sjekkes, øverst i startmeldingen (`docs/planer/start/<steg>.md`). Mangler de, skriver økta dem fra planen før den bygger noe, og viser dem til Jonas i første melding (uten å vente på svar). Steget er ferdig når alle holder.
- **Økta lukker det den åpner: lukkerunden** (interaktive økter; en rutine følger «To arbeidsmåter» over). Et steg er ferdig når ingenting står igjen etter det, ikke når resten er skrevet ned. Før `/lever` lister økta alt den ville kalt svakt, antatt, ikke målt, ikke rettet eller gjenstående, og lukker hvert punkt:
  1. **Antatt:** slå opp kilden, mål eller skriv testen, og bygg det svaret krever.
  2. **En feil økta finner, også utenfor steget, rettes i samme økt.** Unntak: filer en annen økt eier nå («Øktene som kjører» i køen) røres ikke, og feilen skrives i den øktas rad; det som er `hoy` i `tools/ci/risiko.py` (ekte penger, kontoer, lagret spillerdata, databasen, `src/legal/`), går som PR til Jonas, også en feilretting.
  3. **Et valg bare Jonas kan ta:** en økt han har startet, spør straks med spørsmålsverktøyet (A/B/C, én anbefaling) og bygger videre på resten. Arbeidsrutinen bygger sin egen anbefaling når valget kan gjøres om, og sier hva den valgte og hvordan det snus; valg som ikke kan gjøres om (ekte penger, juss, lagringer og spillerdata), venter på ham.
  4. **Det bare Jonas kan gjøre** (se på nettbrettet, måle på en enhet, bilder, migrering på testprosjektet): `docs/spill-dette/<steg>.md` og én linje i meldingen, ikke et backlogpunkt.
  5. **Rekker ikke økta alt,** er steget `pågår` i køen med hvor langt det kom, og samme steg fortsetter. Resten blir aldri et nytt steg eller backlogpunkt.
  Observasjoner og ideer skrives ikke ned som arbeid. Et nytt åpent punkt i backloggen har `**Åpent fordi:**` med `Jonas`, `annen økt`, `ekte penger eller juss` eller `utenfor repoet`, og hva som lukker det. `python3 tools/plan/lukket.py` er rød når grunnen mangler.
- **Uavhengig kontroll før levering** (`/kontroll`): når et steg har endret `src/`, får en fersk agent endringen og «Ferdig når»-punktene, ikke øktas egen oppsummering, og leter etter det som mangler eller er galt. Det den finner, rettes i økta. Ikke for rene dokumentendringer.
- **Meldingen til Jonas** slutter med «Åpent etter økta: ingenting», eller hvert åpne punkt med grunnen. Vær ærlig om svake tester og usikre regler; ingen pynt.
- **Patchnotes** (`PATCH` i `src/js/ui/phone/07-patch.js`): en endring som merkes i spillet, får en oppføring øverst eller en linje i den nyeste, kort, norsk og engelsk. **Aldri** taktisk design, psykologi, ekte penger, 💎, priser, butikk, registreringsgaver eller hvorfor noe er laget slik.
- **Ingen videoopptak i sanntid**, bare skjermbilder. Unntak (Jonas 14.11.2026): **bildeklipp av figurenes bevegelse**: bildene tegnes ett og ett på faste tidssteg med låst klokke (3–5 s, 8–10 bilder i sekundet, vanlig kameraavstand), sys sammen og sendes til `ask_gemini` med **bare ja/nei-spørsmål** (treffer hånda tingen, går noe gjennom kroppen, rykker noe), aldri «ser det bra ut?». Flyt og hakking på nettbrettet viser de ikke: det ser bare Jonas.
- **UI-endringer ses i begge formater** (800×1280 og 1280×800) før de meldes ferdige. Lange løp (`tut.py`) i begge formater bare når UI-et er flyttet eller endret; ellers `KYST_TUT_ONE=liggende`.
- **Stikkprøver langs kysten** (`/stikkprove`): en retting som kan gjelde hele landet, prøves på minst tre andre steder (sør, midt, nord). Svaret sier hvor. Unntak: når du er helt sikker på at den virker overalt, og sier hvorfor.

## Køen og rutinen

- Det som skal bygges, står i rekkefølge i `docs/planer/koen.md` (bare det åpne; resten i `koen-arkiv.md`), startmeldingene hele i `docs/planer/start/<steg>.md`. En økt Jonas starter, merker steget `pågår` før den begynner, og skriver hel startmelding for neste steg når den slutter.
- **Driften** (`tools/drift/RUTINE.md`, 18.11.2026) er den ene planlagte rutinen, hver time på en lett modell, i fast rekkefølge: slippet om natta, feilrettingen, og ett steg fra køen bare når det ikke er en feil å rette og `Rutinen: på` står i køen. Kode skrives bare av én Opus-agent per kjøring.
- **Feilrettingen** (`tools/feilretting/RUTINE.md`, del av Driften): `tools/triage/klynge.py` gjør triagen uten modell, ønsker og balanse går bare til rapporten i /admin, og en Opus-agent startes bare når en ny teknisk feil skal rettes. Én felles lås for alt som skriver kode: `auto/kjorer` (`tools/triage/laas.py`). PR-låsen (`tools/triage/prlaas.py`): en middels/høy PR som har ventet under 24 timer på Jonas, stenger bare for nye middels/høy; lav går alltid.
- **Arbeidsrutinen** (`tools/plan/RUTINE.md`; del av Driften, styrt av `Rutinen: på/av` i køen) tar første klare steg, bygger det og ruller ut til testutgaven selv når porten der holder. Skjermbildene fra hver økt går til Jonas til slutt.
- **Ingen tak på steg som venter på at Jonas ser på dem** (fjernet 12.11.2026). Rutinen og koordinatoren bygger videre uansett hvor mange filer som står i `docs/spill-dette/`; `python3 tools/plan/venter.py --liste` samler dem i `SAMLET.md`.
- **Køen ordnes etter prioriteringen i «Live-drift»** (18.11.2026; porten for de første brukerne er arkivert). Rutinen tar det første klare steget i køens rekkefølge; Jonas flytter rader. Et steg som blir for stort, kuttes til det som trengs.
- **Betaling, kontoer og lagret spillerdata krever alltid ett klikk fra Jonas** (18.11.2026; unntaket for feilrettinger fra 17.11.2026 er fjernet): ekte penger (`ui/10i-shop.js`, `ui/10q-buymoment.js`, `ui/10u-hopp.js`, `core/06j-hopp.js`, `ui/10j-paint.js`, Stripe, `shop_*`), kontoer og lagringer (`ui/10f-cloud.js`, `ui/02-format-state.js`, `kystfiske_v2`, `save_put*`, `account-delete`), `supabase/` og `src/legal/` (alt `hoy` i `tools/ci/risiko.py`). Endringen bygges, testes og gjøres helt ferdig automatisk, men rulles ikke ut og slippes ikke før Jonas har flettet PR-en eller satt `jonas-har-sett` på slipp-PR-en.
- **Kjernemekanikken** (`middels`: `src/js/core/`, 3D-motoren, malen, bygget) går heller ikke ut av en automatisk retting: den blir en ferdig testet PR med merkelappen `venter-pa-jonas`.
- **Hooks og deny-liste** (`.claude/settings.json`, `.claude/hooks/`): nekter `rm -rf`, `sudo`, `git push --force`, push til `main`, `git reset --hard`, `git clean -f` og `.env`. Lesevakten nekter en `Read` uten `offset` og `limit` av en `.md` eller `.js` over 60 KB under `docs/` og `src/js/`. Commit-vakten nekter modellnavn i meldingen og `dist/`, `dist-vec/`, `tests/out/` staget. `hooktest` dekker dem.

## Tester

- **Bare de testene som er strengt nødvendige.** Under byggingen: `node --check`, bygg, `python3 tests/run.py changed` (testene som dekker endrede filer, uten 3D). Dokumentendringer kjører ingen tester. Én commit per endring.
- **Spør før hver test:** dekker den en fil jeg har endret, og kan endringen min få den til å feile? Hvis nei, kjøres den ikke. En test du mener ikke er relevant, kan droppes, også når en startmelding nevner den; meldingen og commiten sier hvilke og hvorfor. Tabellen over de lange testene: `docs/systemer/testing.md`.
- **Full regresjon** (`/regresjon`, rundt en time) bare før publisering.
- Kjør aldri samme test to ganger for å lese utskriften annerledes (loggene: `tests/out/logs/`). Lange tester går i bakgrunnen. Aldri flere 3D-tester samtidig.
- **Enhetstester av kjernen:** `node tests/unit/run.mjs`. En endring i `src/js/core/` er ikke ferdig før de er grønne, og en ny eller endret ren funksjon får en sjekk i samme commit.
- **Se testen feile før den stoles på:** en test skrevet eller rettet for en feil, kjøres mot koden før rettingen og skal være rød da. Commit-meldingen sier hvordan den ble sett rød. Det gjelder all logikk, data og samspill; en ren CSS- eller tekstjustering (`css_tekst` i `tools/ci/risiko.py`: stilarket, tekstene, patchnotatene) verifiseres med bygget og skjermbildene i begge formater, uten en syntetisk test.
- Playwright i Python i `tests/`, mot `dist/index.html` over HTTP (bygg først; `KYST_DIST=<mappe>` for et annet bygg). Oppsett: `pip install playwright==1.63.0`. Kjør med `tests/run.py`; skriptene skriver verdier i stedet for assert, så les utskriften.
- Testene kjører med frø (`seed=1`; `KYST_SEED=2` gir et annet kast, `0` slår av) og med roen av (`ro0`; bare `tut.py` og `roetest.py` har roen). En rød test er en feil, ikke et dårlig kast. En test som lager adressen selv, tar med `ro0`.
- Nye tester: `await boot(pg)` fra `_env.py`, inn i `D3` eller `LITE` i `run.py`. En ny fil i `src/` legges i `COVER` i `run.py`. Trykk i 3D sendes som CDP-berøring; berøring og drag i kartet trenger `--disable-gpu-compositing`.
- **3D-tester tegner bare det de ser på** (15.11.2026): en 3D-test som sjekker logikk (bevegelse, fortøyning, lossing, bunkring), åpner `GAME3D_MIN` fra `_env.py` (uten trær, dyreliv, vind, strand, skjær, marina og nærterreng). Full scene bare i testene av grafikken og der et bilde skal ses. Hver ny side koster 1–2 minutter i SwiftShader før 3D-en går: flytt båten og kameraet i samme side heller enn å starte en ny.
- **Kronisk røde tester** (15.11.2026): en test som er rød på samme sjekk tre netter på rad i regresjonen, merkes «Kronisk» i backloggen 10.6 og blir et steg i køen: rett feilen, eller endre sjekken med Jonas' ja. Å slå av en test eller en sjekk krever fortsatt Jonas.
- Det som må stemme: `trip2.py` ender med `"st":"port"`, `tut.py` med `"tut": 0`, `dbg23o.py` skriver ingenting, sjekklinjer starter med `OK`, sidefeil er `[]`.

## Bygg

- `node build.mjs` setter `src/` sammen til `dist/index.html` og kopierer kartpakkene til `dist/map/` (hele kysten når `tools/map/out/game/` finnes, ellers Senja). `KYST_DIST=<mappe>` bygger dit, `KYST_VEC=1` tar med vec-pakkene, `KYST_ONE=1` gir én fil. `dist/` er ikke i git.
- `node --check <fil>` på hver JS-fil du endrer, og bygg etterpå. Test alltid `dist/index.html` over HTTP (`python3 tools/serve.py`); filene i `src/` kan ikke åpnes direkte.
- `python3 tools/docs/kodekart.py` skriver kodekartet (`/lever` gjør det). Datarørledningene: `docs/systemer/datarorledninger.md`.

## Koden

- `src/index.html` er malen: `@include(sti)` byttes med fila; JSON i JS som `/*@include(sti)*/null`. Alt i `src/js/core/` og `src/js/ui/` havner i samme `<script>` i malens rekkefølge og deler globalt skop. **En ny fil må inn i malen på riktig plass.** `core/00-proj.js` har `'use strict'` og kommer alltid først.
- `vessel3d.js` og `view3d.js` (`G3`) er egne `<script>`. Delene i `src/js/view3d/` og `src/js/ui/phone/` er stykker av én funksjon: de kan ikke `node --check`-es alene, bare bygges.
- **Animasjon stemmes ikke i det uendelige (Jonas 14.11.2026):** høyst **to forsøk** på å justere samme bevegelse. Er klippet ikke godt da, stoppes det: modellen endres (hvor mannen står, hva hånda styres av), ikke tallene, eller Jonas spørres. Centimetermålinger (`tests/folk2maal.py`) er bare vakt mot grove feil (noe mer enn 10 cm inn i en kropp), aldri port for «bra nok»: det avgjør klippet og til slutt Jonas på nettbrettet. Et animasjonssteg har et tak i økter, og stopper der uansett.
- **Folk og bevegelse:** den som rører figurene, løseren eller det de holder (`deckcrew.js`, `figpose.js`, `drawWorker`), leser «Arkitekturen for bevegelsen» i `docs/planer/folk-2.md` først: kinematisk skjelett, analytisk to-ledds IK, lukket fjærløsning, tingen eier grepet, ingenting inn i kroppen.
- **Ingen kode velger etter båttypens navn** (`=== 'sjark'`). Bruk feltene i `VESSELS` (`vesseltest.py`).
- Blender-modellene lages av skriptene i `tools/` (`/blender`, `pip install bpy==4.5.4`) til `src/data/*.b64`; bygget legger dem ut som `data/<id>-<hash>.bin`, og `bootData` henter dem. Referansetegninger legges ikke i repoet, bare målene.
- `src/data/` redigeres ikke for hånd. Rasterkartene leses bare gjennom lasteren i `core/01b-mapdata.js` (`rcell`, `rbil`, `rbilM`); en blokk som ikke er lastet, gir en feil og ingen reserveverdi.
- Rammen er UTM sone 33 i km: x = (E + 250 km)/1000 østover, y = (8 050 km − N)/1000 sørover (`natP`/`natLL`). Sann kurs = rutenettskurs + γ (`gridGamma`, `trueDeg`): det som vises, er sann retning; det som regnes, går i rutenettet. Senja-dataene føres inn med `LG`/`LGa`/`LGm`; nytt skrives med `P(lat, lon)`. Se `docs/systemer/kart-og-terreng.md`.
- Siden er rundt 6 MB; modellene, bildene og Senja-byggene ligger som hashede filer i `data/` og hentes ved oppstart (`ui/11-boot.js`).

## Gemini som andre øyne

- **Reglene står i skillen `/gemini`** (`.claude/skills/gemini/SKILL.md`). Last den før `ask_gemini` eller `generate_game_asset` brukes, og før større endringer i det som ses: UI, UX, HUD, WebGL-shadere, vannflata, lys, vær, 3D-modeller, klipp av bevegelse.
- **Mobil-UX vurderes etter en fast mal** (18.11.2026): skjermbildene i begge formater får poeng fra 1 til 5 på tekststørrelse, kontrast, trykkflater (minst 48 px), tommelsonen, overlapp og lesbarhet i sollys, med konkrete funn og hvor på skjermen. Klipp av bevegelse får fortsatt bare ja/nei-spørsmål.
- **Et klipp fra Jonas går alltid til `ask_gemini` før økta konkluderer**, og en visuell endring av betydning får før- og etterbilde til `ask_gemini` før steget meldes ferdig.
- **Verktøyene koster ekte penger:** ett `ask_gemini`-kall per steg, ett bilde per behov. Meldingen til Jonas sier hvor mange, og hva Gemini fant. Aldri `.env`, nøkler, spillerdata eller noe fra databasen.

## Engasjement og inntekt

Spillet skal tjene penger. Grunnlaget og arbeidslista står i `docs/engasjement.md`. I hver avgjørelse gjelder:

- **Haill for ekte penger beholdes.** Luksushaill bare som gave ved registrering og som takk for tilbakemelding. En feil fra en spillers rapport som er rettet og sluppet til produksjon, gir spilleren automatisk en bekreftelse og takk-haillen i spillet (`agent_fixed`, sendt av `klynge.py --belonn`).
- **Krokene er ekte.** Hver ny funksjon svarer på: hva gir den spilleren å gjøre nå, i dag og denne uka?
- **Betaling korter ned ekte avstander, aldri oppdiktede.** Aldri ventetid, energi eller trøtthet lagt inn for å selge, og aldri en ventetid forlenget for å selge mer.
- **Alt kan nås uten å betale**, med tid og dyktighet. Innholdet legges der betalingen blir fristende av seg selv, og belønningen står i forhold til turen uten trim.
- **Nye ting starter aldri på null** (endowed progress).
- **Variabel belønning kommer fra sjøen.** Ingen tilfeldig utfall for ekte penger: ingen loot boxes, gacha eller pakker med ukjent innhold.
- **Pris i kroner med 💎**, ingen fiktiv valuta, ingen nedtelling i butikken.
- **Ingen straff for fravær.** Push bare om egen båt og eget redskap, med tak etter bruk (`docs/push-plan.md`).
- **Tidspress fra spillverdenen er lov** (18.11.2026): pristopper på mottakene i et tidsrom, værvinduer og sesonger, likt for alle i den felles verdenen. Aldri knyttet til ekte penger eller butikken, og aldri tap av det spilleren eier: det man går glipp av, er en mulighet, ikke en straff.
- **Synlig status og rivalisering:** topplister per rederi, lag, havn og region, og status på kartet (flagg, farger, rederiets plass), med sesonger som gjør det verdt å komme tilbake.
- **Sosialt er additivt.** Ingen reklame eller annonsenettverk; sponsing bare etter `docs/planer/butikker-og-sponsorer.md`.
- **Bare kjøpte spillfordeler (haill) synes aldri** for andre, i noe som deles; haill gir plass på topplista uten at det vises. **Kosmetikk (båtfarger, flagg) og abonnementsstatus synes** på kartet og topplista (18.11.2026).
- **Kosmetikk er varig og synlig.** **Gjester kan ikke kjøpe.** 13-årsgrensen står.
- **Mål og se:** hver engasjementsendring skal kunne leses av i trakten i admin-dashbordet før neste vurderes.

## Publisering

- **En push til arbeidsgrenen som endrer `src/`, går til `test.detstorebla.no`**, ikke til spillerne. «Rull ut» betyr «til testadressen»: sjekk at kjøringen «Appen på Hetzner» er grønn og at `https://test.detstorebla.no/version.json` har den nye versjonen og `"ch":"test"`.
- **detstorebla.no endres bare av et slipp:** `main` flyttes fram av workflowen «Slipp», aldri av en økt (deny-lista) og aldri med fletteknappen. Rutinen slipper høyst én gang i døgnet (03–05 norsk tid) når porten og lagringsporten holder; Jonas kan si «slipp nå». Et slipp som rører ekte penger, kontoer, lagret spillerdata eller `src/legal/`, krever merkelappen `jonas-har-sett`, som bare Jonas setter. `python3 tools/release/slipp.py` lager slipp-PR-en (`--dry` viser den). En økt som mener noe må ut nå, sier det til Jonas.
- **En automatisk retting slippes alene** (16.11.2026), fra feillista og fra spillernes tilbakemeldinger, **bare når risikoen er `lav`** (18.11.2026): porten (`tools/autofix/gate.py`) fletter den, `autofix.yml` plukker bare den til `slipp/auto-<PR>` fra `main`, og «Slipp» tar den ut samme time når den holder mot `main`. `middels` og `hoy` blir en ferdig testet PR med `venter-pa-jonas`. Av-bryter: `AUTO_FIX_SLIPP=off`.
- **Migreringer er bakoverkompatible («expand-and-contract», 18.11.2026):** bare tillegg (ny tabell, ny kolonne med standardverdi, ny funksjon) i automatiske spor; aldri `DROP TABLE/COLUMN`, `TRUNCATE`, `RENAME` eller endret type der, og `save_put4` og andre RPC-er som en sluppet versjon kaller, endres aldri: en ny signatur får et nytt navn (`save_put5`) ved siden av, og den gamle tas bort først når ingen versjon i bruk kaller den, i en økt med Jonas. Spillere med PWA-en åpen skal aldri miste fremdrift.
- **Migreringer kjøres automatisk når de er «ok»** (live-drift fase 3, 18.11.2026): `tools/ci/migsjekk.py` gir hver fil «ok» (bare tillegg, trygg å kjøre to ganger), «jonas» (dataendring, en signatur som tas bort) eller «stopp» (destruktiv). På testprosjektet (`xlrjbqdhdymcdjkqkulx`) kjøres «ok»-filene av `.github/workflows/migreringer.yml` når de når arbeidsgrenen; i produksjon bare i slippet, fra Hetzner-serveren (`slipp.yml` «migreringer: hetzner», `tools/server/gate/migrer.py`), rett før `main` flyttes, aldri etter og aldri ved utrulling til testadressen. En fil som er «jonas» eller «stopp», kjører Jonas for hånd, som før (Supabase-verktøyene i en økt går mot produksjonen).
- **Utgavene og nødbremsen** (live-drift fase 4, 18.11.2026): produksjonen er én mappe per bygg (`releases/<v>`) og en peker (`current`) som byttes i ett steg (`tools/server/utgave.py`). En automatisk retting prøves først som nøyaktig det bygget som skal ut, på `test.detstorebla.no/auto/` (`tools/release/autoprove.py`, oppstartstesten og rettingens egne tester på de samme filene). I to timer etter hvert slipp ser nødbremsen (`tools/server/vakt/brems.py`) på krasj og alvorlige feil per økt; passerer de tersklene, går pekeren tilbake, `https://detstorebla.no/nodbrems.json` sperrer automatiske slipp, Jonas får push, og Driften åpner en PR som reverserer (`tools/triage/brems.py`). Sperren går bort med et slipp Jonas starter selv («tross_nodbrems: ja»).
- Artifacten oppdateres ikke og skal ikke slettes. GitHub Pages har bare flyttesiden.
- Alt står i `docs/systemer/publisering.md` og «Slippet» i `tools/plan/RUTINE.md`.
