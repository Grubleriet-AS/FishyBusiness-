# Steg 154, HS5b: det bare Jonas kan gjøre

Sjekken av kronene er skrevet om (27.11.2026): den regner på kasse, sparekonto og skattekonto minus lån, med båtene og hjemlene. Alt er bygd og testet på grenen `ccr-26223d0c-yhvnxv`.

1. **Flett PR #238.** `supabase/`, `ui/10f-cloud.js` og `src/admin/` er `hoy`, så ingenting er rullet ut. Migreringen `20261127120000_cheat_worth.sql` er «ok» (bare tillegg) og kjøres av seg selv: på testprosjektet når grenen når arbeidsgrenen, i produksjon i slippet.
2. **Etter slippet: «Fjern merket» på de tolv åpne merkene** i fanen Juks. Alle tolv er feil (penger fra sparekontoen og skattekontoen, lån, båtbytte). «Fjern merket» nullstiller også det serveren har lagt sammen for kontoen, så de starter rent med den nye regelen. Gjør det etter slippet, ikke før: med den gamle funksjonen skrives merkene på nytt.
3. **Se på fanen Juks** på nettbrettet, stående og liggende: et nytt merke på kronene sier «Kasse og konti minus lån …» med kassa, kontiene og lånene før og etter. Et merke fra før endringen leses som før.
4. **La bryteren «Ute av topplistene» stå av** til det har gått noen dager uten feil merker.
