# Ranking-systemet: nivå, xp og dine egne ferdigheter (plan 16.11.2026, steg 134 RANK1)

Status: **valgene besvart 16.11.2026** (Jonas: V1 A, V2 A, V3 A, V4 A). Ingenting er bygd. Bygges ikke før steg 133 (DP3-5) er ferdig, fordi 133 eier `ui/phone/07-patch.js` og fila til Driftsplan 3.

## 1. Hva Jonas ba om

Jonas 16.11.2026, om spillerens egen utvikling (`driftsplan-3.md` kap. 4, «Etter dette, eget steg»):

> «siden litt av storyen i spillet er at man arver en båt, så må man starte ganske lavt på ferdighetene. Man er tross alt helt fersk på havet. På den måten vil også egenskapene forme seg etter hva spilleren faktisk bruker slags redskaper»

Og samme dag, om rankingen (steg 134):

> «Jeg tenker ferdighetssystemet må kobles på og balanseres med fartstidsystemet, slik at det blir et fullverdig ranking system med lvl, xp, og ferdigheter.»

Reglene som gjelder (`CLAUDE.md`, `docs/engasjement.md`): ferdighetene og fartstida er **aldri til salgs**, og ingenting som øker dem direkte. **Nye ting starter aldri på null.** **Haill synes aldri** for andre. Topplista er med alt levert, haill inkludert (avgjort 06.10.2026). Ingen straff for fravær.

## 2. Hva som finnes i dag

- **Fartstida** (`core/09e-fartstid.js`): poeng på kurven `fsNeed(N) = 1 000 000 · (N/40)^2,8`, år 0–40, stjerner etter. Poeng inn: hver spilltime til sjøs med deg om bord (`FS.SEA`), hver levering etter kvadratroten av verdien (`fsLand`), en firedel når mannskapet driver uten deg eller spillet er lukket (`FS.AWAY`), og «uthvilt» gir dobbelt. `fsYear` skriver i dekksdagboka, toast etter år 5, Kystposten hvert tiende år. Lagres i `S.fs = {p, rest, away}`.
- **Kommentaren sier «status only, it opens nothing»**, men det stemmer ikke helt lenger: kassekreditten åpner ved 5 år (`BANK.kkFsY`, `core/03-simulation.js`), lærlingen kommer tidligst ved 10 år (`LAER.fs`, `core/14-crewlife.js`), turoppdragene vektes etter årene (`09g-turer.js`), og merkene «5 år» og Fartstid 10/20/30/40 (`09f-merker.js`).
- **Serveren** holder fartstida i `players.fs` og lar den ikke vokse mer enn 5 000 poeng i timen (`pos_put`, `20261105140000_liv_owned.sql`). AIS-kortet og profilen viser den til andre (`ui/03-map.js`, `ui/10v-profil.js`).
- **Mannskapet** (`core/04-crew.js`): egenskapene `c.attr` (erf, styrke, uth, tek, kokk, sjo) og ferdighetene `c.gear` (juksa, line, garn, teiner, sloy, is, sort), alle 1–5. Ferdighetene vokser med minuttene på stasjonen (`learnHour`, `core/14-crewlife.js`: `0,012 · alder · humør · (1 − v/5,5)` per time), erfaringen med timene til sjøs. Nivåene lærling, erfaren og dreven kommer av `erf` (`crewDerive`). Arbeidsfarten er `crewEff`.
- **Du** har ingen ferdigheter. I arbeidsfordelingen er du «en skipper som kan alle jobbene på dekk»: 3,2 på alt, 5 ved roret (`stSkill(null)`, `core/13-work.js`), men det brukes bare til hvilken stasjon du tar. Farten din på dekk er `meEff()` (`core/15-energy.js`): 1, eller saktere når du er trøtt. Hvor du står hvert minutt, står i `S.mySt` (`workMinute`).
- **Søket med ekkoloddet** (`plan3Reader`, `core/06k-plan3.js`): er du om bord, leser du bildet med den faste erfaringen `DRP3.sok.meErf = 1,5`, «til steg 134».
- **Topplista** (`top_list`, `20261116120000_lansering.sql`; `worldTop` i `ui/10h-world.js`): kilo og kroner for uka, og totalt levert.

## 3. Hvordan det virker

**Nivå og xp (V1 A):** nivået er **årene fartstid**, og xp er **fartstidspoengene**. Ingen ny skala ved siden av. Kortet viser «Nivå 12» stort, «12 år og 143 døgn fartstid» under, og linja som fylles mot neste år med poengene (xp) som tall. Etter 40 går nivået videre som stjerner, som i dag. Kurven, kildene til poeng, uthvilt, firedelen og serverens tak er som før, så ingen lagring, test eller AIS-visning endres av at det kalles nivå.

**Ferdighetene dine:** de samme som mannskapets, så langt de gjelder deg: **juksa, line, garn, teiner, sløying, ising og krabbesortering**, og **erfaring**. Skala 1–5 som mannskapet.

- **Du starter på 1,5** i alle (fersk på havet, men ikke null: du kan holde en kniv).
- **Erfaringen er fartstida:** `erf = tak(nivå)`. Den vokser bare med årene. Det er den søket leser (`plan3Reader`), i stedet for 1,5.
- **De andre vokser med det du gjør (V2 A):** hvert minutt du står på en stasjon (`S.mySt`), og når du jukser selv, går den ferdigheten stasjonen trener (`stationSkill`, som for mannskapet) mot **taket for nivået ditt**. Det du ikke bruker, blir stående. Slik formes du etter redskapene du faktisk bruker.
- **Taket** følger nivået: `tak(år) = 1,5 + 3,5 · (år/40)^0,6`. År 0: 1,5. År 1: 1,9. År 5: 2,5. År 10: 3,0. År 20: 3,8. År 30: 4,5. År 40: 5,0. (Startverdier til spilltesting.)
- **Farten mot taket:** per time på stasjonen går ferdigheten en firedel av avstanden opp til taket (antatt). En stasjon du har stått tre timer på, er over halvveis. De første stegene kommer derfor raskt, og en ferdighet du bruker mye, ligger nær taket og stiger med hvert nytt år.
- **Spillet lukket:** det du gjør om bord mens spillet er lukket (driftsplanen med deg om bord), teller en firedel, som fartstida.
- Når en ferdighet går over et helt tall: én linje i dekksdagboka, som for mannskapet («Du har blitt flinkere til å sløye»). Et nytt år viser hvilke tak som steg.

**Hva ferdighetene gjør for deg (V3 A):**

- **Arbeidsfarten på stasjonen:** `meEff() · (1 + 0,07 · (ferdighet − 1,5))`. Fersk er 1,0, **det samme som i dag**, og øverst 1,25. Ingen blir tregere enn i dag; alt over er vekst. Trøttheten virker som før.
- **Søket:** erfaringen din (taket for nivået) i stedet for 1,5. År 0 er som i dag; en spiller med 20 år leser bildet som en skipper med 3,8.
- **Hvilken stasjon du tar** (`stSkill`): 3,2 som før, løftet av ferdigheten din over starten (3,2 ved 1,5, 5 ved 5). Fersk velger du som i dag, og du tar oftere det du har blitt god til. Roret er som før (du har alltid roret når båten går). (Endret i RANK1-a: de rå tallene, 1,5 mot 3,2 i byssa, sendte en fersk skipper bort fra redskapet; `driftsplan2test` S5 fikk lina trukket en time for sent.)

**Rankingen mot andre (V4 A):** en fjerde fane i topplista, **Fartstid**, med de registrerte spillerne etter `players.fs` (serverens tall med taket). Gjester vises ikke, men ser seg selv. Ferdighetene vises ikke for andre, bare nivået, som AIS gjør alt. Haill synes ikke: fartstida fra en levering med haill teller som i dag, og ingenting sier hvor den kom fra.

**Spillere som har spilt:** nivået er fartstida de har. Ferdighetene settes én gang fra den: juksa, sløying og ising, og redskapet en båt i flåten er rigget for eller som du eier (krabbesortering med teinene), settes til taket for nivået ditt; de andre redskapene til halvveis mellom 1,5 og taket. (Endret i RANK1-a: leveringene, `S.sales`, har artene og ikke redskapet, så riggen og redskapet du eier brukes i stedet.) Ingen mister noe: farten på dekk er minst som i dag.

## 4. Fasene

| Fase | Hva den bygger | Filer | Tester |
|---|---|---|---|
| **RANK1-a Modellen** | `S.fs.sk` (ferdighetene), `fsCap(år)`, `fsErf()`, veksten per minutt på `S.mySt` og ved egen juksing (`fsSkillMinute`), en firedel lukket, linja i dekksdagboka, oppstarten for gamle lagringer, `meEff` med ferdigheten i `workTeam` og jobbene, `stSkill(null)` med dine tall, `plan3Reader` med `fsErf()` (`DRP3.sok.meErf` ut). Kommentaren «opens nothing» skrives om. | `core/09e-fartstid.js`, `core/13-work.js` (`stSkill`, `workTeam`, jobbfarten), `core/06k-plan3.js` (`plan3Reader`), `core/03-simulation.js` (bare `jigMeShare`) | ny `tests/unit/rank.test.mjs` (taket, veksten, firedelen, oppstarten, farten aldri under 1), `plan3.test.mjs`, `fartstidtest`, `worktest`, `skiptest` (energien er låst), `driftsplan2test` (åpent mot lukket) |
| **RANK1-b Kortet** | Fartstidskortet blir «Nivå og ferdigheter»: nivået, xp-linja, ferdighetene som streker med taket markert, og hva neste år løfter. Hjemskjermens brikke viser nivået. «Mens du var borte» får én linje når en ferdighet gikk opp. Profilen viser nivået. Patchnoten. Håndboka: ett avsnitt. | `ui/phone/08-home-papers-merker.js`, `ui/08-actions.js` (bare borte-rapporten), `ui/10v-profil.js`, `ui/phone/07-patch.js`, `ui/07c-handbook.js` | `fartstidtest` (skrives om for kortet), `merketest`; begge formater |
| **RANK1-c Topplista** (V4 A) | Fanen Fartstid: `top_list` får `kind = 'fs'` fra `players.fs`, bare registrerte. Migrering først på testprosjektet (Jonas kjører den). | ny migrering i `supabase/migrations/`, `ui/10h-world.js` (`worldTop`), `ui/05i-ukas.js` eller der fanene står | `sqltest`, ny sjekk i `tests/toptest.py` eller den testen som dekker fanene |

Rekkefølgen: a, så b. c etter at 118 (KL3) er flettet, fordi 118 eier `ui/10h-world.js` og en migrering.

## 5. Valgene

Jonas 16.11.2026: «Årene fartstid», «Bruk + tak», «Fart + søk», «Fane i topplista» (A på alle fire).

**V1 Nivået**
- **A (anbefalt):** Nivået er årene fartstid, xp er poengene. Én tallrekke som alt finnes, er kalibrert og sjekkes av serveren, og fiskernes eget språk står under.
- B: En ny skala, nivå 1–100 regnet fra poengene, med fartstida under.
- C: Nivå og fartstid hver for seg, med egne poeng.

**V2 Koblingen mellom nivå og ferdigheter**
- **A (anbefalt):** Det du gjør, bestemmer **hvilke** ferdigheter som vokser; nivået bestemmer **hvor høyt** de kan gå (taket). Begge må til, så ingen av dem kan løpe fra den andre.
- B: Hvert nytt år gir et ferdighetspoeng du fordeler selv.
- C: Ferdighetene vokser bare med bruk, uten tak fra nivået.

**V3 Hva ferdighetene gjør for deg**
- **A (anbefalt):** Arbeidsfarten på stasjonen (fersk = som i dag, øverst +25 %), søket med ekkoloddet (erfaringen), og hvilken stasjon du tar. Ingen blir dårligere enn i dag.
- B: Som A, og i tillegg flere napp når du jukser selv.
- C: Som A, men fersk starter under dagens fart (rundt 0,9), så veksten merkes mer. Gamle spillere får tallene fra fartstida.

**V4 Rankingen mot andre**
- **A (anbefalt):** En fane Fartstid i topplista, registrerte etter serverens tall. Ferdighetene er bare dine.
- B: Ingen ny liste. Nivået synes for andre bare i AIS og profilen, som fartstida i dag.
- C: Som A, og ferdighetene synlige i profilen.

## 6. Antatt og usikkert

- **Taket og farten** (`1,5 + 3,5 · (år/40)^0,6`, en firedel av avstanden i timen) er anslag. Om nivå 5 med 2,5 føles for lavt etter en uke, justeres eksponenten.
- **+25 % øverst** er satt under det en dreven mann i mannskapet får (`crewEff` for 5/5/5 er rundt 1,4), fordi du også styrer båten. Det måles ikke før spilltesting.
- **Oppstarten for gamle lagringer** leser redskapet fra salgene og riggen. Spilleren har ikke hatt minutter per stasjon før, så fordelingen er et anslag.
- **Skippertak** (energi for ekte penger) gir flere våkne timer på dekk og dermed flere minutter på stasjonene. Det kjøper tid, ikke ferdighet, og trøttheten er simuleringens egen. Jeg mener det holder regelen; si fra om du ser det annerledes.
- **Haill** gir mer fangst, og levert verdi gir fartstid (kvadratroten). Det er som i dag (06.10.2026) og endres ikke.
- **Styrke, utholdenhet, teknisk, kokk og sjømannskap** får du ikke: energien din er låst (`skiptest`), skipperen lager ikke mat, og roret er ditt uansett. Et tall som ikke gjør noe, legges ikke inn.
- Lagringsporten (P2): `S.fs.sk` er et nytt felt; en lagring uten det får det ved oppstarten. Ingen felt fjernes.

## 7. Hva planen ikke gjør

- Ingen ferdigheter eller nivå til salgs, og ingenting som øker dem direkte.
- Ingen rangnavn (lærling, skipper osv.) på deg. Nivået er årene.
- Ingen endring i fartstidskurven, poengkildene eller serverens tak.
- Ingen nye låser på utstyr, båter eller områder etter nivå. Kassekreditten (5 år) og lærlingen (10 år) står som før.
- Ingen endring i mannskapets læring.
- Ingenting slippes til detstorebla.no fra planøkta.

## Status

- 16.11.2026: planen skrevet (planøkt, gren `plan/2026-11-16-134`). Valgene besvart samme dag: A på alle fire. RANK1-a bygges når 133 er ferdig; startmeldingen er `docs/planer/start/134.md`.
- 16.11.2026: **RANK1-a bygd** (Jonas: «Kjør på», samme gren): modellen, farten på dekk, søket med din erfaring, og valget av stasjon (3,2 løftet av ferdigheten, endret etter `driftsplan2test` S5). Uavhengig kontroll: oppstarten for gamle lagringer leser riggene i flåten og redskapet du eier, ikke `S.sales` (kap. 3 rettet). Ikke rullet ut: går ut med RANK1-b. Neste: RANK1-b, `docs/planer/start/134.md`.
- 16.11.2026: **RANK1-b bygd** (samme gren): kortet «Nivå og ferdigheter» i Milepæler › Merker (nivået, xp til neste, de sju ferdighetene med taket som gul strek og det over taket skravert), «Nivå 12» på hjemskjermens brikke, nivået i profilen, og en rute i «Mens du var borte» når en ferdighet gikk over et helt tall. Gemini (ett kall, før og etter i begge formater): den gule streken så ut som et mål, ikke et tak, og strekene ble lange liggende; rettet med skravert felt over taket og en bredde på 560 px. Skjermbilder i `docs/okter/2026-11-16-134/`. **Gjenstår:** patchnoten og avsnittet i Håndboka (133 eier `07-patch.js` og `07c-handbook.js`), og utrullingen til testutgaven: Jonas 16.11.2026 «Vent på 133 også»: grenen flettes inn når 133 er ferdig, med patchnoten og Håndboka i samme utrulling.
  - Patchnoten, klar til å legges inn: «Nivå og ferdigheter: fartstida er nå nivået ditt, og du har egne ferdigheter (juksa, line, garn, teiner, sløying, ising og krabbesortering) som vokser med jobben du gjør om bord, opp til et tak som stiger med årene. Se Milepæler › Merker.» / «Level and skills: your sea time is now your level, and you have skills of your own (jigging, longline, nets, pots, gutting, icing and crab sorting) that grow with the work you do aboard, up to a ceiling that rises with the years. See Milestones › Badges.»
  - Håndboka, kapittelet om fartstida: samme innhold, og at erfaringen din leser ekkoloddet når driftsplanen søker med deg om bord.
- 16.11.2026: **RANK1-a og -b flettet inn og rullet ut til testutgaven** etter at 133 var ferdig, med Håndboka (`niva`) og patchnoten (`rank1-161126`). Neste: RANK1-c, `docs/planer/start/134.md`, når 118 er ferdig.
