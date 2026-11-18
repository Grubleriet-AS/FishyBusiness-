# Arkitekturen for nye titler: skallet og kjernen

**Status:** retningslinje for nye spill (Laksebaronen og de neste i Industrispill-rekka). Det Store Blå bygges **ikke** om etter den; den gjelder bare det som starter fra blanke ark. Jonas 18.11.2026, i svaret på analysen av feilrettingen: «Ja, sett i gang med alle fire punktene nå.»

## Hvorfor

Feilrettingen i Det Store Blå kan bare slippe det som er `lav` av seg selv (`tools/ci/risiko.py`). Kvelden 18.11.2026 var 28 av 33 feilklynger `middels` og 5 `hoy`, ingen `lav`: nesten alt ligger i `src/js/core/`, 3D-motoren eller `ui/10f-cloud.js`, fordi spillet deler ett globalt skop og visningen leser og skriver tilstanden direkte. Da blir hver retting en PR som venter på Jonas, og klikkene hans er flaskehalsen. Et nytt spill kan legges opp slik at det meste spillerne merker (menyer, tekst, knapper, oppsett, tegning) ligger i et lag der en feil aldri kan ødelegge en lagring eller en betaling, og så kan slippes automatisk.

## De to lagene

| Lag | Hva | Risiko | Slippes |
|---|---|---|---|
| **Skallet** (presentasjon) | Menyer, HUD, paneler, tekst og oversettelser, oppsett og CSS, tegning og 3D-bildet, lyd, veiledningens tekst, hva knappene viser | `lav` (og `css_tekst` for stil og tekst) | Automatisk, når porten holder |
| **Kjernen** (simulering og lagring) | Spillets tilstand og reglene for den, klokka og `catchUp`, økonomien, lagringen og formatet, synkroniseringen, kjøp og betaling | `middels` (reglene) eller `hoy` (lagring, penger, kontoer) | PR til Jonas |

## Reglene for skillet

1. **Kjernen har ingen DOM og ingen WebGL.** Den er ren JS som kan kjøres i `node` alene (enhetstester uten nettleser), og helst i en Web Worker, så et tungt steg aldri stopper bildet.
2. **Skallet leser bare et øyeblikksbilde** (`snapshot()`, fryst eller kopiert) og endrer ingenting direkte. Alt det vil gjøre, går som en **handling** med navn og data (`{type: 'selg', fisk: 'torsk', kg: 120}`) til kjernen, som sier ja eller nei.
3. **Handlingene er en lukket liste** med skjema, versjonert. En ny handling er et tillegg (expand-and-contract, som migreringene); en gammel endrer aldri betydning.
4. **Lagringen er kjernens eie.** Formatet har et versjonsnummer og en migrering per versjon, testet mot ekte gamle lagringer (anonymiserte kopier, aldri spillerdata i repoet). Skallet vet ikke at lagringen finnes.
5. **Ekte penger går gjennom én modul i kjernen** som snakker med serveren; skallet viser bare det den svarer. Serveren er fasiten (som `HS4` i Det Store Blå).
6. **Skillet håndheves av bygget, ikke av vane:** skallet og kjernen er egne moduler (ES-moduler eller egne mapper med egen inngang), og en sjekk i CI nekter import fra skallet inn i kjernens indre og omvendt fra kjernen ut i DOM-en. `tools/ci/risiko.py` klassifiserer etter mappe: `skall/` er `lav`, `kjerne/` er `middels`, `kjerne/lagring/` og `kjerne/betaling/` er `hoy`.
7. **Diagnostikken er innebygd fra dag én:** ringbufferen med abstrakte tilstandsoverganger (steg 139 i Det Store Blå) ligger i skallet, og kjernen sender sine overganger (handling avvist, `catchUp`-varighet) dit som koder.

## Hva det gir

- En feil i en meny, en tekst eller tegningen kan rettes og slippes av Driften samme time uten Jonas, fordi den ikke kan nå lagringen.
- En feil i reglene kan prøves mot kjernen i `node` på sekunder, uten 3D og uten nettleser, og den røde testen er enkel å skrive.
- Lagringen og betalingen blir mindre flater med færre filer, så PR-ene Jonas må se, blir få og små.

## Det som ikke er avgjort

- Om kjernen kjører i en Worker fra start, eller i hovedtråden bak samme grensesnitt (Worker senere). Anbefaling: samme grensesnitt fra dag én, Worker når den første tunge simuleringen kommer.
- Felles kode mellom titlene (klokka, lagringen, skyen, feillista, Driften) som et eget delt bibliotek. Avgjøres når Laksebaronen startes, i en økt med Jonas (`/planlegg`).
