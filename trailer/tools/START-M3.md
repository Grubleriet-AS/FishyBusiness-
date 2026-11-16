# Startmelding: lanseringstraileren m3 på GPU-maskinen (16.11.2026)

Jonas limer inn alt under streken som første melding i en ny Claude Code-økt på den leide GPU-maskinen (Windows, NVIDIA RTX PRO 6000 Blackwell). Den økta gjør resten.

---

Du lager lanseringstraileren til Det Store Blå på denne GPU-maskinen. Jonas heter brukeren, skriver norsk, og du svarer på norsk. **Traileren legges ut på TikTok i dag kl. 19:00 norsk tid. To ferdige filer, én norsk og én engelsk, må ligge klare på maskinen senest 18:30.** Spør Jonas bare om det bare han kan gi eller avgjøre. Ta resten selv, og si kort fra underveis hva du gjør.

## Ferdig når

1. `trailer/out/rough/m3-no.mp4` og `trailer/out/rough/m3-en.mp4` finnes, 50,0 s, 1080×1920, med låta «Fjord at Dawn» under.
2. **Hvert eneste klipp er filmet i dag fra testutgaven.** Ingen bilder fra 10.11 er brukt (båtene har fått nye modeller siden).
3. Du har sett kontaktarket til hvert klipp selv: ingen båt på land, ingen båt halvveis ute av bildet, ingen hopp, ingen svart eller tomt bilde.
4. Du har sett bilder fra begge ferdige filmer (minst ett per klipp) og at teksten står der den skal og kan leses.
5. Jonas har fått vite hvor filene ligger, og fått teksten under videoen i begge språk (nederst her).

## 1. Hent koden (5 min)

Repoet ligger trolig i `C:\trailer\FishyBusiness-` fra forrige gang. Bruk grenen `ccr-2ec8dc79-padlft`: den har testutgaven slik den er i dag (alt som ligger på test.detstorebla.no) og alle filene til m3.

```powershell
cd C:\trailer\FishyBusiness-
git config core.autocrlf false
git fetch origin ccr-2ec8dc79-padlft
git checkout -f ccr-2ec8dc79-padlft
git reset --hard origin/ccr-2ec8dc79-padlft   # bare hvis checkout klager på lokale endringer i trailer/out eller control-m1
```

Finnes ikke mappa: `git clone https://github.com/average01101010/FishyBusiness-.git` og så `git checkout ccr-2ec8dc79-padlft`. Python kjøres med `$env:PYTHONUTF8=1` (ellers leses filene som cp1252). Har `.b64`-filene fått `\r` (bygget stopper), sjekk ut på nytt med `core.autocrlf=false`.

## 2. Slett de gamle bildene (1 min)

`assemble.py` tar bildene fra `trailer/out/<klipp>-1080x1920/`. Der ligger klippene fra 10.11 med de gamle båtmodellene. **Flytt hele `trailer/out` til `trailer/out-10nov`** før du filmer, så ingenting gammelt kan komme med. Låta ligger i `trailer/audio/suno/fjord-at-dawn.mp3` (ikke i git); flytt den tilbake dit hvis den lå under `out`. Mangler den, spør Jonas straks.

## 3. Kart og bygg (10–15 min)

```powershell
$env:PYTHONUTF8=1
python tools/map/release.py
python tools/map/game.py
$env:KYST_VEC=1; node build.mjs
```

Uten `tools/map/out/game/` har bygget bare Senja, og klippene fra Lofoten, Finnmark, Svalbard, Skottland, Færøyene og Grønland blir tomme. Ligger mappa der fra før, kjør `release.py` likevel (den henter bare det som er nytt) og `game.py` hvis den sier at noe kom.

## 4. Film alle klippene på nytt (40–50 min)

Hvert klipp med `--gpu` (OpenGL; **ikke** d3d11, der mistes WebGL-konteksten). I Git Bash:

```bash
sh trailer/tools/film-all.sh 06b-bleik-hval-kyst21 01-naust-trebat 03-trebat-brua 05-garn-lofoten 07-vardo-line \
  04-reine 12-senja-luft 07-vardo-kuling 10b-hekkingen-kyst21 18b-snokrabbe-kveld 13-snurper-brua \
  15a-hvaler 15d-tromso 15f-kirkenes 17a-skottland 17b-faeroyene 17d-gronland 19-online-kai 16-slutt
```

eller ett om gangen: `python trailer/tools/film.py trailer/shots/<klipp>.json --gpu`. Film i den rekkefølgen; de første er de viktigste.

**Etter hvert klipp:** se `trailer/control-m1/<klipp>-1080x1920/kontaktark.jpg` med Read. Rett det som er galt i klippfila (startpunkt, `heading`, kameraets `yaw`, `pitch`, `dist`, `fov`, eller klokkeslettet i `when`), og film klippet på nytt. Bruk høyst to forsøk per klipp; holder det ikke, se reserven i tabellen. Ikke bruk tid på finpuss: et klipp er godt nok når båten er tydelig i bildet, ingenting er galt, og lyset er pent.

| Klipp | Båt | Hva skal synes | Reserve |
|---|---|---|---|
| `06b-bleik-hval-kyst21` | eldre kystbåt 21 m | Kroken: båten mot midnattssola, hvalen blåser i løpet av de første 2,5 s | `06-bleik-hval` med `boat` byttet |
| `01-naust-trebat` | trebåten | Naustet i grålysning, kameraet glir ut til trebåten (spillets egen intro) | – |
| `03-trebat-brua` | trebåten | Under Gisundbrua, kameraet ser opp mot brudekket | – |
| `05-garn-lofoten` | havsjark 35 | Garnet, folk på dekk | `05-vestfjorden` |
| `07-vardo-line` | ny hurtigsjark | Lina | – |
| `04-reine` | plastsnekke 26 | Lav vintersol, snø på tindene | `04-reine-luft` |
| `12-senja-luft` | eldre kystbåt | Flybilde over fjell og sjø | – |
| `07-vardo-kuling` | eldre kystbåt | Sjø og skum i kuling | – |
| `10b-hekkingen-kyst21` | eldre kystbåt | Nordlyset over fyret | `10-hekkingen-nordlys` |
| `18b-snokrabbe-kveld` | snøkrabbefartøyet | **Droppet.** Hele båten i bildet, lav kveldssol (20:30 UTC, sola rundt 5°). Ble lyset dårlig eller tåke: prøv 18:30, så 13:00 som før. Var hun halvveis ute av bildet i 10.11-utgaven: øk `dist` eller flytt `yaw` | `18-snokrabbe-svalbard` |
| `13-snurper-brua` | kystnotbåten | Det andre lange taket: hun går under Gisundbrua i midnattssol. Masten må klare brua | – |
| `15a`, `15d`, `15f`, `17a`, `17b`, `17d` | ulike | Ett slag hver (0,6 s): byene og havet utenfor Norge. Er landet utenfor Norge bare en flat stripe, er det greit på 0,6 s | stryk et klipp og la det forrige stå lenger |
| `19-online-kai` | kystnotbåten og fire andre spilleres båter | Mange båter ved samme kai: det skal se ut som et sted der flere spiller. De tre nye båtene (`peers` 2–4) er plassert uten å ha vært sett; flytt `along`/`off` eller fjern en som ligger i en annen båt eller på land | `14-side-om-side` |
| `16-slutt` | kystnotbåten | Bakgrunnen til sluttkortet: solstripa | – |

**Målet er 10/10 og filmatisk** (Jonas 16.11.2026: «du står fritt til å velge en helt annen tilnærming til klipping, design, teksting og alt sånt så lenge det blir knallbra, cinematisk og 10/10»). Du har frihet til å endre hvert klipp innenfor tida, etter disse reglene:

- **Lyset velger klippet.** Lav sol, blå time, natt eller vær. Er et klipp tatt midt på dagen under flat blå himmel, flytt `when` til morgen eller kveld samme dag (sola regnes der båten er). Byklippene `15a`–`15f` står på 09:00 og 16:30 i juli; prøv 21:00–23:00 UTC for lavt lys.
- **Lavt, nært og lang linse.** Kameraet i høyde med rekka eller lavere (`pitch` nær 0–8°, liten `dist`), `fov` 18–30°, båten fyller bildet og fjellene trekkes inn bak. Som filmet fra en annen båt. Ingen høye dronebilder der båten blir en prikk.
- **Én rolig bevegelse per klipp:** en sakte sving rundt båten eller en sakte vei inn eller ut. Klippene gir farten.
- **Stående bilde bygges i høyden:** himmel, fjell, båt, speiling. Båten i den nedre midtre delen; teksten står i øvre tredjedel.
- **Én varm ting i hvert bilde:** sola, lys i vinduer, oransje oljehyre.

Er du i tvil mellom et finere klipp og å bli ferdig, velg å bli ferdig. Stilarket med tekstene på bilder: `trailer/stil/stilark-2-m3.jpg`.

**Båtene som ikke skal være i bildet:** plastsjark 31 fot (`plastsjark`) og kystbåt 14,99 (`kyst15`) er de svakeste modellene. `15a-hvaler` har `plastsjark` og `15d-tromso` har `kyst15`: bytt `boat` til `breisjark` i `15a` og `snekke` i `15d` før du filmer dem.

**Ingen klipp med grensesnitt** i denne utgaven: det rekkes ikke i dag. Ikke bruk tid på det.

## 5. Tekstene og sammensettingen (15 min)

```powershell
python trailer/tools/titles.py --lang no
python trailer/tools/titles.py --lang en
python trailer/tools/assemble.py trailer/audio/music-edit-m3-no.json
python trailer/tools/assemble.py trailer/audio/music-edit-m3-en.json
```

`assemble.py` skriver `mangler opptak: [...]` hvis et klipp ikke er filmet; da blir det grått i filmen. Det skal ikke stå noe der. Har du byttet til en reserve, bytt navnet i `clips` i **begge** klippekartene.

Se så bilder fra begge filmer: `python trailer/tools/assemble.py trailer/audio/music-edit-m3-no.json --frames 0:1500:75` lager hvert 75. bilde i `trailer/out/rough/m3-no-frames/` (ett per 2,5 s). Les dem. Sjekk at teksten ikke står oppå båten, og at den leses mot lys himmel. Står en tekst feil i høyden, er det `y` i `titles.py` (påstandene) og `ys` (stedene).

Tekstene og tidene står i `trailer/audio/music-edit-m3-*.json` (`words`) og i `M3` øverst i `trailer/tools/titles.py`. **Ikke endre ordlyden** uten å spørre Jonas.

## 6. Lever

1. Fortell Jonas hvor filene ligger (`trailer/out/rough/m3-no.mp4`, `m3-en.mp4`, og de små `-540.mp4`), og hvordan han får dem over på telefonen (filoverføringen i Xesktop eller en delt lenke).
2. Gi ham teksten under videoen, under.
3. Commit klippfilene du rettet og de små kontaktarkene i `trailer/control-m1/` (ikke `trailer/out/`, ikke `dist/`), og push til `ccr-2ec8dc79-padlft`. Ingen modellnavn i commit-meldingen.
4. Si ærlig hva som ble strøket eller byttet, og hva som så svakt ut.

Har det gått 18:15 og noe fortsatt ikke er filmet: stryk det klippet, la klippet før stå lenger (endre `at` i begge klippekartene), og sett sammen med det du har. Et klipp mindre er bedre enn en film som ikke blir ferdig.

## Teksten under videoen

**Norsk:**

> Det Store Blå er et online fiskespill med hele norskekysten og havet utenfor. Du begynner med fars gamle trebåt og bygger din egen flåte, i én felles verden med de andre spillerne. Gratis, rett i nettleseren: detstorebla.no
>
> Spillet er i early access. Finner du feil, si fra i Tilbakemelding-appen i spillet.
>
> Alt i videoen er ekte spillgrafikk.
> Kartdata: © Kartverket (CC BY 4.0), Mapzen (CC BY), © OpenStreetMap-bidragsytere (ODbL).
>
> #fiske #kystfiske #norskekysten #fiskespill #spill

**English:**

> Det Store Blå is an online fishing game with the whole Norwegian coast and the sea beyond. You start with your father's old wooden boat and build your own fleet, in one shared world with the other players. Free, right in your browser: detstorebla.no
>
> The game is in early access. Found a bug? Tell us in the Feedback app in the game.
>
> All footage captured in-game.
> Map data: © Kartverket (CC BY 4.0), Mapzen (CC BY), © OpenStreetMap contributors (ODbL).
>
> #fishing #fishinggame #norway #simulator #indiegame
