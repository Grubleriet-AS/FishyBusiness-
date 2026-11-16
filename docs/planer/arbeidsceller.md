# Arbeidscellene: faste mål per stasjon på dekk (forslag til eget steg etter steg 125)

**Status: valgt og startet 14.11.2026 (se «Valgt 14.11.2026» under; det som står over valgene, er forslaget slik det var, og faste cellemål er IKKE valgt).** Jonas 14.11.2026, i femte økt av steg 125: «kan du huske dette som noe vi burde jobbe med etter steg 125». Steget begynner med `/planlegg` (valgene under er hans), og ikke før steg 125 er levert. Raden står i `docs/planer/koen.md` som 125b.

## Spørsmålet og svaret (14.11.2026, fjerde økt)

Jonas: «Burde vi i større grad standardisere hvordan arbeidsstasjonene ombord i båten er plassert? Ville det gjort animasjonene lettere? Gi meg dine tanker uten at du starter å jobbe med det».

Svaret: ja, som eget steg etter at steg 125 er levert.

**Det som ble sett i fjerde økt:**
- Høttingen og bløggingen var ikke først og fremst et animasjonsproblem, men et plassproblem. Pakkerens plass kommer fra hver modells egne ankere, mens bløggerens plass ble regnet ut fra haleren uten å se på pakkeren. På fem av åtte båttyper sto de 16–40 cm fra hverandre.
- Det ble løst med en søker som leter etter en ledig celle på hvert dekk. Den virker på nysjarken, hurtigsjarken og 21-meteren, men på sjarken og breisjarken finnes det ingen plass med nok rom, fordi iskassa og pakkeren står der de står i modellen.
- Hver stilling må i dag tåle at karet kan stå hvor som helst rundt mannen (bak, til høyre, 0,5–1,2 m unna). Derfor måtte høttetaket bygges om til å snu seg opptil 130°.

**Det femte økt la til (samme mønster, tre ganger til):**
- To sløyere ved samme bord arbeidet begge mot bordets midtpunkt: hendene 37 cm fra, kniven og sloet 8–14 cm i sidemannen. Rettet i stillingen (hver sin del av bordet etter bordets lengde), men fisken fra karet går fortsatt 6–13 cm gjennom sidemannen på vei til bordkanten.
- Sløyerens kar sto bak ham til høyre på noen båter, så venstre hånd var 17–27 cm for kort. Rettet ved at hånda på karets side henter.
- Egnerens agnbøtte sto på dekket bak setet, 31 cm utenfor rekkevidde. Rettet ved å sette den på en kasse ved kneet.
- Bløggerens fisk lå opptil 0,9 m til siden for ham. Rettet ved at han snur seg mot den.
Hver av dem er en stilling som regner seg fram til et mål som står et tilfeldig sted. Med celler ville målet stått fast.

**Hva standardisering ville gitt:**
- Én arbeidscelle per stasjon i stedet for ett punkt. I dag er en stasjon «her står han, den veien ser han». En celle sier også hvor det han arbeider mot står i hans egen ramme: karet 0,6 m til høyre, fisken slippes 0,5 m bak til venstre, iskassa på venstre side, kassa foran.
- Animasjonene skrives én gang mot faste mål. Høttetaket, spadens runde og sløyerens henting kan finjusteres til de ser riktige ut, og ser så like ut på alle båter.
- Ingenting i kroppen blir en egenskap ved cella, ikke noe som må måles per båt og per øyeblikk. Cellene får et fotavtrykk (for eksempel 1,0 × 1,2 m med svingrom), og to celler får ikke overlappe.
- Gangveiene legges mellom cellene, så den som bærer kassa ikke går gjennom noen.

**Hva det koster, og hvor grensa går:**
- Arbeid i Blender-skriptene og ankerne for hver båtmodell: stasjonene må flyttes så cellene får plass.
- De minste dekkene har ikke plass til fire fulle celler. Der er det ærlige svaret trolig færre samtidige stasjoner (på sjarken bløgger haleren selv, og én mann sløyer og iser), ikke trangere celler. Det er et valg om spillet, og det er Jonas'.
- Båtene skal fortsatt se ulike ut: cellens indre mål standardiseres (mannen og det han rekker), ikke hvor på dekket cella ligger.

**Foreslått rekkefølge:** (1) fire–fem celletyper med mål (haler, bløgger, sløyer, pakker, egner); (2) inn i ankerne båt for båt; (3) stillingene forenkles til å lese cellens mål. Stillingene som er rettet i steg 125, leser allerede målene sine fra ett sted (`HOLDT`, `BLEED` i `src/js/deckcrew.js`) og taper ikke på det.

## Valgt 14.11.2026 (Jonas, etter samtalen med Gemini; «Ja, jeg er enig»)

- **Ikke standardiserte stasjoner.** Jonas: «Jeg ønsker jo i utgangspunktet ikke at det skal være standardiserte arbeidsstasjoner ombord i båtene, da jeg vil ha litt variasjon for realismens del.» Ingen faste avstander mellom utstyret, og ingenting flyttes i modellene.
- **Arbeidssonen i stedet:** de faste tingene (haleren, bordet, karet, iskassa, luka) leses der de står på hver båt. **Mannens ståplass regnes ut fra tingene**, så det han arbeider med, ligger i en romslig sone foran ham (innen rekkevidde, uten å vri seg rundt). De løse tingene (fiskekassa, agnbøtta, isbaljen ved siden av ham, stedet fisken slippes) settes ut av koden i forhold til ham. Fotavtrykkene overlapper ikke.
- **Færre stasjoner på små dekk**, ikke trangere soner. De uten stasjon er inne; på åpne båter vises ikke flere på dekk enn det er stasjoner til. Fangsten endres ikke (figurene er utsikt).
- **Ankerne og gripepunktene i koden**, ikke i Blender.
- **Der ingen ståplass har alt i sonen,** er valget Jonas': slå sammen stasjoner, eller flytte en ting i modellen. Økta velger ikke selv.
- **Rekkefølgen:** (1) en test i Node som for hver båttype og stasjon sier om tingene ligger i sonen, og lister dem som ikke gjør det; lista vises Jonas før stillingene røres om mange faller utenfor; (2) stillingene leser gripepunktene; (3) banen rundt kroppen (én regel i stedet for lappene fra sjette økt). Første runde: haler, bløgger, sløyer, pakker, egner. Pausene, kaia, håndbåten og gangen røres ikke.
- **Rammene:** reglene i `CLAUDE.md` («Animasjon stemmes ikke i det uendelige», bildeklipp). **Høyst to økter**, så utrulling til testadressen og Jonas avgjør på nettbrettet.

## Sonetesten, første kjøring (14.11.2026): stoppet her, lista til Jonas

`node tests/unit/run.mjs arbeidssone` (ny, `tests/unit/arbeidssone.test.mjs`; uten nettleser, samme svar hver gang) leser plassene og tingene på hver båttype og sier om det mannen arbeider med, ligger i sonen foran ham (holder: 0,3–0,75 m og 60° til hver side; henter eller kaster: inntil 1,05 m og 110°). **52 av 93 ting ligger utenfor, på 37 av 52 stasjoner, og mønsteret er det samme på alle åtte kystbåtene:**

- **Sløyeren og bløggekaret:** karet står 1,4–4,1 m fra sløyeren, bak ham eller på den andre sida av dekket (sjarken 2,3 m, nysjarken 4,1 m, 21-meteren 1,9 m; bare snekka har det nær, 0,5 m, men rett bak ham). Stillingen i dag strekker hånda en halv meter i karets retning og tar en fisk ut av lufta. Det kan ingen stilling rette: det er ikke en bevegelse som finnes.
- **Sløyeren og pakkerens kasse:** 1,2–4,0 m unna og bak ham. Den sløyde fisken kastes dit i dag.
- **Bløggeren og karet:** 1,3–1,7 m (kastet), i retning 14–53° (foran ham: det er greit som kast, men lenger enn sonen).
- **Haleren og stedet fisken slippes:** 0,45–0,8 m rett bak ham (120–160°). Derfor snur han seg 130° i høttetaket.
- **Pakkeren og iskassa:** i sonen der den finnes; på snekka 1,5 m.
- Innenfor på alle: haleren ved haleren, sløyeren ved bordet (utenom autolineren og ringnota), bløggeren ved fisken.
- Havbåtene (snøkrabbe, trålerne, ringnot) har karet 6–16 m fra plassene: de har fabrikk og er ikke med i første runde.

**Dette er et valg om spillet, ikke om animasjon (Jonas):** hva tar sløyeren fisken fra, og hvor legger han den? Se meldingen til Jonas 14.11.2026 og svaret hans her når det kommer. Stillingene er ikke rørt.

**Klippene:** `tests/folk2klipp.py` er skrevet. Første forsøk med hele dekket ga 53 s per bilde (40 min for ett klipp), kameraet sto ikke på sløyeren, og HUD-en og sjøen var ikke skrudd av. Ikke sendt til Gemini. Det hvite rommet (12 s per bilde) virker, men viser ikke bordet og karet.

## Bygd etter valg A (14.11.2026, samme dag; rullet ut til testadressen, venter på Jonas)

Jonas valgte gjennom samtalen med Gemini: **A** for sløyeren (kasser ved bordet), haleren slipper fisken foran til siden, bløggeren beholder kastet til karet, havbåtene holdes utenfor, stillbilder i stedet for klipp om det hvite rommet stritter imot.

- **Sløyerens to kasser** (`HOLDT.gutbox`, `drawDeckCrew` og `drawWorker`, bak `LEMMER.on`): en kasse med bløgget fisk på en stabel på tre ved siden av ham (toppen i bordhøyde, 0,8 m til siden, på karets side når dekket er fritt der), og en kasse på dekket på den andre sida for den sløyde fisken. Hånda går helt til kassa, og kroppen lener seg etter. Er det ikke plass til kassene, gjør han som før. Pakkeren legger ikke lenger fisken rett når sløyeren har egen kasse (fisken lander ikke hos ham).
- **Haleren:** fisken slippes ved siden av ham langs rekka (minst 70° rundt fra rett innenbords, `BLEED.side`), der dekket har en slik plass. Bløggerens plass følger slippstedet som før.
- **`node tests/unit/run.mjs arbeidssone`** holder nå de åtte kystbåtene til sonen: 66 ting, alt innenfor utenom ett kjent (snekka har ingen plass ved halerens side; fisken slippes bak ham som før). Bløggerens kast til karet er 1,1–1,5 m. Havbåtene er bare opplysning (6 ting utenfor). `arbeidsplass`: breisjarken har fått unntak 0,8 m (bløggeren står 0,84 m fra haleren med det nye slippstedet; før var grensa 0,95).
- **Målt i nettleseren** (`folk2maal arbeid juksa`): sløyeren 1,1/0,2 cm, ingen ting over 3 cm i egen eller andres kropp ut over stopplista; juksa med to sløyere 1,1/0,9 cm.
- **Ikke sett.** Tre forsøk på stillbilder på det ekte dekket: ett brukbart (`docs/okter/2026-11-14-125/125b-sloyer-kasse-ovenfra.png`: sløyeren lent mot kassa ved bordet, sett ovenfra, for bratt til å se hånda), to med kameraet inne i veggen eller utenfor skroget. Ingenting sendt til Gemini. Om hånda treffer kassa, om stabelen ser riktig ut, og hvordan haleren ser ut når han slipper fisken til siden, er ikke sett av noen: `docs/spill-dette/125.md` punkt 14.
- **Ikke bygd:** færre stasjoner på små dekk og «inne» for dem uten stasjon; banen rundt kroppen som én regel; gripepunkter for pakkeren, bløggeren og egneren; folk som går, går gjennom sløyerens kasser (dekkskartet kjenner dem ikke).
- **Dette var andre og siste økt i runden.** Neste skritt er Jonas' på nettbrettet.

## Ny retning 15.11.2026 (Jonas, etter klippet fra nettbrettet): plassene først, så fiskens vei

Jonas: «Jeg tror det er lurt at vi tar en gjennomgang på alle båtene og plasserer fiskeredskap, kar, sløyebenker og alt sånt på plasser som harmonerer med arbeidsprosessene mannskapet skal utføre»; «fisk teleporterer fra kar til sløyebenk»; «hele hendelsesforløpet fra fisken kommer ombord, bløgges, legges i bløggekar, hentes for sløying, sløyes, kastes i lasterom eller kar på dekk har animasjoner»; «På båter med lasterom vil jeg at det skal være en åpen luke ned til lasterommet der fisken kastes enten rund etter bløgging, eller etter at den er sløyd»; ingen kasser som dukker opp ut av løse lufta, Blender-modeller av kasser som løftes; en trekrakk i stedet for de hvite kassene når de egner eller har pause; tomme linebøtter stables i hverandre etter hvert som lina settes. «Ja, det er greit at ting flyttes båt for båt» (snur «ingenting flyttes i modellene» fra 14.11). «Start med det du mener blir mest riktig for et bra sluttresultat.»

**Rekkefølgen (foreslått, hvert steg med tak i økter og Jonas' ja):** (1) plantegninger av de åtte kystbåtdekkene med forslag til nye plasser, Jonas godkjenner båt for båt; (2) tingene flyttes i Blender-skriptene, luka åpnes, krakken lages; (3) én fisk som følger hele veien (regnskap for den synlige fisken), stillingene festet til de nye plassene; (4) linebøttene og krakken i bruk. Sløyerens to kasser fra 14.11 tas ut når plassene er lagt om.

**Gjort 15.11:** `node tests/unit/run.mjs dekkplan` leser hvert dekk fra modellen (`tests/out/dekkplan.json`), og `python3 tools/deck/dekkplan.py [forslag.json]` tegner det ovenfra til `docs/planer/dekk/<type>.png` (i dag i farger, forslag i grønt). Fiskens vei i dag: 2,4 m (snekka) til 7,0 m (nysjarken); leddet bløggekaret → sløyeren er 1,4–4,1 m. Ting som står i hverandre i dag: bløggekaret og haleren på sjarken og plastsjarken (halerens mann står inne i karets fotavtrykk), bløggekaret og garnkaret på snekka. Første forslag tegnet for nysjarken (`docs/planer/dekk/forslag.json`). Ingenting i spillet er endret.

**Jonas 15.11.2026 (svar på tegningene):** prinsippet for plasseringen finner økta ut selv, etter hva som er realistisk og bransjestandard; **pakkeren med isspaden finnes ikke på dekk på båter med lasterom** (fisken kastes ned gjennom den åpne luka, isingen skjer i rommet; «Enig»); linestampene og annet flyttes der det trengs («du bestemmer. Det viktigste er at ting plasseres på en måte som fungerer og er logisk»).

**Bransjepraksis (slått opp 15.11.2026):** totrinns behandling er regelen for hvitfisk: fisken bløgges straks den kommer om bord, blør ut i kar med rennende sjøvann (Matis' veileder: 15–20 minutter), og sløyes snarest etter utblødningen (Mattilsynet: «sløying skal skje snarast mulig etter utbløding»); direktesløying gir dårligere utblødning (Nofima). Der det er plass, sløyes det på benk, særlig større fisk (Matis). Kystflåten har også lang tradisjon for å levere dagfanget fisk rund, sløyd på kjøpers anlegg (Nofima). Ingen kilde ble funnet om selve dekksarrangementet på en sjark: at utstyret står langs rekka på halerens side i rekkefølgen haler, bløggekar, sløyebenk, luke, er øktas egen slutning fra arbeidsgangen, ikke en kilde. Kilder: matis.is «The importance of good onboard handling of fish» (norsk utgave), mattilsynet.no «Bløgging og sløying», Nofima-rapporten om bløgging, blodtapping og sløying om bord (core.ac.uk/download/249980489.pdf).

**Forslagene for de sju andre båtene var ikke laget da dette ble skrevet (15.11.2026; de står under «Forslagene, båt for båt»).** `tools/deck/dekkforslag.py` prøver hver plassering av karet og bordet mot reglene (kast 0,7–1,6 m, rekkevidde, luka innen 2,2 m, inntil rekka på halerens side). Uten rekkeregelen setter den karet og bordet midt på dekket; med den finner den plass på tre av åtte dekk, og tegningene den gir, er ikke gode nok til å vises som forslag. Søket ble justert fire ganger og stoppet der. Forslagene lages for hånd, båt for båt, fra tegningene, slik nysjarkens ble. Snekka og sjarken får ingen plassering i søket i noen variant: de er de to minste dekkene.

## Forslagene, båt for båt (15.11.2026, laget for hånd; venter på Jonas' ja eller nei)

Tegningene: `docs/planer/dekk/<type>.png`, «I dag» og «Forslag» side om side (grønt = flyttet eller nytt, rødt kryss = tas av dekket, grønn strek = fiskens vei). Plassene står i `docs/planer/dekk/forslag.json`. `node tests/unit/run.mjs dekkplan` legger hvert forslag over dekket og holder det til reglene, og `python3 tools/deck/dekkplan.py` tegner. **Ingenting i spillet er endret.**

**Mønsteret:** alt står langs rekka på halerens side (styrbord på alle åtte) i arbeidets rekkefølge akterover: haler, bløggekar, sløyebord, og luka eller fiskekaret innen et kast fra sløyeren. Sløyeren står innenbords for bordet og ser ut mot rekka (sloet går over ripa), med bløggekaret ved venstre hånd. Fire båter har egen bløgger (nysjarken, breisjarken, 15-meteren, 21-meteren); på de fire minste arbeidsdekkene (snekka, plastsjarken, sjarken, hurtigsjarken) bløgger haleren selv og kaster fisken i karet ved siden av seg, og én mann sløyer. Pakkeren og iskassa er ute på alle sju med lasterom (Jonas 15.11).

- **Snekka (åpen, kar på dekk):** gulvet mellom haleren og sløyebrettet er 2,0 × 0,8 m. Bløggekaret flyttes 0,6 m forover til midten foran dem (fritt for garnkaret, som det står i i dag), haleren bløgger selv, sløyeren står der han står og kaster i fiskekaret akter (1,1 m). Bløggeren og pakkeren tas ut: pakkeren sto 0,43 m fra haleren. **Holder ikke to regler:** karet står skrått bak begge (131° for haleren, 143° for sløyeren); brettet ligger på ripa og alt gulv er bak dem. Ingenting endres i Blender. Fiskens vei 2,4 → 2,2 m.
- **Plastsjarken (lasterom):** bløggekaret flyttes akterover langs styrbord rekke, klar av haleren (han står i det i dag). **Båtens egen sløyebenk flyttes i Blender** fra babord ripe til styrbord rekke akter for karet (0,75 m, som nå); sløyeren innenbords for den, luka 1,2 m foran til venstre. Haleren bløgger selv. Linestampene flyttes til babord akter, der garnkaret står. Vei 4,6 → 2,8 m.
- **Sjarken (lasterom):** samme rekke: bløggekaret akter for haleren (han står i det i dag), sløyebordet (spillets, 1,6 m) akter for karet der linestampene og garnkaret sto, og de flyttes til babord forut der bordet sto. Haleren bløgger selv; iskassa ut. Ingenting endres i modellen ut over at luka åpnes. Vei 4,7 → 2,7 m.
- **Hurtigsjarken (lasterom):** mellom haleren og kranfoten er det 2,4 m rekke. Bløggekaret står på tvers rett akter for haleren, og et **kortere bord (1,0 m i stedet for 1,6)** akter for det; sløyeren har luka 0,6 m bak seg. Haleren bløgger selv. Med egen bløgger må bordet stå på tvers midt på akterdekket ved kranfoten: prøvd og lagt bort (trangt ved luka, bordet midt i gangveien). Vei 3,9 → 2,0 m.
- **Nysjarken (lasterom):** første forslag (15.11) holdt ikke reglene (bløggeren 1,5 m fra fisken, karet og bordet i hverandre) og er lagt om. Fisken slippes akter for haleren, bløggeren innenbords for den, karet ved rekka akter i gangen, bordet akter for karet på akterdekket, luka 1,0 m bak sløyeren til venstre. Linestampene flyttes akterover til garnkarets plass. Gangen forbi karet til døra er 0,6 m. Vei 7,0 → 4,0 m.
- **Breisjarken (lasterom):** som nysjarken på styrbord side. **Båtens egen sløyebenk flyttes i Blender** fra babord under lyet til styrbord rekke akter for karet (0,9 m); linestampene og garnkaret flyttes til babord ved siden av luka, forut for der benken sto. Sløyeren har luka 1,7 m foran til venstre (lengste kastet i forslagene). Vei 5,4 → 4,4 m.
- **15-meteren (lasterom):** halestasjonen er en 1,2 m bred gang, og sløyeren står i dag oppå luka (den er 0,6 × 0,8 m midt i gangen). **Luka flyttes i Blender 0,5 m ut til rekka**; da står sløyeren ved båtens egen benk (blir stående) med luka 0,6 m bak seg. Bløggekaret flyttes inn i nisja ved innerveggen forut for benken (haleren står i kanten av det i dag), bløggeren mellom haleren og luka. Lasterommet er ikke modellert (bare utsiden): luka er et lokk i dekket (`HOLD` i `tools/boats/kyst15.py`), og plassen ved rekka er 0,5 m innenfor skroget (halv bredde 3,3 m), så flyttingen er bare lokket. Alternativet om Jonas heller vil ha luka der den er: benken til rekka og luka inn til veggen (to ting flyttes). Trangeste forslaget: bløggerens kast er 0,7 m og han står 0,25 m fra lukekanten. Vei 2,5 → 2,7 m (i dag går den gjennom luka han står på).
- **21-meteren (lasterom):** rekkefølgen er alt riktig (haler, kar, benk for tre langs rekka). Bløggekaret snus på tvers og skyves inntil benken, så fisken kan slippes mellom haleren og karet (i dag slippes den oppi karet), bløggeren står innenbords, og sløyeren flyttes 0,8 m forover langs benken til karet. **Den åpne luka legges i styrbord del av lukekarmen** (1,6 m fra sløyeren; midten av karmen er 2,6 m unna). Vei 5,7 → 4,3 m.

**Jonas' svar 15.11.2026 («Kjør på», og valgene med spørsmålsverktøyet, alle fire som anbefalt):** alle åtte forslagene godkjent; haleren bløgger selv på snekka, plastsjarken, sjarken og hurtigsjarken (bløggeren er inne der); 15-meteren: luka ut til rekka, benken blir stående; snekka: karet skrått bak haleren og sløyeren godtas, ingenting i Blender; hurtigsjarken: kortere bord (1,0 m). Bygges i steg 125d.

**Reglene slik testen måler dem** (`R` i `tests/unit/dekkplan.test.mjs`; startverdiene fra `docs/planer/start/125c.md`): slippet 0,4–0,8 m fra haleren og minst 70° rundt fra rett innenbords; bløggeren 0,4–0,8 m fra fisken; kastet til karets midte 0,7–1,6 m og høyst 110° fra veien han ser; sløyeren 0,15–0,5 m fra bordets langside og vendt mot det; karets nærmeste kant høyst 0,75 m fra sløyeren og ikke bak ham; luka (nærmeste kant + 0,3 m inn) eller fiskekarets midte høyst 2,2 m fra sløyeren; karet og bordet inntil rekka eller en vegg, på halerens side; ingen ting i hverandre, på luka eller 0,4 m fra døra og roret; folk minst 0,75 m fra hverandre og 0,2 m fra alt som står. «På dekk» tåler 0,45 m ut over ytterste celle mot rekka (cellene stopper før skansekledningen, og dagens bord står slik), aldri i et hull innenbords. Sett rød: det første nysjark-forslaget (tre brudd), og en fil med plasser som bryter hver regel (31 brudd).

**Svakt og antatt:** målene på båtenes egne sløyebenker og lukene er lest fra konstantene i `tools/boats/*.py`, ikke målt i modellene; lukene på sjarken, hurtigsjarken og nysjarken er tegnet 1 × 1 m. Juksaplassene og pauseplassene er ikke lagt om (de følger i steg 2 og 3). Om en plass ser riktig ut med folk på, avgjør klippet og Jonas på nettbrettet, ikke tegningen.

## Bygd i steg 125d (15.11.2026, Jonas' økt): dekkene lagt om i modellene

- **Plassene står i modellene:** `work.gut` (sløyeren), `work.bleed` og `work.drop` (bløggeren og slippet), `work.solo` (haleren bløgger selv: snekka, plastsjarken, sjarken, hurtigsjarken), `work.nopack` (ingen iser på dekk: de sju med lasterom og snekka), `work.bord` (plastbordet på hurtigsjarken, 1,15 m; Jonas sa 1,0, nærmeste bord spillet har), `work.tl` (21-meterens bord, 2,0 m), `hatchSize` og på 21-meteren `hatchCover`. `places()` og `deckPoints()` tar dem; der modellen ikke gir dem, søker koden som før. Pakkeren er inne der rommet ises (i havn tar han imot isen ved luka). Der haleren bløgger selv, sløyer den spillet gir bløggingen, ved bordet (`tests/unit/solodekk.test.mjs`; første utgave sendte ham inn, så ingen sto ved kniven med to om bord).
- **Modellene:** snekka, sjarken, hurtigsjarken, nysjarken og 21-meteren fikk bare nye ankere (`tools/boats/glbanchors.py`, geometrien byte for byte; prøvd: de gamle skriptene gir nøyaktig ankerne i de gamle modellene). Plastsjarken (benken til styrbord rekke), breisjarken (benken fra babord under lyet til styrbord akter for karet) og 15-meteren (luka ut til sida) er eksportert på nytt. `check()` er grønn i alle åtte.
- **Den åpne luka** tegnes av spillet (en mørk brønn i karmen og lokket reist opp på forkanten), ikke i modellen: åpen mens båten fisker og mens isen tas imot i havn, lukket under teiner (de tømmes på lukedekselet på 21-meteren) og ellers. Ingen går over den (`fixedBoxes`). Isen i havn går ned luka, ikke i en iskasse.
- **Juksaplassene** som sto der karet og benken står nå: breisjarken én (jukseMax 1, Jonas 15.11.2026 «Én juksaplass»), nysjarken tre (jukseMax 3, Jonas «Tre plasser»: to om babord der benken sto, én i hekken), 15-meteren fire (den første flyttet mellom luka og haleren; de jukser ikke mens de haler), sjarken fire (den første til styrbord låring), plastsjarken og hurtigsjarken som før med nye steder.
- **Linestampene** står fire i laget der de er flyttet (plastsjarken, nysjarken, breisjarken), resten stablet oppå, slik spillet stabler dem. På sjarken og breisjarken står de nå forut på babord og bæres akterut når det settes; lina går ikke rett fra dem til setteporten lenger.
- **Trekrakken** er lagt til `deck-pause.b64` (`tools/deck/pause.py add`; de 13 gamle delene er uendret). Den brukes ikke ennå (steg 4).
- **Testene:** `dekkplan` holder modellene lik forslagene (sett rød med 49 avvik før flyttingen); lossing, sjøbein, arbeidsplass, arbeidssone, jig, trim og teiner er rettet for de nye plassene. `tests/dekk125d.py` tar bildene ovenfra med linetrekk i begge formater.
- **Ikke gjort her (steg 3 og 4):** stillingene er ikke festet til de nye plassene, haleren bløgger ikke selv i animasjonen ennå, ingen fisk følger hele veien, sløyerens to kasser står fortsatt, krakken er ikke i bruk.

## Bygd i steg 125e (15.11.2026): én fisk hele veien, første økt

- **Regnskapet for den synlige fisken** (`FISKVEI` i `src/js/deckcrew.js`, bak `#folk2`): en bløgget fisk telles i bløggekaret når den lander der (`FISKVEI.TOSS`, 2,45 s ut i bløggingen); sløyeren tar en fisk ut av karet bare når det er en der, ellers venter han ved bordet med hendene i ro; den sløyde fisken går i den åpne luka (`work.nopack`) eller fiskekaret ved slutten av runden. Karet tegnes med regnskapets fisk, ikke spillets kilo; fisken som lå ved bordet etter kiloene, tegnes ikke med `#folk2`. Regnskapet begynner fra fangsten som venter (én fisk per 6 kg, høyst ti) når du kommer om bord midt i et drag, og tømmes med spillet når ingenting venter og ingen sløyer. Kalles sløyeren bort midt i en fisk, går den tilbake i karet om den ikke var lagt på bordet. Spillets fangst endres ikke av noe av dette.
- **Sløyerens to kasser (`HOLDT.gutbox`, 125b) er ute.** Sløyeren henter fra bløggekaret ved hånda og kaster i luka eller fiskekaret (`tests/unit/arbeidssone.test.mjs` måler nå begge, som `dekkplan` gjør: karets nærmeste kant høyst 0,75 m, luka innen 2,2 m).
- **Haleren bløgger selv der `work.solo`:** fisken han slipper ved siden av seg, er hans (før ventet den på den som sto ved bordet og forsvant etter 20 s).
- **Trebåten (Jonas' klipp 15.11.2026):** håndjuksa med pilk + 10 kroker (`HANDJUKSA` i `deckcrew.js`): slippes ned, nappes, sveives opp med det som sitter på og slippes ned igjen; uten fisk sveives den opp etter 18 s. Fisk som krokes mens han bløgger, venter på krokene; køen kuttes ikke lenger. Karet tegnes uten fisken som venter på kniven og den i hånda (før sto de i karet før de var bløgget). Hånda på rorkulten følger den når båten svinger.
- **Testene:** `fiskvei.test.mjs` og `handjuksa.test.mjs` (begge sett røde mot dagens regler), `tests/fiskvei3d.py` (regnskapet i spillet), `tests/trebat125e.py` (juksa og rorkulten i bilder), `tests/folk2klipp.py --lock` (hele dekket på én låst klokke).
- **Andre økt (15.11.2026):**
  - **Gaffelen på sjarken** kom bare én gang i `tests/fiskvei3d.py` fordi studioet (`G3._debug.studio(true)`) returnerte før `drawDeck` og `drawGearOp`, der gaffel-hendelsene lages. Spillet var riktig; studioet kjører dem nå før ruta tørkes hvit. `fiskvei3d.py` grønn: sjarken 8 bløgget og 18 sløyd ut i luka, sjarkny 10 og 12, 0 brudd.
  - **Studioet** (Jonas: «Trenger du skygge eller terrengbyggeren i det hele tatt?») oppdaterer ikke sjøen, skyggene og terrengbitene, og tegner ikke himmelen og landet; båter som rores for hånd får det hvite rommet med hele båten. `studio(2)` beholder båten og dekket (klippene, `tests/folk2klipp.py`).
  - **Trebåten «bløgget for sakte»** bare i testen: juksa og bløggingen går på rammens `dt` (høyst 0,1 s per bilde), og SwiftShader gir under ett bilde i sekundet. `tests/trebat125e.py` går på låst klokke (100 ms per bilde): hele runden og tre fisk bløgget på 20,6 s spilltid, 0 brudd. Første økts «35 bilder i sekundet i studio» var det glidende snittet `fps`, som sto fast.
  - **Venstre hånd på ripa** mens han sveiver (Jonas: «den er liksom i lufta over rekka»), andre forsøk med ny modell: toppen av ripa leses fra skrogets egne punkter (`gunTop` i `13-instruments.js`), håndflata ned på den indre halvdelen.
  - **Gangen** (punkt 8): alene om bord har skipperen én plass om gangen (rorkulten, ripa ved juksa, bordet) og går mellom dem med dekksfolkenes gange (`drawWorker`, 0,9 m/s, et halvt sekund for å reise seg). Veien finnes i et rutenett på 8 cm fra skrogets trekanter (`skGrid`, `skPath`): hindre mellom 25 cm og 1 m over dørken, korteste vei, rettet ut. Fra juksa til roret går han langs styrbord forbi motorkassa. `tests/trebat125e.py --gang` (klipp, sakte: flere sekunder per bilde).
  - **Klippene per båt** (punkt 4) ble ikke laget: Jonas 15.11.2026 «Drit i klippene, det tar så lang tid. Kjør det ut så kan jeg se det selv». Han ser på nettbrettet etter `docs/spill-dette/125e.md`.

## Valgene som må tas før det bygges (Jonas)

- A/B: færre samtidige stasjoner på de minste dekkene, eller trangere celler der.
- Om cellene legges i modellenes ankere (Blender-skriptene, alle båttypene) eller regnes av `places()` i `deckcrew.js` fra ankerne som finnes.
- Hvilke celletyper som er med i første runde.

## Tallene steget kan begynne fra

Tabellen «Alle handlingene» i 5.33d i `docs/systemer/folk-om-bord.md`: radene med andres ting i en kropp og de plassbundne handlingene (`gutw`, `pack`, `bleed`, `gaff`, `egn`) er de cellene skal få til null uten søk per båt. `node tests/unit/run.mjs arbeidsplass` skriver plassene på åtte båttyper.

**Etter steg 125f (16.11.2026):** de fire stegene i rekkefølgen er bygd og rullet ut (125f versjon `e5034d58c40f`). Garnet får ikke et tilsvarende steg: Jonas 16.11.2026, «Garnene står jo i store kar, og skal ikke bæres.» Folk 2-sporet går videre med 121 FB3 (føttene i gange, startmeldingen `start/121.md`, venter på klarsignal) eller etter det Jonas ser på nettbrettet.
