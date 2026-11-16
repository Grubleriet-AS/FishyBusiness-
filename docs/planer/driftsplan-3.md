# Driftsplan 3: den enkle planen (plan 16.11.2026)

Status: **klarsignal 16.11.2026** (Jonas: «V1: A, V2: A. Kjør på.»). Stegene er 129–133 i køen, ranking-systemet 134.

## 1. Hva Jonas ba om

Jonas 16.11.2026: «vi må gjøre en total overhaul av hvordan driftsplanen fungerer», og:

> «Jeg tenker vi skal gjøre den så enkel som overhodet mulig … Spilleren [får] 2 enkle valg: sted og redskap. På felt eller fiskeplass setter spilleren ut en ring i området driftsplanen skal operere. På redskap velger de fiskeredskap og agn som skal brukes, kun 1 type, pluss hvilket agn eller sluktype som skal brukes på fiskeredskapet. Kun fiskeredskap som er tilgjengelig ombord skal vises som et alternativ. Deretter skal driftsplanen automatisk lage den planen som passer best for båten og mannskap. Driftsplanen skal kunne lages og startes fra hvor som helst, og alt skal fungere på automatikk så snart den er startet.»

Svarene samme dag:

- **Plassene i ringen:** «Jeg tenker spillerens karakter søker rundt i området med ekkoloddet etter fisken, og eventuelt flytter seg når fangsten blir dårlig.» Bedre ekkolodd og skipperens erfaring gir et bedre søk: «Ja, begge teller».
- **Juksa i tillegg:** «Bare ett redskap».
- **Planene spillerne har:** «Den slåes av og melding gies. Båten kjøres til nærmeste fiskemottak på automatikk, så den ikke driver avgårde.» Og om fangsten og redskapet: «Trekk først, så lever».
- **Ringen:** «Fast per redskap».
- **Spillerens egen utvikling** (ferdigheter som vokser som mannskapets): «Eget steg etterpå».

## 2. Hva som finnes i dag

Driftsplan 2 (`docs/systemer/driftsplan.md`). Planen er spillerens svar på sju rader (`S.ops` v4: `home`, `anchor`, `rig`, `jig`, `places`, `wx`, `dep`, `rhythm`, `days`, `land`), og alt annet regnes fra dem:

- `core/06g-plan2.js`: modellen, `plan2New`, `plan2Ops` (gamle planer av med melding), `plan2State`, **`planDay`** (dagen som steg med klokkeslett), `planDayAuto` (autolina), `plan2Check`.
- `core/06h-plan2-engine.js`: motoren. `plan2Make` lager leiene, `plan2Step` går hvert minutt, `plan2Trip` følger dagen, `plan2Sea` tar det som skjer på sjøen, og ventingen, været, lyet, pausen og «Hent redskapet» (`o.fetch`) ligger her. Den har ingenting asynkront mens den går, så `catchUp` spiller den likt med spillet lukket.
- `core/06i-plan2-sno.js`: snøkrabbefartøyets sløyfe.
- `core/06d-plan-felles.js`: leiene (`drLeg`), hvilen, reglene på plassene (`drRulesWhy`) og fangstmerkene (`planMark`).
- `ui/05d-plan2.js` (`PLAN2UI`): siden med radene. `ui/03g-planmap.js` (`PLANMAP`): nålene i kartplotteren.
- **Ekkoloddet** (`core/12-heat.js`, `heatValue`; `docs/systemer/baater.md`): `basic` dekker 1 nm i diameter med ruter på 100 m og fire trinn. `chirp` dekker 1,5 nm med ruter på 60 m og artsvalg. `sonar` dekker 3 nm og viser hvor stimene trekker. Alle leser `density` i fiskemodellen.
- **Agnet** (`BAITS` i `core/10-gear.js`): makrell, krabbe, reke, sei, krill, sild og lodde, blekksprut og saury, med virkning per art (`baitF`). **Juksa:** markkroker og pilk, eller kveitepilk (`jigKind`, `jigSets`). **Linetypen** er hyseline eller bankline. Garn har ikke agn.
- **Riggen** byttes med en gang (`rigSet`, `rigBlock`): det trengs haleren og at ingen redskapsjobb pågår, ikke en kai. «Start fra hvor som helst» krever derfor ingen tur til land for å rigge om.
- **Mannskapets erfaring** (`c.attr.erf`, 1–5, `core/04-crew.js`) vokser med timene på sjøen. Den som fører båten når du ikke er om bord, er `actingSkipper()` (`13-work.js`). Du har ingen ferdigheter, bare fartstiden (`09e-fartstid.js`).

**Kjernen i planen:** motoren beholdes. Den trenger svarene, og i dag kommer de fra spilleren. I Driftsplan 3 kommer de fra en ny funksjon som regner dem ut fra ringen, redskapet, båten og mannskapet. Det som kastes, er radene, nålene og det spilleren må fylle ut.

## 3. Hvordan den nye planen virker

**Spilleren velger to ting:**

1. **Sted:** et trykk i kartplotteren setter en ring. Størrelsen er fast per redskap (se 6, antatt). Ringen avvises med grunnen når den ikke har nok lovlig sjø med dybde for redskapet, ligger utenfor rekkevidden for drivstoffet, eller er stengt etter reglene.
2. **Redskap:** bare det som er om bord og som båten kan rigges for (`rigBlock`). Under det velges agnet (line og teiner) eller utstyret (juksa: markkroker eller kveitepilk). For line også linetypen, når båten har begge. For garn er det ingenting under. Ett redskap. Ingen juksa i tillegg.

Så **Start**. Det fungerer fra hvor som helst: i havn, på sjøen, eller når du er på en annen båt.

**Planen regner ut resten** (`plan3Derive`, ny). Svarene blir et v4-objekt som motoren kjører som før:

| Det spilleren valgte i Driftsplan 2 | Det planen velger selv |
|---|---|
| Hjem | Nærmeste sted ved ringen der mannskapet sover godt: køya om båten har køyer, ellers en rorbu, eller naustet om det er nærmest. Prisen teller med. |
| Plasser, antall | Søket i ringen (under). Alt redskapet om bord brukes, fordelt på plassene søket fant. |
| Ståtid | Standarden per redskap (`DRP2.soakDef`). |
| Levering | Nærmeste mottak som tar båten (`p2PlantOk`), når lasten er full eller ferskheten krever det. Med teiner hver tur. |
| Vær | Båtens grenser med «Vanlig» (`DRP2.hav.wx` for havbåtene). |
| Rytme | Køyer og fire om bord gir døgndrift. Køyer og færre gir flerdøgnstur. Ellers dagdrift. Havbåtene har bare døgndrift. |
| Avgang | Kl. 05, eller med en gang når planen startes. |
| Skipper og styrmann | Mangler de, utnevner planen de to med mest erfaring om bord. Er det for få folk, sier den hva som mangler, og går ikke. |

Riggen settes når planen startes (`rigSet`).

**Søket med ekkoloddet** (nytt steg i dagen, `sok`):

- Båten går et søkemønster i ringen i marsjfart og leser ekkoloddet underveis: ruter, rekkevidde og artsvalg etter utstyret (`basic`, `chirp`, `sonar`).
- Den setter redskapet der den så mest av artene redskapet og agnet tar.
- **Den som fører båten, leser bildet.** Er du om bord, er det deg. Ellers er det skipperen. Erfaringen hans (`erf`) bestemmer hvor mye bildet bommer: med lav erfaring blandes tallene med støy, så han velger dårligere ruter. Du har en fast verdi til eget steg om utviklingen kommer (se 4).
- **Ekkoloddet viser fisken, ikke hva redskapet tar.** Line, garn og teiner står i timer eller døgn, og fisken flytter seg. Et godt søk er en god sjanse, ikke en garanti.
- Søket koster tid og diesel. Det skjer når planen starter og når fangsten faller.
- **Flytter seg når fangsten faller:** gir en trekking under en grense (antatt halvparten av snittet for feltets første trekk), søker båten igjen i ringen før redskapet settes ut på nytt. Søket går aldri utenfor ringen.
- Mens redskapet står, ligger båten ved det når ståtida er kort (line), og går ellers dit mannskapet hviler. Planen velger etter ståtida og reiseveien.

**Siden** (`ui/05d-plan2.js` skrives om, eller en ny `05e-plan3.js`):

- Øverst: Sted (ringen, med navnet på stedet og avstanden) og Redskap (med agnet).
- Så Start og Pause, og «Nå».
- Så dagen slik planen la den, med det planen valgte: hjem, levering, rytme og hvem som fører.
- Statistikken som før, og Slett.
- Ingen rader, ingen tall å fylle ut.

**Pause og «Hent redskapet»** står som i Driftsplan 2, fordi spilleren trenger dem.

**Gamle planer** (v4 og eldre) slås av med en melding når spillet åpnes (`plan2Ops`). Båten går så på automatikk: den trekker alt den har i sjøen, går til nærmeste fiskemottak og leverer, og ligger der (`o.fetch` finnes alt). Bare en båt med noen om bord som kan føre den (du, eller en skipper), kan gå. En båt uten folk blir liggende der den er, til kai eller til ankers, og meldingen sier det. Den går ikke for egen maskin uten noen ved roret, jf. siste commit på arbeidsgrenen. Pengene, mannskapet, fangsten og redskapet røres ikke av byttet.

**Havbåtene:** autolineren og snøkrabbefartøyet får ringen som felt, og sløyfene deres (`planDayAuto`, `planDaySno`) går som før. Lenkene legges i ringen etter søket. Trålen (steg 32c) får ringen som slepefelt når den bygges, og er ikke med her.

## 4. Fasene

Hver fase er én økt.

| Fase | Hva den bygger | Filer | Tester |
|---|---|---|---|
| **DP3-1 Modellen og «finn planen»** | `S.ops` v5: `{v:5, on, ring:{x, y, r}, rig, bait, lk, tackle}` og det planen avledet. `plan3Derive` fyller v4-svarene (hjem, levering, vær, rytme, avgang, ståtid, roller) fra ringen, redskapet, båten og mannskapet. Ringen prøves (`plan3RingWhy`). Gamle planer av med melding, med trekking, levering og liggende ved mottaket. | `core/06g-plan2.js`, ny `core/06k-plan3.js` (inn i malen etter `06i`), `06h-plan2-engine.js` | `tests/unit/plan3.test.mjs` (ny), `plan2.test.mjs`, `havplan.test.mjs`, `driftsplan2test` (lagringene, S12) |
| **DP3-2 Søket** | Steget `sok` i dagen og motoren: mønsteret i ringen, ekkoloddets trinn, lesingen med erfaringen som støy, valget av plassene, nytt søk når fangsten faller. Like med spillet lukket. | `06k-plan3.js`, `06g-plan2.js` (`planDay`), `06h-plan2-engine.js` (`plan2Trip`, `plan2Sea`), `12-heat.js` (bare lesing) | `plan3.test.mjs` (søket med frø, støyen etter erfaring, flyttingen), `driftsplan2test` (åpent mot lukket, S9) |
| **DP3-3 Siden og ringen i kartet** | Siden med to valg, Start, «Nå» og dagen. Ringen i kartplotteren, der et trykk setter den og et trykk til flytter den. Det gamle (radene, nålene, kortet) tas ut. | `ui/05d-plan2.js` (eller ny `05e-plan3.js`), `ui/03g-planmap.js`, `styles.css`, `phone/06-render.js`, `phone/14-act.js` | `driftsplan2ui` og `driftsplan2map` skrives om, `driftsplan2gui` skrives om (den er kronisk rød i dag fordi den er eldre enn UI 2). Begge formater. |
| **DP3-4 Havbåtene og kysten** | Autolineren og snøkrabbefartøyet med ringen. Stikkprøvene sør, midt og nord (Bergen, Bodø, Hammerfest) med hele kysten. | `06k-plan3.js`, `06i-plan2-sno.js`, `06g-plan2.js` | `havplantest`, `driftsplan2kyst` (skrives om), `havplan.test.mjs` |
| **DP3-5 Ryddingen** | Det Driftsplan 2 ikke lenger bruker (radene, `PLAN2UI`s skjema, `plan2Copy`), dokumentet skrevet om, patchnotes, Onboarding og Håndboka. | de over, `ui/phone/07-patch.js`, `ui/07c-handbook.js`, `docs/systemer/driftsplan.md` | `run.py changed` |

**Etter dette, eget steg:** spillerens egen utvikling. Du får de samme egenskapene og ferdighetene som mannskapet, og de vokser med det du faktisk gjør, så de formes etter redskapene du bruker. Jonas 16.11.2026: «siden litt av storyen i spillet er at man arver en båt, så må man starte ganske lavt på ferdighetene. Man er tross alt helt fersk på havet. På den måten vil også egenskapene forme seg etter hva spilleren faktisk bruker slags redskaper». Du starter lavt, men ikke på null (`docs/engasjement.md`: nye ting starter aldri på null), og de første stegene kommer raskt. Ferdighetene kan aldri kjøpes. Søket i DP3-2 leser da din erfaring i stedet for den faste verdien. Til da er den faste verdien lav, som for en fersk fisker. Det får sin egen plan.

**Ranking-systemet (steg 134, Jonas 16.11.2026):** «Jeg tenker ferdighetssystemet må kobles på og balanseres med fartstidsystemet, slik at det blir et fullverdig ranking system med lvl, xp, og ferdigheter.» Fartstida (`core/09e-fartstid.js`: poeng på en kurve, år 0–40, stjerner etter) blir nivået og poengene xp-en, og ferdighetene vokser ved siden av med det spilleren gjør. I dag er fartstida «status only, it opens nothing»; det endres. Steget får sin egen plan med `/planlegg` før noe bygges, fordi det rører engasjementsreglene (aldri til salgs, starter ikke på null, topplista).

**Utrullingen:** DP3-1 og DP3-2 endrer motoren og lagringen, men siden kommer i DP3-3. De bygges derfor på samme gren og rulles ut til testutgaven først når DP3-3 er ferdig, så testutgaven aldri har den nye planen med den gamle siden.

Alle stegene går under lanseringslinja i køen, fordi porten er frossen.

## 5. Valgene

Jonas 16.11.2026: «V1: A», «V2: A».

**V1 Hvor båten ligger mens redskapet står**
- **A (valgt):** Planen velger etter ståtida. Med line ligger den ved redskapet. Med garn og teiner går den hjem og hviler når reiseveien er kortere enn ståtida, ellers ligger den ved feltet. Det er slik Driftsplan 2 gjør nå, uten juksa.
- B: Alltid hjem mellom setting og trekking.

**V2 Hjem**
- **A (valgt):** Planen velger hjemmet selv (tabellen i 3). Det holder valgene på to.
- B: Spilleren kan bytte hjemmet etterpå, i en liten «Endre»-lenke under dagen. Det er ikke et tredje valg før start.

## 6. Antatt og usikkert

- **Ringens størrelse per redskap** (startverdier til spilltesting): juksa 1 nm, line 2 nm, garn 2 nm, teiner 1,5 nm, autoline og snøkrabbe 8 nm, alle i diameter. Line på 30 stamper bankline er 13,5 km, så en lang lenke får ikke plass i en ring på 2 nm. Lenka må da ligge med midten i ringen, eller ringen må vokse med lenka. Det avgjøres i DP3-2 med målinger.
- **Hvor mye erfaringen betyr for søket.** Støyen med erfaring 1 mot 5 settes slik at en god skipper får merkbart mer, men ikke mer enn spilleren som søker selv med samme ekkolodd. Det måles i DP3-2 mot fangsten.
- **Grensen for «fangsten faller»** (halvparten av snittet for feltets første trekk) er et anslag.
- **Søket koster diesel og tid.** Hvor lenge det varer, avhenger av ringen og farten, cirka 20–40 min. Det er ikke målt.
- **Gamle planer:** en båt uten noen om bord som kan føre den, kan ikke gå til mottaket. Den blir liggende. Hvor mange lagringer dette gjelder, er ikke sett. Det kan leses i admin før slippet.
- Lagringsporten (P2) må holde. Byttet fra v4 til v5 er det første slippet som endrer `S.ops`.

## 7. Hva planen ikke gjør

- Ingen nye redskap (trål, not og snurrevad kommer med havsteget, og trålen bruker ringen).
- Ingen juksa i tillegg til et passivt redskap.
- Ingen forventet fangst vises (Jonas 09.10.2026). Dagen viser hva planen gjør, ikke hva den får.
- Ingen kjøp fra planen. Agn kjøpes på mottaket som i dag (`plan2Bait`), og det er et handelssted (`docs/handelssteder.md`).
- Ingen endring i ekkoloddet eller varmekartet for spilleren selv.
- Spillerens utvikling, som er eget steg.

## Status

- 16.11.2026: planen skrevet (Jonas' økt, grenen `claude/blissful-cannon-ctb8e9`). Klarsignal og V1 A, V2 A samme dag. DP3-1 pågår i samme økt.
