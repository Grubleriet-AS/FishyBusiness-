# Balansesjekken 2026-11-17 (arbeidsgrenen 4be02cf, bygget d41a34c424a6, hele kysten med kart-31, frø 1; forrige rapport 15.11.2026 i parentes)

Natt til 16.11.2026 (den ukentlige) la ingen rapport i arbeidsgrenen, så tallene i parentes er fra 15.11.2026. `simday` og `progweek` er lest fra kjøringen i del 2 av regresjonen (ikke kjørt en gang til). `fiskeplay` ble kjørt alene etterpå (loggen i `fiskeplay.txt`).

**Over 15 % fra forrige rapport: spilleren får mye mindre fisk, mens fiskemodellen er den samme.**

- `simday`, `calib` og `kvtest` er like til kiloet som 15.11.2026. Bestanden og fisket på feltet er de samme.
- `progweek`: kiloene og kronene per tur er gått ned med 35–57 % i alle tre løpene, og blad B kommer senere (under).
- `fiskeplay`: fangsten er 34–69 % lavere i alle juksescenarioene (under).
- Det felles for de to er spilleren som starter fersk og jukser selv. **e770ec4 (RANK1-a, steg 134, 16.11.2026: «dine egne ferdigheter … farten på dekk»; ferdighetene starter på 1,5)** er den commiten som ligner mest. Commiten sier at farten «aldri [er] under før steget» (V3 A), men tallene her viser mindre fisk. Det er ikke undersøkt, bare antatt ut fra at fiskemodellen er uendret og fallet bare kommer der spilleren selv står på dekk. De andre commitene i lista nederst er ikke utelukket.

**Blad B:** en tur hver tredje dag: **ikke nådd på 56 dager** (11 turer), mer enn to turer senere enn 13–16. En tur annenhver dag: **etter 19 turer**, dag 51 (12 turer, dag 32), tre turer senere enn 13–16. Hver dag: **etter 15 turer**, dag 24 (11 turer, dag 15), innenfor 13–16.

- **simday** (500 kg tak, juksa, 10. mars 2028): Husøy 500 kg (500): torsk 448 (448)/sei 43 (43)/hyse 7 (7)/lyr 2 (2); Gryllefjord 492 kg (492): torsk 395/sei 46/hyse 42/lyr 6/brosme 3, som før; juli Husøy 314 kg (314): hyse 152/sei 97/torsk 47/uer 7/brosme 6/lange 5, som før; mai Malangsgapet 193 kg (193), som før; stang 0 kg (0); jukse 2: 500 kg, torsk 445/sei 45/hyse 8/brosme 2, som før. errors: [].
- **progweek** (uten 3D):
  - En tur hver tredje dag: **142 kg (326, −56 %) og 6 546 kr (15 121, −57 %) per tur**. Blad B ikke nådd (11 turer, dag 35), og inngangen ikke innen rekkevidde (12 turer).
  - En tur annenhver dag: **161 kg (314, −49 %) og 7 522 kr (12 988, −42 %) per tur**. Blad B etter 19 turer, dag 51 (12, dag 32), og inngangen ikke innen rekkevidde (12 turer).
  - Hver dag: **201 kg (309, −35 %) og 7 489 kr (9 508, −21 %) per tur**. Blad B etter 15 turer, dag 24 (11, dag 15), og inngangen etter 18 turer, dag 29 (13, dag 22). Kassen etter 56 dager er **184 972 kr (234 431, −21 %)**. Torsken nådde kvota på 3 400 kg ved dag 42 (3 534 kg ved dag 28).
  - Kvoteprisen er 260 kr/kg hele tida, og inngangen koster 3 168 900 kr, som før. errors: [].
- **fiskeplay** (liggende, uten 3D): alle ni scenarioene kjørt, pageerrors 0 i hvert.
  - Maskin mars: **371 kg på 3,0 t, 122 kg/t (580 kg på 3,2 t, 178 kg/t; −36 %)**.
  - Juni kveite: **23 kg på 4,1 t (41, −44 %)**.
  - Juni mark: **163 kg på 3,1 t, 53 kg/t (364, −55 %)**.
  - Kanter «full»: 16 kg på **3,6 t** (1,9 t), 4 kg/t (9, −56 %). Lasten sto full på 500 kg.
  - Kysten: Lofoten **46 kg** (70, −34 %), Vestlandet **30 kg** (97, −69 %), Finnmark **25 kg** (56, −55 %), alle på 3,0–3,1 t.
  - Teiner: krabbe, krabbe60 og senja ga 0 kg i lasten, som de fire forrige nettene (ikke undersøkt).
  - Juksescenarioet solgte for 7 627 kr på mottaket i Husøy.
- **Commiter siden forrige rapport (15.11.2026, 55ca193) som rører fangsten, prisene eller turene** (`03-simulation.js`, `05-vessels.js`, `10-gear.js`, `03f-fiske.js`, `03j-felt.js`, `02-species-gear.js`):
  - Steg 134: e770ec4 (RANK1-a, ferdighetene og farten på dekk).
  - Prisstigen og Kaiboden: e142d32, 333ccf8, 2682819 og 538dc2d.
  - f0030e3 («Mens du var borte» og innloggingsbonusen).
  - Kalenderen til 2026: 53d46c9. Testene og et lokalt bygg har kalenderen som før.
  - Steg 125d: 6688088 og bbb3b72 (dekkene og plassene).
  - Steg 126: 7b57094 (havnestengingen).

  Den 16.11.2026 kom en commit uten forelder inn (c115afa, et helt øyeblikksbilde av repoet) gjennom 1958099 og d323ce3 på grenen `ccr-349425a1-raf94t`. Fletteresultatet er sjekket: det skiller seg fra arbeidsgrenen bare med Instagram-endringen, så det har ikke tatt inn gamle filer. Commitene er talt uten den.
