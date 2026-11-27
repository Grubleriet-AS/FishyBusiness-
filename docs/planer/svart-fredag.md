# Black Week: tilbudet i Kaiboden (plan 27.11.2026)

Status: **plan, ingenting bygd. Valgene er tatt** (Jonas 27.11.2026): V1 A, ny pakke og gave; V2 B, bare Black Week, til og med mandag 30.11, med datoen på kortet; V3 A, 499 kr; V4 A, Turbotrim 2 timer. Byggingen venter på «kjør på».

## Hva Jonas ba om

Jonas 27.11.2026: «Vi må lage et Black Friday tilbud på spillet! Analyser salgsdata fra detstorebla.no/admin så legger vi en strategisk plan».

Black Friday er samme dag (fredag 27.11.2026). Alt som rører butikken er ekte penger (`hoy` i `tools/ci/risiko.py`): det bygges og testes ferdig, men går ikke ut før Jonas har flettet PR-en og satt `jonas-har-sett` på slippet. Tidligst realistisk ute: i helga, med «slipp nå».

## Salgstallene (produksjonen, lest 27.11.2026 kl. 11.40; bare summer)

Alle beløp er brutto med mva., før betalingsgebyr. Butikken har vært åpen for alle siden 17.11 (ti hele døgn).

| | |
|---|---|
| Betalt i alt | 25 916 kr på 616 kjøp, 76 betalende |
| Per døgn | topp 3 863 kr (ons 18.11) og 3 980 kr (søn 22.11); de tre siste hele døgnene 1 737, 2 087 og 1 648 kr |
| Aktive per døgn | 110–130, jevnt; nye spillere har falt fra 394 (17.11) til 15–61 |
| Betalende av registrerte | 76 av 410 (18,5 %); 60 av 76 har kjøpt mer enn én gang |
| Første kjøp | median 9 timer etter at kontoen ble laget, tre av fire innen 1,4 døgn |
| Tilbakebetalt | 8 kjøp, 445 kr, alle hopp |

**Hva som selger** (betalt): hopp 7 993 kr (31 %), Sjøværspakken 5 229 kr (20 %, 21 kjøp av 11 spillere), «Ferdig nå» 3 667 kr (14 %), Skippertak 3 548 kr (14 %), haill og luksushaill 3 105 kr (12 %), Turbotrim 2 287 kr (9 %), utseende 87 kr (0,3 %). Det som sparer tid (hopp, verft, Skippertak, trim, uten pakken), er to tredeler.

**Hvem som betaler:** 15 spillere med 500 kr eller mer står for 18 535 kr (72 %); de 8 største for 13 445 kr (52 %, 1 129–2 834 kr hver). 72 av de 76 betalende var aktive siste uke. Blant de 15 største går pengene til hopp (6 070 kr), pakken (4 233), Skippertak (2 623), haill (2 212), verft (1 786) og trim (1 524).

**Inngangen:** første kjøp er «Ferdig nå» (19 kr) for 38 av 76, hopp for 19, Skippertak 2 t for 8. Haill er første kjøp for 4.

**Det som ikke blir kjøp:**
- 202 påbegynte betalinger løp ut mot 616 betalte (én av fire). 67 spillere har prøvd uten noen gang å betale (92 forsøk, 4 406 kr); 56 av dem var aktive siste uke.
- 334 registrerte har ikke betalt (217 aktive siste uke), og 556 er gjester (220 aktive siste uke) som ikke kan kjøpe.
- 105 betalte hopp kostet 5–9 kr og ga til sammen 629 kr; det faste gebyret per betaling tar en stor del av så små kjøp.

**Haill er det mye av gratis:** rundt 320 gratis haill ligger ubrukt (153 av 317 velkomstgaver, og fra puben, kapittel 2 og takk). Av Sjøværspakkens 120 leveringer er 53 ubrukt.

## Hva tallene sier om et tilbud

1. **Et prisavslag treffer de som alt betaler full pris.** 72 % kommer fra 15 spillere som kjøper hver dag. 30 % avslag må gi 43 % flere kjøp bare for å gå i null.
2. **Haill bør ikke være tilbudet.** Det er 12 % av salget, og spillerne har lagre av gratis haill.
3. **De største vil ha mer, ikke billigere.** Pakken er kjøpt 21 ganger av 11 spillere, og dyreste vare er 299 kr. Det stemmer med det Jonas så hos Laksebaronen 16.11 («selger mest av sin dyreste booster», `docs/systemer/haill-pub-og-bonus.md`).
4. **De som ikke har betalt, omvendes ikke av pris alene.** Kjøpet kommer det første døgnet eller sjelden. Det som virker der, er en smaksprøve (Jonas om kapittel 2: «haill som smaksprøve funker»), og Turbotrim er kjøpt av bare 13 spillere.
5. **Det største hullet er ikke prisen:** én av fire betalinger fullføres ikke. Hvorfor er ikke kjent (se «Usikkert»).

## Reglene tilbudet må holde

- **`docs/engasjement.md`, «Det vi ikke gjør»:** «Nedtellinger i butikken, "bare i dag". Sesongting kan fortjenes eller kjøpes igjen senere.» **`CLAUDE.md`:** tidspress er lov fra spillverdenen, «aldri knyttet til ekte penger eller butikken». Et klassisk Black Friday-salg bryter begge. Bare Jonas kan gjøre unntak (V2).
- **Førpris:** prisopplysningsforskriften § 9a krever at en prisnedsettelse oppgir førprisen, og førprisen er den laveste prisen de siste 30 dagene før salget. Forbrukertilsynet: det er ikke lov å sette opp prisen rett før Black Friday og sette den ned igjen. Prisstigen ble hevet 16.11.2026 (haill 29 → 39 kr, nye trinn 29/79/149/299), altså 11 dager før. «Før 39, nå 29» på haill ville hatt førpris 29 kr, altså ingen nedsettelse. § 9a er skrevet for varer; om den formelt gjelder digitalt innhold er ikke avklart her, men forbudet mot villedende prispåstander i markedsføringsloven gjelder uansett. Kilder: Forbrukertilsynets veiledning om salg og betingede tilbud (forbrukertilsynet.no, 2025), vedtaket om overtredelsesgebyr for ulovlige førpriser (2025), Kitchn-saken (2023: «Black Friday» sier i seg selv at tilbudet er begrenset til perioden).
- **Pakker med kjent innhold er lov** og finnes: «Spar X %» regnes fra de ekte enkeltprisene (`packWorth`), ikke fra en førpris.
- **Push bare om egen båt og eget redskap:** tilbudet kan ikke varsles med push. Patchnotatene nevner aldri butikk eller priser. En gave som leveres til kontoen, gir melding i telefonen slik takk-haillen gjør.
- **Gjester kan ikke kjøpe.** Ingen tilfeldighet for ekte penger. Lik pris for alle.

## Hva som finnes i dag

- **Prisene står to steder og må stemme:** spillet viser sine (`HAILL_PACKS`, `PACKS`, `BOOSTS`, `SKIP` i `core/03-simulation.js`), serveren tar betalt etter `products.price_nok` (`supabase/functions/shop-checkout/index.ts`). `tests/unit/butikk.test.mjs` vokter at de er like.
- **En pakke er en produktrad med `data.items`:** `shop_paid` gir én levering per del, med `n` for antall (`supabase/migrations/20261116180000_prisstige.sql`). Sjøværspakken: `PACKS.sesong`, `pk_sesong` i `SHOP_PRODUCT` (`ui/10i-shop.js`), kortet øverst i `kbShop` (`ui/phone/01-haill-fiske-service.js`), bildet i `KB_PIC`.
- **Gaver uten kjøp** finnes som produkter med pris 0 og `active` false (`reg_luksus`, `fb_haill`, `ach_haill`), gitt som `grants` uten `purchase_id`; spillet deler dem ut selv (`shopGive`).
- **Et produkt tas av salg** med `active = false`.

## Forslaget (valgt 27.11.2026)

**Ikke et prisavslag, men en større pakke og en gave.**

- **Black Week-pakken (arbeidsnavn), 499 kr, til og med mandag 30.11.2026:** Turbotrim 3 døgn, Skippertak 3 døgn og 8 haill. Delene koster 910 kr enkeltvis (299 + 299 + 8 × 39), så «Spar 45 %» med samme regnemåte og samme forhold som Sjøværspakken (454 → 249). Den hever taket for de 15 som kjøper mest, uten å senke prisen på noe som selger i dag.
- **Gaven:** én Turbotrim 2 timer til hver registrerte spiller, som melding fra Kaiboden. Den lar de 334 som ikke har betalt, prøve det som sparer tid, og meldingen fører inn i Kaiboden der pakken ligger øverst. Gjester får den når de registrerer seg i perioden.
- **Varigheten og unntaket (V2 B):** pakken selges til og med mandag 30.11.2026, og kortet sier det som en dato i tekst («Til og med mandag 30.11»), ikke som en klokke som teller. Det er et unntak Jonas har gjort fra «ingen nedtelling i butikken» og «tidspress aldri knyttet til butikken», for denne pakken alene; regelen står for resten av butikken (`docs/regler-bakgrunn.md`).
- **Slutten må holde:** «Black Week» sier selv at tilbudet er over etter perioden (Kitchn-saken), så pakken forlenges ikke. Spillet skjuler kortet etter datoen, og produktraden settes `active = false` 1.12 (en dataendring Jonas kjører). Gaven gis i samme periode.
- **Tida er knapp:** PR-ene må flettes og slippes med «slipp nå» for at pakken skal ligge ute i helga. Ute lørdag gir det knapt tre døgn.

## Fasene

| Fase | Bygger | Filer | Tester | Måles |
|---|---|---|---|---|
| **SF1** Pakken | `PACKS.blackweek`, `pk_blackweek`, produktraden (migrering, bare tillegg), kortet øverst i Kaiboden med eget bilde (ett `generate_game_asset`) og datoen i tekst, spillet skjuler kortet etter 30.11 og en pakke serveren ikke selger | `core/03-simulation.js`, `ui/10i-shop.js`, `ui/phone/01-haill-fiske-service.js`, ny migrering | `node tests/unit/run.mjs` (ny sjekk i `butikk.test.mjs`, sett rød først), `fasittest`, `sqltest`, skjermbilder i begge formater | kjøp per døgn, nye mot gamle betalende |
| **SF2** Gaven | produktet `gave_trim` (pris 0, ikke til salgs), funksjonen som gir én levering per registrerte konto én gang, meldingen i telefonen | ny migrering, `ui/10i-shop.js` (bare hvis `shopGive` ikke alt tar en trim uten kjøp) | `sqltest`, `fasittest` | hvor mange som bruker gaven, og kjøper trim innen sju døgn |
| **SF3** Avlesningen | ingen kode: produktraden av salg 1.12 (Jonas), spørringene under kjøres 1.12 og 7.12 og skrives inn her | denne fila | ingen | se «Måling» |

SF1 og SF2 er én PR hver til Jonas (`hoy`). Migreringene er bare tillegg og går med slippet.

## Valgene (svart 27.11.2026: V1 A, V2 B, V3 A, V4 A)

- **V1 Formen.** A: Mørketidspakken og gaven (**anbefalt**: hever taket der pengene er, og lovlig uten førpris). B: prosentavslag på butikken (treffer dem som betaler full pris, og førprisen holder ikke 11 dager etter prishevingen). C: bare gaven, ingen ny vare.
- **V2 Varigheten.** A: sesongpakke gjennom mørketida, til 15.1, tilbake neste år, ingen dato som teller ned (**anbefalt**: holder Jonas' egne regler). B: bare Black Week, til og med mandag 30.11, med datoen på kortet (krever at Jonas gjør unntak fra «ingen nedtelling i butikken»).
- **V3 Prisen.** A: 499 kr for trim 3 døgn, Skippertak 3 døgn og 8 haill (**anbefalt**: samme «Spar 45 %» som Sjøværspakken, dobbel pris). B: 399 kr for det samme (56 %; billigere enn de to 3-døgnsvarene hver for seg, tar mer fra salget som finnes). C: 599 kr med fem «Ferdig nå» i tillegg.
- **V4 Gaven.** A: Turbotrim 2 timer (**anbefalt**: det færrest har prøvd). B: én haill (spillerne har mange fra før). C: ingen gave.

## Måling

Leses i `purchases` og `grants`, bare summer: pakkens kjøp per døgn og hvor mange av kjøperne som er nye betalende; Sjøværspakken og 3-døgnsvarene før og etter (kannibalisering); samlet salg per døgn mot 1 650–2 100 kr de tre døgnene før; andelen av gavens mottakere som bruker den og som kjøper Turbotrim innen sju døgn; andelen betalinger som løper ut.

## Antatt og usikkert

- **Anslaget er en gjetning:** kjøper 8–12 av de 15 største pakken én gang, er det 4 000–6 000 kr brutto, minus det Sjøværspakken taper (rundt 370 kr i døgnet nå). Ti døgn med data og 15 spillere er for lite til mer enn det.
- **Hvorfor én av fire betalinger løper ut, er ikke kjent.** Stripe-koblingen var ikke innlogget i økta, så betalingsmåtene i kassa (Vipps, kort, Klarna) er ikke sett. `docs/systemer/monetisering-og-engasjement.md`: «Vipps er nesten et krav.»
- **Gebyret per betaling** er ikke slått opp; satsen står i Jonas' Stripe-avtale.
- **Om `shopGive` tar en trim uten kjøp,** og om en pakkedel kan være «Ferdig nå» (V3 C), ses i SF1 og SF2 før det loves.
- Om § 9a formelt gjelder digitalt innhold.
- **Hvor mange som ser tilbudet:** bare de som åpner Kaiboden eller får gaven. Det finnes ingen kanal ut til spillere som ikke åpner spillet, og det skal det ikke være.

## Hva planen ikke gjør

- Ingen prisendring på det som selges i dag, ingen «før/nå», ingen klokke som teller ned (bare datoen i tekst), ingen push om tilbudet, ingen forlengelse etter 30.11.
- Ingen tilfeldig innhold, ingen fiktiv valuta, ingenting til gjester for penger.
- Retter ikke betalingene som løper ut, og samler ikke små hopp i klipp: det er egne avgjørelser.
- Ingen e-post eller annonsering utenfor spillet.
