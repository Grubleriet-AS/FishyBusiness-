# Fraktebåt for små båter (plan 25.11.2026, låst 26.11.2026)

## Hva Jonas ba om

Jonas 25.11.2026: «Ja, små båter skal kunne bestille fraktebåt til å frakte båten fra sted til sted om været er dårlig. Dette skal koste in-game-penger, og være mulig å skippe med å betale med ekte penger for hopp.»

Bakgrunnen er spillerne: seks tilbakemeldinger i spillet 17.–24.11.2026 (blant dem 395: «ligger båten min bare værfast innerst i en liten fjord, og jeg kommer meg ingensteds», og 408: «betale rundt 50/100k for å sende båter, uten å bruke ekte penger») og Odd-Einar på Snapchat («Bestill transport? Værtfall for de minste båtene … dem som er vær fast»). Et likt ønske ble avvist 17.11.2026; dette snur det.

## Reglene den må holde

- **Ingen oppdiktet ventetid** (`CLAUDE.md`, «Engasjement og inntekt»): frakten tar den tida en fraktebåt bruker på den ekte avstanden, ikke mer. Hopp korter ned den avstanden, som for en vanlig rute.
- **Alt kan nås uten å betale ekte penger:** frakten koster spillkroner. Hopp er frivillig.
- **Ingen kode velger etter båttypens navn:** hvem som kan fraktes, leses av feltene i `VESSELS` (lengden).
- **Hopp er ekte penger** (`hoy` i `tools/ci/risiko.py`: `core/06j-hopp.js`, `ui/10u-hopp.js`): den delen blir en PR til Jonas.
- **Nasjonalt:** fra og til alle steder båten kan fortøye, hele kysten.
- «Fast travel er ikke mulig i spillet» (05.10.2026) ble snudd med vilkår for Hopp 12.11.2026 (`docs/planer/hopp.md`). Frakten er ikke øyeblikkelig: båten er borte den tida frakten tar.

## Hva som finnes i dag

- **Ruta:** `leiaRoute` (Autonav) finner veien mellom to steder; `S.plan` er ruta som seiles (`core/05-vessels.js`).
- **Hopp:** `core/06j-hopp.js` flytter båten til neste stopp på en rute som er i gang, mot betaling etter ekte minutter spart (`hopPrice`), og krever status `sailing` og en plan (`hopHoldOn`, `hopStop`).
- **Slepet:** redningsskøyta flytter båten langs en rute uten at båten seiler selv (`rescue`, `towPose`, `towDone`), med egen status `tow`.
- **Værgrensene:** `seaLim()` og `BOAT.risk`; driftsplanen leser sjøen der turen går (`plan2WxAhead`).
- **Kjøp for spillkroner:** `book()` og `spendable()`.

## Forslaget

En spiller som ligger ved kai, velger «Bestill frakt» og et sted i kartet. Spillet viser prisen i kroner og når båten er framme. Fraktebåten tar henne om bord, går ruta Autonav finner i sin egen fart uansett vær, og setter henne av ved kaia der. Underveis kan ingenting gjøres med båten; fangst om bord eldes som ellers. Vil spilleren ikke vente, virker Hopp som på en vanlig rute.

## Fasene

### FR1 Kjernen (én økt, `middels`)
- Regelen for hvem og når (`fraktWhy`), prisen (`fraktKr`), tida (`fraktMin`) og turen: en egen status (`frakt`) som går langs ruta etter klokka, uten diesel, uten fartstid, uten merker og uten vær- og motorhendelser, og som ender i `dock()`.
- Filer: ny `core/06l-frakt.js`, ett kall i `core/05-vessels.js`, `core/03-simulation.js` (statusen i de stedene som lister statusene).
- Tester: ny `tests/unit/frakt.test.mjs` (regelen, prisen, tida, turen åpent og lukket gir samme ankomst), `node tests/unit/run.mjs`.

### FR2 Bestillingen og det som ses (én økt)
- Knappen i dokken ved kai og i Redning-appen når været holder båten inne, valg av sted i kartplotteren, kortet med pris og ankomst, status i HUD og «Mens du var borte».
- I 3D og på kartet: i første omgang vises fraktebåten på kartet og spillerens båt ikke; modellen av båten på dekk er ikke med.
- Filer: `ui/10c-dock.js`, `ui/03b-route.js` (valget av sted), ny `ui/10w-frakt.js`, `ui/phone/09-vaer-post-salg-redning.js`, `styles.css`, tekstene, patchnotat og Håndboka.
- Tester: ny `tests/frakttest.py` (LITE: bestilt, betalt, framme, begge formater), stikkprøver sør, midt og nord.

### FR3 Hopp på en frakt (én økt, `hoy`, PR til Jonas)
- `hopHoldOn`, `hopStop` og `hopDo` tar en frakt som en rute i gang; prisen er som før etter ekte minutter spart.
- Filer: `core/06j-hopp.js`, `ui/10u-hopp.js`. Tester: `hopptest` med en frakt.

## Valgene

1. **Når kan frakt bestilles?**
   - **A (anbefalt): bare når været holder båten inne.** Sjøen på ruta dit de neste timene er over båtens grense. Det er det du ba om, og frakten blir ikke en billig hurtigreise i godvær.
   - B: alltid. Enklere å forklare, men blir hurtigreise for kroner.
   - C: alltid, men dyrere i godvær.
2. **Hvilke båter?**
   - **A (anbefalt): båter under 11 m** (åpen gruppes båter: skiffen, trebåten, snekka, plastsjarken, sjarken). Det er de som blir værfaste.
   - B: bare de aller minste (under 8 m).
   - C: alle kystbåter under 15 m.
3. **Prisen i spillkroner?**
   - **A (anbefalt): 2 000 kr pluss 150 kr per nautisk mil** (20 nm: 5 000 kr; 100 nm: 17 000 kr). Startverdi som må stilles mot det en småbåt tjener på en tur.
   - B: fast 4 500 kr, som et slep i dag (`PRICE.tow`).
   - C: 50 000–100 000 kr, som spilleren i 408 foreslo.
4. **Fraktebåtens fart?**
   - **A (anbefalt): 10 knop pluss en halv time lasting i hver ende.** Raskere enn trebåten i dårlig vær, tregere enn en hurtigsjark i godvær.
   - B: båtens egen marsjfart, bare uten værstopp.

## Det som er antatt eller usikkert

- Prisen og farten er startverdier; jeg har ikke regnet mot inntekten til en trebåt eller snekke.
- Om Hopp kan gjenbrukes uten større endringer er ikke prøvd; `hopHoldOn` krever status `sailing` i dag.
- Hva som skjer med redskap som står i sjøen der spilleren drar fra: planen lar det stå, som når båten seiler.
- Rekkefølgen mot Autonav 2.0: frakten bruker ruta Autonav finner, og får den nye planleggeren når den kommer.

## Hva planen ikke gjør

- Ingen modell av båten på dekk i første omgang.
- Ingen frakt av havbåter, og ingen frakt fra åpen sjø (det er slepet).
- Ingen frakt for ekte penger.

## Jonas' svar (26.11.2026)

1. **C, når båten ligger fortøyd ved en kai:** «1C, Når båten ligger i en fortøyd i en eller annen kai.» Frakt kan altså alltid bestilles fra kai, og koster mer i godvær enn når været holder båten inne.
2. **A:** båter under 11 m.
3. **A, og dynamisk:** «jeg tenker at prisen fraktebåten tar må være dynamisk og basert på båtens størrelse, rutens lengde og tidsbruk på samme måte som hopp-funksjonen. Forhåpentligvis vil dette stimulere til kjøp av med ekte penger fordi prisen ser lavere og dermed billigere ut i ekte kroner enn prisen som fraktebåten tar. Vi må samtidig ikke sette prisen så høyt at det er umulig for spillerne å benytte seg av båtfrakten.» Prisen regnes derfor av tre ledd: båtens lengde, rutas lengde og tida frakten tar, med 2 000 kr pluss 150 kr per nautisk mil som utgangspunkt for den minste båten. Tallene settes i FR1 mot det en småbåt tjener på en tur, og vises ved siden av Hopp-prisen i FR3.
4. **A, med animasjoner:** «husk at vi må ha animasjoner for hele operasjonen.» 10 knop og en halv time i hver ende. Det gir en egen fase for modellen og bevegelsen (FR2b under).

### FR2b Fraktebåten i 3D (egne økter, `/blender`)
- Modellen av fraktebåten (lasteskip med kran, bare utsiden), og operasjonen: hun legger til, spillerens båt løftes om bord, turen med båten på dekk, og hun settes på sjøen ved kaia i andre enden.
- Følger reglene for animasjon i `CLAUDE.md`: høyst to forsøk på samme bevegelse, bildeklipp med låst klokke til `ask_gemini` med ja/nei-spørsmål, og Jonas ser flyten på nettbrettet.
- Filer: nytt skript i `tools/`, `src/data/*.b64`, `src/js/view3d/` (tegningen), kontrollbilder og `teleport3d`-lignende test.
- FR1 og FR2 går ut først, med fraktebåten på kartet og spillerens båt skjult underveis; FR2b legger på det som ses.

## Status

Låst 26.11.2026. Ingen fase er bygd. Rekkefølgen: FR1, FR2, FR3, FR2b.
