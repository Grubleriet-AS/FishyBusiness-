# Autonav 2.0: ny ruteplanlegger og ny styring fra bunnen av

Status: **F0 ferdig, F1 er neste** (23.11.2026, Jonas' økt, grenen `ccr-399c74e8-91vrad`). Valgene er tatt (Jonas 23.11.2026, alle sju som anbefalt), fasene står i køen som steg 140–147, og benken har gitt grunnlinja for dagens Autonav («Grunnlinja» og «Det benken fant» under). Startmeldingen for F1: `docs/planer/start/141.md`.

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

## Grunnlinja: dagens Autonav på benken (F0, steg 140, 23.11.2026)

`python3 tools/autonav/benk.py` på bygget `8d7a30f732df` (grenen `ccr-399c74e8-91vrad`, `src/` som arbeidsgrenen), kartet `kart-31`. 97 faste strekninger (`tools/autonav/strekninger.json`: 38 fra spillernes fangst, 14 fra jakten og `allesteder`, 10 fra backloggen, 15 bruer, 14 trange sund, 6 andre; 31 sør, 25 midt, 41 nord), hver med `skiff`, `sjark`, `kyst21` og den største båten stedene tar. Full fart (spillernes standard), sjøkartnull hele turen, vind 3 m/s fra sørvest. Hele rapporten med tabellen per strekning: `docs/planer/autonav-benk/grunnlinje-2026-11-23.md`; rådataene til senere sammenligning (`--sammenlign`): `docs/planer/autonav-benk/grunnlinje/turer.jsonl`; bilder av åtte strekninger (ruta, fasiten og treffene): `docs/planer/autonav-benk/bilder/`.

333 kombinasjoner av strekning og båt (13 til der stedet ikke tar båten). **41 fikk ingen rute.** De 292 andre ble seilt i begge motorer.

| Motor | turer | kom fram | turer med treff | treff | per 1000 turer |
|---|---|---|---|---|---|
| Båtmodellen (spillet åpent) | 292 | 291 | 77 (26 %) | 140 | 479 |
| Bakgrunnstur (minuttsteget) | 292 | 292 | 95 (33 %) | 149 | 510 |

Et treff er skroget (hele omrisset, sveipt mellom stegene) inntil noe 3D tegner i sjøen; samme slags berøring under 60 m fra den forrige er én hendelse. Båtens egen kaiplass (under 1 knop innen halvannen båtlengde fra endene, og det hun lå inntil da hun kastet loss) telles ikke. 61 av 97 strekninger har treff for minst én båt i minst én motor; 29 av de 38 fra spillernes fangst.

| Båt | turer | med treff, båtmodellen | med treff, bakgrunn |
|---|---|---|---|
| `skiff` (5,9 m) | 95 | 14 (15 %) | 30 (32 %) |
| `sjark` (10,6 m) | 87 | 14 (16 %) | 27 (31 %) |
| `kyst21` (21 m) | 75 | 27 (36 %) | 20 (27 %) |
| den største stedene tar (15–75 m) | 35 | 22 (63 %) | 18 (51 %) |

| Hva | båtmodellen | bakgrunn |
|---|---|---|
| land | 56 | 52 |
| grunn | 21 | 10 |
| brudekke lavere enn båten | 20 | 20 |
| brygge | 12 | 9 |
| fartøy som ligger stille | 10 | 24 |
| kai | 6 | 17 |
| flytebrygge | 6 | 6 |
| merke | 5 | 7 |
| skjær | 3 | 0 |
| molo | 1 | 2 |
| brupilar | 0 | 2 |

Med båtmodellen kom 58 av treffene under seiling, 44 ut fra kai, 19 mens sikkerhetsnettet lette etter vei, 14 under «hendene» og 5 inn mot kai. «Hendene» tok båten på 92 av 292 turer (gjennom havna 43, skarpt hjørne ved et merke 25, sto fast 20, støt 13, forbi grunt vann 8, naustet 4). I tillegg lå skroget over fjæra slik 3D tegner den på 144 av turene med båtmodellen og 102 av bakgrunnsturene; det telles for seg, se «Det benken ikke ser».

**Rutene mot fasiten** (korteste vei med bare minstemålene: halv bredde + 2 m til siden, 0,5 m under kjølen; 279 ruter):

- Medianen er 1,14 ganger fasiten, 90-prosentilen 1,86, den lengste 14,05. 128 ruter er mer enn 15 % lengre enn fasiten, 41 mer enn 50 %.
- Knekk over 30° per nautisk mil: median 1,8, 90-prosentilen 4,3. 20 av 292 ruter har legger kortere enn to båtlengder utenfor havn.
- 5 ruter er kortere enn fasiten fordi de går gjennom noe: brua på Marøyvegen (0,2 ganger fasiten for `skiff`, `sjark` og `kyst21`), Henningsværbrua med den pelagiske tråleren (0,29) og Knarrlagsund med `kyst21` (0,52).

| De lengste omveiene | båt | rute nm | fasit nm | forhold |
|---|---|---|---|---|
| Under Steinvågbrua i Ålesund | `skiff`, `sjark` | 6,86 | 0,49 | 14,05 |
| Sundet nord for Sørarnøy | `kyst21` | 4,93 | 0,66 | 7,43 |
| Under Sørsundbrua i Kristiansund | `kyst21` | 2,35 | 0,49 | 4,78 |
| Ålesund verft–Ålesund | `skiff`, `sjark` | 6,01 | 1,57 | 3,82 |
| Smøla vest, ut gjennom sundet | `kyst21` | 1,86 | 0,57 | 3,27 |
| Bøvågen–rorbua Marøy | `skiff`, `sjark`, `kyst15` | 4,19 | 1,28 | 3,26 |
| Sundet nord for Sørarnøy | `sjark` | 1,80 | 0,66 | 2,71 |
| Brua på Reksundveien ved Averøy | `kyst21` | 4,02 | 1,49 | 2,70 |

**Uten rute (41):** «Fant ingen rute dit» 28, «For grunt der for båten» 7, «Fant ingen trygg rute dit» 6; den pelagiske tråleren 15, `sjark` 10, `kyst21` 9, `kyst15` 5, `skiff` 2. Elleve av dem er veien inn fra åpent vann til de fem stedene i backloggen (Vallersund og naustet der, Urangsvåg utstyrsbutikk, rorbuene Valen og Evja): alle båtene fra `sjark` og opp får nei, og heller ikke fasiten finner vei ved sjøkartnull. For 12 av de 41 har fasiten en vei: Saltstraumbrua (`kyst21`, pelagisk), Tromsøbrua (pelagisk), sundene ved Stamsund og Melandsjø (`kyst21`), ved Seløy, Sørarnøy, Bølandet og i Hvaler (pelagisk), rundt Hønebrua fra begge sider (pelagisk) og Smøla nord (`skiff`).

**CPU** (CPU-en strupet fire ganger, kjørt alene; en PC, ikke en telefon):

- **Rutesøket:** median 248 ms, 90-prosentilen 5,0 s, lengst 54 s (Engenes–rorbua Straumen, som ender uten rute). Ruter under 2 nm (193 av dem): median 139 ms, 90-prosentilen 0,8 s.
- **Lengste blokkering av hovedtråden under søket:** median 113 ms, 90-prosentilen 382 ms, lengst 10,7 s (Bodø–Helligvær, 16 nm). Over 4 ms i 327 av 333 søk, over 50 ms i 236. Søket deler seg i skiver på 8 ms (`LEIA.slice`) og måler sin egen lengste skive til 14 ms i median; den målte blokkeringen er over det dobbelte i 168 av 292 søk, altså i deler søket ikke deler opp.
- **Båtmodellen de første 120 tikkene fra kai** (trafikken rundt båten slått opp på forhånd): tyngste tikk 47 ms i median, 251 ms i 90-prosentilen, 486 ms på det meste; over 4 ms på 291 av 292 turer og over 50 ms på 133. Det tyngste kommer ved første minuttskifte. Et vanlig tikk tar 2,5 ms i median, og 33 av de 120 tikkene er over 4 ms.
- **Trafikken** slås opp første gang på et nytt sted på 99 ms i median og 10,4 s på det meste. Det er ikke Autonavs kostnad (spillet betaler den når kartet eller 3D tegner de andre fartøyene), men uten et bilde åpent havner den på første tikk, og den er holdt utenfor tallene over.

**Sanntid mot bakgrunn** (291 turer der begge kom fram, samme rute):

- Tiden avviker 11 % i median, 65 % i 90-prosentilen og 150 % på det meste. 229 av 291 avviker mer enn 2 %.
- Dieselen avviker 10 % i median og 33 % i 90-prosentilen.
- Bakgrunnsturen har flere treff ved endene (ut fra kai 54, inn mot kai 14) enn båtmodellen (44 og 5): den starter i havnepunktet og går rett mot neste punkt, uten veien fra kaiplassen.

**I 14 m/s vind** (`--vind 14`, fra sørvest; samme ruter, uten fasit og CPU; `docs/planer/autonav-benk/vind14/turer.jsonl`):

- Båtmodellen: treff på 96 av 292 turer (33 %, mot 26 % i 3 m/s), 175 treff (mot 140). Land 75 (mot 56), kai 15 (mot 6), brygge 17 (mot 12). «Hendene» tok båten på 114 turer (mot 92).
- `skiff` har treff på 32 % av turene (mot 15 %); `sjark` 18 %, `kyst21` 36 % og de største 66 % er som i 3 m/s. Vinden tar de små.
- 27 turer kom ikke fram, 23 av dem med `skiff`: de fleste ligger stille eller har snudd etter spillets egen vindregel, to endte med skrogskade etter støt mot kai, og to med motorstopp.
- Bakgrunnsturen er som i 3 m/s (92 turer med treff, 145 treff): minuttsteget kjenner ikke vinden. 24 kom ikke fram, av samme vindregel.

**Gir benken samme svar to ganger?** 12 strekninger (45 kombinasjoner) kjørt to ganger etter hverandre: samme ruter, samme antall turer med treff (25 og 30) og samme antall treff (54 og 46). 5 av 45 skilte seg, alle med båtmodellen: turens lengde med 1–13 minutter, og på to turer som alt hadde treff, hvilke ting hun kom borti. Mot den fulle kjøringen (tre deler side om side, annen rekkefølge) skilte 7 av 45 seg, to av dem med ett treff. Rutene gjentar seg, bakgrunnsturene på minuttet nær; båtmodellen leser veggklokka og gjentar seg ikke helt.

## Det benken fant

1. **Bruene: Autonav legger ruta gjennom bruer spillet selv regner som stengt.** 42 av spillernes 47 berøringer med brudekk ligger ved tre bruer: Marøyvegen ved Bøvågen (54 m; 21 berøringer), Hønebrua ved Sandshamn verft (80 m; 11) og brua ved Straumen innenfor Engenes (53 m; 10). Tre til ligger ved Reksundveien ved Averøy (24 m). Spillet gir alle bruer under 60 m underkant 0 («en vegg», `obsBridge` i `core/11b-obstacles.js:34`), og dekket ellers en høyde etter lengden. Benken gjenskaper alle tre:
   - **Marøyvegen:** ruta går rett gjennom brua for `skiff`, `sjark` og `kyst21`, 0,52 nm der veien rundt er 2,64 nm, og begge motorene seiler gjennom dekket. Det samme på ruta Bøvågen–rorbua Marøy.
   - **Straumen:** `skiff` får en rute gjennom brua begge veier; `sjark` og `kyst15` får «Fant ingen rute dit». Rorbua Straumen kan altså bare nås av de minste båtene, og da gjennom en vegg. Hos spillerne var det snekka.
   - **Hønebrua:** fra Sandshamn verft og vestover går `sjark` (4,7 m høy) og plastsjarken (4,3 m; prøvd for seg) under et stykke av dekket med 4,2 m underkant, i 4,7 knop: samme fart som i alle 11 berøringene hos spillerne, som alle var plastsjarker. Fasiten går under midten, der dekket er 5,9 m.
   - **Frovåg på Senja, Reksundveien og veien inn til Vallersund:** samme sak (alle båtene ved Frovåg, den pelagiske tråleren ved Reksund, `skiff` ved Vallersund). Henningsværbrua og Storvalen bru med den pelagiske tråleren, og en bru på veien Knarrlagsund–Ansnes med `kyst21`: dekk lavere enn båten.
   - **Årsaken** er tre ting sammen: (a) brumodellen er oppdiktet (ekte båter går under disse bruene); (b) når ruta treffer en hindring og `obsDetour` ikke finner en vei rundt, beholdes etappen som den er (`obsRoute0`, `core/11b-obstacles.js:510`: punktet legges i ruta uansett), så en «vegg» stenger ikke; (c) brudekket finnes ikke i båtmodellens kontakt, så hun seiler gjennom det uten støt, mens 3D tegner brua.
   - Ruta ble den samme med og uten kystens anlegg pakket ut på forhånd i alle kombinasjonene, også med CPU-en strupet. Fristen på 4 s (`obsLoad`) slo altså ikke til her, og er ikke forklaringen på disse treffene.
   - Samtidig går ruta 14 ganger for langt rundt Steinvågbrua, som `skiff` og `sjark` går under etter spillets egne tall. Bruene er både for åpne og for stengte.
   - **Jonas 23.11.2026, spurt om bruene skulle hasterettes i dagens Autonav eller stenges til 141: «Med steg 141».** Bruene rettes i steg 141 sammen med de ekte høydene (valg 6), i 3D og kollisjon samtidig. Ikke valgt: en hasteretting nå med en gjettet høyde for de korte bruene; å nekte ruter gjennom bruer som er vegger til 141.
2. **Jo større båt, jo flere treff:** 15 % av turene for `skiff`, 16 % for `sjark`, 36 % for `kyst21` og 63 % for de største. Det er diagnosens punkt 2 og 3 (strek uten bredde, hjørnekutt større enn marginene) målt.
3. **Bakgrunnsturene treffer oftere enn båtmodellen** (33 % mot 26 %) og har aldri vært målt før: 24 fartøy som ligger stille, 17 kaier, 54 treff ut fra kai.
4. **Omveiene finnes og er store:** 41 av 279 ruter er mer enn 50 % lengre enn korteste vei, og medianruta har 1,8 knekk over 30° per nautisk mil.
5. **Autonav sier nei der det er vei:** 12 av 41 uten rute har en vei som holder minstemålene. For de fem stedene i backloggen er det motsatt: der finnes ingen vei inn som holder minstemålene ved sjøkartnull for båtene fra `sjark` og opp, så de må tilpasses i dataene (valg 5).
6. **De to motorene er uenige om tiden** (11 % i median) på samme rute.
7. **«Hendene»** tar båten på en tredel av turene (92 av 292).
8. **Regningen holder hovedtråden:** 113 ms i median og opptil 10,7 s under rutesøket, og 47 ms i median ved avgang, med CPU-en strupet fire ganger. Porten er 4 ms.

## Det benken ikke ser

- **Kaimodulene som 3D bygger ut til kaiplassene, og småbåtene i marinaene:** de finnes bare i 3D-visningen. F1 avgjør dem.
- **Fjæra** (bakken 3D tegner fra kystlinja og 13,5 m ut) telles i egen kolonne, ikke som treff: 3D graver ut ved kaiplassene og har loddrette kaifronter ved havneenhetene, og benken kjenner bare rampen. Tallet (144 av 292 turer) er derfor et øvre anslag. F1 gjør fjæra til dybde i farbarhetskartet, og da telles den.
- **Fartøy i fart** rapporteres for seg (0 treff i grunnlinja), fordi de er spøkelser for Autonav i dag (`SJV.ghost`).
- **Fasiten** er en nedre grense, ikke en rute: ingen svingradius og ingen fart, 5 m-celler (2,5 m når et sund er trangt). For 42 kombinasjoner finner fasiten ingen vei. 29 av dem har heller ingen rute. De 13 andre har en rute som da går gjennom en bru som er en vegg (Straumen, Frovåg og veien inn til Vallersund) eller over vann grunnere enn minstemålet for et havfartøy (den pelagiske tråleren, 7,5 m dypgang, i havner mudret til 4,35 m: Senjahopen, Reksund, Storvalen; snøkrabbefartøyet ved Napp).
- **Bare sjøkartnull,** og vinden bare i 3 og 14 m/s fra sørvest. 9 m/s, andre retninger og tidevannet som det går, kommer med F3 (`--vind`, `--retning`).
- **En PC, ikke en telefon.** CPU-en er strupet fire ganger i nettleseren; hakking på en ekte enhet ser bare Jonas.
- **Båtmodellen gjentar seg ikke helt** (over): et treff fra eller til på en tur som alt har treff, er innenfor støyen. Porten «0 treff» har ingen slik støy å gjemme seg i.

## Farbarhetskartet (F1, steg 141, 23.11.2026: pågår)

Jonas 23.11.2026: «Kjør på med steg 141». `src/js/core/17-farbar.js` er den ene sannheten om hva en båt kan seile over og under. Ingenting i spillet kaller den ennå; gammel Autonav er urørt og seiler som før.

**Det den svarer på,** for en båt med bredde, dypgang og høyde (`farbBoat`):

- `farbNearest`, `farbClear`: hvor langt det er fra et punkt til nærmeste ting hun ikke kan passere (land, kystlinja, alt fast i sjøen, et brudekke som er lavere enn henne, og fartøy som ligger stille når det spørres med `boats`).
- `farbPose`: om skroget i en stilling er fritt. Vannlinjas omriss (det samme som benkens observatør har) prøves mot kystens egne kanter og hver tings egen form, med en margin til siden når det bes om det, og vannet under hele skroget mot dypgangen (med squat og en margin under kjølen når det bes om det).
- `farbSweep`: skroget sveipt fra én stilling til en annen, med en stilling hver 0,3 m og en halv steglengde i margin. Over åpent vann hopper den fram, men spør om dybden på veien.
- `farbNeed`: gjør alt innenfor en boks kjent (pakkene lastet, kysten indeksert, fliser pakket ut og sortert, skjærene formet), i skiver mellom bildene.
- Det kartet ikke kjenner, er «ukjent» (`NaN`, `'ukjent'`), aldri fritt.

**Én geometri:** kystlinja og havneenhetenes grunn; fjæra som dybde slik 3D tegner den (2 m over middelvann ved kystlinja, 1:3 utover, 1:1,5 ved molo; `FARB.shore` har 3D-ens tall); kartets dybde med tidevann, og mudrede renner (`farbDig`, valg 5: data kartet leser, ingen er lagt inn ennå); skjærene med 3D-ens form (hele foten); Senjas og kystens brygger, kaidekk og bryggeflater slik 3D bygger dem (reglene i `vecGone` og `vecDrawn`), moloer, flytebrygger, naust- og rorbukaia, havneenhetenes blokk og fylling, brupilarer, brudekk etter høyde, merker (ikke de som henger på en bru) og turbiner som står i sjøen.

**Havnelommene:** et mudret basseng og de 50 m foran en tegnet kaifront er vann uansett hva kysten sier (`inHarbourPocket`). Kystlinja inne i en lomme er derfor ikke land, linja utenfor er, og lommas egen side er en vegg der den skjærer gjennom land. Avstanden regnes til de to, så den stemmer også når midten av skroget ligger i bassenget.

### Sjekken mot benken (`tools/autonav/farsjekk.py`)

Observatøren (`benkobs.js`, `benk.js`) leser rådataene selv; kartet holdes mot den stilling for stilling, for samme båt og samme time, med fartøyene som ligger stille. Stillingene tas langs grunnlinjas ruter og fasitens veier, i en stripe på 150 m til hver side med vilkårlig kurs, og i kanten av det observatøren berører (funnet ved halvering til en centimeter, og så 2 til 40 cm til hver side).

| | |
|---|---|
| Strekninger og båter | 304 (96 av de 97 strekningene, 8 båttyper; `urangsvag-inn` har verken rute eller fasit i grunnlinja) |
| Skrogstillinger | 32 144 (langs linjene 8 208, i stripa 11 232, i kanten av en berøring 7 920, rett på en ting 4 784: merke 1 140, brygge 1 019, skjær 954, brupilar 467, brudekke 414, molo 297, kai 224, flytebrygge 177, rorbukai 48, naustkai 44; ingen turbin står ved strekningene) |
| Sveip mellom to stillinger | 3 648 |
| **Observatøren ser en berøring, kartet sier fritt** | **0 stillinger, 0 sveip** |
| **Skroget på en ting, og kartets avstand fra midten større enn skroget rekker** | **0** |
| Begge fri / begge berøring | 18 774 / 12 406 |
| Bare kartet (forsiktig) | 960 stillinger (3,0 %): grunn 931, båt 18, brudekke 17, land 6, skjær 3; 15 sveip |
| Ukjent for kartet | 4 |
| Kartets oppdelte kopier av `portZones`, `vecGone` og `vecDrawn` | like spillets i alle 176 flisene som ble pakket ut |
| Tid per stilling | kartet 0,08 ms, observatøren 2,0 ms |

«Bare kartet» er kartet som er strengere enn observatøren: vannet spørres i et rutenett på 4 m under hele skroget og med 3 cm sikkerhet (observatøren spør fem punkter), et liggende fartøy er en boks rundt skroget, et skjær er hele foten, og et brudekke regnes fra høyeste flo.

**Det sjekken fant underveis** (hvert av dem var rødt før rettingen):

1. Et 75 m skrog sto på en grunne mellom hjørnene av omrisset: første utgave spurte dybden bare i hjørnene, og 52 m av hver side var uspurt. Nå et rutenett på 4 m under hele vannlinja, og omrisset hver 2. meter der fjæra kan nå inn under henne.
2. Fem stillinger hadde skroget på land og 26 til 35 m klaring: midten lå i et havnebasseng, der kysten ikke ble regnet med. Rettet med lommenes vegger.
3. Kystavstanden så bare punktets egen flis og rutene rundt (`coastDistQ`): en kant like over en flisgrense ble ikke sett. Kartet spør alle flisene avstanden når.
4. To stillinger av 27 360, hver 2 cm forbi kanten av fjæra: spillets tidevann innen en kvadratkilometer er det til punktet det sist ble spurt om, så to som spør, kan være noen millimeter fra hverandre. Kartet har 3 cm sikkerhet på vannet (`FARB.eps`).
5. Karmsund bru ligger i flisa vest for sundet og rekker 50 m inn i neste. Et skrog under brua spurte bare sin egen flis og så ingen bru. Funnet av feltets sjekk mot geometrien (5 ruter med dekke i feltet og ingen i geometrien). Nå skrives hver flis' ting som ligger i en annen flis, opp (`FARB.ovr`).
6. Listen over fartøy som ligger stille (`fixBoats`), holdes for spillminuttet; benken setter klokka tilbake ved hver start, så lista fra forrige sted ble brukt. Rettet i sjekken, ikke i spillet. I spillet gjelder lista det som er innen AIS-rekkevidde av båten: et sted langt unna kjenner hun ikke fartøyene på (F5).

**Det den uavhengige kontrollen fant** (`/kontroll`, en fersk agent med endringen og «Ferdig når»-punktene; alt under er rettet, og hver retting ble sett rød først):

7. **Sveipet gikk over fjæra like utenfor et havnebasseng.** Hoppet over åpent vann spurte etter kysten med lommene tatt ut og dybden uten fjæra, men fjæra tegnes fra kystlinja slik den er, også linja inne i bassenget. Kontrollens prøve langs yttersida av bassenget ved alle 369 havneenhetene: 1 336 sveip gikk fritt der observatøren så fjæra (ved 20 enheter, 58° til 71° N). Etter rettingen: 0 (samme prøve, 1 107 fronter og båter, 1 812 sveip gir nå berøring).
8. **Sveipet spurte ikke dybden mellom hoppene:** en båt på 7,9 m hoppet 12,5 m og gikk fri over ei grunne på 4 m. Et hopp er nå aldri lengre enn vannlinja rekker langs veien der hun står (lengden forover, bredden sidelengs, den minste i en sving). Enhetstest forover og sidelengs.
9. **Brudekket ble regnet uten flo.** Dekket tegnes fra middelvann, og vannet står høyere ved flo; en bru med 5,9 m slapp en båt på 4,9 m under med 1 m klaring uansett. Rommet under et dekke regnes nå fra høyeste astronomiske tidevann på stedet (summen av tidevannets ledd), slik en seilingshøyde måles. Benkens observatør har fortsatt den gamle regelen (derfor 17 «bare kartet» på brudekke).
10. Mindre: et sveip som er for langt til å sveipes i ett, er «ukjent», ikke fritt; kystavstanden beholder naboflisas fine kanter der punktets egen flis mangler sjøkartpakke; lagene over en flisgrense hentes fra flisa slik den er nå, ikke fra den som var der da de ble skrevet opp; og kartets kopi av handelsstedenes soner holdes for seg (`FARB.pz`), så ingenting gammel Autonav leser (`PORTZ`), skrives av kartet.

Kontrollen pekte også på at enhetstestene prøver hver form, ikke byggerne (naust- og rorbukaia, flytebryggene, skjærenes form, flislagene, merker på bru, den ekte kystavstanden med lommer): de prøves i nettleseren av farsjekken, som derfor fikk stillingene «rett på en ting». Turbinene er ikke prøvd mot observatøren (ingen står ved strekningene).

### Avstandsfeltet (bygges i en worker)

Et søk spør millioner av punkter, så det geometrien svarer nøyaktig på, legges ut på et rutenett, en flis om gangen: 250 × 250 ruter på 2 m (en flis på 500 m; 4 og 8 m for sund og åpen kyst), hver med avstanden til nærmeste ting ingen kan passere (i trinn på 0,25 m, rundet ned, høyst 60 m), det grunneste vannet blant ruta og naborutene (dm ved sjøkartnull) og den laveste underkanten av et brudekke innen 8 m. `farbFieldJob` samler det en flis trenger som rene tall på hovedtråden, i skiver; `farbFieldBuild` regner flisa ut i en worker; `farbFieldNeed` ber om flisene over en boks, og `farbFieldAt` leser en rute. Søket (F2) går på feltet; veien det finner, kontrolleres på geometrien (`farbSweep`) før båten sendes. Rasterblokkene kartet leser, pakkes ut i fflates egen worker først (`mapBlockWarm` i `01b-mapdata.js`): før holdt den første lesingen av en blokk hovedtråden i 1 til 3 ms.

**Målt** (`python3 tools/autonav/farsjekk.py --felt`, feltet rundt starten av hver strekning, 800 × 800 m, ruter på 2 m, CPU-en strupet fire ganger; kjøringen 23.11.2026 etter alle rettingene):

| | |
|---|---|
| Steder og fliser | 96 steder, 667 fliser |
| Workeren per flis | 8 ms (median), lengste 22 ms |
| Minnet per flis | 187 500 byte (tre lag à 62 500 ruter); 96 fliser holdes (18 MB), eldste ut først |
| En lesing (`farbFieldAt`) | 1,7 µs |
| Feltet mot geometrien, 259 200 ruter | lenger unna: 0; mer enn ett trinn (0,25 m) nærmere: 1 (1,32 m, ved veggen av ei havnelomme); vannet over 0,5 m dypere enn geometrien: 0 (én rute 0,42 m dypere) |
| Brudekket | likt i alle rutene (før rettingen av ting over en flisgrense, punkt 5 over: ulikt i 5 ruter ved Karmsund bru) |
| Vannet er forsiktig | av 61 700 ruter med under 10 m vann er feltet over 0,5 m grunnere i 13 382 (rutenettet på 12,5 m tar det grunneste av de fire punktene rundt) |
| Samlingen på hovedtråden per flis | 95 ms i skiver (median; med det tette dybderutenettet ved havner), mot 8 ms i workeren |
| **Skivene på hovedtråden** | 75 017 i alt: **99,83 % under 4 ms,** 59 mellom 4 og 8 ms, 65 på 8 ms eller mer, den lengste 242 ms |
| Kontrollen (en jobb som bare teller, like lenge) | 83 792 skiver: 99,93 % under 4 ms, 45 mellom 4 og 8 ms, 10 på 8 ms eller mer, den lengste 50 ms |
| Hendelsesløkka sto over 100 ms | ved 19 av 96 steder mens feltet ble bygget (lengst 9,5 s), ved 5 uten bygging (lengst 2,2 s) |

**Kravet «hovedtråden aldri holdt over 4 ms» holder ikke.** Tallene over er fra en kjøring der ingenting annet gikk på maskinen. Skivebudsjettet er 0,6 ms og hvert skritt er ett oppslag, så en vanlig skive er 2 til 4 ms med strupingen. Men 124 av 75 017 skiver gikk over:

- **Ett dybdeoppslag** (52 enkeltskritt over 4 ms): de fleste 4 til 22 ms med strupingen, altså 1 til 5 ms i virkelig tid; ett på 242 ms (Tufjord). Hva i spillets dybdeoppslag som av og til tar så lang tid, er ikke funnet.
- **Én brygge, flate eller molo i sorteringen av en flis** (36 enkeltskritt, opptil 22 ms): en lang molo prøves mot havneenhetene hver tredje meter i ett skritt. Kan deles.
- **Jobben som bare teller** hadde 55 av 83 792 over (lengst 50 ms): maskinen og JavaScript-motorens egne pauser står for en del, ikke alt.
- **Hendelsesløkka sto over 100 ms ved 19 av 96 steder mens feltet ble bygget,** lengst 9,5 s, mot 5 steder uten bygging. Det ligger utenfor feltets skiver og er ikke undersøkt; trolig er det kartpakkene feltet ber om 3,5 km rundt, som spillets laster pakker ut på hovedtråden.

Gjort så langt: rasterblokkene pakkes ut i en worker (før 4 til 12 ms per blokk med strupingen), skjærene formes per kvadratkilometer, tidevannets sted holdes per kilometer, og hvert tungt skritt er delt. `farsjekk.py --felt` skriver nå `FEIL` så lenge en skive er over 4 ms. Det som står igjen, står i `start/141.md`: finne det trege dybdeoppslaget, la workeren lese dybden selv fra blokkene, dele sorteringen av lange moloer, og se på lastingen av pakkene.

### Båtenes høyde (`VESSELS.air`, valg 6)

Høyeste punkt i 3D-modellen over modellens vannlinja (`lod0` i `src/data/boat-*.b64`, lest med spillets egen dekoder og holdt mot konstanten i Blender-skriptet). Før: 0,35 × lengden, høyst 16 m (`obsAir`), som bare aluminiumsbåten og trebåten holdt seg under.

| Type | `air` (med pisker) | Hva som er øverst | Uten pisker | Før | Kilde i skriptet |
|---|---|---|---|---|---|
| skiff | 2,07 | lanterne på stake akter | 2,07 | 2,07 | `skiff59.py:685` |
| trebat | 2,09 | lanterne på stake ved ripa | 2,09 | 2,45 | `snekke23.py:800` |
| snekke | 3,90 | VHF-pisk på hardtoppen | 3,69 | 2,77 | `snekke26.py:766` |
| plastsjark | 5,70 | VHF-pisk på salingen | 5,06 | 3,31 | `plast31.py:707` |
| sjark | 8,61 | lanterne på formastens topp | 8,61 | 3,70 | `havsjark35.py:871` |
| hurtigsjark | 9,35 | to VHF-pisker på salingen | 8,76 | 3,85 | `hurtig11.py:815` |
| sjarkny | 7,27 | lanterne på mastetoppen | 7,27 | 3,85 | `hs11.py:1032` |
| breisjark | 8,43 | to pisker på formastens saling | 7,95 | 3,85 | `malo36.py:1148` |
| kyst15 | 9,41 | to pisker på salingen | 9,32 | 5,25 | `kyst15.py:974` |
| kyst21 | 10,56 | topplanterna på formasten | 10,56 | 7,35 | `kyst21.py:980` |
| ringnot38 | 20,85 | MF/HF-pisk fra kompassdekket | 18,52 | 13,49 | `ringnot38.py:1062` |
| autoliner | 23,00 | to pisker på råa på aktre mast | 22,70 | 15,89 | `al45.py:435` |
| snokrabbe | 22,25 | aktre topplanterne | 22,25 | 16,00 | `krabbe50.py:828` |
| bunntral | 24,30 | toppen av mastestanga | 24,30 | 16,00 | `tral60.py:470` |
| pelagisk | 22,15 | toppen av mastetårnet | 22,15 | 16,00 | `not75.py:394` |

Valgt: **med pisker,** det 3D tegner (ingenting tegnet skal gå gjennom et brudekke), pluss 1 m klaring (`FARB.airOver`). Kan snus ved å bytte tallene. En tom båt tegnes 0,06 m høyere enn modellens vannlinje, og en planende båt løftes inntil 0,16 m; klaringen dekker det. Med last ligger hun lavere. Kartet leser `air`; gammel Autonav (`obsAir`) er urørt til 141b, så i spillet er ingenting endret ennå. Masta på snekka og plastsjarken står i tabernakel i modellen; spillet legger den ikke ned.

### Bruene: kilden (valg 6)

Sjekket 23.11.2026 (dekning og lisens). Økta har begrenset nett: OSM-tallene, Geonorges katalog, NVDB Vegnett Pluss, Kystverkets WFS og kalibreringen er lest direkte; de «ekte» høydene fra leksikon og Den norske los er fra søkeutdrag og må leses i kilden når de føres inn.

| Kilde | Har | Dekning | Lisens | Avgjort |
|---|---|---|---|---|
| OpenStreetMap, `seamark:bridge:clearance_height` | seilingshøyde (og `_closed` for bevegelige) | 154 bruer, 147 ved kysten; tynt nord for 66° (17) | ODbL, kreditering som for sjømerkene; ligger alt i releasen `sjomerker-kilde` | **Valgt** for bruene som har den |
| NVDB Vegnett Pluss (Statens vegvesen, Geonorge) | vegdekkets høyde på hver brulenke (NN2000), ikke seilingshøyde | alle kjørbare veger | CC BY 4.0 | **Valgt** som regel for bruene uten verdi: dekkhøyde minus fratrekk |
| Håndført liste med kilde per rad | kjente bruer som mangler i OSM (Tromsøbrua, Sandnessundbrua, Sortlandsbrua, Hadselbrua, Sørsundbrua med flere) | noen titalls | per kilde | **Valgt,** hver rad leses i kilden |
| Kartverket, «Sjøkart – Maritim infrastruktur» | bruer med friseilingshøyde | best, nær full | nedlasting bare for Norge digitalt; WMS-en er åpen (CC BY 4.0), men å hente høyden bru for bru gjenskaper et begrenset datasett | **Forkastet** til Kartverket har sagt ja |
| ENC (S-57) | alt i sjøkartet | full | Primar, avtale | Forkastet |
| NVDB Bru (objekttype 60) | navn, type, lengde; felt for seilingshøyde ikke bekreftet | | NLOD | Forkastet (API-et var stengt herfra) |
| Wikidata P2793 | 9 av 18 kontrollbruer | noen titalls | CC0 | Bare til kontroll (avviker 1 til 4 m fra kartet) |
| Den norske los (OGC API) | høyder i fritekst, også småbruer (Straumen på Andørja 2,5 m) | ukjent | åpne data | Bare til håndlista |
| Kartverkets høydemodell | ingen verdier på brua over vann | | | Forkastet |

**Regelen for bruene uten verdi:** høyeste punkt på brulenkene minus et fratrekk for overbygning og høyeste astronomiske tidevann. Kalibrert mot 99 bruer med kjent seilingshøyde: fratrekk 2,7 m (dekk under 8 m), 3,0 m (8–16 m), 4,1 m (16–30 m), 4,2 m (over 30 m); middelfeil 2,2 m (median 1,3) mot 6,7 m (median 4,0) for dagens 3,6 % av lengden. Forbehold: fratrekkene er tilpasset de samme bruene de måles på, og fasiten er OSM-verdier av ujevn kvalitet. **«Under 60 m er en vegg» faller:** av 24 OSM-bruer under 60 m har 18 minst 3 m og 10 minst 5 m. Dekkhøydene gir rundt 5 m ved Marøyvegen (Bøvågen) og under 2 m ved Reksundveien; Hønebrua har 7,2 m dekk og 6 m oppgitt (Efs 1/2014, søkeutdrag).

**Vakt mot feil i kildene:** en oppgitt seilingshøyde over dekkhøyden minus 1 m er feil i en av dem (OSM har 45 m for Gisundbrua; dekket er 46,5 m og riktig høyde 41 m).

**Bygges i 141b** (`docs/planer/start/141b.md`): rørledningen, `obsBridge` og `obsAir` som leser dataene, 3D i samme høyde, krediteringen, og benken før og etter med tabellen over hvilke ruter og steder som stenges og åpnes for hvilken båt. Med ekte høyder er en sjark 8,6 m: den tabellen må Jonas se før det slås på.

### Det 3D tegner annerledes (oppgave 5 i steg 141)

| Ting | Status |
|---|---|
| Fjæra | I kartet som dybde, med 3D-ens tall. Holdt mot observatøren (5 279 berøringer). |
| Skjærene | 3D-ens form, hele foten (observatøren har omrisset i kjølens dybde; kartet er strengere). |
| Brygger, kaidekk, bryggeflater, flytebrygger | Slik 3D bygger dem; reglene er like spillets i 170 fliser. |
| **Moloer kartlagt som linje** | **Ikke rettet.** 3D tegner dem 16 m brede i vannlinja (`MOLO.half` 8 m, `view3d/05-quays-breakwaters.js:317`) med en skråning 1:1,4 ned til 6 m dyp; kartet og benkens observatør har 9 m. Kartet skal ha 3D-ens form: den harde delen 8 m til hver side, og skråningen som dybde etter båtens dypgang. Observatøren må få det samme, og det flytter grunnlinja. Moloer som omriss har samme skråning utenfor omrisset. |
| Kraftspenn over sjøen | Avgjort: ingen hindring. Laveste punkt er 30 m over sjøen (`VD_CLEAR`, `view3d/17d-vind.js:10`); høyeste båt er 24,3 m pluss 1 m. |
| **Marinaenes småbåter** (`view3d/17g-marina.js`) | **Ikke rettet.** De tegnes ved fingerbryggene, men finnes ikke i kartet. Plassene må regnes ett sted i kjernen, som 3D og kartet leser. |
| **Kaimodulene bygget ut til kaiplassene** | **Ikke gjennomgått.** |
| Båtens egen kaiplass | En båt som ligger inntil sin egen kai, berører kaias vegg i kartet. Planleggeren og styringen (F2, F3) må ha regelen benken har: det hun lå inntil da hun kastet loss, er ikke et treff. |

## Fasene

Hver fase er én økt (F2 og F3 kan trenge to). Gammel Autonav står urørt og er standard til F6.

| Fase | Bygger | Filer | Ferdig når |
|---|---|---|---|
| **F0 (steg 140) Benken og grunnlinja, ferdig 23.11.2026** | Strekningslista, observatøren, målene, kjørt på dagens Autonav. Forklarer brudekk-treffene hos spillerne | `tools/autonav/`, `tests/` | Benken gir tall for dagens Autonav på alle strekninger og begge motorer; den er rød der spillerne og jakten har treff |
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

- ~~Hvorfor spillernes båter kommer under brudekk på Autonavs egne ruter (29 berøringer, tre bruer), er ikke forklart.~~ Forklart og gjenskapt i F0 (23.11.2026): «Det benken fant», punkt 1.
- ~~Om bruenes seilingshøyde finnes i en åpen kilde med god dekning, er ikke sjekket.~~ Sjekket i F1 (23.11.2026): ingen åpen kilde har ekte seilingshøyde for mer enn rundt 150 bruer (OSM); resten får vegdekkets høyde fra NVDB Vegnett Pluss minus et fratrekk. Se «Bruene: kilden».
- Sporfeilen per båt og fart er ikke målt. Korridorens bredde settes fra målingen i F3, ikke fra et anslag.
- Tidene er fra PC. Kravet (4 ms, strupet fire ganger) er et anslag på en vanlig telefon; bare Jonas kan måle på en enhet. F1 holder det ikke ennå: 99,83 % av skivene er under, 124 av 75 017 over (lengst 242 ms); se «Avstandsfeltet».
- ~~Om avstandsfeltene får plass i minnet på en telefon ved siden av 3D, måles i F1.~~ Målt i F1: 187,5 kB per flis på 500 m, 96 fliser holdes (18 MB).
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

- 23.11.2026: diagnosen og planen skrevet. Jonas svarte på de sju valgene samme dag, alle som anbefalt. Fasene lagt i køen som steg 140–147, startmeldingen for F0 skrevet (`docs/planer/start/140.md`).
- 23.11.2026, F0 (steg 140) ferdig (Jonas: «Kjør på»; samme økt). Benken er bygget (`tools/autonav/benk.py`, `benk.js`, `benkobs.js`, `strekninger.json` med 97 strekninger, `tests/unit/benkobs.test.mjs`), kjørt på dagens Autonav, og grunnlinja står over. «Ferdig når» fra `start/140.md`: (1) 97 strekninger, med spillernes verste steder, de tre bruene og de fem stedene uten rute inn; (2) fire båter, begge motorer, treff, lengde mot fasit, knekk, planleggingstid, lengste blokkering strupet fire ganger, tid og diesel i de to motorene; (3) observatøren ser hele skroget sveipt, også bakgrunnsturene, og enhetstesten (26 sjekker; 9 røde med sveipet slått av) viser hva jaktens observatør hopper over; (4) grunnlinja står i planfila, og benken er rød på 29 av de 38 strekningene fra spillernes fangst; (5) brudekk-berøringene er gjenskapt ved alle tre bruene og forklart. Ingen endring i `src/`, ingen utrulling. Neste: F1 (steg 141), `docs/planer/start/141.md`.
- 23.11.2026, F1 (steg 141) pågår (Jonas: «Kjør på med steg 141»; samme økt). Bygget: `core/17-farbar.js` med geometrien, spørsmålene og feltet i worker, `mapBlockWarm` i loaderen, `VESSELS.air` for alle 15 typene, `tests/unit/farbar.test.mjs` (117 sjekker), `tools/autonav/farsjekk.py`. Sjekket: 32 144 skrogstillinger og 3 648 sveip mot benkens observatør uten én stilling der kartet sier fritt og observatøren ser en berøring; feltet mot geometrien i 259 200 ruter. Den uavhengige kontrollen fant tre feil i sveipet og brudekket (punkt 7 til 9 i «Farbarhetskartet»), som er rettet, og at «aldri over 4 ms» ikke holder (124 av 75 017 skiver). Avgjort: båtenes høyde med pisker, bru-kilden (OSM og NVDB Vegnett Pluss; Kartverkets maritime infrastruktur forkastet til de har sagt ja), kraftspenn er ingen hindring. Lagt: steg 141b (bruene og `air` i bruk). Igjen i 141 («Hvor langt» i `start/141.md`): moloenes form, marinaenes småbåter, kaimodulene, de siste lange skivene.
