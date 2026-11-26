# Regelverket i klartekst: trinn, målere og «hvorfor kan jeg ikke» (plan 25.11.2026)

**Status: valgene er tatt 25.11.2026 (V1 A, V2 A, V3 A). K0 (steg 148) er bygd og testet på grenen `ccr-e101e6f0-y7fg6x` samme dag, ikke flettet til arbeidsgrenen. K1 (steg 149) er bygd på samme gren. K2 (steg 150) er bygd på samme gren. K3–K5 (steg 151–153) er bygd på samme gren. Alle fasene er bygd; ingenting er flettet til arbeidsgrenen, og migreringen for målingen er ikke kjørt.**

## Hva Jonas ba om

Jonas 25.11.2026: «Spillet (Det Store Blå) bygger på reelt norsk fiskeriregelverk. Dette gir høy realisme, men skaper en for bratt læringskurve og høy friksjon for nye spillere – spesielt i overgangen fra åpen gruppe til lukket gruppe med kvotesystemer. Vi skal beholde hele den juridiske regelmotoren intakt i backend/logikklaget, men skape et intuitivt progresjons- og grensesnittlag som gjør at spillerne forstår handlingsrommet sitt uten å måtte lese lovtekst.»

Han ba om tre ting: progressiv kompleksitet, kvotene og reglene som synlige målere og forklaringer i klartekst, og en gjennomgang av tilstanden mellom båtbytte, kvoteberegning og fangstregistrering. «Fase 1 (Analyse og arkitekturforslag, IKKE skriv kode ennå) … Vi gjennomgår planen sammen før du implementerer noe.»

## Kort svar

Regelmotoren er hel og kan stå urørt. Det som svikter, er møtet med den:

1. **Spilleren ser kvoten først når fisken er tapt.** Kvotetallet står bare i telefonen (Kvote › Mine kvoter). På skjermen til sjøs står ingenting, og det eneste varselet er én logglinje i døgnet. Blindtestene sier det samme: Kvote-appen ble aldri åpnet, og testeren så aldri sin egen kvote.
2. **Kjøpet forteller for lite, for sent.** Den som kjøper sin første båt med hjemmel, får vite etterpå at selgeren alt har fisket en del av årets kvote (opptil 85 % sent i året). Den som kjøper en båt på 11 m eller mer uten hjemmel, får én liten linje under den sekundære knappen om at hun bare kan ta bifangst.
3. **Ordene er lovens.** «Adgang», «maksimalkvote», «garantert», «hjemmel», «deltakeradgang» og «blad B» står uforklart; ordboka i teksten har ingen av dem.
4. **Fem steder i tilstanden lekker** ved båtbytte og kvoteflytting (kapittel 3). De er funnet ved lesing og er ikke rettet.

Løsningen er ett nytt, tynt lag mellom motoren og skjermen («handlingsrommet»), som svarer på tre spørsmål med de funksjonene motoren alt har: *hvor mye har jeg igjen*, *hva endrer dette kjøpet*, og *hvorfor kan jeg ikke*. Skjermen spør bare laget. Ingen regel endres.

## 1. Hva som finnes i dag

| Hva | Hvor i koden | Slik møter spilleren det |
|---|---|---|
| Gruppa båten fisker i (`'lukket'`, `'open'`, `'none'`) | `access()`, `openVesselId()` i `core/03-simulation.js:18–29` | Ordet «Adgang» på båtkortet (`accessText`, `ui/phone/10-fartoy.js:6`) |
| Torskekvoten: åpen gruppes maks og garantert etter lengde, stoppen, økningene; fartøykvoten i lukket gruppe | `codLimits`, `codOpen`, `codLimitNow` (`03-simulation.js:1307–1312`), `yearQuota`, `licQ`, `qyAt` (`core/03d-quota.js`) | Kvote › Mine kvoter, med søyle (`salg('kvote')`, `ui/phone/09-vaer-post-salg-redning.js:69–96`) |
| Det som er landet i år, per båt | `S.quota` (i `VKEYS`, altså per båt), `quotaState()` | Samme kort |
| Det eieren har fisket i åpen gruppe følger eieren (§ 29) | `S.openUsed`, `openUsedSave`, `openUsedLoad`, `licStart`, `sellerCod` (`03d-quota.js:83–94`) | En melding fra Fiskeridirektoratet etter kjøpet |
| Hva som inndras ved levering | `landConf` (`ui/08-actions.js:144`), brukt av `sell()` og `landWarn` | Kaia før «Lever» (`landWarn`, `ui/07-guide.js:379`), sluttseddelen og en melding etterpå |
| Hvor det er lov å fiske (sted, redskap, lengde, dato) | `rulesAt`, `ruNow`, `ruBlockMsg` (`core/03e-rules.js`), data i `src/data/rules.json` | Linja «Regler» i statusboksen, Regler-appen, regellaget i kartet, varsel før feil (R4) |
| Kjøpssperrer | `deal().why`, `bladB()`, `kmBuyWhy`, `mbMoveWhy`, `havLicWhy`, `buyGate`/`equipFits` | Grå knapper; grunnen står noen steder som en setning i nærheten, andre steder ikke |
| Hjemler, strukturkvoter, flytting | `core/03i-kvotemarked.js`, `core/09k-market.js`, kjøpsgrenene `buy` og `buylic` i `ui/phone/14-act.js:228–380` | Båthandel, Kystmegleren, Kvote › Marked |
| Stigen | `goals()` i `ui/phone/10-fartoy.js:14–38` | «Neste mål» på hjemskjermen og i Båthandel |
| Tips når noe skjer første gang | Håndbokas drypp (`ui/07c-handbook.js`), ordboka i teksten (`ui/05k-ordbok.js`) | Ett drypp om kvote ved fjerde levering; 18 ord i ordboka, ingen om grupper eller hjemmel |

To ting å vite før noe foreslås:

- **Alle appene vises fra start.** Jonas 16.11.2026: «Gi tilgang til alle apper fra start» (`APPS_ALL = true`, `07c-handbook.js:235`). Innfasingen av apper som fantes før, ble slått av med vilje. Planen skjuler derfor ingen apper (valg V1).
- **Kvoten stopper ikke fisket.** Jonas 27.10.2026: en full torskekvote skal ikke stoppe driftsplanen; det som er over, inndras ved levering, og spilleren får 20 % i vederlag (`06h-plan2-engine.js:233`, `CONF_PAY`). Planen varsler, den stopper ingenting.

## 2. Friksjonen på veien fra første båt til egen kvote

I den rekkefølgen spilleren møter den.

1. **Første tur sier ingenting om kvoter, og det er riktig.** Ingen av de 17 stegene nevner kvote, gruppe eller regel (`ui/07b-first-trip.js:80–153`). Det beholdes.
2. **Rett etter første tur står «Blad B i fiskermanntallet» som mål nummer to på hjemskjermen**, uten forklaring (`goals()`, linje 19–20). Samtidig brukes «fiskermanntallet» om å opprette konto (`ui/10f-cloud.js:930`: «For å selge fisk i eget navn må du føres i fiskermanntallet»). To forskjellige ting har samme navn.
3. **Kvoten synes ikke der spilleren ser.** Statusboksen og knappelinja har ingenting om kvote. Hjemskjermens «Nå»-kort har regler og torskepris, ikke kvote (`nowCards`, `ui/phone/08-home-papers-merker.js:27`); kortet «Kvote: 0 av 4,3 t» fra `docs/planer/ui-redesign.md` (grep 7) ble aldri bygd. Sluttseddelen viser ikke hva som er igjen.
4. **Varselet til sjøs er én logglinje i døgnet, og bare når det alt er for sent:** «Torskekvoten er full. Torsk du lander nå blir inndratt.» (`core/05-vessels.js:1189`). Det kommer ikke i det hele tatt mens ferskfiskordningen løper (`!ffPct(H)`), altså fra 29. juni og ut året.
5. **Regler-linja sier «✓ Du kan fiske her» til en båt uten adgang.** Regelmotoren kjenner sted, redskap og lengde, men ikke gruppa nord for 62° N (`03e-rules.js` kaller aldri `access()`). En båt på 15 m uten hjemmel får grønt lys og mister 90 % av torsken ved kaia.
6. **«Neste mål» peker rett på fella.** Stigen foreslår «Kystbåt 14,99 m med lugarer» til skrogpris, uten hjemmel (`10-fartoy.js:28`).
7. **Båthandel sier feil om kystbåtene.** Fanen sier «Hjemlene for 11–21 m kommer senere, så nå selges de uten» (`10-fartoy.js:221`), men de selges med hjemmel under «Med hjemmel» (`LIC_OFFERS`, h14 og h20). Raden «Gruppe» sier «bare lukket gruppe (11 m og mer)» om en båt som i virkeligheten ikke er i noen gruppe (`grpText`, linje 196).
8. **Det første kjøpet i lukket gruppe er spillets største, og det dyreste den kjøper, er usynlig.** Inngangen (`u7`) er samme skrog som startbåten til rundt 3,2 millioner; prisen er kvoten. Arket viser årets fartøykvote, men ikke at selgeren har fisket av den (`sellerCod` brukes bare i `licStart`, etter kjøpet). Det kommer som melding etterpå: «Selgeren har fisket X tonn av den, og det trekkes fra (§ 29).»
9. **Fordelene med egen kvote står ingen steder i klartekst:** hun kan fiske uten at du er om bord, kvoten er din hele året, og den stoppes ikke.
10. **Rederiets småbåt mister åpen gruppe når rederiet får en hjemmel.** Verftet sier det før kjøpet (`10-fartoy.js:292`). Kystmegleren og Kvotemarkedets «Sett på» sier det verken før eller etter (`09k-market.js:324`, `03i-kvotemarked.js:134`).
11. **Grå knapper forklarer seg ujevnt.** Bankens grunner står i fet skrift ved knappen; «bare på verftet», «bestilling venter» og «til salgs» gjør knappen grå uten et ord.
12. **Rederi-appen viser ikke hvilken gruppe hver båt er i** (`ui/phone/11-rederi.js`). Hvilken båt som er «åpen gruppe-båten», bestemmes av rekkefølgen i flåten (`openVesselId()`: den første under 11 m).

Grunnlaget for 3–5 og ordene er blindtestene (`docs/playtest/rapport-2.md` F, `p2/intervju.md`): «Åpen gruppe, maksimalkvote, høvedsmann, fjordlinja og ferskfiskordningen ble ikke forstått», «Redskap- og Kvote-appen ble aldri åpnet». Testeren som leste kvotesiden, forsto den (`r1/quiz.md`): innholdet er godt, veien dit mangler.

## 3. Hullene i tilstanden

Lest i koden 25.11.2026. Ingen er kjørt som test ennå; hver retting skal ha en test som er sett rød først.

| # | Funn | Hvor | Følge |
|---|---|---|---|
| T1 | **Innbytte av en båt med hjemmel mot en ny båt med hjemmel gir ikke den gamle hjemmelen tilbake til registeret.** `buy` kaller `regFree`, `buylic` gjør det ikke. | `ui/phone/14-act.js:247` mot `:370–375` | Registeret mister én plass for hvert steg opp stigen, lokalt (`S.npcReg`) og på serveren (`reg_take` uten `reg_free`). |
| T2 | **Fisk i rommet følger med ved innbytte.** `switchVessel` rører ikke `S.hold`, og kjøpet sjekker ikke lasten. Flytting av hjemmel krever tomt rom (`mbMoveWhy`); innbytte gjør det ikke. | `14-act.js:228–251`, `13-mannskap-bank-meld.js:202` | Fangst tatt med én adgang landes med en annen: torsk fra åpen gruppe kan bli inndratt etter kjøp av en båt uten hjemmel, og rommet kan holde mer enn den nye båten rommer. |
| T3 | **Båt-id-er brukes om igjen.** Ny id er høyeste i flåten + 1, og det som er lagret per id, ryddes ikke når en båt selges. | `newVesselObj` (`03-simulation.js:35`), `mbDrop` (`09k-market.js:185`) | En ny båt kan arve den solgtes blåkveitefangst i år (`S.bkq.v`), skattemessige saldo (`S.saldo`, `saldoOf`) og landingshistorikk (`S.sales[].v`). |
| T4 | **`freshQuota()` nullstiller mer enn kvoten.** Hele objektet byttes: også bifangsttaket på 2 t (`byCod`), takene sør for 62° N (`nsjo`, `skag4`) og ukas ferskfisktall. | `03d-quota.js:93`, kalt fra `kmOut`, `kmApply`, `buy`, `buylic` | Å sette en hjemmel på og ta den av igjen (gratis og med en gang, KM4) gir takene tilbake. |
| T5 | **Åpen gruppe-båten på tur når rederiet får en hjemmel.** `access()` leses ved levering, ikke ved fangst. Et oppgjør i Kvotemarkedet kan komme mens spillet er lukket. | `03-simulation.js:29`, `sell()` | Torsk hun alt har om bord, går fra lovlig fangst til bifangst. Bare for rederier med flere båter; den vanlige overgangen har én båt og dekkes av T2. |
| T6 | **Varselet til sjøs er blindt** under ferskfiskordningen og for hyse, sei og blåkveite. | `05-vessels.js:1186–1189` | Se friksjon 4. Rettes i K2, der varselet bygges om. |
| T7 | **Tre tekster er gale i dag** (friksjon 6 og 7). | `10-fartoy.js:28`, `:196`, `:221` | Spilleren ledes mot en båt uten adgang. |

I tillegg: `tests/progweek.py` starter boten i `skiff` med 15 000 kr, mens spillet siden 09.11.2026 starter i `trebat` med 2 000 kr (`START_KR`). Tallene i dokumentene for «blad B» og «inngangen til lukket gruppe» er derfor ikke målt fra dagens start.

## 4. Løsningen

### 4.1 Handlingsrommet: ett lag mellom motoren og skjermen

En ny fil i kjernen, `src/js/core/03l-room.js`, med rene funksjoner som bare leser. Den eier ingen regler og ingen tilstand; den spør `access()`, `codLimitNow`, `licQ`, `bkMax`, `sorLeft`, `snoRoom`, `ruNow` og `landConf`, og gir skjermen ferdige svar.

| Funksjon | Svarer på | Gir |
|---|---|---|
| `rmStage()` | Hvor langt er spilleren kommet? | Trinn 1–5 (4.2), avledet av det som alt lagres. Ingen nye felt i lagringen. |
| `rmMeters(H)` | Hvor mye har jeg igjen? | Én rad per art som binder båten nå: landet, om bord, tak, igjen, tilstand (`ok`, `near`, `full`, `none`), og hvor mye av det som er om bord som ville blitt inndratt nå (fra `landConf`). |
| `rmNow()` | Kan jeg fiske her, med denne båten? | `ruNow()` slått sammen med gruppa og kvoten: «! Bare bifangst: båten har ingen kvote», «! Torskekvoten er full». |
| `rmBuy(tilbud)` | Hva endrer dette kjøpet? | Før og etter: gruppe, torsk igjen i år (med selgerens del trukket fra), hvem som kan fiske på kvoten, hvilken annen båt som mister adgangen, og det som hindrer kjøpet. |
| `rmWhy(kode, ctx)` | Hvorfor kan jeg ikke? | Én setning i klartekst, «slik løser du det» med knapp til riktig sted, og loven bak (paragraf og kilde) for den som vil. |
| `rmTerm(ord)` | Hva heter det? | Klartekstordet fra tabellen `RM_TERMS` (4.5), med fagordet i parentes første gang på en side. Ordene står ett sted, så et ord byttes ett sted. |

`landConf` flyttes uendret fra `ui/08-actions.js` til kjernen, så enhetstestene når den (de laster bare `js/core/`). Prefikset `rm` er ledig i det delte skopet i dag; det sjekkes igjen før navnene tas.

Laget gjør at teksten om en regel står ett sted. I dag er «ingen adgang» skrevet ut seks steder med litt ulike ord.

### 4.2 Trinnene: det enkle først

Trinnet styrer hva som **vises først**, aldri hva som er lov. Reglene gjelder likt på alle trinn, et varsel (✕ eller !) skjules aldri, og alt kan fortsatt åpnes.

| Trinn | Når (avledet) | Nytt på skjermen |
|---|---|---|
| 1 Fisker | Fra start: én båt under 11 m | Seile, redskap, fangst, levering. Én måler: torsk i år. Regler-linja. Neste mål. |
| 2 Yrkesfisker | Blad B nådd (`bladB()`) | «Egen kvote» forklart i tre setninger. Kjøpskortet. Fanen «Med hjemmel» løftes fram. |
| 3 Egen kvote | Rederiet har eller har hatt en hjemmel | Målerne for hyse og sei. Høsttillegget. Kvotemarkedet. Bestand. |
| 4 Reder | Båt fra 11 m, flere båter eller strukturkvote | Strukturering, kvotetaket, lengderegelen, flytting av hjemmel, reglene for fjordlinja og grunnlinja etter lengde. |
| 5 Hav | Havtillatelse | Havkvotene og kvotefaktorene. |

Det som hører til et senere trinn, ligger under «Mer» i samme app. Innstillinger får bryteren «Vis alt». Det nye forklares med Håndbokas drypp, som finnes: halvveis i kvoten, 80 %, første gang noe ville blitt inndratt, varslet stopp, blad B nådd, første gang «Med hjemmel» åpnes.

### 4.3 Målerne og varslene

- **Kvotemåleren** er en søyle med tre deler: landet, om bord, og taket. Den blir gul fra 80 % og rød når det som er om bord, ikke får plass. Et trykk åpner Kvote › Mine kvoter.
- **Til sjøs** (statusboksen): måleren vises når den betyr noe (valg V2). Varslene kommer ved 80 % («0,8 t igjen av torskekvoten») og når den er full («Torskekvoten er full. Torsk du tar nå, får du bare 20 % for.»), også mens høsttillegget løper, og for hyse, sei og blåkveite der de har tak.
- **Lasten:** den delen av rommet som ville blitt inndratt nå, merkes i lasten.
- **Kaia før «Lever»:** `landWarn` beholdes, med måleren ved siden av.
- **Sluttseddelen:** én ny rad, «Igjen av torskekvoten: 2,1 av 4,0 t», fra første levering. Første tur får ingen nye steg.
- **Hjemskjermen:** «Nå»-kortet «Torsk i år: 1,2 av 4,0 t».
- **Regler-linja** bruker `rmNow()`, så en båt uten kvote ikke får grønt.

Måleren regnes ut én gang per spillminutt og ved levering, ikke per bilde.

### 4.4 Kjøpet: «Dette endrer seg» og «Hvorfor kan jeg ikke»

Hvert båtark (verftet, Kystmegleren, Kvotemarkedets «Sett på») får kortet **«Dette endrer seg»** over kjøpsknappen, fylt av `rmBuy`:

| | Nå | Etter kjøpet |
|---|---|---|
| Kvote | Felleskvoten for småbåter (åpen gruppe) | Egen kvote (lukket gruppe) |
| Torsk du kan levere i år | 2,8 t igjen av 4,0 t | 3,7 t igjen av 10,6 t (selgeren har fisket 6,9 t) |
| Hvem kan fiske på kvoten | Bare når du er om bord | Båten, også med leid skipper |
| Kan stoppes i år | Ja, når felleskvoten er fisket | Nei |
| «Havbris» | Fisker på felleskvoten | Kan ikke lenger fiske torsk, hyse og sei for salg, bare som bifangst |

En båt som **tar fra spilleren** adgang (11 m eller mer uten hjemmel, eller en hjemmel som følger innbyttebåten), får et rødt felt øverst og ett spørsmål før kjøpet. En knapp som er grå, viser grunnen ved trykk (`rmWhy`): «Du må være yrkesfisker (blad B): 6 av 10 dager med levering», med knappen «Se Papirer».

### 4.5 Ordene (V3 A)

Jonas valgte først B («V3B») og endret det samme dag, 25.11.2026: «Vi må gjerne bytte ut ord til noe som er mer forståelig for brukerne … jeg mener det er viktig at spillet er forståelig for så mange som mulig, mens det enda ivaretar autensiteten».

Slik brukes ordene:

- **Klartekstordet står først.** Fagordet står i parentes første gang det nevnes på en side: «felleskvoten for småbåter (åpen gruppe)». Etter det bare klartekstordet.
- **Fagordene blir i spillet.** De står alene der de hører hjemme: i brev fra Fiskeridirektoratet, i Kystposten, på Papirer og bak «Loven bak» i Regler-appen. Der, og i parentesene, har de prikket strek fra ordboka i teksten (`ORDBOK`, `ui/05k-ordbok.js`), og et trykk gir setningen i høyre spalte.
- **Ordene står ett sted** (`RM_TERMS` i `core/03l-room.js`, lest med `rmTerm`). Vil Jonas bytte et ord, byttes det der.
- «Kvote» og «bifangst» står som de er; de er vanlige nok og står alt i ordboka.

| Fagord | Klartekst (forslag, Jonas retter) | Setningen i ordboka (forslag) |
|---|---|---|
| åpen gruppe | felleskvoten for småbåter | Båter under 11 m uten hjemmel. De deler én gruppekvote, og hver båt har et tak (maksimalkvoten). |
| lukket gruppe | egen kvote | Båter med hjemmel. Hver båt har sin egen kvote hele året. |
| hjemmel, deltakeradgang | kvoterett | Retten til å fiske i lukket gruppe. Den hører til båten og kan kjøpes og selges. |
| maksimalkvote | taket ditt i år | Det meste båten kan lande av arten i år, så lenge gruppekvoten ikke er fisket. |
| garantert kvote | det du har uansett | Det båten kan lande uansett, også etter at fisket på maksimalkvotene er stoppet. |
| fartøykvote | båtens kvote | Båtens egen kvote i lukket gruppe. |
| kvotefaktor | kvotens størrelse | Tallet som sier hvor stor del av gruppas kvote hjemmelen gir. |
| adgang | lov til å fiske torsk, hyse og sei for salg | At båten har lov til å fiske torsk, hyse og sei for salg. Uten adgang kan de bare være bifangst. |
| inndratt | får du ikke betalt for | Fisk over kvoten eller regelen betaler salgslaget ikke for. Du får 20 % av verdien for å føre den i land. |
| blad B | yrkesfisker | Den delen av fiskermanntallet der de med fiske som hovedyrke står. Kreves for å kjøpe en båt med hjemmel. |
| ferskfiskordningen | høsttillegget for fersk fisk | Et tillegg om høsten: en del av ukas ferske leveringer kan være torsk utenom kvoten. |
| strukturkvote | kvote slått sammen fra en annen båt | Kvoten fra en annen båt i samme gruppe, lagt til din i 20 år med 10 % avkorting. |
| høvedsmann | skipper om bord | Den som fører båten. I åpen gruppe må eieren selv være om bord. |

Ordboka merker i dag bare løpende tekst i skuffen og telefonens apper, første gang ordet står på siden; knapper, faner, overskrifter og tabellhoder merkes ikke (`ORD_SKIP`). Kjøpskortet og «hvorfor»-arket skrives som løpende tekst, så ordene i dem kan trykkes på. Dialoger og toast har ikke ordbok; om de skal få det, avgjøres i K4. Den engelske utgaven følger samme prinsipp; de engelske ordene skrives i K4.

## 5. Fasene

Hver fase er én økt. K1 må komme før K2–K4. Risikoklassene er fra `tools/ci/risiko.py`.

### K0 Hullene (T1–T4 og T7)

- **Bygger:** `regFree` ved innbytte i `buylic`; tomt rom før innbytte, med grunnen i klartekst; id-er som aldri brukes om igjen, og rydding i `mbDrop`; `freshQuota` som tar med takene som følger eieren; de tre gale tekstene, og «Neste mål» som peker på kystbåten med hjemmel.
- **Filer:** `ui/phone/14-act.js`, `ui/phone/10-fartoy.js` (lav); `core/03-simulation.js`, `core/03d-quota.js`, `core/09k-market.js` (middels).
- **Tester:** `tests/unit/quota.test.mjs`, `market2.test.mjs`, `kvotemarked.test.mjs` med nye sjekker (røde først), `quotatest.py`, `megletest.py`, `kvotemarkedtest.py`, `vesseltest.py`.
- **Ferdig når:** (1) registeret har samme antall plasser før og etter et innbytte med hjemmel mot hjemmel; (2) innbytte med fisk i rommet er grått med grunnen; (3) en båt kjøpt etter et salg har ny id og ingen arvede tall; (4) `byCod`, `nsjo` og `skag4` står etter at en hjemmel er satt på og tatt av; (5) fanen og «Neste mål» sier det `LIC_OFFERS` selger.

### K1 Handlingsrommet

- **Bygger:** `core/03l-room.js` (4.1) med ordtabellen `RM_TERMS` (4.5), `landConf` til kjernen. Ingenting nytt på skjermen.
- **Filer:** ny `src/js/core/03l-room.js`, `src/index.html` (malen), `ui/08-actions.js`, `tests/run.py` (`COVER`).
- **Tester:** ny `tests/unit/room.test.mjs`: trinnene fra faste lagringer; `rmMeters` sin inndragning er lik `landConf` for et sett trukne laster; `rmBuy` for hver kjøpsvei.
- **Ferdig når:** (1) enhetstestene er grønne og sett røde; (2) `sell()` og `landWarn` gir samme tall som før (`r4test`, `quotatest`); (3) bygget er likt på skjermen (`uishots`).

### K2 Måleren og varslene

- **Bygger:** 4.3.
- **Filer:** `ui/04-panels-instruments.js`, `ui/07-guide.js`, `ui/phone/08-home-papers-merker.js`, `ui/10c-dock.js` (roen brytes av varselet), `src/styles.css`, `ui/phone/07-patch.js` (lav); `core/05-vessels.js` (middels).
- **Tester:** `hudtest`, `r4test`, `quotatest`, `roetest`, `uishots`, `tut.py` i begge formater (statusboksen endres).
- **Måles:** at statusboksen ikke tegnes oftere enn før. Skjermbilder i 800×1280 og 1280×800 til `ask_gemini` etter malen for mobil-UX (ett kall).
- **Ferdig når:** (1) måleren står i statusboksen etter V2 og i lasten, på kaia, på sluttseddelen og på hjemskjermen; (2) varslene kommer ved 80 % og full kvote, også i oktober; (3) en båt uten kvote får «!» og ikke «✓»; (4) `tut.py` ender med `"tut": 0` i begge formater.

### K3 Kjøpet

- **Bygger:** 4.4, på verftet, hos Kystmegleren og i Kvotemarkedet; gruppa per båt i Rederi. Deles i to økter (verftet; megleren og Kvotemarkedet) om den blir for stor.
- **Filer:** `ui/phone/10-fartoy.js`, `13c-megler.js`, `04b-kvotemarked.js`, `11-rederi.js`, `14-act.js`, `src/styles.css`, `07-patch.js` (lav).
- **Tester:** ny `tests/romtest.py` (uten 3D): for hver kjøpsvei leses `rmBuy`, kjøpet gjøres, og gruppa, taket og det som er fisket, sammenlignes. Kortet skal love det kjøpet gjør. Dessuten `megletest`, `kvotemarkedtest`, `shoptest`, `fleet3test`, `uishots`.
- **Ferdig når:** (1) kortet står på alle tre kjøpsveiene og stemmer med utfallet i `romtest`; (2) selgerens del av årets kvote står før kjøpet; (3) et kjøp som tar bort adgang, spør først; (4) hver grå kjøpsknapp gir en grunn ved trykk.

### K4 Trinnene og ordene

- **Bygger:** 4.2 og 4.5: innholdet i Kvote, Regler og Båthandel etter trinn, «Mer» og «Vis alt», klartekstordene i Kvote, Båthandel, Rederi og hjemskjermen (`rmTerm`), de 13 fagordene i ordboka, dryppene (det gamle `kvote`-dryppet skrives om). Tekstene K2 og K3 bygger, bruker tabellen fra starten.
- **Filer:** `ui/phone/04-kvote.js`, `09-vaer-post-salg-redning.js`, `03-regler.js`, `10-fartoy.js`, `05-rigg-innst-admin.js`, `08-home-papers-merker.js`, `ui/05k-ordbok.js`, `ui/07c-handbook.js`, `07-patch.js` (lav).
- **Tester:** `hbtest`, `docktest`, `uishots`, `tut.py` i begge formater.
- **Ferdig når:** (1) en ny lagring ser ett kvotekort og ingen paragrafer uten å trykke «Mer»; (2) en lagring med kystbåt og strukturkvote ser alt som i dag; (3) «Vis alt» gir dagens visning på trinn 1; (4) i Kvote › Mine kvoter, Båthandel og Rederi står ingen av fagordene i 4.5 alene: klartekstordet står først, og fagordet i parentes har prikket strek og gir setningen sin ved trykk; (5) et brev fra Fiskeridirektoratet har fagordene som før, med ordbok.

### K5 Målingen

- **Bygger:** hendelsene (trinn nådd, første inndragning, trykk på måleren, åpnet «hvorfor» per kode, kjøp som tok bort adgang) i trakten i admin, og `progweek.py` fra dagens start (trebåt, 2 000 kr).
- **Filer:** `tests/progweek.py`, og admin-siden. Hvor trakten bygges, er ikke kartlagt i denne økta (`docs/systemer/tilbakemelding-og-admin.md`).
- **Ferdig når:** (1) hendelsene kan leses i admin; (2) tallene for blad B og inngangen er målt på nytt og ført inn i systemdokumentene.

## 6. Valgene (tatt 25.11.2026)

Jonas 25.11.2026: «V1A V2A V3B», og senere samme dag V3 endret til A.

**V1 Hva fases inn? Valgt: A.** Alle appene står som i dag. Innholdet i Kvote, Regler og Båthandel følger trinnet, med «Mer» og bryteren «Vis alt». (B var å skjule fanene helt til trinnet er nådd, C ingen trinn.)

**V2 Kvotemåleren på skjermen til sjøs. Valgt: A.** Den vises når den betyr noe: fra halv kvote med det som er om bord, eller når noe ville blitt inndratt. En smal søyle i statusboksen og et merke på stripa. (B var alltid synlig, C bare i telefonen, på kaia og på sluttseddelen.)

**V3 Ordene. Valgt: A** (først B, endret samme dag; Jonas' ord står i 4.5). Klartekst først, fagordet i parentes første gang, paragrafen bak «Loven bak». Fagordene lever videre i brevene, Regler-appen og ordboka. (B var fagordene som i dag med ordbok, C bare klartekst.)

## 7. Valgt uten å spørre (kan snus)

- **Kvoten stopper ikke fisket.** Måleren varsler; den stopper verken juksa eller driftsplanen (Jonas 27.10.2026).
- **Tomt rom før innbytte**, samme regel som ved flytting og salg av hjemmel (KM3, KM4). Snus ved å la kortet vise følgen i stedet.
- **Trinnet lagres ikke.** Det avledes av blad B, rederiet og flåten, så ingen lagring må endres.
- **«Neste mål» peker på kystbåten med hjemmel**, ikke på skroget alene.
- **Første tur får ingen nye steg.** Raden på sluttseddelen er alt den ser av kvoten.
- **Brev fra Fiskeridirektoratet, Kystposten, Papirer og «Loven bak» beholder fagordene** uten klartekst foran: der står de som i virkeligheten, med ordbok. Snus ved å la `rmTerm` skrive dem også der.

## 8. Antatt eller usikkert

- **Hullene i kapittel 3 er lest, ikke kjørt.** T1 og T3 er jeg sikker på etter koden; T4 og T5 trenger en test som viser dem før de rettes.
- **Kildene er ikke lest på nytt.** Planen innfører ingen regel. Klartekstordene og setningene i ordboka (4.5) skal stemme med kildene i kapittel 6 i `docs/systemer/kvoter-og-regler.md` og kontrolleres mot dem i K4.
- **Et klartekstord kan forenkle for mye.** «Egen kvote» om lukket gruppe er sant for torsk, men hyse og sei har fortsatt maksimalkvoter der; «felleskvoten for småbåter» sier ikke at båten også har et eget tak. Parentesen og ordboka skal bære resten, og ordene prøves på skjermbildene i K4.
- **T5 (åpen gruppe-båten på tur når rederiet får en hjemmel) er ikke løst her.** Å låse adgangen ved avgang ville være en ny regel i motoren, og hva som gjelder for fangst om bord når deltakeradgangen endres, er ikke sjekket mot Fiskeridirektoratet. Planen varsler før kjøpet (K3) og lar resten stå.
- **Grunnlaget er blindtestene og koden,** ikke tilbakemeldinger fra spillere: ingen nummerert tilbakemelding i `docs/` handler om kvote, inndragning eller hjemmel. Trakten i admin er ikke lest.
- **Tersklene 50 % og 80 %** er startverdier.
- **Statusboksen på 360 px** har lite plass; hvordan merket på stripa ser ut der, ses først på skjermbildene i K2 og på Jonas' telefon.
- **`ui/10f-cloud.js` er `hoy`.** Ordet «fiskermanntallet» i registreringsdialogen (friksjon 2) kan bare endres i en PR Jonas fletter. Det er ikke med i fasene.

## 9. Hva planen ikke gjør

- Endrer ingen regel, kvote, pris eller sperre i motoren (`rulesAt`, `landConf`, `licQ`, `codLimits`, `kmBuyWhy`).
- Skjuler ingen app og låser ingen handling.
- Tar ikke fagordene ut av spillet: de står i parentes, i ordboka, i brevene og bak «Loven bak».
- Lar ikke spilleren velge hvilken båt som er i åpen gruppe; Rederi viser bare hvilken det er.
- Rører ikke databasen, `supabase/`, lagringsformatet eller butikken.
- Legger ikke inn noe som selges, og ingen tidspress knyttet til kjøp.

## Status

- 25.11.2026: planen skrevet i Jonas' økt (grenen `ccr-e101e6f0-y7fg6x`).
- 25.11.2026: valgene tatt («V1A V2A V3B»), og V3 endret til A samme dag (4.5). 4.1–4.5, K1 og K4 følger V3 A. K0–K5 er steg 148–153 i `docs/planer/koen.md`, startmeldingen for K0 står i `docs/planer/start/148.md`. K0 venter på «kjør på»; Jonas ba om gjennomgang før noe bygges.
- 25.11.2026: «Kjør på». **K0 bygd** (steg 148): T1–T4 og T7 rettet, hver med en test sett rød først (`tests/unit/tilstand.test.mjs`, seks sjekker i `quotatest`). Den uavhengige kontrollen fant åtte ting; rettet: samme hjemmelslengde sender verken `reg_free` eller `reg_take`, saldoen følger ikke med ved innbytte, testen i `COVER`, systemdokumentet. Nytt felt i lagringen: `S.vseq` (venter på Jonas' ja). T5 og T6 står (backloggen).
- 25.11.2026: «Start 149». **K1 bygd** (steg 149): `core/03l-room.js` med `rmStage`, `rmMeters`, `rmNow`, `rmBuy`, `rmWhy`, `rmTerm` og `RM_TERMS`, og `landConf` i kjernen. Den uavhengige kontrollen fant at `rmBuy` avvek fra kjøpene i fire tilfeller, at målerne sa feil for fartøy uten torsk, uten eieren om bord og under ferskfiskordningen, og at `rmWhy` manglet ord; alt rettet, testen fra 59 til 76 sjekker. Avvik fra planen: trinnet kan falle fra 3 til 2 i ett tilfelle, og `rmOpenLimit` gjentar lengdegruppene (5.29c i systemdokumentet).
- 25.11.2026: «Kjør på med neste steg». **K2 bygd** (steg 150): måleren i statusboksen og merket på stripa (V2 A), `rmWarn` i stedet for logglinja (T6 lukket), Regler-linja med gruppa, kaia, lasten, sluttseddelen og hjemskjermen. Den uavhengige kontrollen fant ti ting (blant dem «Torskkvoten», merket som skjulte neste hendelse, og torsk fra takene sør for 62° N regnet som full kvote); Gemini fant fire (motsigelsen mellom «✓» og full kvote, kaias linje, pila på stripa, den dempede raden på sluttseddelen). Alt rettet. Står: trykkflaten på raden er rundt 30 px.
- 25.11.2026: «Start neste steg». **K3 pågår** (steg 151): kortet «Dette endrer seg» på alle tre kjøpsveiene, spørsmålet før et kjøp som tar kvoten, `whyBox` på verftet og for meglerens «kan ikke kjøpe», gruppa i Rederi. Avvik fra planen: grunnen står åpen under knappen, ikke ved trykk. Den uavhengige kontrollen og Gemini (ett kall) er tatt; det som står igjen, står i 5.29c og i køen.
- 25.11.2026: «Gjør det du mener blir mest riktig. Kjør på.» **K3 ferdig** (steg 151): grunnen står åpen under knappen; Kvotemarkedets og meglerens grunner bruker `rmWhy` sine setninger; `romtest` går gjennom oppgjøret; megleren, Kvotemarkedet, Rederi og 390 px er sett; `why_shown` sendes.
- 25.11.2026: «Kjør på». **K4 bygd** (steg 152): `stShow` og «Mer» i Kvote, Regler og Båthandel, «Vis alt», klartekstordene i Mine kvoter, Båthandel, Rederi og hjemskjermen, tolv fagord i ordboka, fire nye tips. Avvik: «adgang» er ikke i ordboka (ordet brukes om annet), tipset «første gang Med hjemmel åpnes» er ikke laget, og Kvotemarkedet og fanen Felleskvoten har fagordene som før. Gemini-kallet så bare den erfarne spillerens side (testen hadde lukket telefonen i de tre andre bildene).
- 25.11.2026: «kjør på med neste steg». **K5 bygd** (steg 153): `admin_regler` og kortet i admin › Trakt, hendelsene `land_conf` og `bladb`, og `progweek` fra dagens start (blad B etter 14–15 turer, inngangen etter 19: «én uke» holder ikke lenger). Planen er bygd. Det neste er ikke et steg: at Jonas fletter grenen, at migreringen kjøres, og at trakten leses to ekte uker etter slippet.
- 26.11.2026: Jonas om de tre ja/nei-valgene: «Ta det du mener er mest riktig på Ja/nei-valgene, så kjører vi på.» Valgt: `S.vseq` står (et rent tillegg i lagringen); trinnet lagres ikke på nytt (sidene husker alt det høyeste trinnet i `S.settings.rmMax`); § 29-hullet ved innbytte med beholdt hjemmel fra en båt på 11 m eller mer er tettet i `buy`, med test sett rød først (`romtest`).
