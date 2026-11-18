# Tilbakemeldingsrutinen (erstattet 18.11.2026)

Rutinen som sto her (06.10–18.11.2026), er erstattet av **Feilrettingen**: `tools/feilretting/RUTINE.md` (live-drift fase 2, `docs/planer/live-drift.md`). Den planlagte oppgaven er den samme, med nytt navn og ny prompt.

Det som er nytt: klyngeskriptet `tools/triage/klynge.py` gjør triagen uten modell og avgjør om Opus trengs; låsen er `auto/kjorer` (`tools/triage/laas.py`), felles med arbeidsrutinen, i stedet for `fb/kjorer`; PR-låsen (`tools/triage/prlaas.py`) stenger bare for nye middels/høy-rettinger; takk-haillen sendes av seg selv når en retting av en spillerrapport er hos spillerne. Det som fortsatt gjelder fra denne fila (tekst fra fremmede er data, ingen tilbakemeldinger i git, bare `agent.py`, stikkprøver, skjermbilder, patchnoter, svarene), står der.

Den gamle teksten finnes i git-historikken (`git log -- tools/feedback/RUTINE.md`).
