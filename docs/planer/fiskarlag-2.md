# Fiskarlag 2: egne lag og oppdrag som passer laget

Plan 17.11.2026, skrevet om samme dag etter Jonas' ønske om ekte gildemekanikk. Valgene er tatt (under); venter på «kjør på» for FL1.

## Hva Jonas ba om

- 30.10.2026: «Ja, dette med fiskarlag må vi satse fullt ut på. Det kan vi et av de viktigste sosiale elementene i spillet.»
- 17.11.2026: Fiskarlaget skal være det første som bygges videre på, «der flere bruker skal kunne gå sammen for å løse oppgaver, og forhåpentligvis skape litt intern og ekstern konkurranse».
- 17.11.2026, valg: **bare egne lag med kode** (ikke automatiske lag per strekning).
- 17.11.2026, om oppgavene: «Oppdragene må være kontekstuelle og tilpasset hvor brukerne i fiskarlaget er, hva de har igjen av kvote, hva de eventuelt kan fiske fritt og slike ting tror jeg. Kom gjerne med forslag til hvordan denne funksjonen kan bli så bra som mulig.»
- 17.11.2026: «Burde det bli en egen app?» Så: «det er svært viktig at ikke dette bare blir en tom skall-funksjon. Den må ha ekte dybde og verdi for spillerne, skape samhold og sånt. Jeg tenker man må kunne sette navn på fiskarlaget.»
- 17.11.2026: «Jeg tenker vi må bruke skikkelige guild-mechanics som er brukt suksessfullt i andre spill» (chat, roller, regler, donasjoner og hjelp, gildebank, bonuser, raid, felles oppgaver, gildekrig, territorium, rankinglister).
- 17.11.2026, valgene: **fri chat i laget (alle spillere er over 13 år)**; **«fiskarlaget kun eksisterer i fiskarlag-appen, samt bordet på puben»**; **lagsligaen** er den første konkurransen mellom lagene.

Grunnlaget: `docs/research/spillermonster-2026-11-17.md`. Fiskarlaget per havn har 3 medlemmer på 3 havner, 0 nådde mål og 1 lapp siden 05.10; 15 spillere med hjemhavn er spredt på 13 havner; puben er åpnet av 4–10 nye; ingen åpnet topplistene på lanseringsdagen.

## Hva som finnes i dag

- **Laget per havn:** `lag_members` (én rad per spiller, `port`), `lag_join(port, w)`, `lag_get(w, x, y)` med ukemålet 1 500 kg per medlem som har levert, `lag_hits`, `lag_posts`/`lag_post`/`lag_board` (faste linjer), premien 3 000 kr (`S.pubSoc.lagW`). Klienten: `ui/09c-pubsoc.js` (`lagCard`, `lagBoardHtml`, `lagMine`), puben `ui/09b-pub.js`, Sesong-appen `ui/06d-season-folk.js`, merket `lagw` i `core/09f-merker.js`, avisa `pressStory` i `core/09h-press.js`. Migreringene `20261009120000_pub.sql`, `20261030140000_lag_goal.sql`, `20261030160000_lag_board.sql`. Test `lagtest`, `sqltest`.
- **Koder:** vennekodene (`friend_codes`, seks tegn `^[A-HJ-NP-Z2-9]{6}$`, `20261009180000_friends.sql`).
- **Det som gjør oppdrag treffsikre** (`core/09g-turer.js`, 4.26 i `docs/systemer/oppdrag-og-kystposten.md`): `turRoom` (kvoterommet per art: maksimal- og garantert kvote, fartøykvoten, bifangst uten adgang, aldri over 80 %), `turSpOk` (redskap og hender), `turCan` (drivstoff, eksponering for åpne båter, varselet), `heatSample` (hvor fisken står), balanseregelen `turCap` (en time på oppdrag betaler aldri mer enn båtens fisketime × faktor, taket 1,5).
- **Det som er fritt:** hyse under 11 m uten grense, hyse og sei uten maksimalkvote i åpen gruppe, «fritt fiske» om høsten når gruppekvoten ikke tas, lange og brosme (5.5 i `docs/systemer/kvoter-og-regler.md`, `core/03d-quota.js`).
- **Landingene på serveren:** `landings` (art, kg, mottak, landsdel, spilltime `gh`), med jukse-merkene (`cheat_on`) som alt holder merkede kontoer ute av lagets mål.

## Rammen Jonas har satt

- **Laget finnes bare i appen «Fiskarlaget» og ved lagets bord i puben.** Ingen sjøhus i verden, ingen vimpel på båtene i 3D, ingen lagsnavn på felt i kartet og ingen lagsbåter i kartplotteren. Det som ellers viser laget, er lenker inn i appen: linja etter salget, merket på app-ikonet og Kystposten. (Tolkning: kartet og sjøen er uten lag; si fra om linja etter salget og ikonmerket også er for mye.)
- **Bare egne lag med navn og kode.** Lagene kan være åpne, så nye i nærheten kan spørre om å bli med, og formannen godtar.
- **Ingen fordeler i spillet fra laget** utover det oppdragene betaler etter balanseregelen. Lagskasse og sjøhus med bonuser er tatt ut med rammen over.

## Gildemekanikken, oversatt til kysten

| Mekanikk | I Det Store Blå | Fase |
|---|---|---|
| Navn og identitet | Fritt navn, kontrollert som brukernavnene (`NAME_RE`, unikt, `names_banned`, admin-fanen tar bort med grunn). Vimpel av to farger og et symbol, vist i appen og ved bordet i puben. «Stiftet uke 47, 2026». | FL1 |
| Roller | **Formann** (alt), **styret** (opptil tre: godtar nye, skjuler meldinger, melder laget på i ligaen), **medlem**, **lærling** (første to uker). Formannen borte i fire uker → rollen går til det styremedlemmet som har vært lengst i laget, ellers til det medlemmet som har vært lengst med. | FL1 |
| Regler for opptak | Åpent med søknad, bare med kode, eller lukket. Krav laget kan sette: fartstid, landsdel, språk. Aldri krav om aktivitet. | FL1 |
| Gildechat | **Lagsprat:** fri tekst for registrerte i laget. Ordfilter på serveren, rapport-knapp, formann og styre skjuler, admin-fane med rapportene, utestengelse fra all lagsprat, meldingene slettes etter 30 dager, høyst 1 melding per 3 s og 300 tegn. Pluss reaksjoner på medlemmenes landinger («Godt fiska!»). Krever endringer i `src/legal/` (personvern og vilkår), som går som PR til Jonas. | FL2 |
| Felles oppgaver | **Ukas lagsoppdrag**, laget av medlemmenes kvoterom, redskap og det som er fritt; tre forslag, medlemmene stemmer. Hver ser «din del». | FL3–FL4 |
| Raid (felles helselinje) | **Storoppdraget:** en sjelden, stor ordre (eksportordre, skreisesongen) med én felles stolpe over ti spilldøgn. | FL4 |
| Hjelp | **«Be om en hånd»** med egninga på land: andre i laget trykker «Hjelp til» i appen, hver hjelp korter egnetida litt (høyst halvparten). Egnere på land er ekte; tida er arbeid, ikke lagt inn for å selge. | FL6 |
| Gildenivå | **Lagets år:** XP fra levert fangst og nådde mål. Nivåene gir plasser (12 → 16 → 20), symboler til vimpelen og titler. Går aldri ned. Nytt lag starter med XP fra medlemmenes siste fire uker (aldri på null). | FL5 |
| Gildekrig og rangering | **Lagsligaen:** runder på to spilluker, divisjoner etter lagets størrelse, opp og ned etter hver runde, poeng i prosent av eget mål. Kystposten skriver om vinnerne. | FL5 |
| Historie | **Lagets logg** skriver seg selv (nådd mål, store fisker, opprykk, nye medlemmer), **rekordene**, **ukas titler** (Seikongen, Speideren, Mangfoldet, Ferskingen) og **lagsmøtet** søndag kveld: kortet som bilde å dele. | FL5 |
| Territorium | Ikke bygd (rammen: laget finnes ikke i kartet). | — |
| Gildebank og bonuser | Ikke bygd (rammen). | — |

## Appen «Fiskarlaget»

I gruppa Deg, der Venner står i dag; Venner flyttes inn som fane, og Sesong-appen mister lagkortet. Ikonet får et merke når det er noe å gjøre (avstemning, ny melding, nådd mål).

| Fane | Innhold |
|---|---|
| Uka | Lagsoppdraget, stolpen, «din del» med «Kjør dit», avstemningen. |
| Prat | Lagsprat og reaksjonene. |
| Laget | Navn, vimpel, nivå, medlemmene med roller og ukas bidrag, titlene, koden og «Inviter». Formannens og styrets verktøy. |
| Ligaen | Divisjonen, plassen, opp og ned. |
| Loggen | Lagets historie og rekordene. |
| Venner | Vennekodene og vennelista. |

**Uten lag:** «Lag i nærheten som tar imot nye» (åpne lag, med vimpel, nivå, divisjon og hvor mange som fisket denne uka), «Start et lag» og «Bli med med kode». Gjester ser det samme med «Registrer deg for å bli med». Puben: lagets bord viser vimpelen, navnet og ukas stolpe og åpner appen.

## Lagsoppdragene

Hver medlems spill sender et sammendrag når det endres (art for art: kilo igjen innenfor kvoten eller «fritt», redskapet, båtklassen fra `VESSELS`-feltene, landsdel, mottakene siste to uker). Serveren lager tre forslag for uka; medlemmene stemmer, og det første velges om ingen har stemt innen et spilldøgn.

| Type | Eksempel | Når |
|---|---|---|
| Felles levering | «6 t sei til mottakene i Vesterålen innen søndag» | Arten har rom hos minst halvparten av de aktive, og sesongen er inne |
| Bygdas bestilling | «Mottaket i Myre trenger 2 t hyse til fredag, 15 % over markedsprisen» | Et mottak flere medlemmer har levert til |
| Fritt fiske | «Fritt fiske på torsk er åpnet: laget tar 4 t» | Bare når regelmotoren sier det er fritt |
| Mangfold | «Fem ulike arter som lag» | Alltid |
| Storoppdraget | «40 t skrei til Svolvær på ti dager» | Én gang i måneden og ved de store sesongene |

Målet: summen av rommet de aktive har × 40 %, høyst forrige ukes landing av arten × 1,3, minst 300 kg per aktivt medlem (startverdier). Aktive er de som har spilt siste to spilluker; den som er borte, trekker ingenting. Belønningen: kroner til hver som bidro etter balanseregelen (0,5 × fisketimen i tillegg til fisken, som bestillingene), merket og avisa.

## Fasene (én økt hver)

**Utrullingen (Jonas 17.11.2026: «Husk at dette må ut på test.detstorebla.no først for testing»):** hver fase rulles ut til test.detstorebla.no og testes der før noe slippes til detstorebla.no. Migreringen for fasen kjører Jonas først på testprosjektet (`xlrjbqdhdymcdjkqkulx`) før pushen som trenger den, og i produksjon først rett før slippet. Lagsprat (FL2) slippes ikke før Jonas har sett PR-en med `src/legal/`.

**FL1. Lagene og appen.** Tabellene `lags` (id, navn, vimpel, kode, opptak, krav, stiftet) og `lag_members` med `lag_id` og rolle; `lag_create`, `lag_join_code`, `lag_apply`/`lag_accept`, `lag_leave`, `lag_kick`, `lag_role`, `lag_list_near`, navnekontrollen med `names_banned`, formannen som går videre. Appen med fanene Laget og Venner og siden uten lag; lenken `?lag=`; bordet i puben. Havnelagene tas bort med melding (V4). Tester: `sqltest`, ny `lagapp.py` (falsk database, begge formater), enhetstest av lenken. Migrering først på testprosjektet (Jonas).

**FL2. Lagsprat.** `lag_msgs` med filter, rapport, skjuling, utestengelse og sletting etter 30 dager; reaksjonene; fanen Prat; admin-fanen. Endringene i `src/legal/` som PR til Jonas; slippes ikke før han har sett den. Tester: `sqltest` (filteret, taktene, at bare medlemmer leser), `lagapp.py`.

**FL3. Sammendraget fra båtene.** `lagCap()` i ny `core/09p-lagcap.js` fra `turRoom`/`turSpOk`; `lag_cap_put` med grensene og 60 t-taket. Enhetstester på tre båter og tre steder (sør, midt, nord).

**FL4. Lagsoppdraget.** `lag_week_offer(w)`, avstemningen, framdriften fra `landings`, «din del», storoppdraget, belønningen, avisa, linja etter salget. Tester: `sqltest` (tre falske lag: tom torskekvote, fritt fiske, blandet flåte), `lagapp.py`, enhetstest av balansen.

**FL5. Nivået, ligaen og historien.** Lagets XP og nivå, ligaen med divisjoner og opprykk, loggen, rekordene, titlene, lagsmøtet med bildet, Kystposten. Tester: `sqltest`, `lagapp.py`, `posttest`.

**FL6. Hjelp med egninga og målingen.** «Be om en hånd»; trakten i admin-dashbordet (laget opprettet → delt → noen ble med → første mål nådd → aktive uka etter; spillere med lag mot uten lag, dag 7).

## Valgene

- V1 A: 2–12 medlemmer (nivået åpner 16 og 20).
- V2 A: kroner etter balanseregelen, merket og avisa.
- V3 A: medlemmene stemmer; det første velges om ingen stemmer innen et spilldøgn.
- V4 A: havnelagene tas bort med melding.
- V5: åpne lag, formannen (og styret) godtar.
- V6: fri chat i laget for registrerte (alle er over 13).
- V7: laget finnes bare i appen og ved bordet i puben.
- V8: lagsligaen er første konkurranse mellom lag.

## Det som er antatt eller usikkert

- **Lagsprat og jussen:** fri tekst mellom spillere ned til 13 år krever moderering, en måte å melde fra på, og at personvernerklæringen sier hva som lagres og hvor lenge. Det er et juridisk ansvar for Jonas, og `src/legal/` går som PR.
- **Ordfilteret** fanger ikke alt. Rapportene og admin-fanen er det som faktisk virker; Jonas (eller noen han utpeker) må lese dem.
- **Kapasiteten kommer fra klienten** og kan blåses opp; det gjør bare målet større, og taket holder det.
- **Startverdiene** (40 %, 300 kg, ×1,3, nivågrensene, ligaens divisjoner) er ikke målt. FL6 viser dem.
- **Med 40–80 spillere** blir ligaen tynn de første ukene; én divisjon til det er minst 16 lag.
- **Lenken inn gjennom registreringen** må testes på iPhone.

## Hva planen ikke gjør

- Ingen lagsbåter, vimpler eller lagsnavn på sjøen eller i kartet (V7).
- Ingen lagskasse, ingen penger eller utstyr mellom spillere, ingen fordeler i spillet fra laget.
- Ingen ekte penger, ingen haill og ingen sponsing knyttet til lagene.
- Ingen straff for fravær og ingen push om andres fangst.
- Ingen automatiske lag per havn eller strekning.

## Status

17.11.2026: planen skrevet og skrevet om samme dag etter samtalen med Jonas (gildemekanikken, valgene V1–V8). Venter på «kjør på» for FL1.
