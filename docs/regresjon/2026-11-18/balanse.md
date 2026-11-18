# Balansesjekken 2026-11-18 (arbeidsgrenen dd98e0c, bygget 90eacee38120, hele kysten med kart-31, frø 1; forrige natt 17.11.2026 i parentes)

`simday`, `calib`, `kvtest` og `progweek` er lest fra kjøringen i del 2 av regresjonen (ikke kjørt en gang til). `fiskeplay` ble kjørt alene etterpå (loggen i `fiskeplay.txt`).

**Over 15 % fra forrige natt: spilleren får igjen like mye fisk som 15.11.2026, mens fiskemodellen er den samme.**

- `simday`, `calib` og `kvtest` er like til kiloet som 17.11. og 15.11.2026.
- `progweek`: kiloene per tur er tilbake på 302–304 kg (142–201 forrige natt; 309–326 den 15.11.), og blad B kommer etter 12 turer i alle tre løpene.
- `fiskeplay`: juksingen gir 35–101 % mer enn forrige natt i Husøy-scenarioene og i Lofoten. **Finnmark gir 0 kg**: båten jukser ikke i det hele tatt, fordi hun går i ly med en gang («Sjøen er 3,0 m, nær det båten tåler. Hun går i ly til nærmeste kai.»).
- Den som ligner mest på oppgangen: **8c87779** (17.11.2026, «Alene på feltet kjører du opp igjen selv, og drivanker i utstyrsbutikken»). Du kan ta roret og kjøre opp igjen når båten har drevet 400 m av feltet, og juksingen alene står mens du kjører. Det passer med at fallet forrige natt bare var der spilleren jukser alene. Forrige natt ble e770ec4 (RANK1-a) antatt, og det står ikke lenger: de andre to i stigen er ikke rørt. Begge er antatt, ikke undersøkt.
- Finnmark på 0 kg ligner på **0e2baaf** (17.11.2026, «Kystbåtene snur ikke for vind: de går i ly av seg selv når sjøen nærmer seg det de tåler»). Sikkerhetsgrensen for sjøen er alltid på, og den er 95 % av det båten tåler. Antatt, ikke undersøkt.

**Blad B:** en tur hver tredje dag **etter 12 turer, dag 38** (ikke nådd på 56 dager, 11 turer). En tur annenhver dag **etter 12 turer, dag 32** (19 turer, dag 51). Hver dag **etter 12 turer, dag 18** (15 turer, dag 24). 12 turer er én tur før 13–16, innenfor grensen på to.

- **simday** (500 kg tak, juksa, 10. mars 2028): Husøy 500 kg (500): torsk 448/sei 43/hyse 7/lyr 2; Gryllefjord 492 kg (492); juli Husøy 314 kg (314); mai Malangsgapet 193 kg (193); stang 0 kg (0); jukse 2: 500 kg (500). Som før. errors: [].
- **calib** og **kvtest**: like til tallet (kvtest: sep_kveite 492 kr/dag, sep_kveite_haill 437, oct_kveite_g0 1 026). errors: [].
- **progweek** (uten 3D):
  - En tur hver tredje dag: **302 kg (142, +113 %) og 14 532 kr (6 546, +122 %) per tur**. Blad B etter 12 turer, dag 38 (ikke nådd). Inngangen innen rekkevidde etter 13 turer, dag 41 (ikke innen rekkevidde).
  - En tur annenhver dag: **304 kg (161, +89 %) og 12 896 kr (7 522, +71 %) per tur**. Blad B etter 12 turer, dag 32 (19, dag 51). Inngangen etter 13 turer, dag 35 (ikke innen rekkevidde).
  - Hver dag: **302 kg (201, +50 %) og 9 211 kr (7 489, +23 %) per tur**. Blad B etter 12 turer, dag 18 (15, dag 24). Inngangen etter 13 turer, dag 22 (18, dag 29). Kassen etter 56 dager er **230 107 kr (184 972, +24 %)**. Torsken nådde kvota på 3 400 kg ved dag 28 (dag 42).
  - Kvoteprisen er 260 kr/kg hele tida, og inngangen koster 3 168 900 kr, som før. errors: [].
- **fiskeplay** (liggende, uten 3D): alle ni scenarioene kjørt, pageerrors 0 i hvert.
  - Maskin mars: **506 kg på 3,1 t, 164 kg/t (371 kg, 122 kg/t; +36 %)**.
  - Juni kveite: **18 kg på 4,0 t (23, −22 %)**.
  - Juni mark: **328 kg på 3,0 t, 108 kg/t (163, +101 %)**.
  - Kanter «full»: 16 kg på **2,0 t** (3,6 t), 8 kg/t (4). Lasten sto full på 500 kg.
  - Kysten: Lofoten **62 kg** (46, +35 %), Vestlandet 30 kg (30), **Finnmark 0 kg på 0,0 t (25, −100 %)**: juksingen stoppet straks, og båten gikk i ly (over).
  - Teiner: krabbe, krabbe60 og senja ga 0 kg i lasten, som de fem forrige nettene (ikke undersøkt).
  - Juksescenarioet solgte for **10 436 kr** (7 627, +37 %) på mottaket i Husøy.
- **Commiter siden forrige natt (f698d75) som rører fangsten, prisene eller turene** (`03-simulation.js`, `05-vessels.js`, `10-gear.js`, `03f-fiske.js`, `03j-felt.js`, `02-species-gear.js`):
  - 8c87779 (alene på feltet kjører du opp igjen selv; drivankeret).
  - 0e2baaf (kystbåtene går i ly for sjøen, ikke for vinden; `SEA_SAFE` 0,95).
  - 6774a2d (ingen vindgrense på fiskeredskapene for kystbåtene).
  - 47617d7 (hoppet: trimmen som går ut underveis).
  - 8ed8566 (steg 137, driften: færre kall mot databasen).
  - Utenfor de seks filene, men i driftsplanen: ba84b9a («vinden er ingen grense») og 0c25df8 (været der turen arbeider).
