# Hvordan spillerne spiller (17.11.2026, lanseringsmorgenen)

Hentet fra produksjonen (`players`, `sessions`, `events`, `landings`, `lag_*`, `feedback`) kl. 09:50 norsk tid 17.11.2026. Admin-kontoer er holdt utenfor. Bare tall, ingen spillerdata ut av databasen.

**Forbehold:** 69 av de 96 kontoene ble laget i dag, de første ti timene etter lanseringen. Det finnes ingen retensjon (dag 1, dag 7) å måle ennå. Telemetrien (`events`, `sessions`) finnes bare for dem som har samtykket: 37 av de 78 nye. Tallene under gjelder dem.

## Tallene

| | |
|---|---|
| Nye kontoer 16.–17.11 | 78 (40 gjester) |
| Med samtykke og telemetri | 36–37 |
| Aktive siste 2 timer | 43 |
| Plattform (der den er kjent) | iOS 17, Android 5, PC 2 |
| Økter per spiller | 3,9 i snitt; 20 av 36 har to eller flere, 12 har fire eller flere |
| Spilletid i dag per spiller | median 20,6 min; 6 under 2 min, 8 på 2–15, 17 på 15–60, 5 over én time |
| Startet når (norsk tid) | jevnt 01–05, stigende fra 06 til 09 (15 spillere kl. 09) |

**Trakten for de nye (spillere med telemetri):**

| Steg | Spillere |
|---|---|
| Spillet lastet (`boot`, `first3d`) | 36 |
| Første tur startet (`tut_step`) | 35 |
| Første fisk (`tut_fish`) | 30 |
| Seilte ut (`depart`) | 30 |
| Solgte fangst (`sale`) | 24 |
| Første tur ferdig (`tut_done`) | 19 |
| Spurt om registrering / registrerte | 21 / 20 |
| Åpnet butikken / kjøpte (`shop_buy`) | 18 / 11 |
| Tok et oppdrag (`tur_take`) / fullførte | 6 / 5 |

Hvor de 16 som ikke fullførte første tur, slapp: `gps` 5 (etter 7 sekunder i snitt), `slip`, `land`, `route1`, `cast2` 2 hver, `fish`, `deck`, `reg` 1 hver.

Salg: 24 har solgt, 17 av dem bare én gang (den første turen), 5 to–tre ganger, 2 fire eller flere. En tur varer 30 min i snitt, median 13 500 kr i salg.

Det spillerne bruker: kartplotteren (`pa:open`/`pa:close`, 26–27), juksa (27), salg (24), meny (22). Merker 16, kaiboden 13, oppdrag 6, puben 4–10. **Ingen** har åpnet topplista, sesongtavla eller venner i dag.

## Det sosiale

| | I alt siden 05.10 |
|---|---|
| Medlemmer i et fiskarlag | 3, i tre ulike havner |
| Lag som nådde ukemålet (`lag_hits`) | 0 |
| Lapper på lagtavla | 1 |
| Vennskap | 3 |
| Delte fangstmerker | 1 |
| Hilsener i puben | 0 |
| Slep mellom spillere | 1 |
| Kappløp | 0 |

Hjemhavnene: 15 spillere har en hjemhavn registrert, fordelt på 13 havner. Ingen havn har mer enn to. Landingene siste to døgn: Nord-Norge 27 spillere (15 mottak), Midt-Norge 8 (7 mottak), Vestlandet 2.

## Det tallene sier

1. **Første tur holder bra, andre tur er hullet.** 30 av 35 får fisk, 24 selger. Men 17 av 24 selger bare én gang. Det er overgangen fra den styrte første turen til «hva gjør jeg nå» som taper folk, ikke selve fiskingen.
2. **`gps`-steget mister fem spillere på sju sekunder.** Det er tidlig nok til å være lasting, en dialog eller noe som ikke svarer på iPhone (iOS er to av tre). Bør ses på med iPhone-skjermbilder.
3. **Fiskarlaget finnes, men ingen finner det og ingen ville møtt noen der.** Laget er per hjemhavn og man melder seg inn i puben. Med 13 havner på 15 spillere ville hvert lag hatt én person; tre medlemmer på tre havner viser akkurat det. Ukemålet krever da 1 500 kg av én person, og «laget» er en solo-oppgave. Puben er åpnet av 4–10 spillere.
4. **Folk samler seg i landsdeler, ikke havner.** 27 av 37 som landet, fisket i Nord-Norge. Bygdekampen bruker allerede landsdelene; et lag på den skalaen hadde hatt folk i seg fra første dag.
5. **Ingen åpner topplistene.** Konkurransen finnes, men vises ikke der spilleren er (kartplotteren, salget, kaia).
6. **Grunnstøting under ruteseiling.** Tre rapporter i dag (#122–124) der båten på rute går på «kartdybde 0 m», og spilleren svarer «spillets feil». Ruten går over land eller tørt skjær.

## Hva det betyr for fiskarlaget

Et lag må ha folk i seg den dagen spilleren kommer inn, ellers er det en tom side. Med dagens tall betyr det enten større lag (landsdel eller kyststrekning), eller lag spillerne lager selv og inviterer til (en kode, som vennekodene). Konkurransen mellom lag og inne i laget må vises der spilleren alt er: etter et salg («Laget ditt: 3,2 av 8 tonn, du leverte 14 % i dag»), i kartplotteren og på kaia, ikke bare i puben og Sesong-appen.

Reglene som gjelder (`docs/engasjement.md`): sosialt er additivt (fravær trekker ingen ned), ingen fri tekst, haill synes ikke for andre, alt teller bare oppover, gjester kan ikke være med i det som deles.

Jonas valgte 17.11.2026 egne lag med kode og oppdrag tilpasset medlemmene; planen er `docs/planer/fiskarlag-2.md`.
