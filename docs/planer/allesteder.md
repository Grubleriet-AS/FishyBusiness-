# Alle steder: ingen blir sittende fast (steg 126 AS1)

Jonas 13.11.2026: «Test å start fra alle kaiplasser, butikker, verft, rorbuer, fiskemottak med den eldre kystbåten å se om du kan starte en rute som går en eller annen plass. Å se at det faktisk fungerer både å ligge der med båten med tanke på størrelse og dypgående, men også at det faktisk er mulig å seile videre der i fra … Jeg MÅ vite at alle stedene i spillet fungerer som de skal og at spillere ikke blir stuck NOEN steder.» Og: «det er fullstendig krise om alt ikke fungerer som det skal når spillet lanseres.»

Valg: «Grense ved 15 m» for rorbuer og naust (13.11.2026; 5.25j i `docs/systemer/havner-og-mottak.md`).

Valg 41 (15.11.2026): Jonas: **«Valg A»**: båten ligger inntil pælekaia ved naustet og rorbua, og sjøbunnen rett foran kaifronten mudres (bare foran fronten, ikke land bak, ingen vegger over vannet). T-brygga (B, bygd i femte kjøring) tas ut når A er bygd. Og samme dag: «Alle steder spillerens båt kan fortøye må være tilgjengelig via autonav både inn og ut av.» Det gjelder alle plassene: mottak, butikker, verft, rorbuer, naustet og havneplassene i havnene langs kysten (`havnBerths`, «Fortøy»), inn og ut.

Jonas 15.11.2026 (i økta med fjerde kjøring), om spørsmålene derfra:
- **Vanse og Søndeled:** utstyrsbutikken i Vanse (flyttet 4,6 km) og verftet i Søndeled (3,4 km): «Ja, det er greit.»
- **Rorbuer og naust:** «Rorbuer og naust skal ikke være plassert sånn at båter under 15m ikke kommer til under noen forhold.» De flyttes til der alle båter opp til 15 m kommer inn og ut, og avvises ikke. Austgulen og Langvasseid, som sjuende kjøring la i `siteout.json` (`SITE_SILL`, båter som stikker dypere avvises), flyttes derfor. `SITE_SILL` kan stå som et sikkerhetsnett, men en rorbu eller et naust i den er et funn.
- **Laveste lavvann:** «Jeg tenker at det er lurt å kjøre testen på kun laveste lavvann, fordi det sikrer at det faktisk fungerer under alle forhold.» `tests/allesteder.py` holder tidevannet på det laveste gjennom hele turen. Arbeidsrutinen valgte sjøkartnull: dybdene i sjøkartet er målt mot den, og den ligger ved laveste astronomiske tidevann. Å vente på flo for å komme ut (`tideBound`) er da et funn, ikke et unntak.
- **Autonav etter båten:** «Jeg tenker også at autonav burde tilpasse seg båtens svingradius og dypgang når ruta lages. Det er bedre at vi tilpasser oss verden enn at verden må tilpasse seg oss.» Ruta skal lages og sjekkes med det sporet båten faktisk seiler: buene på hennes egen svingradius, dypgangen med squat og en margin. Rettingene sted for sted (omveiene, back and fill, «hendene») skal bli overflødige der ruta er riktig fra start. Hendene står igjen bare som den siste utveien.
- **Rorbuer som ikke kan bli grønne** (til sjuende kjøring, 15.11.2026): «Om noen få rorbuer er umulig å få grønn har du min tillatelse til å fjerne dem i sin helhet». De merkes som borte (id-ene står), og lagringer der flyttes ved oppstart.
- **Frie tøyler:** «Du får frie tøyler til å ta de valgene du mener er riktig, men som ikke går på bekostning av spillets integritet.» Valgene som kan gjøres om, tar økta selv og skriver her. Det som ikke kan gjøres om (lagringer, ekte penger, juss), venter fortsatt på Jonas.
- **Arbeidsmåten** (fra samme økt, «Ja, det er greit»): (1) hvert sted i `allesteder` starter med blanke ark på samme faste tidevann, og testen skriver ut loggen når et sted feiler (filteret fanget ikke «Grunt vann forut»); proben for ett sted (`KYST_ALLE_ID`, med logg og spor) inn i testen; (2) funnene fra forrige kjøring kjøres først, og hele kysten deles i to deler som kjøres alene etter hverandre; (3) en rask sjekk av om det er sammenhengende vann med nok dybde ut fra et sted, før det trege rutesøket (et søk som ikke finner noe, tar 45–50 s), både for `rorbuvei.py` og i spillet.

Valg 13.11.2026 (andre del): handelsstedene der kystbåten (21 m, 3,4 m) ikke kommer ut ved noe tidevann, fordi sjøkartet er grunt i innseilingen (Flekkerøy, Helligvær, Mandal verft, Arendal verft, Halden verft og de andre): Jonas: **«Flytt alle»**, til en kai der kystbåten kommer ut, også når det blir opptil 3 km fra det ekte stedet. Alle båter kan bruke alle steder (mot «Flytt, ellers avvis» og «Avvis, flytt ikke»).

## Ferdig når

1. `tests/allesteder.py` er grønn på hele kysten: kystbåten (21 m) fra hver havn og kystbåten på 14,99 m fra hver rorbu og hvert naust finner en vei ut (til en havn eller åpent vann, innen 12 timer med tidevannet), seiler den med båtmodellen og legger til uten grunnstøting, kollisjon eller skade.
2. Havneplassene i NPC-havnene (`KYST_ALLE=havn`): veien ut fra alle 3 311, seilt fra hver tiende, grønn.
3. Et sted som ikke kan tas i bruk av en båt (for grunt inn for henne ved alle tidevann), tilbys ikke henne, og spillet sier hvorfor.
4. Stikkprøver i 3D (sør, midt, nord) av stedene som er rettet.

## Gjort 13.11.2026 (grenen `ccr-432150cd-kkjoez`)

- 15 m-grensen for rorbuer og naust, mudringen der (`siteDredge`) og kravet om vei ut for den dypeste båten under 15 m (`naustWay`, `rorbuSite`); båter over 15 m ved en rorbu flyttes ved oppstart.
- Autopiloten står ikke lenger fast mot en kai (`T.assist` i `dynAuto`): Skjervøy prøvd.
- Margen til brupilarer og sjømerker vokser med båtens lengde (`obsClr`), og en omvei med mindre margin prøves der ingen med full finnes (`obsDetourAny`): Reine prøvd.

## Gjort 13.–14.11.2026 (andre del, grenen `ccr-as1-alle`)

- **Testen:** skipperen hviler mellom stedene (han sovnet ved roret etter tusen turer, Ålesund), hvert støt skrives med posisjon og etappe (`hits`), `KYST_ALLE_H` flytter klokka og `KYST_ALLE_CPU` struper prosessoren.
- **Handelsstedene uten vei ut** (15, Jonas: «Flytt alle»): flyttet med `tools/steder/lukkflytt.py --vei` til en kai der kystbåten ligger med dypgangen under seg og Autonav finner vei ut. Tolv innen 3 km; Arendal verft 2,4 km, Søndeled verft 3,4 km og Vanse utstyrsbutikk 4,6 km (ingen kai innen 3 km holdt; `KYST_REACH` til 6 km). Id-ene beholdes.
- **Rorbuene uten vei ut:** `tools/rorbu/rorbuvei.py` flytter punktet til der kystbåten på 14,99 m ligger trygt og Autonav finner vei ut (ringer ut til 4,5 km, 1,5 km fra andre steder, 0,8 km der ingenting annet holder).
- **Autopiloten** (`core/16b-dyn.js`): hendene tar henne rundt skarpe svinger like etter havnepunktet (Vannvåg), og `dynAvoid` styrer unna merker, pæler og pilarer i svingene. Bøvågen og Napp gikk rene etterpå; Vannvåg og Stamsund traff fortsatt.
- `autonavtest` 9c skrevet om (veien langs ruta, ikke luftlinja).
- **Rorbuene** (andre økt, 14.11.2026): 37 flyttet med `rorbuvei.py` (9b6ebb65); uløst der: Austgulen (ingen plass innen 4,5 km) og Langvasseid (søket hang).

## Gjort 14.11.2026 (tredje del, arbeidsrutinen, grenen `ccr-as1-alle`, PR #87)

- **Omveien under en bru** passer båtens svingradius (Karmsundbrua ved Kopervik: S-sving 24 m til siden over 25 m, båten rygget og gikk fram for godt).
- **Omveien rundt et merke mellom to tette rutepunkter** (Bokn, Vannvåg, Mathopen, Revsnes): fra punktet før til punktet etter når sikksakken ikke kan svinges gjennom (`obsTurnable`, `obsRoute`).
- **Back and fill** når hun snur fra land, og **ny vei rundt** når hun holdes sakte mot grunna (sundet sør for Egersund).
- **Hendene som siste utvei** (Jonas 14.11.2026: «båten kan få lov til å bryte fysikkens regler og lover i enkelte situasjoner … men jeg ønsker jo helst at vi klarer å løse problemet på en annen måte»): står hun fast, holdes hun mot grunna igjen etter en vei rundt, eller kommer hun til et hjørne over 60 grader med et merke tett på leggene, fører hendene henne langs linja (`T.assist`, `dynTight`). Testen teller hvor ofte.
- Målt på de 13 vanskeligste havnene fra kjøringene (Kopervik, Tananger, Hellvik, Brettesnes, Vannvåg, Stamsund, Sund i Lofoten, Grimstad, Bokn, Arendal, Mathopen, Revsnes, Norheimsund): før 10–12 røde, etter alle fram, hendene 9 ganger på 7 av dem.
- Fylkene for de 15 flyttede handelsstedene slått opp på nytt (`fylke.py`; enhetstesten `regions` var rød).
- Funnet underveis: resultatet ved et sted avhenger av klokka (tidevann og trafikk), og testen lar klokka gå videre fra sted til sted. Et sted som er grønt i én kjøring, kan være rødt i neste (Kopervik, Tananger, Sund). Hele kysten må derfor være grønn i én og samme kjøring.

## Gjort 14.11.2026 (fjerde del, arbeidsrutinen, grenen `ccr-as1-alle`, PR #89)

- **Forsøkene rundt grunna** telles per rute (`SAIL_RP.pl`): en ny rute med samme leggnummer og lengde som de siste forsøkene på ruta før, begynte på tre, og første grunne stoppet henne (testen kjører tusen turer etter hverandre; i spillet en spiller som legger en ny rute etter en som stoppet). Høyst åtte veier rundt fra samme grunne (innen 300 m) mot samme punkt, mot en ring av omveier som fører tilbake på grunna.
- **Båten venter på svaret** når hun har stoppet foran grunna (`T.ghit`): før spurte hun igjen hvert spillsekund mens søket gikk, og det fjerde stoppet henne før det første hadde svart (Træna utstyrsbutikk, Sørvær). Taket: ti spillminutter med modellen i gang og minst ett sanntidsminutt.
- **Hendene når søket ikke hjelper:** er veien rundt bare den samme leggen (ingen punkter lagt inn), eller finnes ingen vei rundt på en legg ruta selv kalte trygg, tar hendene henne forbi grunna langs linja (`dynHandsOn`, telles som «held»). Træna og Tvedestrand verft kommer fram.
- **I havn** tar Autonav farten av for et fartøy i fart som nærmer seg (1 m/s; stopp innen to grenser der det å ligge stille lar det passere klart), og styrer rundt fartøy som ligger stille (`dynAvoid`). Givær utstyrsbutikk → Sørarnøy: ferja som la til ved fergekaia tvers over veien inn til mottaket, traff før; nå fortøyd.
- **Lomma ved naustet** når ut dit kaia er bygd (`siteOut`): Kvitsøy og Smøla nord 3,5 m, før 2,0 m.
- **Testen:** gir søket tid mens hun venter (før svarte det aldri, Hestnes), og skriver hvert sammenstøt med posisjon, havn, vikingen, varselet og hva den andre båten gjorde.
- `rorbuvei.py` fikk `KYST_RORBU_FAST=1`, men kom ikke gjennom Langvasseid på 25 minutter: hvert søk som ikke finner noe der, tar 45–50 s. Rorbuene uten vei ut er ikke flyttet i denne delen.
- Funnet underveis: hvilke NPC-båter som er ute, avhenger av kartflisene som er lastet fra stedene før. Leines og Ålesund verft traff en fiskebåt og et skip i hele kjøringen, men ikke alene.

## Gjort 14.11.2026 (femte kjøring, arbeidsrutinen, grenen `ccr-as1-alle`, PR #89)

- **Porten for fjerde del** gjort ferdig: `heattest` og `landtest` grønne (`heattest` var rød også på arbeidsgrenen: monteringstida står under knappen siden D3, testen leste bare knappen; rettet i testen), skjermbildene i `docs/okter/2026-11-14-126b/` (naustet på Kvitsøy med kystbåten på 14,99 m, mottaket i Sørarnøy og Træna verft med den på 21 m, i begge formater).
- **Trekaia ut til båten er en T-brygge** (`quayMod`, `view3d/22-docks-air.js`): ved naustet på Kvitsøy ble det tegnet fire rader trekai i hele båtens lengde, et tredekk på 17 × 24 m. Jonas så bildet: «Hvorfor er det bygget 4 kaier utpå hverandre? det ser jo helt sykt ut». Nå én rad langs båten og én seksjon bred gangbru inn. Jonas spurte så hvorfor hun ikke kan ligge inntil naustet; valget (A inntil med sjøbunnen mudret, B T-brygga, C naustet flyttet) står i 5.25j i `docs/systemer/havner-og-mottak.md` og i køen.
- **Ferja som legger til i veien hennes** (punkt 1 fra fjerde del, Fitjar verft nord): `colregSit` regner nå CPA-en med ferja liggende ved kaia når hun når den før CPA-en (`dock` fra `ferjeAt`), 4.12o i `docs/systemer/autonav.md`. Enhetstestene sett røde uten rettingen.

## Gjort 14.11.2026 (sjette kjøring, arbeidsrutinen, grenen `ccr-as1-alle`, PR #89)

Rullet ut til testutgaven med fjerde og femte del (6d397aca, 14.11.2026, versjon `e9f5defed56d`).

- **Gjennomgangen og kontrollen** (`/code-review` medium og `/kontroll` på hele diffen mot arbeidsgrenen) fant at styringen rundt fartøy som ligger stille aldri så en ferje ved kaia (`sjvNear` utelater fartøy ved kaia og til ankers når Autonav styrer), og at blikket den leste, var ferskt bare de første ti spillsekundene i hvert minutt. Rettet: en egen liste (`SJV.tl.s`) og visningenes klokke. Det andre som ble rettet: ferja viker ikke for en passering hun ikke kan åpne når hun ligger ved kaia (`dk`), og Autonav gjør det; kaia regnes også når ferja går forbi i samme retning; hendene tar henne bare forbi grunt vann, aldri over land, molo, skjær eller is; et søk ved is som ikke svarer, sier at det er is; `siteOut` husker bare et svar der hele fronten har den fine kysten; `ferjeDock` regner punktet ved kaia én gang. Ny `tests/unit/stilleliggende.test.mjs`, sett rød før rettingene. `helmtest` summerer svingen (den leste 187° til styrbord som 173° til babord, rød også før).
- **Hele kysten** (`tests/allesteder.py`, 1 045 steder, 100 min alene, bygget `a25f400ee20a`): **27 steder med funn, mot 38 etter tredje del** (den siste kjøringen over hele kysten, på det som er arbeidsgrenen nå). De som er prøvd alene på begge bygg ved samme klokkeslett: Træna utstyrsbutikk stopper likt på begge (ingen framdrift 0,65 km ute); Rørvik verft kommer fram alene på begge (sammenstøtet i hele kjøringen avhenger av hvilke NPC-båter som er ute); Laukvik (rorbua ved Alta) treffer ferja «MS Høgkrykkja» i havna på begge, i 8,4 knop på grenen og i 17,9 knop med full motorrom og slep på arbeidsgrenen.

## Gjort 14.11.2026 (sjuende kjøring, arbeidsrutinen, grenen `ccr-as1-alle`, PR #89)

- **Laukvik var testen** (punkt 1): `allesteder.py` holdt spillets minuttbrøk (`acc`, `lastWall` i `ui/08-actions.js`) fast mens den kjørte modellen, så `liveFrac` sto på slutten av minuttet og blikket (`sjvClock`) så de andre fartøyene der de ville være et minutt senere. «MS Høgkrykkja» er en hurtigbåt i 29,6 knop (ekte fart), og kystbåten stoppet i havna der hurtigbåten skulle gå et minutt fram. Nå holder testen brøken slik spillets løkke gjør; klokkene følges innen 2 s, og Laukvik kommer fram. I spillet følger klokkene hverandre (de nullstilles hver ramme eller hver tredels sekund). Det samme kan ha gitt de andre sammenstøtene og Autonavs unnvikelse av fartøy som ligger stille (ferskheten i `dynAvoid` holdt bare de første ti sekundene): kjøringen over hele kysten etter rettingen sier hva som står igjen.
- **Træna utstyrsbutikk** (punkt 2): linja til modellen var tegnet fra der båten var da ruta sist endret seg, og første bit gikk over holmen hun stoppet for, 30 m fra henne. Fra der hun lå, var leggen klar, så søket ga ingen nye punkter, og samme linje stoppet henne igjen. Nå tegnes linja på nytt fra båten når veien rundt er leggen selv (`sailReplan`, `05-vessels.js`). Rød før, grønn etter.
- **Rorbuene og naustene uten rute** (punkt 4, «Ferdig når» 3): seks av de åtte var testen, som spurte søket alene; kartplotteren finner veien gjennom havnas vei og veien på vannet fra plassen (`draftWay`, nå også fra rorbuer), og testen spør gjennom den. Rorbua i Austgulen tar båter som stikker høyst 2,0 m, og rorbua i Langvasseid har ingen vannvei ut: de tilbys ikke en båt som stikker dypere, og spillet sier hvorfor (`tools/rorbu/siteout.py`, `SITE_SILL`, `siteWhy`; 5.25j i `docs/systemer/havner-og-mottak.md`). Etter Jonas' svar 15.11.2026 (over) flyttes de to i åttende kjøring; `SITE_SILL` står som sikkerhetsnett.
- **Sjømerkene og brupilaren** (punkt 3): Veo og Ytre Bruvik traff pilaren til brua ved Bergen verft i 4 knop etter å ha kommet i 7 knop; nå går hun i manøverfart der `dynAvoid` finner noe tett over veien (4.12o i `docs/systemer/autonav.md`). Veo, Ytre Bruvik, Hofset, Leirvika og naustet på Kvaløya sør kommer fram alene på samme klokkeslett.
- **Hele kysten med alle rettingene** (`tests/out/logs/allesteder-8.log`, 1 037 steder): 7 feiler i seilingen (Veierland verft, Dønna utstyrsbutikk, rorbuene Jektvika, Torvika, Sølvberg og Årdalstangen, naustet på Bleik), 1 uten rute (Austgulen), hendene der hun sto fast på 23 steder, 4 ruter med en legg over land. Lista med klokkeslett står i startmeldingen for åttende kjøring.
- **Hele kysten på bygget før de to siste rettingene** (`tests/out/logs/allesteder-7.log`, med Laukvik- og Træna-rettingene, 1 037 steder): alle 357 mottak, butikker og verft seilt ut uten funn; 13 rorbuer og naust feiler i seilingen (mot 23 etter sjette kjøring), 8 hadde ingen rute (6 av dem var testen, 2 står bak terskel, over), og hendene tok henne der hun sto fast på 21 steder (mot 25).

## Gjort 15.11.2026 (åttende kjøring, Jonas' økt, grenen `ccr-as1-alle`)

- **Testen på laveste lavvann og inn og ut** (punkt 3 og 6 i startmeldingen): `tests/allesteder.py` holder tidevannet på sjøkartnull hele turen (`tideH` gir minus middelvann over sjøkartnull, så `tideCD` er 0 og ingen tidevannsstrøm går; `KYST_ALLE_TIDE=live` som før), og venter ikke på flo. Etter veien ut seiler båten inn igjen fra et punkt på sin egen vei ut 1,5 km fra plassen (ellers åpent vann 1–3 km ute) og legger til (`ALS.back`, `ALS.sail`). `KYST_ALLE_PART=k/n` deler kysten på flere prosesser, `KYST_ALLE_ROUTE=1` spør bare rutene.
- **Helkjøring 9** (stoppet etter 600 av 1 045, `tests/out/logs/allesteder-9-delvis.log`): rundt 115 funn, nesten alle nye med lavvann og veien inn: 55 rorbuer der Autonav ikke fant veien inn, 41 rorbuer og 7 handelssteder uten vei ut på sjøkartnull, sammenstøt med ferger.
- **Veien inn i Autonav** (en ekte feil, ikke testen: en spiller som trykket på en rorbu fra sjøen ved lavvann, fikk «Fant ingen trygg rute»): `leiaRoute` snur søket når veien inn eller ut (under 60 km) ikke ble funnet, og går ellers inn via havnas egen innseiling (`approachPath`, ytterste punkt som mål; Averøy). `draftWay` går inn til en rorbu via veien på vannet ut fra plassen (`naustWay`) snudd, som den alt gjorde ut (Mehamn, Tømmervik og de andre).
- **Rorbuene flyttet** (`tools/rorbu/rorbuvei.py`, nå på sjøkartnull og med veien inn, `draftWay` som kartplotteren): 47 rorbuer 0,3–0,6 km (41 i nord, seks på Helgeland). Ingen trengte å fjernes.
- **Rorbuer tatt bort** (Jonas 15.11.2026: «Om noen rorbuer er plassert på plasser som gjør det umulig å seile dit på laveste lavvann ved hjelp av autonav-funksjonen, fjerner du dem»): Austgulen (`rb426`, ingen punkt innen 4,5 km med vei ut på sjøkartnull, 28 prøvd) og Langvasseid (`rb90`, ingen vannvei). `rorbuer.json` «gone» (`rorbuvei.py --gone`, og `--gone -rbN` tar en tilbake): rorbua står i lista med punktet sitt (id-ene står) og i `RBID`, men ikke i `RORBUER`, kartet, 3D, søket eller Autonav; `siteFits` sier nei til alle båter, `siteWhy` sier hvorfor, og oppstarten flytter en båt der til nærmeste havn og lar en rute som ender der, ende utenfor (`ui/11-boot.js`). `SITE_SILL` har dem fortsatt; «gone» går foran.
- **Handelsstedene for 21 m på lavvann** (Jonas 15.11.2026, beslutningskortet: «21 m også på lavvann»): `tools/steder/lukkflytt.py --vei` på sjøkartnull og med veien inn flyttet Revsnes 630 m, Brandsfjord 197 m, Helligvær 739 m (`KYST_REACH` til 6 km), Hagavik verft 182 m, Tvedestrand verft 1,6 km, Melandsjø verft 607 m og Træna utstyrsbutikk 38 m.
- **Valg A** (valg 41): `siteOut` gir bare så langt ut som finkystens vann er (`quayOut` med `wet`, `QOUT.wet` 0,5 m), også for rorbuene (`rorbuFace`), så T-brygga går ut der fronten står på vannet; `siteTerr` skjærer banken foran fronten ned til gropas dybde også over vannet, og under dekket en bratt skråning opp til bakken bak dekket (ingen vegg over vannet, ingenting bak kaia gravd). Målt i 3D med `tests/as1valga.py` (tre rorbuer og tre naust, sør, midt og nord).

- **Inn til fars naust langs kaia** (helkjøring 11, `allesteder-11-*.log`: 19 naust der 14,99 m-båten traff mottakets kai på vei inn, 3-5 knop): `dynLineBuild` legger veien langs kaia (`berthPath`) inn før naustet og ender akter for plassen; `berthPath` med `mm` holder hennes bredde og 3 m fra kaiene (også bak en enhet som står i vannet) og dypgangen utenfor havna; de siste 200 m tar hendene henne på linja (1,5 m/s), som havnas fortøyninger de siste to lengdene. Ligger naustet utenfor mottakets basseng (Smøla nord), går `draftWay` inn via veien på vannet ut fra naustet, som til en rorbu. Alle 19 inn etter (`allesteder-naust14.log` og Smøla nord alene).
- **Trondheim verft** flyttet 271 m (`lukkflytt.py --vei`): innseilingen var for grunn på sjøkartnull, og seks rorbuer i fjorden sto fast i den. `leiaRoute` sjekker nå havnas innseiling som båten seiler den før den legges til en reserverute.
- **Fylkene** (`tools/regions/fylke.json`) for de åtte flyttede stedene satt der de ligger nå, samme kommune; Kartverket svarer ikke fra skyen.

## Funnene etter sjette kjøring (14.11.2026, hele kysten, 1 045 steder; `tests/out/logs/allesteder-6.log`)

- **Ingen rute** (8): rorbuene Langvasseid, Austein, Åsværgården, Austgulen; naustene Tufjord, Gjesvær, Sørarnøy, Hidrasund (som før: punkt 3 under).
- **Sammenstøt med et fartøy** (4): Rørvik verft («Kvitbris», regel 15, ikke alene), rorbuene Båtsfjord («Ishavet» i havna), Laukvik («MS Høgkrykkja» ved fergekaia i Alta, i havna, også alene og på arbeidsgrenen), Sjølstad.
- **Sjømerke eller kai** (8): rorbuene Røst (67.4996 N 12.0541 Ø, 6,3 knop), Hofset, Ylvisåker, Veo og Ytre Bruvik (samme merke ved 60.3841 N 5.3170 Ø, 4,2 knop), Buvika; naustene Kvaløya sør, Helligvær (kaia).
- **Skadet ellers på veien** (4): rorbuene Årset, Buene, Eikemo; naustet Melbu.
- **Ingen framdrift** (3): Træna utstyrsbutikk (også på arbeidsgrenen alene), rorbuene Rise og Otterskreda (slep).
- **Etappe over land** (4, de samme som 13.11.2026: Selvær, Trondheim verft, Træna verft, naustet på Selvær).
- **Hendene på 25 av 1 037 steder** (grensen er ett av hundre): Brønnøysund, Revsnes, Bremnes, Fitjar verft, Lysekloster verft, Hellvik verft, Averøy utstyrsbutikk, Tvedestrand verft, Harstad verft, rorbuene Stikkelvåg, Vardø, Hestnes og flere.

## Funnene etter fjerde del (14.11.2026, bygget før de to siste rettingene; stoppet etter 450 av 1 045 steder fordi 3D-testene delte maskinen)

Havnene (mottak, butikker og verft, 357) og de første 93 rorbuene: 5 funn, mot 10 på de samme stedene på arbeidsgrenen samme morgen (Leines, Ålesund verft, Bud utstyrsbutikk, Træna utstyrsbutikk, Givær utstyrsbutikk og Sørvær er borte).

- **Fitjar verft nord** → Fitjar verft: ferja «MF Ytterflua» la til ved kaia si rett på linja hennes mens hun holdt av for den etter regel 15 (59.983 N 5.333 Ø, 4,4 knop).
- **Molde verft** → Bud: sjømerke i 6,3 knop (62.888 N 6.954 Ø, etappe 10).
- **Tvedestrand verft** → Søndeled verft: ingen vei rundt grunna 3 km ute. Rettet etterpå (hendene når søket ikke finner noe på en legg ruta kalte trygg); fortøyd alene på det endelige bygget.
- **Rorbua Hestnes:** grunt 20 m fra kaia og ingen vei rundt (et ekte funn nå som søket får svare).
- **Rorbua Langvasseid:** ingen rute (som før; hvert søk 45–50 s).

## Funnene etter tredje del (hele kysten 14.11.2026 07:00 UTC, 1 037 steder, bygget 8d1d8605fbbd; `tests/out/allesteder.json`)

Første kjøring 13.11.2026 hadde 136 funn; nå 38, og havnene (mottak, butikker og verft) 7 av 357.

- **ingen rute** (8): rorbuene Langvasseid, Åsværgården, Austgulen, Holskogen; naustene Tufjord, Gjesvær, Sørarnøy, Hidrasund.
- **sammenstøt med ferje** (Bokn verft «MF Ytterdraget» 9,5 knop, Norheimsund verft «MF Breibåen» 9,8 knop).
- **skade underveis** (merker, pilarer): Molde verft; rorbuene Kjøllefjord, Ytre Kåfjord, Røst, Buene, Veo, Ytre Bruvik, Røvær; naustene Brønnøysund, Midsund, Straumsjøen nord, Kvaløya sør.
- **ingen framdrift på 40 min**: Lysekloster verft, Tvedestrand verft, Træna utstyrsbutikk, Kokelv verft; rorbuene Sørvær, Vatnfjorden, Moskenes, Djupholman, Torvika, Høyanger, Hjartnes, Nordhuglo; naustet Gamvik.
- **ikke ute på åpent vann**: rorbua Hestnes.
- **for grunt der hun ligger**: naustene Smøla nord og Kvitsøy (2,0 m).
- **etappe over land** (4, som 13.11.2026): Selvær, Trondheim verft, Træna verft, naustet på Selvær.
- **Hendene** 150 ganger på 124 steder: hjørnene 123 (bare merker på utsiden), fast 18, holdt 2, støt 7. Fast eller holdt på 18 steder (grensen er ett av hundre, 10): Træna, Brønnøysund, Revsnes, Bokn verft, Fitjar verft nord, Hellvik verft, Averøy utstyrsbutikk, Harstad verft, rorbuene Kjøllefjord, Stikkelvåg, Svolvær, Breivika og flere.
- Resultatet for et sted avhenger av klokka (tidevann og trafikk), og testen lar klokka gå videre fra sted til sted: Kopervik, Tananger, Sund og Hellvik var grønne i én kjøring og røde i en annen.

## Funnene før tredje del: (hele kysten 13.11.2026 med testrettingene, før flyttingene og autopilotrettingene; `tests/out/allesteder.json`)

- **ingen rute** (60): port Helligvær (67.4069, 13.903); port Revsnes (64.0401, 10.0596); port Tustna (63.1587, 7.932); port Flekkerøy (58.0783, 8.0132); port Vanse utstyrsbutikk (58.1767, 6.7014); port Mandal verft (58.0342, 7.4451); port Mandal utstyrsbutikk (58.007, 7.5385); port Arendal verft (58.4409, 8.7257); port Søndeled verft (58.7601, 9.0784); port Melandsjø verft (63.6386, 8.8095); port Dyrvik utstyrsbutikk (63.8064, 8.8012); port Knarrlagsund utstyrsbutikk (63.6628, 9.0762); port Tjøme verft (59.1074, 10.4183); port Halden verft (59.1103, 11.3042); port Træna utstyrsbutikk (66.5432, 12.1594); rorbu Solbakken (70.5103, 25.0798); rorbu Sørvær (70.6503, 21.9975); rorbu Langvasseid (69.5963, 29.9371); rorbu Storvoll (69.8679, 20.1799); rorbu Sessøya (69.7652, 18.1131); rorbu Veidmannen (69.2843, 17.0047); rorbu Bogen (68.5214, 17.001); rorbu Bukta (68.4517, 15.8042); rorbu Vatnfjorden (68.3623, 14.4586); rorbu Svolvær (68.2554, 14.6276); rorbu Skår (67.7235, 14.8045); rorbu Evja (67.0831, 14.408); rorbu Innerkvarøy (66.4928, 12.8912); rorbu Åsværgården (66.2423, 12.246); rorbu Skibbåtsvær (66.1231, 12.0433); rorbu Sørstaulen (66.0283, 12.297); rorbu Muddværet (65.566, 11.7126); rorbu Brønnøysund (65.4832, 12.2283); rorbu Fjær (64.3769, 11.3883); rorbu Vika (64.3046, 10.491); rorbu Leset (63.8508, 9.8144); rorbu Sørskaget (63.7117, 8.5124); rorbu Vikstrøm (63.6346, 8.7584); rorbu Mastad (63.6358, 9.0563); rorbu Austgulen (60.9792, 5.2734); rorbu Tofta (60.2024, 5.0396); rorbu Tengesdal (59.5579, 6.5279); rorbu Grimsrud (59.6834, 10.4244); rorbu Lysebotn (59.0517, 6.6205); rorbu Skjærvika (59.2026, 11.0704); rorbu Slevik (59.1802, 10.8133); rorbu Sofienberg (59.0637, 11.4125); rorbu Valle (58.9029, 9.5619); rorbu Risør (58.7197, 9.1976); rorbu Hesnes (58.3392, 8.6282); rorbu Rasvåg (58.2134, 6.5645); rorbu Holmen (58.0889, 7.6775); rorbu Holskogen (58.1006, 7.9818); rorbu Mandal (58.0216, 7.4285); naust Tufjord (71.0046, 23.9035); naust Gjesvær (71.0976, 25.3984); naust Tustna (63.1587, 7.932); naust Sørarnøy (67.1358, 13.9757); naust Flekkerøy (58.0783, 8.0132); naust Hidrasund (58.2296, 6.5299)
- **støt i sjømerke** (15): port Vannvåg (70.1311, 19.9923); port Stamsund (68.1231, 13.8485); port Sund i Lofoten (68.009, 13.2126); port Bøvågen (60.7009, 4.9216); port Grimstad (58.3395, 8.5949); port Bokn (59.1761, 5.3895); port Lyngdal verft (58.1189, 7.0447); port Molde verft (62.7361, 7.1586); port Leknes verft (68.1347, 13.6122); rorbu Østtun (64.7118, 11.4386); rorbu Veo (60.6307, 5.7192); rorbu Ytre Bruvik (60.4714, 5.6535); naust Revsnes (64.0401, 10.0596); naust Straumsjøen nord (68.8165, 14.5525); naust Smøla vest (63.3673, 7.7808)
- **står fast underveis (sailing)** (9): port Ålesund (62.4695, 6.1441); port Kopervik verft (59.2918, 5.3031); port Tananger verft (58.92, 5.5836); port Hellvik verft (58.4709, 5.914); port Brettesnes utstyrsbutikk (68.2314, 14.8219); rorbu Skognes (69.5491, 18.5522); rorbu Sør-Gutvika (65.0719, 11.7983); naust Leines (67.7296, 14.7684); naust Mandal (58.0215, 7.4768)
- **står fast ved kaia** (7): rorbu Hasfjord (70.5035, 22.2477); rorbu Ravelsnes (70.0574, 21.7064); rorbu Tømmervika (63.5619, 8.5179); rorbu Leirvika (63.1416, 8.5471); rorbu Jordal (60.6908, 5.3664); rorbu Nordhuglo (59.8699, 5.5713); rorbu Sandnes (59.0546, 10.23)
- **skade underveis (ikke merke)** (6): port Fitjar verft nord (59.9691, 5.3353); port Sykkylven verft (62.3963, 6.5797); rorbu Molde (62.7159, 7.1661); rorbu Nesjestranda (62.691, 7.4428); rorbu Helle (61.3712, 5.6029); rorbu Klevald (61.1637, 5.8035)
- **står fast underveis (tow)** (4): port Båtsfjord sør (70.6219, 29.6932); port Rennesøy (59.0968, 5.7021); rorbu Sør-Arnøy (67.1355, 13.9185); rorbu Bele (63.0104, 8.5551)
- **står fast underveis (idle)** (3): port Tvedestrand verft (58.6239, 8.9551); rorbu Hjartnes (60.1118, 5.7313); naust Mausund (63.8688, 8.6655)
- **kollisjon med fartøy** (1): port Lovund utstyrsbutikk (66.3657, 12.3761)
- **kommer ikke fram** (1): rorbu Hestnes (70.2945, 25.4266)

Funnet underveis: **Kopervik verft** står fast fordi omveien rundt pilarene under brua (`obsRoute`) er en S-sving på 30–100 m som en 21 m båt ikke kan ta; hun rygger og går fram om igjen (`T.bow`). Gjelder trolig også Tananger, Hellvik og Brettesnes (sjekkes).

## Neste

Rekkefølgen for fjerde kjøring står i «Oppgaven (fjerde kjøring)» i `docs/planer/start/126.md` (ferger og hurtigbåter, stedene der hendene måtte ta henne, rorbuene og naustene uten vei ut, landleggene, tilstanden mellom stedene, NPC-havnene). Lista under er fra andre del.


1. Kjør `tests/allesteder.py` på nytt med flyttingene og autopilotrettingene, og sorter det som står igjen.
2. **Står fast underveis** (Kopervik, Tananger, Hellvik, Brettesnes, Skognes, Sør-Gutvika, Leines, Mandal-naustet): omveien rundt pilarer og merker (`obsWays`, `obsDetour`) må passe båtens svingradius, eller hendene tar henne gjennom.
3. **Merker** som fortsatt treffes (Vannvåg, Stamsund, Grimstad, Bokn, Lyngdal verft, Molde verft, Leknes verft og rorbuene og naustene i lista).
4. **Står fast ved kaia** (Hasfjord, Ravelsnes, Tømmervika, Leirvika, Jordal, Nordhuglo, Sandnes) og **slep** (Båtsfjord sør, Rennesøy, Sør-Arnøy, Bele).
5. **Naustene uten vei ut** (Tufjord, Gjesvær, Sørarnøy, Hidrasund; Tustna og Flekkerøy følger mottakene) og **for grunt der hun ligger** (Sørskaget 2,5 m, Smøla nord og Kvitsøy 2,0 m).
6. **Ferger** (Lovund: «MF Ytterdrivet», 6,2 knop) og skade uten merke (Fitjar verft nord, Sykkylven verft, rorbuene Molde, Nesjestranda, Helle, Klevald).
7. NPC-havnene (`KYST_ALLE=havn`) er ikke kjørt.
