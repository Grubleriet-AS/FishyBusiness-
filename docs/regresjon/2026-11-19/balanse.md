# Balansesjekken 2026-11-19 (arbeidsgrenen edf871b, bygget 42dde895eb65, hele kysten med kart-31, frø 1; forrige natt 18.11.2026 i parentes)

`simday`, `calib`, `kvtest` og `progweek` er lest fra kjøringen i del 2 og 3 av regresjonen (del 3 tok dem en gang til, med samme tall). `fiskeplay` ble kjørt alene etterpå (loggen i `fiskeplay.txt`).

**Over 15 % fra forrige natt: bare kveiten i `fiskeplay` (41 mot 18 kg).** Resten er innenfor 15 %, og blad B er etter 12 turer i alle tre løpene (innenfor 13–16 ± 2).

- `simday`, `calib` og `kvtest`: like til kiloet som i går (Husøy 500 kg, torsk 448; Gryllefjord 492; juli Husøy 314; mai Malangsgapet 193; stang 0; jukse 2: 500). errors: [].
- `progweek` (uten 3D):
  - En tur hver tredje dag: 302 kg (302) og 14 532 kr (14 532) per tur. Blad B etter 12 turer, dag 38 (12, dag 38).
  - En tur annenhver dag: 304 kg (304) og 12 896 kr (12 896). Blad B etter 12 turer, dag 32 (12, dag 32).
  - Hver dag: 303 kg (302) og 9 253 kr (9 211, +0,5 %). Blad B etter 12 turer, dag 18 (12, dag 18). Kassen etter 56 dager 231 170 kr (230 107, +0,5 %). Torsken nådde kvota ved dag 28.
  - Kvoteprisen 260 kr/kg hele tida, inngangen 3 168 900 kr. errors: [].
- `fiskeplay` (liggende, uten 3D): alle scenarioene kjørt, pageerrors 0 i hvert.
  - Maskin mars: 510 kg på 3,1 t, 165 kg/t (506 kg, 164 kg/t; +1 %).
  - Juni kveite: **41 kg på 4,0 t (18, +128 %)**. Kveite er en sjelden fangst; 41 kg var også tallet 15.11.2026, så spredningen mellom netter er stor. Fiskemodellen er den samme (`simday`, `calib` og `kvtest` uendret).
  - Juni mark: 313 kg på 3,0 t, 103 kg/t (328, −5 %).
  - Kanter «full»: 16 kg på 2,0 t (16 kg, 2,0 t). Lasten sto full på 500 kg.
  - Kysten: Lofoten 60 kg (62), Vestlandet 32 kg (30), **Finnmark 0 kg på 0,0 t (0)**: juksingen stopper straks og båten går i ly («Sjøen er 3,0 m, nær det båten tåler. Hun går i ly til nærmeste kai.»), som i går.
  - Teiner: krabbe, krabbe60 og senja ga 0 kg i lasten, som de syv forrige nettene (ikke undersøkt).
  - Juksescenarioet solgte for 11 417 kr (10 436, +9 %) på mottaket.
- **Commiter siden forrige natt (dd98e0c) som rører fangsten, prisene eller turene** (`03-simulation.js`, `05-vessels.js`, `10-gear.js`, `03f-fiske.js`, `03j-felt.js`, `02-species-gear.js`): 780607e (baug- og hekkpropell på de store båttypene) og cc96df1 (autonav-rutinen, første kjøring). Ingen av dem rører fiskemodellen, og tallene for kg per dag er uendret. Kveiten er mest sannsynlig tilfeldig spredning; ikke undersøkt videre (regresjonsrutinen retter og undersøker ingenting).
