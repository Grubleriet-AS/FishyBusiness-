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

### Grunnlinja kjørt på nytt med moloens form (23.11.2026, steg 141)

Observatøren fikk moloen slik 3D bygger den (8 m ut fra linja i vannskorpa, skråning 1:1,4), så hele benken ble kjørt på nytt (uten CPU-passet, som ikke berøres): `docs/planer/autonav-benk/grunnlinje2/turer.jsonl`. Dette er grunnlinja Autonav 2.0 måles mot fra F2. Ellers er alt som i tabellene over (ruter, lengde mot fasiten median 1,14, knekk).

| Motor | turer | turer med treff | treff | per 1000 turer | molo |
|---|---|---|---|---|---|
| båtmodellen, før | 292 | 77 (26 %) | 140 | 479 | 1 på de ni molostrekningene |
| båtmodellen, nå | 292 | 81 (28 %) | 137 | 469 | 5 |
| bakgrunn, før | 292 | 95 (33 %) | 149 | 510 | 2 på de ni molostrekningene |
| bakgrunn, nå | 292 | 97 (33 %) | 153 | 524 | 6 |

På de ni molostrekningene gikk treffene fra 14 til 18 for begge motorer: sjarken og kyst21 kommer borti moloens skråning ved Øksfjord og Værøy. Resten av forskjellen er at båtmodellen ikke er helt lik fra kjøring til kjøring (i F0 skilte 5 av 45 turer seg på minutter eller på hvilke ting som ble berørt, med samme sum).

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

## Farbarhetskartet (F1, steg 141, 23.11.2026)

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

Et søk spør millioner av punkter, så det geometrien svarer nøyaktig på, legges ut på et rutenett, en flis om gangen: 250 × 250 ruter på 2 m (en flis på 500 m; 4 og 8 m for sund og åpen kyst), hver med avstanden til nærmeste ting ingen kan passere (i trinn på 0,25 m, rundet ned, høyst 60 m), det grunneste vannet blant ruta og naborutene (dm ved sjøkartnull) og den laveste underkanten av et brudekke innen 8 m (regnet fra høyeste flo). `farbFieldJob` samler det en flis trenger som rene tall på hovedtråden, i skiver; `farbFieldBuild` regner flisa ut i en worker; `farbFieldNeed` ber om flisene over en boks, og `farbFieldAt` leser en rute. Søket (F2) går på feltet; veien det finner, kontrolleres på geometrien (`farbSweep`) før båten sendes.

**Dybden regnes i workeren** (andre økt 23.11.2026): hovedtråden sender dybdelagets egne celler over flisa og det som mudrer (havneenhetene, naustets og rorbuenes kaiplasser, havnenes sirkler), og workeren regner vannet slik spillet selv gjør (`depthWater`, `unitDredge`, `siteDredge`, `depthNav`). Der det ikke går (ingen fin kyst, en blokk uten pakke, lagets kant), spørres dybden på et rutenett på hovedtråden som før. Rasterblokkene pakkes ut i fflates egen worker først (`mapBlockWarm` i `01b-mapdata.js`).

**Målt** (`python3 tools/autonav/farsjekk.py --felt`, feltet rundt starten av hver strekning, 800 × 800 m, ruter på 2 m, CPU-en strupet fire ganger; siste kjøring 23.11.2026, ingenting annet på maskinen):

| | Første økt (dybden på hovedtråden) | Nå (dybden i workeren) |
|---|---|---|
| Steder og fliser | 96 steder, 667 fliser | de samme |
| Workeren per flis | 8 ms (median), lengste 22 ms | 10 ms, lengste 30 ms |
| Samlingen på hovedtråden per flis | 95 ms i skiver | **3 ms** |
| Minnet per flis | 187 500 byte; 96 fliser holdes (18 MB) | det samme |
| Feltet mot geometrien, 259 200 ruter | lenger unna: 0; brudekket likt | lenger unna: 0; brudekket likt |
| Vannet | forsiktig: 13 382 av 61 700 grunne ruter over 0,5 m grunnere enn geometrien | **geometriens eget:** 1 rute 0,5 m dypere, 4 911 over 0,5 m grunnere (det grunneste blant naborutene) |
| Skiver på hovedtråden | 75 017, 124 over 4 ms (0,17 %), lengst 242 ms | **28 268, 82 over 4 ms (0,29 %),** lengst 229 ms |
| Av dem i feltets fliser | | 10 av 3 177 |
| Av dem i lagene (én gang per flis på 50 km) | | 72 av 25 091 |
| Kontrollen som bare teller | 55 av 83 792 over 4 ms, lengst 50 ms | 19 av 26 984, lengst 12 ms |
| Kontrollen som bare lager søppel | | **264 av 24 304 over 4 ms (1,09 %),** lengst 23 ms |

**Kravet «hovedtråden aldri holdt over 4 ms» holder ikke bokstavelig, og målingen viser hvorfor.** Jonas 23.11.2026 (spørsmålsverktøyet; A «Fortsett å jage», B «Godta som målt», C «Start F2 nå»): **«Fortsett å jage».** Kravet står, og det endres først om målingen viser at resten er motorens egne pauser. Det som er funnet siden:

- **Dybdeoppslaget er ikke tregt i seg selv:** ved Tufjord, der ett oppslag tok 242 ms, tok 3 av 230 000 oppslag over 0,4 ms da stedet ble målt alene. Det som holdt, var mengden: 1 700 til 6 600 oppslag per flis, hvert med søppel motoren må rydde. Nå gjør workeren dem.
- **En jobb som bare lager søppel, har flere skiver over 4 ms enn kartet** (1,09 % mot 0,29 %), og opptil 23 ms. Skiver på 4 til 23 ms er altså på nivå med JavaScript-motorens egne pauser for rydding med denne strupingen.
- **Ni av kartets 28 268 skiver er lengre enn søppelkontrollens lengste.** De fire lengste (129 til 229 ms, i sorteringen av en flis på 50 km: skjærene, bryggene) gjentok seg ikke da de samme stedene ble målt alene på en fersk side (lengst 36 ms). De kom på en testside som hadde lastet kart for 32 steder langs hele kysten.
- **De lange oppholdene i hendelsesløkka** (9,5 s ved Smøla i første måling) gjentok seg heller ikke alene (1,4 s for hele bygget der, lengste opphold 9,5 ms).

**Jonas 23.11.2026, andre gang** (spørsmålsverktøyet, med tallene over; A «Skriv om kravet», B «Jag de ni videre», C «La det stå, start F2»): **«Skriv om kravet».** Det nye kravet: ingen skive av kartets arbeid er lengre enn den lengste i en jobb som bare lager søppel, med CPU-en strupet fire ganger og hvert sted målt på en fersk side. `farsjekk.py --felt` måler slik (en ny side per sted; `--samme-side` gir den gamle målingen), og steg 141 er ferdig når den er grønn. Grensa er ett sted i `farsjekk.py` og kan snus. Antallet skiver over 4 ms skrives fortsatt ut.

**Målt etter det nye kravet** (23.11.2026, 96 steder, 571 fliser, en fersk side per sted, CPU-en strupet fire ganger):

| | Kartets arbeid | Jobben som bare lager søppel | Jobben som bare teller |
|---|---|---|---|
| Skiver | 46 677 | 37 013 | 41 541 |
| Over 4 ms | 340 (0,73 %) | 238 (0,64 %) | 21 (0,05 %) |
| Lengste | **75 ms** (Bergen, lommene; så 52 og 42 ms i skjærene) | **118 ms** | 16 ms |

Kravet holder i denne målingen (75 ms mot 118 ms): `OK farsjekken, hovedtråden`. To ting må sies: (1) på en fersk side er det flere lange skiver enn på en side som har gått en stund (0,73 % mot 0,29 %), fordi motoren oversetter koden første gang den kjøres; (2) sammenligningen er mellom to lengste verdier og kan snu på et lite utvalg: en kjøring med bare sju steder ga 13,8 ms for kartet og 11,5 ms for søppeljobben, altså rød. Kartets skiver og søppeljobbens er av samme størrelse; ingen av dem er jevnt lengst. Feltets egne fliser sto for 118 av de 340, lagene (én gang per flis på 50 km) for 222.


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
| Fjæra | I kartet som dybde, med 3D-ens tall. Holdt mot observatøren (6 103 berøringer). |
| Skjærene | 3D-ens form, hele foten (observatøren har omrisset i kjølens dybde; kartet er strengere). |
| Brygger, kaidekk, bryggeflater, flytebrygger | Slik 3D bygger dem; reglene er like spillets i 172 fliser. |
| **Moloer** | **Rettet (andre økt 23.11.2026).** 3D bygger steinen i vannskorpa 8 m ut fra linja (på omrisset av en molo kartlagt som flate) med skråning 1:1,4 ned til 6 m dyp (`MOLO`, `view3d/05-quays-breakwaters.js:317`); kartet og observatøren hadde 9 m og det nakne omrisset. Nå følger det dypgangen og vannstanden (`farbMoloR`): en båt som stikker 0,6 m, må 8,9 m ut ved middelvann, en som stikker 3,4 m, 12,8 m, og ingen lenger enn 16,4 m. I feltet er den tørre delen stengt for alle og skråningen dybde. Observatøren (`benk.js`) har samme form. |
| Kraftspenn over sjøen | Avgjort: ingen hindring. Laveste punkt er 30 m over sjøen (`VD_CLEAR`, `view3d/17d-vind.js:10`); høyeste båt er 24,3 m pluss 1 m. |
| **Marinaenes småbåter** (`view3d/17g-marina.js`) | **Rettet (andre økt), i kartet og i 3D.** 460 marinaer: 177 med flytebrygger (1 689 stykker, 67 km) og 283 med bøyer. Hvilke plasser som er tatt, skifter med årstiden, så kartet tar alle (`farbMarina`): ingen innen 9,6 m fra siden av ei flytebrygge i en marina (baugen inn, båter opptil 9 m), og en sirkel på 7 m rundt hver bøyeplass (10 m mellom, 14 m mellom rekkene) der det er vann og ikke en vei inn til et handelssted. Lista over marinaene er flyttet til kjernen (`MARINA` i `01c-vec.js`), så 3D og kartet leser den samme. **3D fulgte ikke reglene kartet må ha, og er rettet:** småbåter lå ved flytebrygger som ikke tegnes (tatt bort ved et handelssted), på bøyer i veien inn til en kai (Ålesund utstyrsbutikk ligger inne i en bøyemarina) og inne under trebryggene. Nå hopper `marinaBuild` over dem, og bøyene er for marinaer uten bryggestykker som kan ta båter. Bilder før og etter i begge formater, og ett `ask_gemini`-kall: før lå det småbåter rett foran butikkaia, etter er vannet der fritt og resten av havna som før; den pekte på båtene under trebrygga, som så ble rettet. Observatøren har ikke småbåtene. |
| **Kaimodulene** (`view3d/22-docks-air.js` `quayMod`) | **Gjennomgått (andre økt).** 3D bygger en kai fra land ut til båten der hun ligger: ved kaiplassene rederiet holder, der spillerens båt ligger nå, og ved havnenes egne båter. Der en båt ligger, står kaia mellom henne og land, og hun er i kartet som fartøy som ligger stille. Kaia ved en kaiplass rederiet holder, står også mens båten er ute: den er nå en ting i kartet (leses fra `S.havn` uten å skrive i lagringen). |
| Båtens egen kaiplass | En båt som ligger inntil sin egen kai, berører kaias vegg i kartet. Planleggeren og styringen (F2, F3) må ha regelen benken har: det hun lå inntil da hun kastet loss, er ikke et treff. |

## Planleggeren (F2, steg 142, pågår 26.11.2026)

Jonas: «Kjør på med steg 142». Koden: `src/js/core/17b-bane.js` (banen) og `17c-plan.js` (søket og kontrollen); systemdokumentet `docs/systemer/autonav.md` 4.12y sier hva hver del gjør. Ingenting i spillet kaller dette ennå: bare benken (`tools/autonav/benk.py --autonav ny --motor bakgrunn`). Gammel Autonav er urørt.

### Det som er bygget

- **Banen:** rette stykker og buer hun kan svinge, fart etter stopplengden (også ut fra kai), fartsgrense per strekk, skroget sveipt langs hvert stykke med `farbSweep`, og minuttsteget som følger banen etter klokka (`baneSail`, ett kall i `sail()`). Planen lagrer bare punktene og en kort oppskrift (`b2`); banen bygges ved behov.
- **Søket:** A* på feltets fliser i en worker, med to rutestørrelser på ett gitter (2 m ved endene og der det er trangt, 4 m ellers), styrt av avstanden over sjøkartets 50 m-ruter. Kostnaden er tiden: lengden, mer nær land der det er plass, mer der hun må gå sakte over grunt vann.
- **Kontrollen:** veien blir bane og sveipes på geometrien ved laveste vann, med marginene fra valg 4. Buer strammes, farten senkes over grunt vann, og det som fortsatt tar borti, stenges før et nytt søk. Uten bane sier svaret hvorfor og hvor.
- **Benken:** `--autonav ny` planlegger med `planBane` og seiler bakgrunnsturen langs banen.

### Det benken viser (runde 6, 24.11.2026, `docs/planer/autonav-benk/ny-steg142/turer.jsonl`)

332 av rundt 372 linjer (kjøringen ble stoppet der; 93 strekninger, alle unntatt kategorien `rute`), bakgrunnsturen, uten CPU-strupingen. Mot grunnlinja (`grunnlinje2`, bakgrunn: 97 turer med treff, 153 treff):

| | Ny (delvis) | Kravet |
|---|---|---|
| Turer seilt | 224 | |
| Turer med treff | 11 (16 treff: 9 fartøy som ligger stille, 3 flytebrygge, 3 fjære, 1 land) | 0 |
| Uten bane der fasiten har vei | 46 (20 «søket ble for stort», 12 «for grunt», 8 «brua er for lav», 5 «for trangt», 1 «land») | 0 |
| Lengde mot fasiten, median | 1,5 % over | høyst 5 % |
| Baner over 15 % lenger enn fasiten | 8 (sund-bolandet, sund-urangsvag, stamsund, smola-vest-ut) | ingen |
| Planleggingstid, ustrupet, maskinen opptatt | median 0,6 s, p90 2,8 s, lengst 9,7 s | under 1 s strupet fire ganger (ikke målt) |
| Seilt tid mot banens tid | median 1,8 ganger | innen 2 % |

Tallene er fra en maskin som kjørte tre benkdeler samtidig, så tidene er ikke målinger etter kravet. Treffene og banene er ikke påvirket av det.

### Det som står igjen i steget

1. **«Søket ble for stort» (20): funnet og rettet til 4** (24.11.2026, Jonas: «Kjør på med punkt 1»). Tre grunner, alle ved bruer:
   - *Båtens høyde.* Kartet ga båtens ekte høyde med antenner (sjarken 8,6 m), mens bruene har høydene fra den gamle regelen. Planleggeren bruker nå høyden spillet seiler etter i dag (0,35 av lengden), `planBoat` i `17c-plan.js`.
   - *Tidevannet.* Kartet måler brudekket fra høyeste astronomiske tidevann; spillets regel gjør ikke det. Høyeste tidevann trekkes fra båtens høyde til 141b er inne. **Begge deler snus med `PLAN.realAir` når bruene har ekte høyder (steg 141b)**: da gjelder ekte høyde og høyeste tidevann.
   - *Sjøkartets ruter ser ikke en lav bru eller en smal fylling.* Avstanden til målet pekte rett gjennom, og søket fylte vannet på denne siden til taket. Etter et søk uten vei får sjøkartets ruter nå vite hvor søket har vært og er ferdig (`learn`), avstanden regnes på nytt, og et større utsnitt hentes når veien rundt ligger utenfor det første. Hønebrua med kyst21: 3,99 nm mot fasitens 3,98.
   - Benken på de 39 strekningene som hadde feil (`ny-steg142/turer-39-etter-punkt1.jsonl`): turer 79 → 90, uten bane der fasiten har vei 46 → 32, «for stort» 20 → 4. De fire som står igjen: bru-storvalen og reine med kyst21 (brua er noen centimeter for lav etter avrunding i feltet, og det finnes ingen vei rundt), sund-akkarfjord og sund-rosvik med skiff (ikke sett på). Et søk som gir opp, bruker fortsatt 3–18 s.
2. **«For grunt», «brua er for lav» og «for trangt» (27 steder, og ett «land»): 12 rettet i kartet og planleggeren, 5 gravd, 1 var benkens egen feil, og i andre økt 4 til rettet i planleggeren; 6 står igjen, se «Resten av punkt 2»** (26.11.2026, Jonas: «Kjør på med neste steg»). Årsaken per klasse står i «Stedene uten bane» under.
3. **Treffene: tatt 26.11.2026 (tredje økt), se «Punkt 3» under.** Opprinnelig (14 turer, 26.11.2026): fartøy som ligger stille like utenfor regelen for egen kaiplass (11 treff), flytebrygge (4), land og fjære ved sund-urangsvag. To er nye etter punkt 2 og ikke sett på: myre-sto med ringnoteren (brygge 73 m fra kaia på Stø; havna er nå åpen for henne, så veien er en annen) og sund-hvaler med sjarken (over tegnet fjære 115 m fra enden; banen selv er fri for fjære i observatørens øyne når den spørres stilling for stilling, så det er sveipet mellom minuttene som bør ses på).
4. **Omveiene (8 baner):** der det trange løpet ikke er på veien det første søket (bare det faste stenger) finner. **Påbegynt 26.11.2026:** to av tre var fasitens feil (den gikk gjennom fjæra; rettet, se «Punkt 3»). Stamsund med skiffen står igjen: 1,25 ganger fasiten fordi feltet (det grunneste vannet innen 3 m) stenger vann like utenfor fjæra som geometrien har nok av, og det andre søket går bare når det første ikke finner vei.
5. **Ankomsttiden:** `sailV` har 5 knop i havn, fartsgrenser og akselerasjon per minutt som banens profil ikke kjenner. Banen må ta dem inn, eller `sail()` følge banens fart.
6. **Planleggingstiden** målt etter kravet (strupet fire ganger, stille maskin, `farsjekk.py --felt`-måten for skivene). Trolig trengs 8 m-ruter på åpne strekk.
7. **Ikke begynt:** havnesøket med kurs (G2: rygge ut, snu), flagget `#autonav2` i spillet (`planOn()` finnes, ingenting kaller den), tegnede ruter rettet ved «Kast loss» med logglinje, rennene, strekningen forbi havvind ved Karmøy.
8. **Fra den uavhengige kontrollen, ikke rettet:** laveste vann regnes fra nå, ikke fra når en senere etappe seiles; `planInto` flytter ikke `pl.unsafe`; en vending over 172° gir en bue som ikke tangerer neste strekk; buer strammes ned til halve bredden (en manøver, ikke en sving: F3 må behandle dem slik); minuttsteget langs banen viker ikke for andre fartøy og brenner diesel etter minuttets fart.

### Stedene uten bane (punkt 2, 26.11.2026)

27 steder hadde ingen bane der fasiten har vei, med årsaken «for grunt», «brua er for lav» eller «for trangt» (og lindesnes med skiffen: «land»). Årsaken er funnet med `tools/autonav/hvorfor.py`: fasitens vei gått 2 m om gangen mot feltet og geometrien, og et bilde av feltet rundt stedet planleggeren peker på. Tre klasser:

**A. Feil i kartet og planleggeren (12 steder, alle rettet, alle har bane nå).** På åtte av dem feilet kontrollen på samme sted sju ganger på rad.

| Feil | Steder | Rettet |
|---|---|---|
| En lommeveggs berøring ble meldt i veggens ende (35 og 59 m fra båten), så regelen for egen kaiplass tok den ikke, og stengingen rundt den endret ingenting | senjahopen-ut sjark, sandshamn-verft autoliner, finnsnes-botnhamn sjark | `farbWallTouch`: berøringen er der hun er |
| Regelen for egen plass gjaldt ikke en grunnberøring i et sveip over åpent vann | sund-bolandet, sund-hvaler og bru-honebrua pelagisk, sund-stamsund kyst21 | `farbSweep` tar `opt.skip` også der |
| Vannet var rundet til dm i feltet, og planleggeren la kartets 3 cm og squat oppå dypgang + 0,5 m. Havnene er mudret til nøyaktig største dypgang + 0,5 m (4,35 m): feltet hadde 4,3 og kravet var 4,4 | tufjord-ut autoliner (og alle havner for de dypeste båtene) | Feltet i trinn på 5 cm; `planNeeds`, `planKeel`, `planSquat` |
| Kartet hadde fjære tvers over gropa 3D graver foran naustet | tufjord-naust og oksvoll-vallersund-naust skiff | `farbSitePit` i geometrien, feltet og observatøren |
| Et knekk på 6 m over 8 m forbi et brukar: et skip på 75 m snudde 45° på stedet og feide baugen 26 m til siden. Stengingen ble lagt rundt berøringen, 30 m fra veien | bru-karmsund og bru-maroyvegen pelagisk | `gentle` (hjørnene trekkes fra hverandre), `planBlockOf` (samme berøring igjen: der hun sto) |

I tillegg sa svaret «brua er for lav» ved Træna, Lindesnes og Øksfjord, der det ikke er bru: vann under siden hennes som stengte ei rute, ble tatt for et dekke. Rettet (`sideOk` i `cause`).

**Avgjort i denne klassen, kan snus:** i 3 knop og saktere regnes squat som ingenting (under 7 cm for alle båtene), og kartets 3 cm legges ikke oppå de 0,5 m. Ellers er havnene stengt for båtene de er mudret for. Valg 4 sier «dypgang + squat + 0,5 m»; alternativet er å mudre havnene 10 cm dypere (`HARB_DRAFT` i `07-harbours.js`, som er kjernemekanikk og endrer spillet i dag). Snus i `planSquat` (én linje).

**B. Ekte grunt slik 3D tegner det (13 steder): renne etter valg 5.** Fjæra går 13,5 m ut fra kystlinja og er for grunn for alle båtene ved laveste lavvann i nord (bunnen ligger 2,5 m under middelvann ytterst, sjøkartnull 1,4 m under). Et løp smalere enn rundt 27 m pluss båten er derfor stengt for alle, og fasiten ser ikke fjæra.

| Sted | Båter | Hva | Status |
|---|---|---|---|
| Træna (mottaket) | skiff, sjark, kyst21 | Løpet ut av havna er smalere enn fjæra på de to sidene | **Gravd:** 258 m, 19,2 m bred, 4,2 m dyp (for kyst21). Alle tre har bane |
| Ålesund verft | skiff, sjark | Fjæra over munningen av verftsbassenget | **Gravd:** 89 m, 16,2 m bred, 2,4 m dyp (for sjark). Begge har bane |
| Ålesund verft | kyst21 | Munningen er for trang for henne (rundt 14 m); fasiten går en annen vei ut (5,1 nm) | Ikke gravd: ikke sett på hvor hennes vei går |
| Øksfjord | skiff, sjark | Innløpet mellom moloens hode og land: moloens steinfot (8,9 m ut for skiffen) og fjæra lar under 8 m vann stå igjen | Ikke gravd: gravingen ser moloens fot som vann i søket og som stein i kontrollen, og finner ingen vei. Verktøyet må holde foten stengt i søket |
| Lindesnes | skiff, sjark, kyst21 | Ei rekke bryggestykker på tvers av bassengets munning med et gap på rundt 19 m; fjære langs dem | Ikke gravd: «land i veien» også når vannet ses bort fra. Ikke funnet hva som stenger gapet |
| Sandshamn verft | pelagisk (øst og vest) | Bassenget ligger i vann grunnere enn 8 m; fasiten har vei fordi den ikke spør vannet innen 1,5 båtlengder (112 m) av endene | Ikke gravd: gravingen gir «for grunt» ved starten. Ikke funnet hvorfor |

Rennene lages av `tools/autonav/renner.py` (stedene i `renner-steder.json`) og ligger i `src/data/renner.json`. Hvor det graves, er planleggerens eget svar: søket går der minst må graves (`planDig`). **3D graver dem ikke ennå** (`docs/spill-dette/142.md`), og observatøren ser som 3D: de fem turene gjennom rennene står med «over tegnet fjære» på benken til 3D har gravd.

**C. Benkens egne (3 steder).** sund-seloy med pelagisk: startpunktet ligger på 3 m vann, og fasiten «hadde vei» fordi den ikke spurte vannet nær enden. Rettet: en ende som er et punkt på sjøen, har ingen kaiplass, så vannet og klaringen gjelder der også. urangsvag-bremnes (sjark, kyst21): fasiten har vei bare på 20 m-ruter (vinduet blir stort når ruta mangler), der et løp på under 20 m slipper gjennom; på 5 m-ruter har den ingen. Ikke rettet: fasiten bør ikke stoles på over 5 m-ruter, og de to står fortsatt som «uten bane der fasiten har vei».

### Benken etter punkt 2 (26.11.2026, `docs/planer/autonav-benk/ny-steg142-punkt2/turer.jsonl`)

Hele lista: 93 strekninger (alle unntatt kategorien `rute`), 321 linjer og 11 der stedet ikke tar båten, bakgrunnsturen, uten CPU-strupingen, tre deler samtidig.

| | Runde 6 (delvis) | Etter punkt 1 (39 strekninger) | Nå (hele lista) | Kravet |
|---|---|---|---|---|
| Turer seilt | 224 | | 262 | |
| Turer med treff | 11 | | 14 (18 treff: 11 fartøy som ligger stille, 4 flytebrygge, 2 land, 1 brygge) | 0 |
| Turer over tegnet fjære | (3 treff) | | 8 (5 i rennene 3D ikke har gravd, 2 sund-urangsvag, 1 sund-hvaler) | 0 |
| Uten bane der fasiten har vei | 46 | 32 | 14 (8 «for grunt», 2 «for trangt», 4 «søket ble for stort») | 0 |
| Lengde mot fasiten, median | 1,5 % over | | 1,4 % over | høyst 5 % |
| Baner over 15 % lenger enn fasiten | 8 | | 13 (smola-vest-ut, sund-urangsvag, bru-maroyvegen, bru-reksund, stamsund, sund-bolandet) | ingen |
| Planleggingstid, ustrupet, maskinen opptatt | median 0,6 s, p90 2,8 s | | median 0,7 s, p90 3,7 s, lengst 29,8 s | under 1 s strupet (ikke målt) |
| Seilt tid mot banens tid | median 1,8 ganger | | median 1,9 ganger | innen 2 % |

Farsjekken etter endringene i kartet (26.11.2026, langs denne kjøringens ruter): 0 stillinger og 0 sveip der observatøren ser en berøring og kartet sier fritt (25 000 stillinger), bassengene 0 av 22 944, feltet aldri lenger unna enn geometrien. Skivemålingen (`--felt`) er rød og grønn om hverandre på øktas maskin, også for koden fra før økta (12,3 mot 10,9 ms rød, 7,9 mot 10,2 grønn; den nye 10,1 mot 9,4 og én gang 31 ms i lagene under): den sier ingenting sikkert her og må tas på en stille maskin (punkt 6).

De 14 uten bane: «for stort» reine og bru-storvalen kyst21 (punkt 1), sund-akkarfjord og sund-rosvik skiff (ikke sett på); «for grunt» og «for trangt» er klasse B og C over (Sandshamn verft pelagisk to, Øksfjord to, Lindesnes tre, Ålesund verft kyst21; urangsvag-bremnes to). Omveiene er flere fordi flere steder har bane (bru-maroyvegen, sund-bolandet): punkt 4. De to nye treffene står i punkt 3.

### Resten av punkt 2 (26.11.2026, andre økt samme dag; Jonas: «fortsett»)

De åtte stedene i klasse B som sto uten renne, og de to i C, sett på en gang til. Tre av dem var ikke grunt vann:

- **Feltet stengte vann geometrien har nok av** (Øksfjord med skiffen, Sandshamn verft med pelagisk, sund-akkarfjord og sund-rosvik med skiffen). Gravingen fant en vei der ingenting måtte graves: feltets vann er det grunneste innen halvannen rute, og et bredt skrog spør rutene til siden også, så et løp med nok vann for henne kan være stengt i feltet. Rettet: sier søket «for grunt» eller «for trangt», går det én gang til der vannet koster i stedet for å stenge og avstanden er uten halve ruta, og kontrollen på geometrien avgjør (`opt.soft` i `planBane`). Alle fire har bane nå.
- **Moloens fot er stein, ikke fjære.** Feltet har fått et eget lag for den (`m`), og gravingen går aldri gjennom den. Øksfjord med sjarken har derfor ingen vei: mellom moloens fot i hennes kjøldybde og land er det for trangt, også med fjæra gravd bort.
- **Lindesnes er stengt av ei hårtynn landstripe i kystdataene** (under 2 m bred, 60 m lang, tvers over bassengets munning ved 58,0411° N 7,152° Ø). Fasiten på 5 m-ruter slipper gjennom den; kartet, observatøren og spillets `isLand` har den som land. Det er ikke noe å grave: stripa må rettes i kartdataene, eller havna har ingen vei ut.
- **Ålesund verft med kyst21:** munningen er for trang for henne med marginene (halve bredden + 2 m til hver side), også uten feltets avrunding.

**Benken, de 26 strekningene som manglet bane kjørt på nytt og slått sammen med resten** (`docs/planer/autonav-benk/ny-steg142-punkt2b/turer.jsonl`): 264 turer seilt, 12 turer med treff (14 treff), **uten bane der fasiten har vei 14 → 8**: Lindesnes tre (landstripa), Øksfjord sjark (moloens fot), Ålesund verft kyst21 (for trangt), Sandshamn verft vest med pelagisk (ikke sett på: østsiden har bane nå), og reine og bru-storvalen med kyst21 («for stort», punkt 1). To turer mistet banen: skiffen til og fra Urangsvåg utstyrsbutikk (urangsvag-inn, urangsvag-bremnes). Banen de hadde, gikk borti et fartøy som ligger stille og ei flytebrygge; nå stenges fartøyet, og søket etterpå blir for stort. Hører til punkt 3. Et søk som gir opp, tar lengre tid enn før (median 5,5 s, lengst 40 s), fordi det går to ganger: punkt 6.

**Valg 8 (Jonas 26.11.2026, i spørsmålsverktøyet): «Rett kartet per sted».** Der stein eller land står i veien og renne ikke hjelper, rettes kartet, så stedene tar båtene de tar i dag: landstripa ved Lindesnes tas ut av kystdataene, og ved Øksfjord og Ålesund verft flyttes moloen eller munningen utvides i havnedataene. Forkastet: «Stedet tar ikke båten» (Øksfjord bare skiff, Ålesund verft opp til sjark) og «Mindre margin i havn» (1 m til siden de siste 100 m; ville endret valg 4 for alle havner). Ikke bygget ennå: det er neste i steget, før punkt 3. Kystdataene lages av kartrørledningen (`tools/map/`, releasen `kart-N`), havnedataene av `tools/harbour/`; 3D, observatøren og kartet leser de samme dataene, så rettingen gjelder alle tre.

### Valg 8 bygd (26.11.2026, tredje økt; Jonas: «Kjør på med neste steg»)

- **Lindesnes: ikke ei landstripe i dataene, men en feil i spillets kystoppslag.** `coastQuery` (`01d-coast.js`, og kopien i feltets worker) telte veien ned langs rutas venstre side halvåpen, mens veien på tvers teller radens egne punkter som passert. Et punkt på nøyaktig samme meter-rad som en vannrett kystkant ble da land helt bort til neste kant: en linje uten tykkelse, 60 m tvers over munningen. Feltets ruter på 2 m har midten på hele meter og traff den; fasiten (5 m) og observatøren gjorde det sjelden. Rettet i kjernen med enhetstest (`kystlinje.test.mjs`, sett rød). Stikkprøve på 1 km² hele meter: Kristiansand hadde 74 slike punkter, Bodø, Tromsø og Hammerfest 0. Etterpå sto bare fjæra i munningen igjen for sjark og kyst21: gravd (`renner.json`, 85 m, 19,2 m bred, 4,2 m dyp). Alle tre båtene har bane (2,6 nm).
- **Øksfjord: moloen 22 m kortere** (`tools/map/rett.json`, `rett.py`: kuttet i `coast2` og i vec-pakkenes molo-linje; `game.py` tar det med når kysten settes sammen, også i utrullingen, `chart.py` i neste release). Med 12 m sto moloens fot og fjæra på landsiden fortsatt for nær hverandre (`planDig` fant ingen vei). Med 22 m har skiff, sjark og kyst21 bane (0,41 nm) uten renne.
- **Ålesund verft med kyst21: ikke løst, stedet satt tilbake slik det var.** To forsøk: (1) verftet 25 m inn langs sin egen kai (`tools/steder/rett.py`): kyst21 fikk bane (5,23 nm), men 3D tegnet en blek flate (11 × 26 m) ute i bassenget rett ut for hovedplassen, der kystdataene har land som havnelomma gjør til vann (Gemini: «ser ut som en feil»); årsaken i 3D er ikke funnet. (2) Land tatt bort på sørsiden av munningen (`rett.py` `land`, 30 × 90 m): munningen ble bred nok, men søket for kyst21 sto fortsatt fast («for trangt» ved den nye strandkanten), også med fjæra gravd. Siden den nye planleggeren ikke brukes i spillet og gammel Autonav tar kyst21 fra verftet i dag, ble ingen av dem stående. Neste forsøk: finne hva 3D tegner der (flyttingen er den som virket for planleggeren), eller hvorfor søket står fast etter kuttet.
- **Gammel Autonav** (`tests/allesteder.py`, de tre stedene, kyst21, laveste lavvann): likt før og etter, alt OK.
- **`hvorfor.py`** regnet feltets vann i dm etter at feltet gikk over til trinn på 5 cm: «grunt» og det brune i bildene var feil. Rettet.

### Punkt 3: treffene (26.11.2026, tredje økt)

Hver tur med treff er kjørt på nytt med en sonde som lister fartøyene som ligger stille nær banen i det planleggingen skjer, seiler bakgrunnsturen, og måler hvor langt hvert treff ligger fra banen. Fire klasser:

| Klasse | Turer | Hva | Gjort |
|---|---|---|---|
| Planleggerens feil: et fartøy som ligger stille, stengt som en sirkel | urangsvag-bremnes, urangsvag-inn, bremnes-urangsvag (skiff) | Sirkelen rundt midten med radius lik halve diagonalen stengte 15 m til siden og skiffens eneste vei forbi en båt langs flytebrygga | Stengt som hennes egen boks med marginene (`planBlockOf`, enhetstest sett rød). Fasiten har heller ingen vei der når båten ligger der: planleggeren sier nå «et fartøy som ligger stille, stenger veien» i stedet for «brua er for lav» |
| Planleggerens feil: egen kaiplass regnet etter fartøyets nærmeste punkt | sandshamn-inn (autoliner), samme klasse som Senjahopen | Djupvær (75 m) med midten 97 m fra kaia ble tatt for egen kaiplass; observatøren regner etter midten | `planSkip`: et fartøy etter midten (enhetstest sett rød) |
| Fartøyet var ikke der da planen ble lagt | bremnes-urangsvag skiff (Havbris utenfor AIS-rekkevidden fra Bremnes, 6 km), gutvik-ut (ferja har flyttet seg) | Planleggeren kjenner bare fartøy som ligger stille innen AIS-rekkevidde når den planlegger | Hører til vakta i F3 og ny planlegging ved ankomst (som planen sier) |
| Bakgrunnsturen forlater banen ved endene | myre-sto (ringnoteren, 38 m fra banen), urangsvag-bremnes ut (39–43 m), sund-hvaler (sjarken driver i 0 knop etter enden) | Banen ender i havnas punkt; `arrive()` setter båten ved kaiplassen og observatøren sveiper det hoppet over brygga. Ved et endepunkt på sjøen ligger båten etterpå og driver | Havnesøket med kurs (G2, punkt 7): banen skal ende og begynne ved kaiplassen. Senjahopen og Breivikbotn hadde ingen treff i sonden |

**Fasiten ser fjæra** (benk.js `fasit`): den spurte bare sjøkartet og gikk gjennom fjæra der observatøren teller treff; nå tar den vannet over fjæra som observatøren (`shoreGround`). smola-vest-ut med skiffen 1,57 → 1,00 ganger fasiten, sund-bolandet 1,21 → 1,01. Kjøringen under gikk med den gamle fasiten (den startet før rettingen).

### Benken etter valg 8 og punkt 3 (26.11.2026, `docs/planer/autonav-benk/ny-steg142-punkt3/turer.jsonl`)

Hele lista (93 strekninger, 321 linjer, 11 der stedet ikke tar båten), bakgrunnsturen, uten CPU-strupingen, tre deler samtidig. Bygget hadde boksen for fartøy og ordene for dem, men ikke `planSkip` og ikke fasiten som ser fjæra (de kom mens den gikk). Strekningene med treff og omveier er kjørt på nytt med dagens bygg (`ny-steg142-punkt3-treff/turer.jsonl`, 41 linjer).

| | Etter punkt 2 (`punkt2b`) | Nå (hele lista) | Kravet |
|---|---|---|---|
| Turer seilt | 264 | 271 | |
| Turer med treff | 12 (14 treff) | 14 (18 treff: 11 fartøy som ligger stille, 4 flytebrygge, 2 land, 1 brygge) | 0 |
| Turer over tegnet fjære | 8 | 10 (8 i rennene 3D ikke har gravd: Træna, Ålesund verft, Lindesnes; 2 sund-urangsvag; sund-hvaler) | 0 |
| Uten bane der fasiten har vei | 8 | 4 (Ålesund verft kyst21, reine og bru-storvalen kyst21 «for stort», Sandshamn verft vest pelagisk) | 0 |
| Lengde mot fasiten, median | 1,4 % over | 1 % over (p90 5 %) | høyst 5 % |
| Baner over 15 % lenger enn fasiten | 13 | 13 med den gamle fasiten; Smøla og Bolandet er 1,00–1,02 med den nye, Stamsund 1,25 | ingen |
| Planleggingstid, ustrupet, maskinen opptatt | median 0,97 s, p90 6,7 s | median 1,2 s, p90 8,3 s, lengst 65 s | under 1 s strupet (ikke målt) |

**Treffene med dagens bygg** (`punkt3-treff`): Sandshamn-inn med autolineren har ingen (`planSkip`). Det som står igjen: **Senjahopen ut** med skiff, sjark og kyst21, på banen i 5 knop, 262 m fra kaia, mot Nordglimt I (75 m) og Havtrost (60 m) ved kai, er ikke forklart (sonden på en annen klokke fant ingen treff, og planleggeren stengte fartøyet der); ellers bare klassene i «Punkt 3» som hører til havnesøket (G2: myre-sto, urangsvag-inn og breivikbotn i 0 knop ved enden) og vakta (F3: gutvik-ut, ferja har flyttet seg), og sund-hvaler (driver etter enden).

**Farsjekken** langs kjøringens ruter (tre deler): 0 stillinger og 0 sveip der observatøren ser en berøring og kartet sier fritt, av 29 070 stillinger og 3 300 sveip; 7 lå i rennene 3D ikke har gravd (telles nå for seg, `renne`). Bassengene (`--basseng`): 0 av 22 944. Gammel Autonav (`tests/allesteder.py`, de tre stedene i valg 8): likt før og etter.

### Fjerde økt (27.11.2026; Jonas: «Start neste økt»)

**Punkt 4, omveiene: bygd.** Det andre søket (`opt.soft`) prøves nå også når banen er en tydelig omvei, og den korteste banen som består kontrollen, tas.

- *Målet for «omvei» uten fasit:* det første søket begynner med et forsøk der bare det faste stenger (land, en for lav bru). Lengden av den veien, trukket rett, er `h0`, og `planOmvei` slår til når banen er over 1,1 ganger `h0` og 80 m til. Sjøkartets grove avstand (100 m-ruter) ble prøvd først og forkastet: den slo til på de fleste turene (banen 1,2–5 ganger den), og hver av dem ble søkt to ganger.
- *Taket:* det andre søket ser på høyst 30 000 ruter pluss tre ganger det første søket og stenger og søker på nytt høyst tre ganger. Smøla nord (der den første veien er den korteste og målet slår til fordi fjæra ikke er «fast») gikk fra 31–35 s til 13–19 s med taket.
- *To feil i det andre søket, funnet på Stamsund med kyst21* (1,23 ganger fasiten også etter det over): (1) de grove rutene langs sundet ble aldri gjort fine, fordi forfiningen bare så etter ruter som var stengt, og i det andre søket koster grunt vann i stedet for å stenge; sundet kostet 24 ganger lengden sin og omveien vant. (2) Vannet til siden ble ikke spurt i det hele tatt, så et skrog på 7,2 m ble sendt med siden over fjæra; kontrollen stengte stedet, og søket kom tilbake med det samme noen meter bortenfor. Nå gjøres rutene fine også der vannet bare koster, og ringen til siden er én rute nærmere enn i det første søket.
- *Fasiten var for snill mot brede båter:* den spurte fjæra bare under kjøllinja. For kyst21 ved Stamsund gikk den med siden over fjæra observatøren teller treff på. Nå spør den åtte punkter en halv bredde og marginen ut. Med 5 m-ruter er den da noen steder strengere enn planleggerens kontroll på geometrien (Stamsund med sjarken: banen 0,82 ganger fasiten), så fasiten er ikke lenger en sikker nedre grense for de brede.
- *Strekningene som var over 15 %:* Stamsund skiff og sjark 1,25 → 1,00 og 0,82; kyst21 1,23 → 1,00 (fasiten ble lengre: sundet er for trangt for henne med marginen); Urangsvåg-sundet kyst21 og pelagisk 1,23 og 1,43 → 0,97 og 1,04; Marøyvegen pelagisk 1,38 → 1,01; Smøla vest, Bolandet og Reksund var fasitens feil fra før (1,00–1,02). Alle under 1,10.

**Punkt: Senjahopen ut, forklart og rettet.** Fem fartøy ligger i samme punkt 262 m fra kaia (Nordglimt I 75 m, Havtrost 60 m og tre småbåter). `fixBoats` holder lista over fartøy som ligger stille, for spillminuttet, og lista er dem innen AIS-rekkevidde av der hun var da den ble laget. Benken stiller klokka tilbake til samme minutt for hver tur, så planen ved Senjahopen fikk fartøyene rundt strekningen før. Sett med en sonde: Stamsund planlagt først i samme side ga 0 stengt, banen 7 m fra midten av Nordglimt I og de to treffene fra benken; alene ga den ett stengt og ingen treff. `planFresh()` kaster lista når en plan lages. Klassen «fartøyet var ikke der da planen ble lagt» i punkt 3 var trolig delvis denne feilen (Bremnes–Urangsvåg).

**Det den ferske lista viste:**
- *Værøy verft:* ti småbåter ligger fortøyd rundt verftet, og én på bøye midt i bassengets munning (30 m bred). Svingsirkelen hennes (lengden og 3 m) stengte verftet for alle båtene. Kartet regner nå en bøyebåt som skroget der hun ligger (`farbBoats`), som observatøren; `FARB.swing` snur det. Alle tre har bane, 0 treff. **Valgt uten Jonas, kan snus:** at hun svinger når vinden snur, er vaktas sak i F3.
- *Urangsvåg utstyrsbutikk:* ingen av båtene har bane inn eller ut (urangsvag-inn, urangsvag-bremnes, bremnes-urangsvag) når fartøyene ved flytebrygga er med; fasiten, som ikke ser fartøy, har heller ingen på 5 m-ruter. Banene de hadde før, gikk forbi fartøy planleggeren ikke hadde i lista.

**Ålesund verft med kyst21: løst med forsøk (a), verftet 25 m inn langs kaia.** Den bleke flata i bassenget var ikke terreng og ikke en ting: bare sjøshaderen malte den (flata forsvant når sjøens tegnekall ble hoppet over, og det lå ingenting blekt under), strandteksturen og terrenget var dypt vann der. Årsaken var sjøens grunne-tekstur (`groundStep` i `view3d/17-draw.js`), som bygges av 25 m-landmasken uten å kjenne havnelommene: der masken har land inne i bassenget, var dybden 0 og sjøen tegnet brenning. En rute i en havnelomme er nå vann der også. Pikselen midt i flata gikk fra (91, 114, 134) til (10, 45, 75), som vannet rundt. Bilder før og etter i begge formater: `docs/okter/2026-11-27-142/`. Gemini (ett kall som svarte; det første fikk tidsavbrudd): flata er borte i alle etterbildene, ingen ny sprekk mellom blokka og land; den pekte på en liten grå bit i vannkanten ved blokkas venstre ende som ikke er i førbildene (ikke sett på, står i `docs/spill-dette/142.md`) og at landfestet er smalere. Benken: kyst21 5,23 nm, 0 treff.

**Havnesøket med kurs (G2): prøvd det enkle, ikke bygd.** `planEnd` gir kaiplassen fra `berthPose`, og benken kan planlegge mellom kaiplassene (`BK.berthEnds`). Uten søket med kurs kommer banen inn mot kaia fra den veien den kom, skroget sveiper kaia, og det ble «kai»-treff i begge ender ved Sandshamn, Ålesund verft, Husøy, Træna og Breivikbotn, der det ikke var noen. Slått av; treffene i 0 knop ved endene (myre-sto med ringnoteren, sund-urangsvag) står til G2 er bygd.

**Benken på hele lista** (`docs/planer/autonav-benk/ny-steg142-punkt4/turer.jsonl`; 93 strekninger, 332 linjer, 11 der stedet ikke tar båten, bakgrunnsturen, uten CPU-strupingen, tre deler samtidig; Sandshamn verft, Øksfjord og Gamvik kjørt på nytt etter den siste rettingen og slått inn):

| | Etter punkt 3 | Nå | Kravet |
|---|---|---|---|
| Turer seilt | 271 | 266 | |
| Turer med treff | 14 (18 treff) | 4 (4 treff: 3 land i 0 knop 17–39 m fra enden ved sund-urangsvag, 1 brygge 73 m fra kaia på Stø med ringnoteren; alle hører til havnesøket med kurs) | 0 |
| Turer over tegnet fjære | 10 | 10 (6 i rennene 3D ikke har gravd: Træna, Lindesnes, Ålesund verft med sjarken; 3 sund-urangsvag i 0 knop ved enden; sund-hvaler, som driver etter enden) | 0 |
| Uten bane der fasiten har vei | 4 | 6 (Gamvik sjark, kyst21 og autoliner: et fartøy ligger i havnas munning; Sandshamn verft vest pelagisk; reine og bru-storvalen kyst21 «for stort») | 0 |
| Uten bane, fasiten heller ikke | | 48 linjer på 21 strekninger (de tre til og fra Urangsvåg utstyrsbutikk er nye der) | |
| Lengde mot fasiten, median | 1 % over (p90 5 %) | 0,2 % over (p90 2,3 %) | høyst 5 % |
| Baner over 15 % lenger enn fasiten | 13 med den gamle fasiten | 0 (lengst: Værøy kyst21 1,10, Smøla nord skiff og Gutvik 1,07) | ingen |
| Det andre søket prøvd ved omvei | | 20 turer, tatt i 4 | |
| Planleggingstid, ustrupet, maskinen opptatt | median 1,2 s, p90 8,3 s, lengst 65 s | med bane: median 1,1 s, p90 5,4 s, lengst 44 s; uten bane: median 5,4 s, lengst 51 s | under 1 s strupet (ikke målt) |

Færre turer seilt enn sist fordi Urangsvåg utstyrsbutikk (9 linjer) ikke lenger har bane når fartøyene der er med. **Gamvik** er ny: en båt ligger fortøyd midt i munningen (rundt 20 m vann mellom fjærene), skiffen kommer forbi, sjarken og større ikke. Banene de hadde før, gikk forbi en båt planleggeren ikke hadde i lista. Det er samme slag som bøya i munningen ved Værøy verft: hvor kystens båter legges (`moorHarbour` i `05-vessels.js`), ikke planleggeren. **Sandshamn verft øst med pelagisk** mistet banen med ringen til siden i det andre søket og fikk den tilbake: der det andre søket med ring ikke finner vei, går det én gang til uten (`opt.bare`).

**Farsjekken** langs kjøringens ruter (tre deler): 0 stillinger og 0 sveip der observatøren ser en berøring og kartet sier fritt, av 28 853 stillinger; 5 lå i rennene 3D ikke har gravd (telles for seg). Bassengene (`--basseng`): 0 av 22 940. Gammel Autonav ved Ålesund verft etter flyttingen (`KYST_ALLE=ports KYST_ALLE_ID=sv292732_1091800 python3 tests/allesteder.py`): alt OK, ingen feil.

### Femte økt (27.11.2026; Jonas: «Kjør på»)

- **Havnesøket med kurs: to forsøk på det enkle, begge dårligere, tatt ut igjen.** Banen ble lagt til et punkt halvannen båtlengde akterut for kaiplassen og litt ut fra kaia, og derfra langs kaia inn (`planLead`). Første forsøk: «ingen bane» nesten overalt (kontrollen fant kaia 5 m fra kaiplassen sju ganger på rad, fordi regelen for egen kai for ting bare rekker 0,9 båtlengder). Andre forsøk (regelen utvidet langs leddet, punktet med marginen): fortsatt «for trangt» for skiffen de fleste stedene, og ekte «kai»-treff 17–19 m fra kaia i 3 knop (Stamsund, Øksfjord, Træna, Sandshamn). Grunnen er banen selv: skroget står alltid langs veien, så når banen svinger ut fra kaia, slår hekken inn. **Det som trengs** er en bane som kan rygge og snu (stykker med kursen motsatt av farten og full stopp imellom, i `17b-bane.js`: `baneBuild`, `baneAt`, fartsprofilen og `baneSail`), og et søk over posisjon og kurs de første og siste 300–500 m som spør geometrien direkte (`farbPose`). Det er ikke flere tall å stille på i den enkle varianten. Koden for forsøket ligger ikke i repoet; `planEnd` (kaiplassen med kurs og kaias normal) står.
- **Valg 9 (Jonas 27.11.2026, i spørsmålsverktøyet): «Fri led forbi».** En bøye legges ikke nærmere land enn båtlengden, fortøyningen, fjæra (13,5 m) og 16 m fri led (`moorBuoyRoom` i `05-vessels.js`; før: båtlengden og 8 m). Forkastet: «La bøyene ligge» og «Planleggeren ser bort fra dem». Bredden på vannet tvers gjennom bøya ble prøvd som regel først og virket ikke (bøya ved Gamvik ble liggende, og ved Værøy flyttet bøyene seg til nye steder som stengte). Med avstandsregelen har Gamvik og Værøy verft bane for alle båtene, 0 treff. En båt uten slik plass vises ikke i havn, som før. Endrer det spillerne ser langs hele kysten: færre båter på bøye i trange havner.
- **Svingsirklene er tilbake i planleggeren** (`FARB.swing = true`): med fri led rundt hver bøye stenger sirkelen ikke lenger et løp, og den er det forsiktige når vinden snur. Valget fra fjerde økt («bøyebåt som skrog») er dermed snudd.
- **Urangsvåg utstyrsbutikk** står: fartøyene som stenger der, ligger ved flytebrygga og kaia, ikke på bøye, og fasiten har heller ingen vei.
- **Benken på hele lista etter valg 9** (`docs/planer/autonav-benk/ny-steg142-femte/turer.jsonl`, 332 linjer): 270 turer seilt; 4 med treff (de samme fire ved endene: tre ved sund-urangsvag i 0 knop, én brygge på Stø med ringnoteren); 10 over tegnet fjære (som før); **uten bane der fasiten har vei 6 → 3** (Sandshamn verft vest pelagisk, reine og bru-storvalen kyst21); median 0,2 % over fasiten, p90 2,3 %, lengst 1,10 (Værøy kyst21). Planleggingstid med bane: median 1,0 s, p90 5,4 s, lengst 42 s; uten bane median 8,3 s, lengst 68 s. Farsjekken langs rutene: 0 stillinger og 0 sveip der observatøren ser berøring og kartet sier fritt (28 858 stillinger); bassengene 0 av 22 940.
- **`dbg23o`** var rød på klikket i oppstarten fra 23.11.2026 (ventet 900 ms, ga klikket 30 s). Bruker nå `boot()`; grønn.

### Sjette økt (27.11.2026; Jonas: «Fortsett arbeidet»): havnesøket med kurs (G2) bygd

- **Banen kan rygge og gå sidelengs** (`17b-bane.js`). Et punkts sjette tall sier hvordan hun ligger på leddet som ender der: forover, akterover (kursen motsatt av farten, høyst 1,0 m/s) eller sidelengs (høyst 0,3 m/s). Der hun skifter, og i begge ender av et sidelengs ledd, er det ingen bue: hun stopper (`B.cusp`). Et hjørne søket har laget leddene for, beholder radien sin (ellers halverte «halve det korteste leddet» den).
- **Søket over posisjon og kurs** (`planHavnG` i `17c-plan.js`): fra kaiplassen til et sted og en kurs på veien det vanlige søket fant (2,5 båtlengder, minst 30 m, langs den), over et gitter av steder og 16 kurser. Fra hver stilling: forover eller akterover, rett fram eller en sekstendedels vending på 0,8 båtlengders radius, og innen én båtlengde fra kaiplassen sidelengs (slik en båt tas ut fra kaia på spring: det er den ene måten et skrog som ligger langs en vegg, kommer fra den uten et hjørne gjennom veggen). Kostnaden er lengden, tre ganger akterover, fire ganger sidelengs, og en halv båtlengde for hvert skifte. Skroget spørres på geometrien (`farbPose`) med planleggerens marginer og regelen for egen kai. Veien inn er veien ut seilt baklengs (`planHavnRev`), søkt fra kaiplassen med forover og akterover byttet.
- **Flettet inn i `planBane`** (`opt.from`, `opt.to` fra `planEnd`): manøveren foran, veien fra det vanlige søket i midten, manøveren inn bak. Hele banen sveipes som før. Finner sveipet en berøring i en manøver, eller finnes ingen manøver, går den enden til havnas punkt som før manøvrene (en bane som kom «som den kom» helt inn til kaiplassen, slo hekken inn i kaia og stengte kaiplassen for seg selv: Ålesund verft med kyst21, «ingen bane»). En manøver som er funnet, holdes gjennom planen (`PLAN.hvMemo`): å søke den på nytt i hvert forsøk tok en plan fra 6 s til 57 s.
- **Samme bane kontrollert og seilt.** Planen lagrer banens punkter i cm, og minuttsteget bygger banen fra dem. Med manøverens hjørner ble banen fra de avrundede tallene en annen enn den kontrollerte, `baneOf` ga ingen, og turen ble seilt fra punkt til punkt som før banen (Averøy–Tustna med skiffen over land i 15 knop på benken). Punktene rundes nå før kontrollen, og benken melder `bane: false` der en plan har bane og minuttsteget ikke følger den.
- **Observatøren følger banen** (`benk.js` `watchBane`): gjennom hvert minutt sveiper den skroget langs banen selv, hver andre meter, med kursen og farten banen har der. Før fulgte den planens punkter med kursen lik fartsretningen og minuttets snittfart: en manøver på 30 m ved kaia ble en rett strek over kaihjørnet i «3 knop». Regelen for egen kai (under én knop innen halvannen båtlengde) regnes fra banens ender. Det gjør observatøren riktigere, ikke snillere: den ser fortsatt hver stilling, tettere enn før.

**Benken på hele lista** (`docs/planer/autonav-benk/ny-steg142-g2/turer.jsonl`; 93 strekninger, 332 linjer, bakgrunnsturen, uten CPU-strupingen, tre deler samtidig):

| | Femte økt | Nå | Kravet |
|---|---|---|---|
| Turer seilt | 270 | 270 | |
| Turer med treff | 4 | **0** | 0 |
| Turer over tegnet fjære | 10 | 6 (alle i rennene 3D ikke har gravd: Træna tre, Lindesnes tre) | 0 |
| Uten bane der fasiten har vei | 3 | 3 (Sandshamn verft vest pelagisk, reine og bru-storvalen kyst21) | 0 |
| Lengde mot fasiten, median | 0,2 % over | 0,7 % over (p90 3,4 %; manøvrene er med i lengden) | høyst 5 % |
| Lengste bane mot fasiten | 1,10 | 1,10 (Værøy kyst21) | høyst 1,15 |
| Manøver ut fra kai / inn til kai | | 131 / 65 av 270 turer (resten ender i et punkt på sjøen, ved et naust, eller gikk til havnas punkt) | |
| Planleggingstid, ustrupet, maskinen opptatt | median 1,0 s, p90 5,4 s, lengst 42 s | median 2,4 s, p90 12,5 s, lengst 106 s | under 1 s strupet (ikke målt) |

Planleggingstiden har økt: manøversøket spør geometrien for hver stilling på hovedtråden (opptil 2 000 steder per ende), og en ende uten manøver planlegges én gang til mot havnas punkt. Det er punkt 6 og er ikke løst. Farsjekken er ikke kjørt på nytt (kartet er ikke endret siden femte økt, der den var 0). Hele enhetssettet: 5 773 OK.

**Det som står igjen av G2:** manøveren finnes ikke ved alle kaiplasser (inn til kai: 65 turer); der går enden til havnas punkt, og `arrive()` setter henne ved kaiplassen som før. Naustene og rorbuene har ikke manøver (benken gir dem ikke `planEnd`). Sidelengs gange er en planleggingsforenkling: F3 (kaimanøveren med fysikk og avgrenset hjelp, valg 3) må avgjøre hvordan båten faktisk tas ut fra kaia.


### Det kontrollen fant (24.11.2026)

En fersk agent fikk diffen og «Ferdig når». Den fant at punkt 1 og 2 holder delvis og 3–5 ikke, og ti feil i koden. Rettet samme økt: flisene bes om der søket kommer til dem; et første søk viser hvor de fine rutene trengs (et løp på 13 m ble ellers 43 % omvei); fartsgrensen til korte stykker; minnet over frie stykker kjenner farten; egen kaiplass regnes etter der hun selv er for ting; stenging legges der hun sto; `baneSail` går videre fra planens sted, stopper for sjøis og fyller ikke sporet; workeren kaster flisene når kartet endres. Ett funn var feil lest: benken lar det observatøren ser av vannet følge samme regel som kaia (bare spillets egen grunnstøting teller alltid), og fars naust har tørt opptrekk.

## Fasene

Hver fase er én økt (F2 og F3 kan trenge to). Gammel Autonav står urørt og er standard til F6.

| Fase | Bygger | Filer | Ferdig når |
|---|---|---|---|
| **F0 (steg 140) Benken og grunnlinja, ferdig 23.11.2026** | Strekningslista, observatøren, målene, kjørt på dagens Autonav. Forklarer brudekk-treffene hos spillerne | `tools/autonav/`, `tests/` | Benken gir tall for dagens Autonav på alle strekninger og begge motorer; den er rød der spillerne og jakten har treff |
| **F1 (steg 141) Farbarhetskartet, ferdig 23.11.2026** | Én geometri, avstandsfelt i worker, dybderegelen, skjær med størrelse, `VESSELS.air`, bruhøyder | ny `core/17-farbar.js`, `02-species-gear.js` (felt), `tools/map/` ved behov | Enhetstester mot rå geometri; observatøren og kartet er enige på benkens strekninger; lista over det 3D tegner annerledes er tom eller avgjort |
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
8. **Stein eller land i veien der renne ikke hjelper (26.11.2026, steg 142): «Rett kartet per sted».** Landstripa i kystdataene ved Lindesnes tas ut, og moloen ved Øksfjord og munningen ved Ålesund verft rettes i havnedataene, så stedene tar båtene de tar i dag. *Ikke valgt:* «Stedet tar ikke båten» (Øksfjord bare skiff, Ålesund verft opp til sjark), «Mindre margin i havn» (1 m til siden de siste 100 m inn mot kai). Står i «Resten av punkt 2».
9. **Bøyer i løp (27.11.2026, steg 142): «Fri led forbi».** Se «Femte økt».
10. **Sanntid (27.11.2026, i spørsmålsverktøyet; Jonas: «Vi må bare fikse denne autonav-funksjonen slik at den fungerer for alle hver gang. Den må funke 100% feilfritt»): «Ført langs banen».** Når spilleren ser på båten under Autonav, følger hun banen nøyaktig i sted, kurs og fart, likt i sanntid og når spillet er lukket. Det som er kontrollert fritt, er det som seiles. Vind og sjø beveger henne i bølgene, men flytter henne ikke av banen; full fysikk gjelder når spilleren styrer selv. **Erstatter valg 3** («Fysikk med hjelp»). *Ikke valgt:* «Fysikk med hjelp» (0 treff kan ikke loves, sporfeil må måles, bredere korridorer), «Ført i havn og trange løp, fysikk ellers» (kan komme som et steg etterpå). F3 (steg 143) blir dermed: banefølgeren som fører henne, og vakta for det som ikke var der da planen ble lagt; sporfeilen i valg 4 faller bort.

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
- 23.11.2026, F1 (steg 141) ferdig (Jonas: «Kjør på med resten av steg 141»; andre økt). Lagt til: dybden i workeren, moloens form i kartet, feltet og observatøren, marinaenes småbåter og kaiplassenes kaier i kartet, 3D rettet så småbåter ikke ligger i veien inn til en kai eller under bryggene, bassengpasset i farsjekken, grunnlinja kjørt på nytt (`grunnlinje2`). Jonas' to svar om hovedtråden: «Fortsett å jage», så «Skriv om kravet»; det nye kravet holder i målingen av alle 96 stedene. «Ferdig når» fra `start/141.md`: (1) holder; (2) 144 enhetssjekker; (3) 32 144 stillinger, 3 648 sveip og 23 173 bassengsveip uten én der kartet sier fritt og observatøren ser en berøring; (4) holder etter det nye kravet, 187,5 kB per flis; (5) holder, 141b lagt. Startmeldingen for F2 er skrevet (`start/142.md`). Ikke gjort: turbinene er ikke prøvd mot observatøren, og ingen renne er mudret; begge står i oppgaven til 142.
- 24.11.2026, F2 (steg 142) pågår (Jonas: «Kjør på med steg 142»). Bygget: banen, søket på to rutestørrelser i worker, kontrollen, bakgrunnsturen langs banen, benken med `--autonav ny`. Benken (delvis, 332 linjer): 11 av 224 turer med treff (grunnlinja: 97), 46 uten bane der fasiten har vei, median lengde 1,5 % over fasiten. «Ferdig når» 1 og 2 holder delvis, 3–5 ikke; se «Planleggeren (F2, steg 142)» for hva som står igjen. Samme steg fortsetter.
- 27.11.2026, F2 (steg 142) fjerde økt (Jonas: «Start neste økt»): punkt 4 bygd (ingen bane over 1,10 ganger fasiten, median 0,2 % over), Senjahopen ut forklart og rettet (fartøylista var fra forrige strekning), bøyebåter som skrog, Ålesund verft med kyst21 løst (flyttet 25 m; brenningen i bassenget kom fra sjøens grunne-tekstur). Benken: 4 turer med treff av 266 (alle ved endene), 6 uten bane der fasiten har vei. Havnesøket med kurs er ikke bygd. Se «Fjerde økt».
- 27.11.2026, F2 (steg 142) femte og sjette økt: bøyene fikk fri led (valg 9), og havnesøket med kurs er bygd (banen kan rygge og gå sidelengs, søk over posisjon og kurs ved kaiplassene, observatøren følger banen). Se «Femte økt» og «Sjette økt».
- 26.11.2026, F2 (steg 142), punkt 2 (Jonas: «Kjør på med neste steg i en ny økt»). Årsaken funnet for de 27 stedene uten bane: 12 var feil i kartet og planleggeren (rettet, med enhetstester), 13 er ekte grunt slik 3D tegner fjæra (5 gravd med renne: Træna og Ålesund verft; 8 står igjen), 3 var benkens egne (1 rettet). Benken på hele lista: 262 turer, 14 uten bane der fasiten har vei (før 32), 14 turer med treff. Samme steg fortsetter.
- 26.11.2026, andre økt (Jonas: «fortsett»): resten av punkt 2. Der søket sier «for grunt» eller «for trangt», går det en gang til med geometrien som dommer (fire steder til har bane); moloens fot graves aldri (eget lag i feltet); Lindesnes er stengt av ei landstripe i kystdataene. Benken: uten bane der fasiten har vei 14 → 8. Samme steg fortsetter.
- 24.11.2026, F2 punkt 1 (Jonas: «Kjør på med punkt 1»): «søket ble for stort» 20 → 4. Planleggeren regner båtens høyde og tidevannet under bruer som spillet gjør i dag (til 141b), og søket lærer sjøkartets ruter det det har sett. Uten bane der fasiten har vei: 46 → 32 (resten er grunt, kaidekker og trangt: punkt 2).
- 26.11.2026, F2 (steg 142) pågår, tredje økt (Jonas: «Kjør på med neste steg i en ny økt»). Valg 8 bygd: Lindesnes var en feil i kjernens kystoppslag (rettet, stikkprøve sør, midt og nord), moloen ved Øksfjord 22 m kortere (`tools/map/rett.json`), Ålesund verft med kyst21 ikke løst og stedet satt tilbake. Punkt 3: fartøy som ligger stille stenges som boks og regnes etter midten for egen kaiplass, og svaret sier når et fartøy stenger; fasiten ser fjæra. Benken på hele lista: uten bane der fasiten har vei 8 → 4, farsjekken 0 (7 i rennene). Neste: punkt 4 (Stamsund), Ålesund verft, Senjahopen ut (startmeldingen).
