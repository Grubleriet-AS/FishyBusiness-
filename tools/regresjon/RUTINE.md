# Regresjonen (D5; i GitHub Actions fra 19.11.2026, live-drift fase 5)

Jonas 19.11.2026: «flytt nattlig og ukentlig regresjon over til GitHub Actions (regresjon.yml) slik at testkjøringene går uten Claude-tokens og eventuelle nye røde tester plukkes opp automatisk av triagen i «Driften»». Om hvor det røde skal stå: «Saker» (én GitHub-sak per rød test).

Regresjonen er workflowen `.github/workflows/regresjon.yml`, uten modell. De to planlagte Claude-oppgavene «Nattlig regresjon» og «Ukentlig regresjon» (`trig_013Aut9VYSRkSPkQjUh17A36`) står på pause fra den første grønne kjøringen av workflowen; de slettes ikke, så historikken deres står.

## Når og hva

- **Hver natt kl. 01.17 UTC** (02.17 norsk vintertid): enhetstestene og testene uten 3D i fire deler side om side (`tools/regresjon/deler.py --json natt --lite 4`), og balansesjekken (`simday`, `progweek`, `fiskeplay`, uten 3D, frø 1).
- **Natt til mandag** også 3D-testene (åtte per maskin, etter hverandre, så aldri to 3D-tester samtidig på én maskin) og testene som måler tid (alene på en egen maskin).
- **For hånd:** «Run workflow» på «Regresjonen» med `natt` eller `uke`.
- **En PR som endrer workflowen eller `tools/regresjon/`** kjører en prøve: enhetstestene, `boottest` og `errtest`, og `saker.py --dry` (skriver ingen saker).
- Hver del bygger med hele kysten (`tools/map/game.py`, `node build.mjs`) på arbeidsgrenen. Repoet er offentlig, så GitHubs maskiner er gratis; en jobb har høyst seks timer.
- **Testene som tegner 3D uten å være 3D-tester** (`tut`, `markettest`, `DRAWS3D` i `tests/run.py`) går på en egen maskin (`tegner-3d`), og alle tidsgrensene i `run.py` er doble (`KYST_TIDSFAKTOR=2`): GitHubs maskiner tegner SwiftShader langsommere enn øktene, og `tut` gikk ut på tid to ganger første natt (19.11.2026, saken #150).
- **`sqltest` som vanlig bruker:** GitHubs maskin kjører ikke som root. Til 19.11.2026 var serverens valg skrevet bare for `su`-skallet, og PostgreSQL startet ikke (saken #149); nå sendes de riktig begge veier.

## Det røde: én sak per test (`tools/regresjon/saker.py`)

- **Rød to ganger:** en test som er rød, kjøres én gang til alene (`saker.py igjen`). Testene kjører med frø (`seed=1`), så rød to ganger er en feil i koden eller i testen, ikke et dårlig kast. Da åpnes eller oppdateres saken `regresjon` for testen: sjekklinja, antall netter på rad, filene testen dekker (`COVER` i `tests/run.py`), commitene som rørte dem fra regresjonen før den første røde natta, og lenke til kjøringen og loggene (artefaktene `logg-<del>`, 90 dager).
- **Kronisk:** tre netter på rad på samme test gir merkelappen `kronisk` (CLAUDE.md, «Kronisk røde tester»).
- **Ustabil:** rød, så grønn alene. Ingen sak; den står i oppsummeringen av kjøringen.
- **Grønn:** en test som er grønn, lukker saken sin med en kommentar.
- **Ikke kjørt i natt** (3D og tidsmålingene mellom mandagene): saken står urørt.
- **Triagen:** `tools/triage/klynge.py` leser de åpne `regresjon`-sakene som tekniske klynger (`klynge:<id>` fra saken, risiko etter filene testen dekker, vekt 3, `kronisk` 4). Driften retter dem da innenfor Opus-taket, etter spillernes feil (`tools/feilretting/RUTINE.md` punkt 5). En PR som nevner `klynge:<id>`, eller en sak `trenger-jonas`, gjør at klyngen hoppes over, som for feillista.
- **Ingen retter testen for å få den grønn:** koden rettes. Å endre eller slå av en sjekk krever Jonas (CLAUDE.md).

## Balansen

Utskriften fra `simday`, `progweek` og `fiskeplay` står i den ene saken `balanse` («Balansesjekken natt for natt»). Hver natt sammenlignes linje for linje med natta før: samme ord med tallene tatt ut er samme linje, og et tall som har flyttet seg mer enn 15 %, står øverst i saken (og i en kommentar). Ingen modell tolker tallene, og ingen rutine retter balansen: Driften leser ikke saken. Det er Jonas som avgjør.

## Absolutte regler

- Workflowen pusher ingenting: ingen git, ingen backlog, ingen `docs/regresjon/`. Den skriver bare saker (`issues: write` i den siste jobben).
- Den hopper aldri over, slår av eller myker opp en test eller en sjekk.
- En del som ikke blir ferdig (maskinen, bygget eller tidsgrensen), gjør kjøringen rød, og testene i den delen står urørt i sakene den natta. GitHub sender da e-post til Jonas.

## Før 19.11.2026

Fra 26.10.2026 var regresjonen to planlagte Claude-økter (natt til mandag med 3D, de andre nettene uten), som skrev backloggen 10.6 og loggene i `docs/regresjon/<dato>/` og flettet rapporten selv. Loggene derfra står i `docs/regresjon/`, og `tests/run.py historikk` leser dem fortsatt.
