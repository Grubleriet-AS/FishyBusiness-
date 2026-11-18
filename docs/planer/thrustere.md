# Baug- og hekkpropell for de store båtene (Jonas 18.11.2026)

Jonas: «Vil det hjelpe å gi de største båtene baugthruster-funksjonalitet? Jeg vil anta at de har dette på ekte», og «De kan ha hekkthruster også, så kan de gå rett sidelengs ved behov». Valget: **følger båttypen** (A, anbefalt), ikke kjøpt på verftet.

Bakgrunn: autonav-jakten (`docs/planer/autonav-null-treff.md`) viser at treffene som står igjen, er de store båtene som svinger vidt i havna (ringnota ved Oldervik og Bokn, kyst21 som rygger ut i Lindesnes). I dag tar hendene dem langs linja uten fysikk; med propeller på tvers kan modellen selv.

## Slik

1. **Båttypene** (`VESSELS`, `core/02-species-gear.js`): `thrusters:2` (baug og hekk) på kyst15, kyst21, ringnot38 og havbåtene (snøkrabbe, autoliner, bunntråler, pelagisk). Ingen kode velger etter navnet.
2. **Kraften** (`dynPar`/`dynCal`, `core/16b-dyn.js`): hver propell dimensjoneres som Vetus' veileder gjør: vindens kraft på siden ved Beaufort 5 (10,7 m/s) med båtens eget sideareal `P.AL`, dreiemomentet med halve lengden som arm, delt på avstanden fra tunnelen til dreiepunktet (0,45 L): omtrent 1,1 ganger vindkraften. Virkningen faller med farten og er borte ved 4 knop (en tunnelpropell mister virkningen i fart).
3. **Modellen** (`dynInt`): en sidekraft ved baugen (+0,45 L) og ved hekken (−0,45 L); samme vei gir sideforskyvning, motsatt vei gir dreining på stedet.
4. **Autopiloten** (`dynAuto`): under manøverfart dreier den med propellene mot kursen linja vil ha, og skyver henne sidelengs inn mot linja (tverravviket).
5. **Hendene**: en båt med propeller seiler selv de siste og første 200 m av en fri linje (som de små båtene). Hendene tar fortsatt en vei som er funnet mellom bryggene.

## Ferdig når

1. Kyst15, kyst21, ringnot38 og havbåtene har baug- og hekkpropell i `VESSELS`, og kraften er regnet slik over (enhetstest: kraften for kyst21 og ringnot38, og null i 4 knop).
2. I modellen dreier en ringnot38 på stedet med propellene alene, og går sidelengs uten å dreie (enhetstest på `dynInt`).
3. `dyntest` (svingdiameter og stopp i fart) er som før (propellene virker ikke i marsjfart).
4. Jakten på de 24 verste scenariene: ingen nye treff, og de store båtene ved Oldervik, Bokn og Lindesnes har færre.
5. `autonavtest`, `trip2`, `utfrakai`, `kaiover`, `trackfollow` grønne.

## Kilder

- VETUS, «How to choose bow and stern thrusters»: dreiemoment = vindkraft × halve lengden; 17–23 kgf per kW for elektriske tunnelpropeller. https://cdn.shoplightspeed.com/shops/610564/files/15811777/how-to-choose-bow-and-stern.pdf
- Brunvoll: fiskeriforskningsfartøyet «Nordsøen» med 300 kW baugpropell og 160 kW hekkpropell (nærmeste størrelse funnet for ringnota). https://issuu.com/brunvoll/docs/brunvoll_complete_thruster_systems_
