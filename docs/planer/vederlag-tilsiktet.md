# Vederlaget for inndratt fangst: bare når fangsten ikke var tilsiktet (plan 27.11.2026)

Status: **plan, venter på klarsignal.** Ingenting er bygd.

## Hva Jonas ba om

- 11.11.2026, da vederlaget ble lagt inn: «Dette må inn. Jeg vet at fiskere utnytter seg av slikt regelverk bevist, så det er realistisk» (kommentaren over `CONF_PAY` i `core/03l-room.js`).
- 27.11.2026, etter at steg 154 fant en konto som levde av vederlaget (5,38 mill. kr i vederlag for 26,9 mill. kr inndratt på 60 sluttsedler, med en 21-meter uten hjemmel), og jeg foreslo å la kvoten ved avgang avgjøre: «Man man ikke bruke data fra ekkoloddet til å fastslå hvilken art spilleren spesifikt fisker etter på en intuitiv måte?»

## Regelverket (lest 27.11.2026)

Forskrift om inndraging av fangst og bruk av inndregne midlar (FOR-2010-03-12-390, Lovdata, sist endret ved FOR-2025-06-12-1054) § 3:

- Første ledd: ved inndraging som følge av fangst utover kvote eller andre brudd skal det gis vederlag for omkostninger ved ilandføring «dersom meirfangsten eller den ulovlege fangsten ikkje var tilsikta».
- Andre ledd: «Vederlaget skal setjast til 20 % av verdien av meirfangsten eller den ulovlege fangsten.»
- Tredje ledd: gjelder ikke fangst utover kvote av blant annet makrell, norsk vårgytende sild og kongekrabbe.
- Ingen andre paragrafer i forskriften reduserer vederlaget (ikke gjentakelse, ikke grov uaktsomhet).

Forskriften sier ikke hvordan «tilsikta» avgjøres. Regelen under er spillets egen måte å avgjøre det på.

## Hva som finnes i dag

- `CONF_PAY = 0.2` og `landConf(H, q, acc)` i `core/03l-room.js`: hvor stor del av hver art som inndras ved landing nå (kvoten, ferskfiskordningen, bifangstreglene, uten adgang 10 % og 2 tonn i året). Spillet gir vederlaget for alt som inndras, «the game cannot tell intent».
- `sell()` i `ui/08-actions.js`: `vedKr = CONF_PAY * confKr`, på sluttseddelen som egen rad (`d.ved`), `fine:0`.
- All fangst kommer om bord gjennom `addCatch(sp, kg, cls, hook, opt)` i `core/05-vessels.js` (juksa, garn og line med `opt.how`, teiner, eget napp i juksespillet). Hver lott i rommet er et objekt (`sp`, `kg`, `cls`, `hr`, `fresh` …).
- `density(sp, p, H)` i `core/03-simulation.js` er tettheten av en art på et sted. Det er det ekkoloddet tegner (`core/12-heat.js`, `ui/03c-heat.js`), og det fangsten trekkes fra. Det enkle loddet viser all fisk samlet; CHIRP kan vise én art (`HEAT.sp`).
- Varslene om inndragning: lastelista og kaia i `ui/07-guide.js` («inndras; du får 20 %»), Kvote-appen, sluttseddelen.

## Regelen som foreslås

Det spilleren har *valgt å se* på loddet, brukes ikke: bare CHIRP har artsvelger, den kan stå på «Alle», og mannskap på driftsplan ser ikke på noe lodd. Det loddet *måler* brukes: artsblandingen på stedet.

En lott merkes **tilsiktet** i det den kommer om bord når begge deler holder:

1. **Kvoten for arten er full:** det som alt ligger i rommet av arten, ville blitt inndratt om det ble landet nå (`landConf` sier det; ferskfiskordningen og bifangstreglene er dermed med).
2. **Arten er hovedarten på stedet:** artens andel av tettheten der redskapet står, er minst halvparten av det loddet viser der.

Ved landing gis vederlaget bare for den inndratte fangsten som ikke er merket. Merket fangst inndras uten vederlag, på sluttseddelen som egen rad.

Spilleren ser det før det skjer: ekkoloddfeltet og dekket sier «Kvoten for torsk er full, og det er mest torsk her: torsken inndras uten vederlag», og loddet er verktøyet for å finne et sted med mindre torsk. Bifangst av torsk på et seifelt gir vederlag som i dag.

## Fasene

| Fase | Hva | Filer | Tester |
|---|---|---|---|
| **V1** Kjernen | Merkingen i `addCatch` (ren funksjon `catchIntent(sp, p, H)`), vederlaget i `landConf` og `sell` bare for det umerkede, raden på sluttseddelen. Ingen ny tekst andre steder. | `core/05-vessels.js`, `core/03l-room.js`, `ui/08-actions.js` (bare `vedKr` og sluttseddelen), `tests/unit/` | Enhetstester sett røde først: full kvote + hovedart gir ikke vederlag; bifangst gir; kvote igjen gir; en lagring uten merkene oppfører seg som i dag. `selltest`. |
| **V2** Varslene | Ekkoloddfeltet, lastelista, kaia før landing, Kvote-appen og Regler-appen sier det i klartekst, norsk og engelsk; patchnotat. Begge formater. | `ui/03c-heat.js`, `ui/07-guide.js`, `ui/phone/04-kvote.js`, `ui/phone/03-regler.js`, `ui/phone/07-patch.js` | `uishots`, skjermbilder 800×1280 og 1280×800, mobil-UX-malen. |
| **V3** Målingen | Trakten i admin: andelen leveringer med inndragning uten vederlag, og kroner i vederlag per uke, før og etter. | `src/admin/index.html`, en hendelse i `sell` | `admintest`. `hoy` (admin): PR til Jonas. |

Hver fase er én økt. V1 er `middels` (kjernen) og går som PR.

## Valgene

- **V-A, grensen for «hovedarten».** A (anbefalt): minst 50 % av tettheten på stedet. Tydelig å forklare («mest torsk her»), og bifangst på blandingsfelt går fri. B: arten med størst andel, uansett hvor stor. C: 30 %, strengere.
- **V-B, redskap som står i sjøen (garn, line).** A (anbefalt): leses da redskapet ble satt, både kvoten og blandingen. Det er da valget tas, og fisk som går i garnet etter at kvoten ble full på en annen tur, er ikke tilsiktet. B: leses da det trekkes.
- **V-C, mannskap på driftsplan.** A (anbefalt): samme regel, og planen sier fra i dagsmeldingen når den fisker tilsiktet over kvoten. Ellers blir driftsplanen veien rundt regelen. B: fangst på driftsplan er aldri tilsiktet.
- **V-D, de som alt har fangst om bord når regelen kommer.** A (anbefalt): lotter uten merke regnes som ikke tilsiktet (ingen mister noe de alt har fisket). Ikke et reelt valg, men sagt for ordens skyld.

## Antatt eller usikkert

- Forskriften sier ikke hvordan salgslagene avgjør «tilsikta». Regelen over er en spillregel som skal være forståelig, ikke en gjengivelse av praksis.
- Redskapet velger også art (garnets maskevidde, kveitepilken): fangsten følger ikke tettheten nøyaktig. Regelen leser tettheten, fordi det er den loddet viser spilleren.
- Det enkle loddet viser ikke artene hver for seg. Varselet må derfor si arten i tekst også uten CHIRP.
- Tallet 50 % er en startverdi. V3 måler hvor mye vederlag som fortsatt betales.
- Kontoen fra steg 154 fisker mest torsk uten hjemmel: regelen tar bort vederlaget for den torsken, men ikke for hyse og sei som bifangst.
- `sell` i `ui/08-actions.js` har linjer steg 148 (KV1) eier (`codGrp`). V1 rører bare `vedKr` og sluttseddelens rad, og må flettes etter at 148 er inne.

## Hva planen ikke gjør

- Ingen bot, gebyr eller anmeldelse, og ingen endring i hva som inndras. Bare vederlaget endres.
- Ingen endring for kongekrabbe (spillet inndrar ikke kongekrabbe over kvote i dag).
- Ingen straff for det som alt er landet. Regelen gjelder fangst som kommer om bord etter at den er ute.
