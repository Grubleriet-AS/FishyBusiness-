# Autonav 2.0: ny ruteplanlegger og ny styring fra bunnen av

Status: **valgene er tatt** (Jonas 23.11.2026, alle sju som anbefalt; Jonas' økt, grenen `ccr-399c74e8-91vrad`). Fasene står i køen som steg 140–147; F0 (steg 140) starter når Jonas sier «kjør på». Startmeldingen: `docs/planer/start/140.md`.

## Hva Jonas ba om

Jonas 23.11.2026: «Vi skal bygge «Autonav 2.0» fra scratch for å erstatte dagens autonav, som grunnstøter og kolliderer med kaier, moloer, havner, landmasse, sjømerker og bruer, i tillegg til å lage ulogiske ruter med lange omveier. Målet er null kollisjoner og grunnstøtinger, rene og naturlige ruter uten omveier, og at systemet fungerer like presist for den minste båten som for det største fartøyet. Løsningen må kjøre lett nok til at den aldri gir hakking i nettleseren på mobil, og den må være konsistent mellom sanntid og bakgrunns-/fraværssimulering.»

Arbeidsmåten han satte: diagnose og plan før kode; problemet delt i global ruteplanlegging og lokal styring/antikollisjon, parametrisert etter bredde, dybde, høyde, svingradius og bremselengde; dagens båtfysikk beholdes med mindre en konkret begrensning pekes ut; en automatisert benk som kjører gammel og ny Autonav gjennom krevende strekninger for minste og største båt; ingen slipp før 2.0 beviselig har null kollisjoner, kortere og mer naturlige ruter og akseptabel CPU-tid.

## Tallene i dag

**Hos spillerne** (`python3 tools/autonav/treff.py --days 7`, lest 23.11.2026; fangsten fra `core/16e-anvtreff.js`, bare spillere med samtykke, bare med båtmodellen i gang):

| | turer | berøringer | per 1000 turer | turer med berøring |
|---|---|---|---|---|
| Alle ruter | 10 131 | 378 | 37 | 232 (2,3 %) |
| Autonav | 2 829 | 200 | 71 | 115 (4,1 %) |
| Tegnet for hånd | 6 340 | 150 | 24 | 98 (1,5 %) |
| Retur | 510 | 9 | 18 | |
| Driftsplan | 452 | 19 | 42 | |

- Hva: land 214 (57 %), fartøy som ligger stille 77 (20 %), brudekke 47 (12 %, tre bruer), grunn 18, brygge, kai, flytebrygge og molo 21, merke 1.
- Når: ut fra kai 221 (58 %), seiling 87, «hendene» 45, inn mot kai 25. 56 % under 100 m fra rutas start eller mål.
- 17 grunnstøtinger (status `aground`), alle på ruter tegnet for hånd (`how: 'route'`); ingen på Autonavs egne ruter.
- Turene er korte: medianen for alle ruter er 0,9 nm; for Autonav 3,6 nm, 22 % over 10 nm. Alle båtene er 6–11 m (trebåt, snekke, sjark, plastsjark, skiff).

**I jakten** (`tools/autonav/jakt.py`, 13 skrogpunkter mot alt 3D tegner; `docs/planer/autonav-null-treff.md`): 558 hendelser per 1000 turer i grunnlinja 18.11.2026 (29 % av turene), 188 (11,3 %) på det som ble sluppet samme dag. Der er også de store båtene med.

**Testene:** `allpairs` er rød i Actions siden 17.11 (3 av 301 par, første bein ut fra Gamvik), `allesteder` går ut på tid hver natt (17 steder med skrogskade 19.11, sak #141 «kronisk»), `dyntest` er rød for `ringnot38`. Fem steder har ingen rute inn (backloggen «Autonav finner ikke veien inn til fem steder»).

## Diagnosen: hvorfor dagens Autonav feiler

Sju årsaker, de fire første er de som gir treffene.

1. **Det finnes ingen felles sannhet om hva som er farbart.** Planleggeren ser `obsIndex` og landmasken, veien gjennom havna og båtmodellens kontakt ser `fixIndex` og havneenhetene, og 3D tegner i tillegg fjæra (vannlinja ligger rundt 6 m utenfor kystlinja ved middelvann, `view3d/02-mesh-terrain.js:61-97`), kaimodulene, marinaene og moloer som er 16 m brede der kollisjonen har 9 eller 12 m. Kystens anlegg (`vec`-pakkene) er ikke del av sperra som holder klokka til kartet er inne (`mapSimPacks`, `core/01b-mapdata.js:117`); ruta venter høyst 4 s på dem (`obsLoad`, `core/11b-obstacles.js:530`). Planleggeren godkjenner derfor ruter gjennom ting den ikke hadde lastet eller ikke kjenner.
2. **Alt kontrolleres som en strek uten bredde.** Land hver 2.–5. m, dybde hver 20. m og skjær innen 12 m, alt langs midtlinja (`leiaLegOk`, `leiaLegFail` i `core/11-route.js:331-385`; `groundCheck` i `core/01-world.js:310-348`). Marginene er faste tall som ikke kommer fra båten: 100 m fra land utenfor havn, 20 m inne i havn, 0 ved endene, `B/2 + 1 m` gjennom havna, `B/2` ut fra kaiplassen. Skrogets sveipte areal er aldri kontrollert noe sted.
3. **Planen vet ikke hvordan båten beveger seg.** Ruta er veipunkter med skarpe knekk. Autopiloten kutter hjørnene med vilje (`lead0`, `core/16b-dyn.js:1095`) med `R·(1/cos(θ/2) − 1)`: ved 90° kutter sjarken 10 m (hindermargen `obsClr` er 8,1 m), kyst21 20 m (14,1 m) og den pelagiske tråleren 73 m (45 m). Hjørner ses bare 600 m fram (`:1041`), mens de store trenger 750–2 050 m for å komme ned i fart. Jo større båt, jo verre: det er derfor det ikke er «like presist for minste og største».
4. **Havna er det svakeste leddet, og der er spillerne.** 58 % av berøringene er «ut fra kai». Havnas vei inn (`approachPath`, `core/07-harbours.js:298-350`) går på 25 m-celler uten dybde og uten faste anlegg; veien til kaiplassen (`berthPath`) har `B/2` uten tillegg og faller tilbake på en rett strek når den ikke finner vei (`:458`); innen 600 m av et havnepunkt spør verken ruta eller grunnsjekken om dybde eller skjær. Stedene og kaiplassene er satt automatisk: 120 av 161 mottakshavner har en kaifront kortere enn havneenheten som står på den, og «hendene» må ta over ved rundt 11 % av stedene.
5. **Lapp på lapp.** Globalt: A* på 100, 200 og 50 m celler i vindu, korridor, leinett, lane på 25 m, lomme, deling, baklengs søk, innseilingslinje, mending, utretting, stramming og omveier rundt hindringer, hvert ledd med egne regler og unntak (`leiaRoute`, `:502-556`). Lokalt: siktelinjestyring, `dynAvoid`, `dynLineNudge`, seks slags «hender» og `sailReplan`. Hver retting har flyttet treffene et annet sted. Omveiene kommer herfra: 100 m-celler som stenger trange sund, leinettets knutepunkter, sikksakk-omveier og reserveløsninger som gir en annen vei A→B enn B→A.
6. **To motorer.** Med spillet åpent seiler båtmodellen (`dynAuto`); i bakgrunnen, ved fravær, for flåtens andre fartøy og i «Hopp» flyttes båten ett minutt av gangen rett mot neste veipunkt (`sail`, `core/05-vessels.js:835`), fra havnepunktet i stedet for kaiplassen, uten kontakt, uten veien gjennom havna og uten viking. Tid, diesel og vei blir ulike, og skjærsjekken slår terning (`Math.random() < 0.5`, `01-world.js:346`). Bakgrunnsturene er aldri blitt kontrollert for treff, verken i jakten eller hos spillerne.
7. **Regningen går på hovedtråden.** Rutesøket går i skiver på 8 ms mellom bildene (målt 90–130 ms i utrettingen nær land), `dynLineBuild` blokkerer 60–330 ms ved avgang, lange ruter tar 1–8 s. Tallene er fra en PC uten skjerm; en telefon er flere ganger tregere.

## Det i kartgrunnlaget og fysikken som hindrer god navigasjon

**Kartgrunnlaget** (må rettes som del av 2.0, ellers kan ingen planlegger garantere null):

- **Dybden nær land er grov:** 50 m-celler i halve meter, hentet fra cellene lenger ut inntil land, syntetisk der Kartverket mangler data. Spillet kan ikke vite den ekte dybden ved en kai. 2.0 trenger én regel som 3D, kollisjonen og ruta er enige om (se «Farbarhetskartet»).
- **Skjær er punkter uten størrelse** (98 056 langs kysten), med 12 m fast avstand og terning.
- **Bruene har oppdiktet seilingshøyde** (3,6 % av lengden, 6–42 m; en bru under 60 m er en vegg for alle) og oppdiktede pilarer, og **båtene har ingen høyde**: `obsAir` er 0,35 × lengden (`11b-obstacles.js:20`).
- **Samme ting har flere geometrier,** og noe tegnes uten å finnes i kollisjonen (fjæra, kaimodulene, marinaenes småbåter).
- **Stedene:** kaiplasser satt automatisk på for korte kaifronter, og havner der dybden ikke er sjekket.
- **Fartøy som ligger stille** (ferja ved kaia, NPC-båter) kommer i veien etter at ruta er lagt: 20 % av berøringene.
- **Leinettet** er baket 08.10.2026 for en 7 m båt mot datidens kart.

**Båtfysikken beholdes.** Skrogdynamikken hindrer ikke trygg navigasjon. Tre ting må likevel sies:

- `VESSELS` mangler høyde over vannet. Feltet må inn (data, ikke fysikk).
- `ringnot38` er underdrevet mot massen (stopp 18 båtlengder, 692 m fra marsjfart; kjent rød i `dyntest`, havsteget H5 eier kalibreringen). 2.0 leser stopplengden fra `dynCal` og blir trygg uansett, men ringnota må begynne å bremse over en kilometer før havna til den er kalibrert.
- Roret skifter fortegn når hun bremser akterover med fart forover; den nye styringen må vite det.

## Arkitekturen

Tre grunnregler, så de to delene Jonas ba om.

**A. Én sannhet: farbarhetskartet.** Én modul svarer på «hvor langt er det herfra til nærmeste ting denne båten ikke kan gå over eller under», for båtens dypgang og høyde. Den bygges fra den samme geometrien 3D tegner: kystlinja med fjæra som dybde, dybden med tidevann, skjær med en størrelse, alle faste anlegg i sin egen form, brupilarer og brudekk, merker, turbiner, havneenhetene og det som regnes ut ved kjøring (naust, rorbukai, NPC-havnenes brygger). Planleggeren, styringen, vakta, bakgrunnsturen og kontakten spør bare den. Søket går på et rutenett over avstandsfeltet; den endelige kontrollen går på den ekte geometrien. Kartpakkene den trenger, lastes før en rute godkjennes: ingen tidsfrist som godkjenner det ukjente.

**B. Ruta er en bane, ikke en strek.** Planleggeren leverer rette strekk og buer båten faktisk kan seile (radien fra hennes egen svingeevne ved den farten), en fartsprofil (avslakking før svinger og havner etter hennes egen bremseevne fra `dynCal`, fartsgrensene) og en kontrollert fri korridor rundt: halv bredde + sporfeilen hun har i den farten + margin. Det er skrogets sveipte areal som kontrolleres, og marginene regnes fra båten, så samme kode gir 2 m for trebåten og 40 m for tråleren.

**C. Samme bane i sanntid og bakgrunn.** Båtmodellen følger banen innenfor toleransebåndet som alt er med i korridoren. Bakgrunnen, fraværet, flåtens andre fartøy og «Hopp» leser den samme banen etter klokka. Samme vei, samme ankomsttid, samme diesel, ingen terning.

### Global ruteplanlegging (hovedleden)

| Nivå | Gjelder | Slik |
|---|---|---|
| **G1 Nærområdet** | turer opp til rundt 25 km, og tilkoblingen til hovedleden i begge ender. Over 90 % av turene | Fritt-vinkel-søk (Theta*-typen) på farbarhetskartet: rette, naturlige strekk direkte, uten trappetrinn som må rettes ut etterpå. Kostnaden er tid, med et lite tillegg nær land der det er plass (sjømannsavstand uten omvei). Minsteklaringen er hard og kommer fra båten |
| **G2 Havna** | de første og siste 300–500 m, og kaimanøveren | Søk med kurs (posisjon + retning, skroget som rektangel): rygge ut, snu, gå. Samme algoritme for mottak, verft, butikk, rorbu og naust. Egen kaifront er eneste unntak fra klaringen, og bare under 1 knop |
| **G0 Hovedleden** | lange ruter | Leinettet baket på nytt med den nye kontrollen, med smaleste bredde, grunneste dybde og laveste bru lagret per etappe. Ett nett for alle båter: hver båt bruker etappene som er brede, dype og høye nok for henne. Søket i nettet tar millisekunder |

Ruta blir den samme A→B som B→A (bortsett fra kaimanøveren). Finnes ingen rute, sier Autonav hvorfor og hvor: «for grunt (2,1 m) i sundet ved …», «brua er for lav», «kaia er for kort for båten».

### Lokal styring og antikollisjon

- **Banefølgeren** styrer etter banens buer (svingen begynner der buen begynner, ikke etter en tommelfingerregel), holder fartsprofilen og retter opp vind og strøm.
- **Vakta** går hvert tikk: (1) hun er alltid innenfor båndet, ellers slakker hun, og går hun ut, stopper hun kontrollert og får ny bane derfra; (2) farten er aldri høyere enn at stopplengden hennes får plass i den kontrollerte frie veien forut. Det er dette som gjør null til en regel og ikke et håp: hun er aldri i en tilstand hun ikke kan stoppe fra.
- **Andre fartøy:** et fartøy som ligger stille i banen, er et hinder banen legges utenom. For fartøy i fart: farten først, og sideavvik bare innenfor korridoren som alt er kontrollert fri. Vikemanøveren kan da ikke føre henne på land, slik den kan i dag (`sjvRoomOwn` sjekker to streker uten bredde).
- **Parametrene** leses fra båten: bredde, lengde, dypgang (+ squat), høyde (nytt felt), svingradius per fart, stopplengde og avslakking (`dynCal`), tverrpropeller.

### CPU

Planleggeren og avstandsfeltene går i en Web Worker (spillet har alt fire, blant annet for kystindeksen og `vec`). Hovedtråden samler bare geometrien og tar imot banen. Banefølgeren og vakta er noen titalls oppslag per tikk.

## Benken (kravet til verifisering)

`tools/autonav/benk.py`, bygget på jakten:

- **Strekningene** (`tools/autonav/strekninger.json`, navngitt og fast): trange havneinnløp, moloer, brupasseringer, trange sund, leder med merker på begge sider, kaiplasser bak brygger; fra spillernes verste steder (Sandshamn, Urangsvåg, Engenes, Ålesund, Værøy, de tre bruene), jaktens verste, de fem stedene uten rute i dag, og et utvalg av de 388 sundene i `strom.json` og bruene i `vec`. Sør, midt og nord.
- **Båtene:** minste (`skiff`, 5,9 m), den vanligste (`sjark`), `kyst21` og den største stedet tar (opp til `pelagisk`, 75 m × 15,5 m × 7,5 m).
- **Begge motorer:** hver strekning seiles med båtmodellen og som bakgrunnstur.
- **Uavhengig observatør:** hele skrogomrisset, sveipt mellom stegene, mot den rå geometrien 3D tegner (ikke mot farbarhetskartet, så en feil der blir sett), med skjær og brudekk.
- **Det som måles, gammel mot ny:** treff; rutelengde mot dagens og mot en fasit (fint søk med samme minstemål); knekk per nm og korte legger; planleggingstid og lengste blokkering av hovedtråden med CPU-en strupet fire ganger; sanntid mot bakgrunn (tid, diesel, vei); steder uten rute.
- **Porten for slipp** (startverdier): 0 treff på hele benken og på en full jakt (minst 2 000 turer), i begge motorer; ingen rute lengre enn dagens uten at dagens gikk gjennom noe; medianen høyst 5 % over fasiten; hovedtråden aldri blokkert over 4 ms; sanntid og bakgrunn innen 2 % på tid og diesel; ingen steder mister ruta.

## Fasene

Hver fase er én økt (F2 og F3 kan trenge to). Gammel Autonav står urørt og er standard til F6.

| Fase | Bygger | Filer | Ferdig når |
|---|---|---|---|
| **F0 (steg 140) Benken og grunnlinja** | Strekningslista, observatøren, målene, kjørt på dagens Autonav. Forklarer brudekk-treffene hos spillerne | `tools/autonav/`, `tests/` | Benken gir tall for dagens Autonav på alle strekninger og begge motorer; den er rød der spillerne og jakten har treff |
| **F1 (steg 141) Farbarhetskartet** | Én geometri, avstandsfelt i worker, dybderegelen, skjær med størrelse, `VESSELS.air`, bruhøyder | ny `core/17-farbar.js`, `02-species-gear.js` (felt), `tools/map/` ved behov | Enhetstester mot rå geometri; observatøren og kartet er enige på benkens strekninger; lista over det 3D tegner annerledes er tom eller avgjort |
| **F2 (steg 142) Planleggeren nær og i havn** | G1, G2, banen, bakgrunnsturen | ny `core/17b-bane.js`, `17c-plan.js` (worker) | 0 treff på benkens korte strekninger som bakgrunnstur, alle båter; lengde og CPU innen porten |
| **F3 (steg 143) Styringen** | Banefølgeren, vakta, kaimanøveren, sanntid = bakgrunn | ny `core/17d-styr.js`, ett kall i `16b-dyn.js` | 0 treff i sanntid for alle båter i vind 3, 9 og 14 m/s; sporfeilen målt per båt og lagt inn i korridoren |
| **F4 (steg 144) Hovedleden** | G0, leinettet baket på nytt, lange ruter | `tools/leia/`, `src/data/leinett.json`, `17c-plan.js` | Alle mottakspar og alle steder har rute; Oslo–Kirkenes under 1 s strupet |
| **F5 (steg 145) Trafikken og resten** | Fartøy som ligger stille, vikeplikt i korridoren, søvn, retur, driftsplan, redningsskøyta, «Hopp» | `05e-sjovei.js`, `05-vessels.js`, `06-*` (kall), `06j-hopp.js` er `hoy`: PR til Jonas | Benken med trafikk: 0 treff; alle 17 kall til `leiaRoute` går på den nye |
| **F6 (steg 146) Bytte og slipp** | Full jakt, regresjon, testutgaven, gradvis slipp, fangsten merker motoren | `16e-anvtreff.js` (ett felt), flagget | Porten holder; Jonas har sett den på nettbrettet |
| **F7 (steg 147) Rydding** | Gammel kode ut (`11-route.js` med flere) | | Etter to uker uten treff hos spillerne |

Lagringen endres ikke: `S.plan.wps` er som før, og banen regnes fra veipunktene ved oppstart.

## Valgene (besvart av Jonas 23.11.2026, i spørsmålsverktøyet)

Alle sju ble som anbefalt. Det som ikke ble valgt, står med for sammenhengen.

1. **Andre fartøy i «null»: «Liggende er hindre».** Fartøy som ligger stille, er hindre ruta legges utenom. NPC-er legger aldri til i spillerens kaiplass eller vei inn. For fartøy i fart slakker og viker Autonav, men bare innenfor korridoren som er kontrollert fri. *Ikke valgt:* bare det faste teller (fartøy som spøkelser); alt teller og Autonav venter.
2. **Ruter tegnet for hånd: «Rett til trygg bane».** Ved «Kast loss» rettes den tegnede ruta til nærmeste trygge bane, vist i kartet. Båten grunnstøter aldri på en rute; grunnstøting finnes bare når spilleren styrer selv ved roret. Det erstatter dagens regel om at en rute tegnet gjennom grunna (`pl.unsafe`) grunnstøter. *Ikke valgt:* stopp foran faren uten retting; som i dag.
3. **Kaimanøveren: «Fysikk med hjelp».** Båten seiler en planlagt manøver med fysikken (rygge, snu, propeller). En avgrenset hjelp fører henne langs banen bare når hun under 3 knop er i ferd med å forlate den kontrollerte korridoren, og benken teller hvor ofte. *Ikke valgt:* alltid ført; ren fysikk.
4. **Marginene: «Tilpasset».** Harde minstemål fra båten: halv bredde + målt sporfeil + 2 m til siden, dypgang + squat + 0,5 m under kjølen ved laveste vann på turen, båtens høyde + 1 m under bruer. I tillegg sjømannsavstand (rundt en båtlengde, minst 30 m fra land) bare der det er plass og det koster under et par prosent ekstra vei. *Ikke valgt:* romslig (alltid 50–100 m); stramt (bare minstemålene).
5. **Steder som ikke passer en båt: «Tilpass havna».** Havna tilpasses båtene stedet tar i dag: en mudret renne og småbrygger bort langs den kontrollerte veien inn, som «Mudre havnene» 18.11.2026. Et sted stenges for en båtstørrelse bare som siste utvei, med forklaring i kartplotteren. *Ikke valgt:* steng stedet for størrelsen og rett dataene sted for sted.
6. **Bruene: «Ekte høyder».** Båtene får en ekte høyde som eget felt. Bruene får seilingshøyde fra offentlig kilde der den finnes (kilde og lisens sjekkes først, og oppgis), ellers dagens anslag, og 3D tegner brua med samme høyde. *Ikke valgt:* dagens anslag beholdt.
7. **Slippet: «Gradvis».** 10 % av spillerne først, så 50 % og 100 %, hvert trinn etter noen døgn der fangsten viser færre berøringer per 1000 turer enn gammel Autonav. Nødbremsen står på, og gammel Autonav ligger klar å falle tilbake på. *Ikke valgt:* alle samtidig.

**Det valgene betyr for byggingen:**

- Valg 2 gjør at vakta og banebyggeren (F2 og F3) også tar ruter spilleren tegner: rutepanelets varsler («Etappe WP2→WP3 krysser land», `legHazard`, `pl.unsafe`) og den grå «Kast loss»-knappen må følge den rettede banen. Det er en synlig endring i kartplotteren (`ui/03b-route.js`, `ui/07-guide.js`) og skal ses i begge formater.
- Valg 5 trenger mudringen og fjerningen som data i farbarhetskartet (F1), slik `depthNav` og `vecGone` gjør det i dag, så 3D, kollisjonen og ruta er enige.
- Valg 6 legger en kildesjekk og et datasteg inn i F1 (`tools/map/`), og et felt i `VESSELS`.
- Valg 7 trenger et flagg som ikke ligger i lagringen (egen nøkkel, ikke `kystfiske_v2`) og et felt for motoren i fangstens hendelser (F6).

## Antatt eller usikkert

- Hvorfor spillernes båter kommer under brudekk på Autonavs egne ruter (29 berøringer, tre bruer), er ikke forklart. F0 finner det.
- Om bruenes seilingshøyde finnes i en åpen kilde med god dekning (OSMs `seamark:bridge:clearance_height`, NVDB, Kystverket), er ikke sjekket. Kilden og lisensen sjekkes i F1 før noe bygges inn.
- Sporfeilen per båt og fart er ikke målt. Korridorens bredde settes fra målingen i F3, ikke fra et anslag.
- Tidene er fra PC. Kravet (4 ms, strupet fire ganger) er et anslag på en vanlig telefon; bare Jonas kan måle på en enhet.
- Om avstandsfeltene får plass i minnet på en telefon ved siden av 3D (LRU-budsjettet for kartet er 96 MB), måles i F1.
- Fasenes størrelse: F2 og F3 er de tyngste og kan bli to økter hver.
- Benkens port (5 % over fasiten, 2 % mellom motorene) er startverdier.

## Hva planen ikke gjør

- Endrer ikke skrogdynamikken eller kalibreringen av båtene (`dynCal`; ringnota er havsteget H5 sin).
- Endrer ikke styringen for hånd ved roret.
- Endrer ikke lagringsformatet, betalingen eller databasen. «Hopp» (`06j-hopp.js`, `hoy`) får bare en ny tidskilde, som PR til Jonas.
- Lager ikke nye steder eller flytter handelssteder; bare kaiplassen og veien inn der kontrollen krever det.
- Lar ikke merkenes side (lateral, kardinal) styre ruta (Jonas 12.11.2026: hvilken som helst side er lov når ruta er trygg).
- Fjerner ikke gammel Autonav før 2.0 har gått hos spillerne uten treff.

## Status

- 23.11.2026: diagnosen og planen skrevet. Jonas svarte på de sju valgene samme dag, alle som anbefalt. Fasene lagt i køen som steg 140–147, startmeldingen for F0 skrevet (`docs/planer/start/140.md`). Venter på «kjør på» for F0.
