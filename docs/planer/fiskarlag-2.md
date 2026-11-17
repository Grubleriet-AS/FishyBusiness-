# Fiskarlag 2: egne lag og oppdrag som passer laget

Plan 17.11.2026. Valgene tatt samme dag (V1–V4 A); venter på «kjør på».

## Hva Jonas ba om

- 30.10.2026: «Ja, dette med fiskarlag må vi satse fullt ut på. Det kan vi et av de viktigste sosiale elementene i spillet.»
- 17.11.2026: Fiskarlaget skal være det første som bygges videre på, «der flere bruker skal kunne gå sammen for å løse oppgaver, og forhåpentligvis skape litt intern og ekstern konkurranse».
- 17.11.2026, valg: **bare egne lag med kode** (ikke automatiske lag per strekning).
- 17.11.2026, om oppgavene: «Oppdragene må være kontekstuelle og tilpasset hvor brukerne i fiskarlaget er, hva de har igjen av kvote, hva de eventuelt kan fiske fritt og slike ting tror jeg. Kom gjerne med forslag til hvordan denne funksjonen kan bli så bra som mulig.»

Grunnlaget: `docs/research/spillermonster-2026-11-17.md`. Fiskarlaget per havn har 3 medlemmer på 3 havner, 0 nådde mål og 1 lapp siden 05.10; 15 spillere med hjemhavn er spredt på 13 havner; puben er åpnet av 4–10 nye; ingen åpnet topplistene på lanseringsdagen.

## Hva som finnes i dag

- **Laget per havn:** `lag_members` (én rad per spiller, `port`), `lag_join(port, w)`, `lag_get(w, x, y)` med ukemålet 1 500 kg per medlem som har levert, `lag_hits`, `lag_posts`/`lag_post`/`lag_board` (faste linjer), premien 3 000 kr (`S.pubSoc.lagW`). Klienten: `ui/09c-pubsoc.js` (`lagCard`, `lagBoardHtml`, `lagMine`), puben `ui/09b-pub.js`, Sesong-appen `ui/06d-season-folk.js`, merket `lagw` i `core/09f-merker.js`, avisa `pressStory` i `core/09h-press.js`. Migreringene `20261009120000_pub.sql`, `20261030140000_lag_goal.sql`, `20261030160000_lag_board.sql`. Test `lagtest`, `sqltest`.
- **Koder:** vennekodene (`friend_codes`, seks tegn `^[A-HJ-NP-Z2-9]{6}$`, `20261009180000_friends.sql`).
- **Det som gjør oppdrag treffsikre** (`core/09g-turer.js`, 4.26 i `docs/systemer/oppdrag-og-kystposten.md`): `turRoom` (kvoterommet per art: maksimal- og garantert kvote, fartøykvoten, bifangst uten adgang, aldri over 80 %), `turSpOk` (redskap og hender), `turCan` (drivstoff, eksponering for åpne båter, varselet), `heatSample` (hvor fisken står), balanseregelen `turCap` (en time på oppdrag betaler aldri mer enn båtens fisketime × faktor, taket 1,5).
- **Det som er fritt:** hyse under 11 m uten grense, hyse og sei uten maksimalkvote i åpen gruppe, «fritt fiske» om høsten når gruppekvoten ikke tas, lange og brosme (5.5 i `docs/systemer/kvoter-og-regler.md`, `core/03d-quota.js`).
- **Landingene på serveren:** `landings` (art, kg, mottak, landsdel, spilltime `gh`), med jukse-merkene (`cheat_on`) som alt holder merkede kontoer ute av lagets mål.

## Hvordan det blir så bra som mulig

1. **Laget er folk du har valgt.** Hvem som helst starter et lag og får en kode og en lenke (`detstorebla.no/?lag=K7M2QX`) som deles med telefonens delemeny. Lenken er også veien inn for nye spillere: den som åpner den, lander i spillet med laget ventende etter første tur. Det er den eneste vekstkroken spillet ikke har i dag.
2. **Laget heter etter et sted,** valgt fra stedsnavnene i spillet (havner, felt, fyr), aldri fri tekst. «Laget fra Hekkingen», «Gryllefjord-laget». To lag kan ha samme sted; koden skiller dem.
3. **Oppdraget lages av laget, ikke for et gjennomsnitt.** Hver medlems spill sender et lite sammendrag når det endres (art for art: kilo igjen å lande innenfor kvoten, eller «fritt»; redskapet; båtklassen; landsdel og sist brukte mottak). Serveren lager tre forslag for uka av det laget faktisk kan, og laget velger ett. Hvert medlem ser i tillegg **sin del**: hva *din* båt kan bidra med, og hvor fisken står nærmest deg, regnet i ditt eget spill med de samme funksjonene som tavla bruker.
4. **Oppdragene følger kysten og kalenderen.** Skrei om vinteren i nord, sei og hyse når torskekvoten er tom, fritt fiske når det åpner, krabbe og blåkveite for dem som har redskapet. Er torskekvoten tom for alle, foreslås aldri torsk.
5. **Ingen blir dratt ned.** Målet regnes av de medlemmene som har vært i spillet siste to spilluker; den som er borte, teller ikke i målet og mister ingenting. Alt teller bare oppover.
6. **Konkurransen er rettferdig mellom store og små lag:** lag mot lag måles i hvor stor del av eget mål laget nådde, ikke i tonn. Inne i laget vises de beste bidragene i uka, aldri en sisteplass.
7. **Det vises der spilleren er:** linja etter hvert salg («Laget: 3,2 av 8 t sei, din del 640 kg»), en stripe i kartplotteren mens oppdraget pågår, lagets kort i Sesong-appen, og Kystposten søndag. Puben beholder tavla.

### Typene lagsoppdrag (forslagene serveren kan lage)

| Type | Eksempel | Når den kan foreslås |
|---|---|---|
| Felles levering | «6 t sei til mottakene i Vesterålen innen søndag» | Arten har rom hos minst halvparten av de aktive, og sesongen er inne |
| Bygdas bestilling | «Mottaket i Myre trenger 2 t hyse til fredag, 15 % over markedsprisen» | Et mottak flere medlemmer har levert til de siste to ukene |
| Fritt fiske | «Fritt fiske på torsk er åpnet: laget tar 4 t før det stenges» | Bare når regelmotoren sier det er fritt |
| Mangfold | «Lever fem ulike arter som lag denne uka» | Alltid; passer lag med ulike båter og redskap |
| Leting | «Finn seien: tre fangstmerker over 200 kg/t delt i laget» | Bygger på delte fangstmerker (`shared_marks`, `scope 'l'`) |
| Hjelp | «Et slep innen laget» som tillegg, aldri som hele målet | Slepet mellom spillere finnes (`ptow`) |

Målet: summen av hva de aktive medlemmene har rom for, ganger en andel (startverdi 40 %), høyst forrige ukes faktiske landing for arten × 1,3, minst 300 kg per aktivt medlem. Startverdier som justeres i spilltesting.

## Fasene (én økt hver)

**FL1. Lagene med kode.** Tabellen `lags` (id, kode, sted, grunnlegger, opprettet), `lag_members` får `lag_id`; funksjonene `lag_create(place)`, `lag_join_code(code)`, `lag_leave()`, `lag_get` på lag i stedet for havn (målet, tavla og `lag_hits` flyttes med). Høyst N medlemmer (valg V1). Gjester kan ikke bli med; lenken til en gjest gir «Registrer deg for å bli med i laget» og husker koden til etter registreringen. Klienten: lagets side (i Sesong-appen og puben), «Start et lag», «Bli med med kode», delingen med `navigator.share`, lenken `?lag=` i `ui/11-boot.js`. Spillere som er med i et havnelag i dag, får beskjed og blir stående uten lag (valg V4). Hendelser `lag_create`, `lag_join`, `lag_share`, `lag_link_open`. Tester: `lagtest` (falsk database), `sqltest` (koden, taket, gjesten, at en spiller er i ett lag), enhetstest av lenken. Migreringen kjøres først på testprosjektet av Jonas.

**FL2. Kapasiteten.** `lagCap()` i en ny `core/09p-lagcap.js`: per art kilo igjen (`turRoom`) eller «fritt», redskapet (`turSpOk`), båtklassen fra `VESSELS`-feltene (ikke navnet), landsdel, mottakene brukt siste to uker. Sendes med `lag_cap_put` når det endres, høyst én gang per spilltime. Serveren tar bare imot tall innenfor grensene og kutter ved 60 t per art (som `world_agg_get`). Enhetstester av `lagCap` på tre båter og tre steder (sør, midt, nord).

**FL3. Lagsoppdraget.** `lag_week_offer(w)` på serveren lager tre forslag fra kapasiteten og landingene (typene over); medlemmene stemmer innen første spilldøgn, ellers velges det første (valg V3). Framdriften regnes fra `landings` (art, mottak eller landsdel, uka). «Din del» regnes i klienten fra `lagCap` og `heatSample`. Belønningen etter valg V2 og balanseregelen, betalt én gang per medlem som bidro. Avisa (type `lag`), meldingen til dem som bidro, hendelsen `lag_goal_hit`. Tester: `sqltest` (forslagene på tre falske lag: tom torskekvote, fritt fiske, blandet flåte), `lagtest`, enhetstest av balansen.

**FL4. Konkurransen og stedene den vises.** Lag mot lag i prosent av eget mål (`lag_top(w)`, landsdel og hele kysten), ukas tre beste bidrag inne i laget, linja etter salget, stripen i kartplotteren, Kystposten søndag («Ukas fiskarlag»), merket for uker med nådd mål. UI-et ses i begge formater. Tester: `lagtest`, `posttest`, skjermbilder.

**FL5. Målingen.** Trakten i admin-dashbordet: laget opprettet → delt → noen ble med via lenken → første lagsoppdrag nådd → laget aktivt uka etter. Mål før neste runde vurderes (engasjementsregelen).

Rekkefølgen er FL1 → FL2 → FL3 → FL4 → FL5. FL1 alene gir verdi (lenken og laget), FL3 er der oppgavene kommer.

## Valgene

- **V1. Hvor mange i et lag?** A: 2–12 (anbefalt; stort nok for et mål med folk som er borte, lite nok til at alle kjenner hverandre). B: 2–6. C: 2–20.
- **V2. Belønningen for nådd lagsoppdrag.** A: kroner til hvert medlem som bidro, etter balanseregelen (som bestillingene, 0,5 × fisketimen i tillegg til fisken), pluss merket og avisa (anbefalt; fisken er fortsatt hovedinntekten). B: bare merket, avisa og lagets vimpel (kosmetikk). C: A pluss vimpelen når laget har nådd målet fire uker.
- **V3. Hvem velger ukas oppdrag?** A: serveren lager tre, medlemmene stemmer, det første velges om ingen stemmer innen et spilldøgn (anbefalt; ingen venter på én person). B: serveren velger alene. C: grunnleggeren velger.
- **V4. Havnelagene som finnes.** A: tas bort, de tre medlemmene får en melding om å starte eller bli med i et lag (anbefalt; tre spillere, ingen nådde mål). B: hvert havnelag blir et eget lag med kode, med medlemmene i.

## Det som er antatt eller usikkert

- **Kapasiteten kommer fra klienten.** Serveren kan ikke regne kvoterommet selv (kvotene og bestanden er per lagring). En jukser kan blåse opp eget rom og dermed målet; det gjør målet vanskeligere, ikke lettere, og taket på 60 t holder det. Landingene er like sårbare som i dag og dekkes av jukse-merkene.
- **Andelen 40 %, minstemålet 300 kg og taket × 1,3** er startverdier uten måling bak. FL5 viser om målene nås.
- **Om spillerne deler koder** vet vi ikke. 3 vennskap siden oktober tyder på at det må være lett og belønnet å dele, og at laget må gi noe til den som er alene i laget sitt de første dagene (laget kan ha ett medlem og likevel få et oppdrag tilpasset én båt).
- **Lenken inn** (`?lag=`) krever at registreringen husker koden gjennom innloggingen; det må testes på iPhone (to av tre spillere).

## Hva planen ikke gjør

- Ingen fri tekst, ingen chat og ingen VHF-kanal (A1 i `docs/forslag.md` er egen sak).
- Ingen automatiske lag per havn eller strekning (Jonas' valg 17.11.2026).
- Ingen ekte penger, ingen haill og ingen sponsing knyttet til lagene.
- Ingen straff for fravær og ingen push om andres fangst (`docs/push-plan.md`: push bare om egen båt og eget redskap).
- Lagets sjøhus og flagg på båtene (B3 i `docs/forslag.md`) er Malerverkstedet og ikke her.

## Status

17.11.2026: planen skrevet. Jonas valgte samme dag V1 A (2–12), V2 A (kroner etter balanseregelen, merket og avisa), V3 A (medlemmene stemmer, det første velges om ingen stemmer innen et spilldøgn), V4 A (havnelagene tas bort med melding). Venter på «kjør på» for FL1.
