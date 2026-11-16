# Kodekart

Seksjonene og funksjonene i hver kildefil, med linjenummer, i rekkefølgen malen setter dem sammen i (`src/index.html`). Lages av `python3 tools/docs/kodekart.py` og skrives på nytt av `/lever`, så linjenumrene kan være litt gamle; navnene og rekkefølgen stemmer. Slå opp her og bruk `grep` i stedet for å lese en stor fil hel.

## `src/js/errtrap.js` (69 linjer)

THE ERROR TRAP (02.11.2026; Jonas: «det viktigste er at vi klarer å fange opp så mange feil automatisk som mulig slik at vi

- **1** THE ERROR TRAP (02.11.2026; Jonas: «det viktigste er at vi klarer å fange opp så mange feil automatisk som mulig slik at vi

## `src/js/core/00-proj.js` (65 linjer)

- **2** CORE START
- **4** PROJECTION: UTM zone 33 (ETRS89, EPSG:25833)
  - 30 `utm33(lat, lon)`
  - 45 `utm33inv(E, N)`
  - 60 `natP(lat, lon)`
  - 61 `natLL(p)`

## `src/js/core/01-world.js` (555 linjer)

- **10** one clock for everyone (05.10.2026, the shared world V1)
  - 59 `gridScale(p)`
  - 63 `gridGamma(p)`
  - 81 `farL(kind, p)`
  - 89 `expoFar(p)`
  - 94 `landFracM(x, z)`
  - 99 `landXIn(X, x, z)`
  - 104 `dcCellFar(p)`
  - 111 `b64bytes(s)`
  - 112 `varints(b)`
  - 120 `loadFine()`
  - 128 `loadRoads()`
  - 144 `inHarbour(p)`
  - 151 `legHazard(a, c, sd)`
  - 164 `legHazardMemo(a, c, sd)`
  - 169 `draftHazards()`
  - 184 `legReady(a, c)`
- **192** THE NAMES OF THE FISHING GROUNDS IN THE TEXTS (Ø14 F3 of docs/planer/fangstfelt.md, 11.11.2026)
  - 212 `feltNameAt(p, lim = 1.5 * NM)`
  - 225 `placeAt(p)`
  - 234 `feltNear(p, R)`
  - 245 `feltLawful(sp, p, H)`
  - 248 `nearestPlace(p)`
  - 254 `groundCheck(a, c, sq = 0)`
  - 274 `runAground(p)`
  - 303 `rocksNear(a, b, r)`
  - 313 `rocksIn(x0, y0, x1, y1)`
  - 321 `rocksAlong(a, b, r)`
  - 335 `coastDist(p)`
  - 336 `coastDistFar(p)`
  - 342 `decodeContours()`
  - 351 `isLand(p)`
  - 359 `isLandFar(p)`
  - 365 `isLandUI(p)`
  - 371 `inHarbourPocket(p)`
  - 377 `harbourNear(x, z)`
  - 383 `qPockets()`
  - 384 `pocketHit(US, QS, x, z)`
  - 391 `pocketsIn(x0, y0, x1, y1)`
  - 400 `legClear(a, b)`
  - 414 `legClearMemo(a, b)`
  - 445 `portLabel(p)`
- **461** the harbour unit (02.10.2026)
  - 502 `fillOut(U, lx, lz)`
  - 515 `onUnitGround(p)`
  - 522 `unitCovers(x, z, m)`
  - 530 `bridgeUnderUnit(br, extra)`
  - 535 `portApproach(pt)`

## `src/js/core/01b-mapdata.js` (281 linjer)

MAP DATA (phase K3 of the coast plan): the rasters in 10 km blocks, fetched in packs from map/

- **1** MAP DATA (phase K3 of the coast plan): the rasters in 10 km blocks, fetched in packs from map/
  - 26 `mapOnReady(f)`
- **27** IndexedDB, by content
  - 28 `mapIdb()`
  - 32 `idbDo(mode, f)`
  - 33 `mapFetch(pk)`
  - 58 `mapStale(pk)`
- **68** the manifest and the packs
  - 72 `mapStart(base)`
  - 88 `mapLoad(pk)`
  - 99 `mapPackOf(L, bx, by)`
  - 100 `mapPacksIn(kind, x0, y0, x1, y1)`
  - 108 `mapSimPacks(p, r)`
  - 109 `mapReadyAt(p, r)`
  - 111 `mapSimAt(p)`
  - 112 `mapViewAt(p)`
  - 115 `mapKindIn(kind, p, memo)`
  - 117 `mapNeed(p, r)`
  - 123 `mapPreload(pts, kinds, onProgress)`
  - 140 `mapLoadKind(kind)`
- **141** blocks
  - 142 `med16(raw, n)`
  - 148 `med8(raw, n)`
  - 153 `mapDecode(L, raw)`
  - 167 `mapBlock(L, bx, by)`
  - 179 `mapHasBlock(L, bx, by)`
  - 182 `mapBlockKnown(L, bx, by)`
  - 185 `rcell(L, ix, iy)`
  - 193 `rbil(L, p)`
  - 198 `rbilM(L, x, z)`
- **202** the fine ground along the sea (Ø13 K1, 11.11.2026)
  - 210 `finBlock(L, bx, by)`
  - 216 `finCell(L, ix, iy)`
  - 232 `finH(x, z, h)`
  - 245 `mapHasM(L, x0, z0, x1, z1)`
  - 252 `mapVec(pk, name)`
  - 259 `mapViewReady(x0, y0, x1, y1, then, kinds)`
  - 266 `simAreaReady()`
  - 276 `mapDrop(pk)`

## `src/js/core/01c-vec.js` (223 linjer)

THE COAST'S VECTORS (part 4 of the coast-wide plan, 03.10.2026): buildings, roads, bridges, piers and quay faces

- **1** THE COAST'S VECTORS (part 4 of the coast-wide plan, 03.10.2026): buildings, roads, bridges, piers and quay faces
  - 25 `inQuad(Q, x, z)`
  - 30 `pierBoxes(out, kind, n, X, Z, src)`
  - 47 `vecDecode(D)`
  - 122 `flyteTile(tx, ty)`
  - 131 `vecFinish(r)`
  - 140 `vecWorker()`
  - 157 `vecInput(pk, inflate)`
  - 165 `vecDecodeHere(pk)`
  - 167 `vecTile(tx, ty)`
  - 176 `vecTilesIn(x0, z0, x1, z1)`
  - 184 `roadsIn(x0, z0, x1, z1)`
  - 197 `bridgesIn(x0, z0, x1, z1)`
  - 199 `vecWant(x0, y0, x1, y1, then)`
  - 207 `vecPrune(pts, R = 60)`

## `src/js/core/01d-coast.js` (148 linjer)

THE COAST AS THE TRUTH FOR LAND AND SEA (04.10.2026; the user: «Jeg vil ha bort det som er i magenta», the land is to follow

- **1** THE COAST AS THE TRUTH FOR LAND AND SEA (04.10.2026; the user: «Jeg vil ha bort det som er i magenta», the land is to follow
  - 15 `coastBuild(b, T, CC, COX, COY)`
  - 51 `coastQuery(I, x, y)`
  - 68 `coastDistQ(I, x, y, cap)`
  - 83 `coastIndexAt(p, ask = true)`
  - 93 `coastSegHit(a, b)`
  - 118 `coastAt(p)`
  - 120 `coastAtIf(p)`
  - 122 `coastSdIf(p, cap)`
  - 124 `coastDistM(p, cap)`
  - 126 `coastWorker()`
  - 136 `coastDone(pk, r)`
  - 137 `coastBuildHere(pk)`
  - 138 `coastEnsure(pk)`

## `src/js/core/01e-marks.js` (154 linjer)

THE SEA MARKS ALONG THE WHOLE COAST (05.10.2026; Jonas: «Sjømerker må ordnes langs hele kysten. Alt senja har, må resten av

- **1** THE SEA MARKS ALONG THE WHOLE COAST (05.10.2026; Jonas: «Sjømerker må ordnes langs hele kysten. Alt senja har, må resten av
  - 11 `marksAdd(pk)`
  - 27 `marksSenja(list, lights)`
  - 44 `marksRocksIn(x0, y0, x1, y1)`
  - 49 `marksNear(kind, x, y, R)`
  - 67 `markSvg(mk, u)`
- **87** THE NAMES OF THE FISHING GROUNDS ALONG THE WHOLE COAST (B2 of docs/planer/bestand-og-flaate.md, 01.11.2026)
  - 106 `feltData()`
  - 120 `feltIn(x0, y0, x1, y1, all)`
  - 129 `feltShapesFrom(bytes)`
  - 142 `feltShape(f)`

## `src/js/core/02-species-gear.js` (454 linjer)

Placeholder prices (NOK/kg, grade A) – to be tuned

- **95** the minimum sizes (steg 59, 10.11.2026; Jonas 07.11.2026, valg 3 A: «etter § 47 med sonene»). Høstingsforskriften § 47 as read
  - 108 `lwKg(sp, cm)`
  - 112 `minZone(p)`
  - 115 `min47Cm(sp, p)`
  - 118 `minKgAt(sp, p)`
  - 122 `letGo(sp, w, p, H)`
- **123** vessels, equipment, crew
  - 276 `fuelWeek(w)`
  - 278 `fuelPrice(H = S.t / 60, pid = S.boat && S.boat.port, diesel = BOAT.die…)`
  - 365 `equipFits(k, type)`
- **366** the upgrades in tiers (OPP1 of docs/planer/oppgraderinger.md, 07.11.2026)
  - 370 `upgSum(...p)`
  - 375 `equipLv(k, eq = S.equip, type = S.boat && S.boat.type)`
  - 379 `equipTier(k, eq, type)`
  - 383 `tierUnits(k, lv, type = S.boat && S.boat.type, eq = S.equip)`
  - 389 `tierKr(k, lv, type = S.boat && S.boat.type, eq = S.equip)`
  - 394 `equipKr(k, eq = S.equip, type = S.boat && S.boat.type)`
  - 400 `knifeX(eq, type)`
  - 401 `hookX(f, eq, type)`
  - 404 `jigSlip(eq, type)`
  - 407 `fuelBase(v, vmax, planing)`
  - 408 `fuelKOf(V)`
  - 410 `vesselDerive(V)`
  - 423 `reqOf(V)`
  - 429 `reqFill(eq, type)`
  - 447 `lsaOf(V)`

## `src/js/core/03-simulation.js` (1493 linjer)

fleet: each vessel keeps its own state; the company holds the rest. The simulation steps through the vessels one at a

- **1** fleet: each vessel keeps its own state; the company holds the rest. The simulation steps through the vessels one at a
  - 4 `curVessel()`
  - 5 `storeVessel(v)`
  - 6 `bindVessel(v)`
  - 7 `ensureFleet()`
  - 8 `withVessel(v, fn)`
  - 11 `onVessel(v, fn)`
  - 12 `eachVessel(fn)`
  - 14 `vget(v, k)`
  - 15 `vesselById(id)`
- **16** fleet rules (deltakerforskriften, J-30-2026): the company can have one vessel in the open group, and none there if it owns a
  - 18 `openVesselId()`
  - 20 `wpStop(w)`
  - 21 `meAboard()`
  - 24 `noCrewText()`
  - 29 `access()`
  - 31 `vesselValue(v)`
  - 34 `newVesselObj(type, pid, lic)`
- **46** the yard's rebuilds, per boat (S.boat; the user's list 04.10.2026): a bigger hold in three steps, the last doubling it (more
  - 75 `speedSum(b, V, T)`
  - 137 `trimRescale(v0)`
  - 145 `trimFleet(change)`
  - 152 `trimSet(k)`
- **157** a bought boost given again to a save that went on without it (HS3, 11.11.2026, docs/planer/haill-saldo.md; ui/10i-shop.js shopBack)
  - 161 `backT(doneMs, nowMs, t, world)`
  - 169 `boostBack(on, list, stack)`
  - 183 `trimBack(c)`
  - 191 `givenKeep(ids, at, now, days)`
  - 198 `trimWords(k, how)`
  - 206 `trimEnd()`
  - 208 `powerX(b)`
  - 212 `applyVessel()`
  - 240 `speedPin()`
  - 254 `jigPer(eq, type)`
  - 255 `effortOf(people, jk, hand, per = jigPer()`
  - 256 `fishEffort()`
  - 264 `jigMeShare()`
  - 272 `jigMeCan()`
  - 279 `hash(n)`
  - 280 `h2(a, b)`
  - 281 `vn(t, s)`
  - 282 `sstep(a, b, x)`
  - 283 `seasonal(arr, H)`
  - 303 `wxTrack()`
  - 314 `wxMeasure(p)`
  - 322 `wxPlace(p)`
  - 330 `wxLowShape(k, m)`
  - 337 `stormsNear(H, p)`
  - 349 `wxWindF(H, p)`
  - 350 `windAt(H, p)`
  - 360 `windDir(H, p)`
  - 371 `exposure(p)`
  - 373 `fcErr(H, now, seed)`
  - 374 `fcWind(H, now, p)`
  - 376 `beaufort(W)`
  - 391 `climW(p)`
  - 397 `climV(key, H, p)`
  - 398 `climDiff(key, H, p)`
  - 399 `climRatio(key, H, p)`
  - 400 `airTemp(H, p)`
  - 402 `precipAt(H, p)`
  - 403 `cloudAt(H, p)`
  - 404 `visibility(H, p)`
  - 406 `seaTemp(H, p)`
- **407** snow and the seasons on land (V2 and V3 of the weather plan; Jonas 09.10.2026: «vi må bygge ferdig værsystemene og årstidene»).
  - 419 `wxDay(d, p)`
  - 426 `seasonAt(H, p)`
  - 453 `snowLineAt(H, p)`
  - 460 `snowAt(H, z, p)`
  - 467 `obsAt(p)`
  - 468 `eqToHor(ra, dec, d, ob)`
  - 474 `sunEq(d)`
  - 478 `moonEq(d)`
  - 483 `sunAt(H, p)`
  - 484 `moonAt(H, p)`
  - 491 `moonName(mo)`
  - 493 `sunTimes(H, p)`
  - 504 `flagUp(H, p)`
- **510** tide: harmonic prediction per place (phase K10 of the coast plan)
  - 523 `tidePlace(p)`
  - 532 `tideH(H, p)`
  - 540 `tideEvents(H0, hours, p)`
  - 548 `auroraAt(H, p)`
  - 551 `riskLevel(W, hs)`
- **554** weight (the user's list 04.10.2026: «mer last og vekt betyr mindre fart ... viktig at ikke dette blir urealistisk»): what she
  - 559 `boatTons()`
  - 560 `boatTons0()`
  - 561 `loadF()`
- **562** fouling: weed and barnacles on the hull (S.boat.foul, 0 to 1) slow her up to 15 % and cost up to 25 % more fuel; it grows in
  - 566 `foulHour(H)`
  - 570 `fuelUse(b, l)`
  - 571 `fuelAdd(b, l, kr0)`
  - 575 `boatWith(o, v)`
  - 583 `trimVmax(k)`
  - 587 `fuelLph(v, W)`
  - 588 `speedCap(hs, cb = 1)`
  - 591 `noise2(x, y, s)`
  - 597 `slopeAt(p)`
  - 605 `hotField(sp, p, H, k)`
  - 611 `hotspot(sp, p, H, P = 1)`
  - 620 `schField(sp, p, H, k, si, v)`
  - 624 `school(sp, p, H)`
  - 631 `schoolHeading(sp, p, H)`
  - 640 `fieldCode(p)`
  - 643 `skreiSpot(p, d = depthF(p)`
  - 647 `gauss(u1, u2)`
  - 649 `sampleFish(sp, p, H)`
  - 654 `clsOf(sp, kg)`
  - 657 `kveiteClosed(H)`
  - 660 `targetF(sp, H, pilk)`
  - 665 `uerOpen(H)`
  - 669 `denPlace(p)`
  - 686 `inBasin(p)`
  - 694 `harbourNote()`
  - 699 `denTime(H)`
  - 707 `denSp(sp, q, H, T)`
  - 721 `density(sp, p, H)`
  - 728 `eggaArea(p, d, H, E)`
  - 755 `tutBonus(sp, p)`
  - 767 `stockIdx(p)`
  - 769 `stockW(p)`
  - 774 `stockFill(v)`
  - 779 `stockAt(p, sp, H)`
  - 792 `takeStock(p, kg, sp, npc)`
- **800** the shared world V2 (05.10.2026; ui/10h-world.js, supabase/migrations/20261006000000_world_v2.sql): one sea, one quota and one
  - 806 `wq()`
  - 807 `wshOpen(y)`
  - 808 `wshSat(pid, sp, H)`
  - 809 `wshTake(k, kg)`
  - 812 `wshLand(port, H, acc, kgSp, codQ, krSp)`
  - 821 `initStock()`
  - 822 `stockHour(H)`
  - 847 `depthFactor(sp, d, k = 1)`
  - 852 `depthF(p)`
  - 858 `depthHas(p)`
  - 867 `deepAt(p)`
  - 872 `offDepth(p)`
  - 875 `tileDepth(p, d)`
  - 882 `depthWater(p)`
  - 894 `depthAt(p)`
  - 895 `depthModel(p)`
  - 896 `grade(f)`
- **897** How the catch keeps (D3 of the operations plan, Jonas 23.10.2026, svar 15a: calibrated against the sources)
  - 907 `keepDay(f)`
  - 908 `keepF(day)`
  - 911 `keepK(x, rrs)`
  - 913 `keepHours(f, f2, k)`
  - 915 `supplyFactor(H)`
  - 922 `weekOfH(H)`
  - 923 `weekDev(sp, H)`
  - 929 `marketPrice(sp, H, fz)`
  - 931 `clsPrice(port, sp, c, H, hook, fz)`
  - 937 `price(port, sp, H)`
  - 939 `avgPrice(sp, H, days)`
- **940** quotas north of 62° N: the regulation and the year's figures are in 03d-quota.js
  - 941 `doyH(H)`
  - 942 `yearH(H)`
  - 943 `quotaState()`
  - 963 `licValue(l, H)`
- **980** the books (Økonomi 2, Ø1, 27.10.2026, docs/planer/okonomi/02-design.md)
  - 1002 `bookMigrate()`
  - 1010 `bookAll(parts, no, en, vid)`
  - 1024 `bookResult(y)`
- **1026** the bank's accounts (Økonomi 2, Ø3, 27.10.2026; Jonas: «Automatisk skatteavsetning, rente på sparekonto, kassakreditt med
  - 1039 `bankS()`
  - 1050 `bankMove(k, kr0, no, en)`
  - 1053 `bankAfterIncome(inKr)`
  - 1061 `taxPay(kr0, no, en)`
  - 1064 `bankRelease()`
  - 1068 `bankDay(H)`
  - 1102 `taxOf(P, form, days, skj = 0, carry = 0)`
  - 1112 `saldoOf(v)`
  - 1123 `skjOf(frac, ri = 1)`
  - 1127 `txInit(H, adv)`
  - 1129 `yearFrac(H)`
  - 1131 `txProfit(H)`
  - 1134 `txNow(H = S.t / 60)`
  - 1140 `taxOwed(H = S.t / 60)`
  - 1145 `enkAdv(H)`
  - 1151 `taxPlan(H = S.t / 60)`
  - 1164 `asBase(y)`
  - 1168 `txClose(H)`
  - 1184 `taxDayMark(H)`
  - 1190 `taxFix(H)`
  - 1207 `taxTick(H)`
  - 1245 `foundAS()`
  - 1258 `mvaCheck(total)`
  - 1267 `trekkOf(total, len)`
  - 1272 `fmInit()`
  - 1274 `fmLand(total)`
  - 1283 `takeLoan(amount, months, k)`
  - 1287 `payDown(x)`
  - 1293 `deal(price, ti, inn)`
  - 1300 `finance(x, months)`
  - 1303 `lenGroup()`
  - 1304 `codLimits(H)`
  - 1307 `codOpen(H)`
  - 1308 `codLimitNow(H)`
- **1309** haill: luck from the quay. Fresh goods: full effect for two days, fading to nothing on day seven. Sold for real money only (test mode now) or won at the pub.
  - 1333 `haillBoost()`
  - 1334 `haillLeft()`
  - 1335 `haillStage()`
  - 1337 `haillF()`
  - 1338 `luck(sp)`
  - 1342 `haillCap()`
  - 1351 `haillInit()`
  - 1359 `haillFromSrv(loc, srv, wait)`
  - 1366 `srvToT(m, srvNow, t, world)`
  - 1367 `tToSrv(m, srvNow, t, world)`
  - 1370 `boostSrv(list, stack, now)`
  - 1372 `haillMirror(list, used)`
  - 1376 `haillStock(inv, srv, used)`
  - 1381 `giveHaill(type, how, id)`
  - 1386 `useHaill(type)`
  - 1400 `pubEvening(H)`
  - 1401 `pubOpen(H)`
  - 1404 `capHold()`
  - 1406 `cargoRoom()`
  - 1408 `cargoMin(kg)`
- **1409** the daily login bonus: each real calendar day you open the game adds a point to a bonus on the fish price; each day
  - 1412 `streakState()`
  - 1413 `streakPct()`
  - 1414 `streakTouch()`
- **1425** cold: effective temperature from air temperature and wind, plus wet from rain, snow and spray. Cold, wet hands fish worse;
  - 1429 `effTemp(H)`
  - 1430 `coldPen(H, hs)`
- **1437** orders from buyers and customers: species, amount, quality, deadline and a price premium; reputation builds with each buyer
  - 1452 `gradeOk(g, q)`
  - 1453 `ordState()`
  - 1456 `custNear(c)`
  - 1461 `repOf(id)`
  - 1463 `bkOrderable(H)`
  - 1465 `bkPlant(id)`
  - 1466 `custSp(c)`
  - 1467 `spCatchable(sp, H)`
  - 1469 `ordersTick(H)`

## `src/js/core/03b-sea.js` (313 linjer)

SEA: fetch, wind sea, swell

- **1** SEA: fetch, wind sea, swell
  - 11 `fetchRay(x, y, dx, dy)`
  - 30 `fetchAt(p, from)`
  - 37 `fetchCell(ix, iy, k)`
  - 48 `fetchSector(p, k)`
  - 62 `fetchFine(p, from)`
  - 72 `fetchHere(p, from)`
  - 73 `fetchField(p, from)`
  - 83 `hsWMO(U)`
  - 88 `hsWind(U, F)`
  - 90 `fetchCap(U)`
  - 91 `tpWind(U, F)`
  - 95 `wdAt(H, p)`
  - 96 `weAt(H, p)`
  - 105 `swellOpen(H, p)`
  - 114 `swellFactor(p)`
  - 116 `hsParts(p, H)`
  - 121 `hsAt(p, H)`
  - 126 `hsOpen(H, p)`
  - 128 `fcHsOpen(H, now, p)`
  - 129 `hsAtFc(p, H, now)`
  - 137 `seaCode(hs)`
  - 140 `seaHere(p, H)`
- **145** waves on a current (Ø9 F8b, docs/planer/fysikk-4-sjo-og-skrog.md F8)
  - 155 `curWave(om, U)`
  - 164 `curEff(c)`
  - 170 `curAlong(C, from, g)`
  - 173 `seaCur(p, H, q)`
  - 184 `seaDirOf(rel)`
  - 191 `seaPartsNear(p, H)`
  - 193 `seaDirF(p, H, head)`
- **198** The breaking sea, brottsjøen (Ø9 F7, docs/planer/fysikk-4-sjo-og-skrog.md F7; Jonas 27.10.2026 6A: «at båten skal fungere så ekte
  - 218 `brtHash(ix, iy, t, k)`
  - 225 `brottSea(p, H)`
  - 229 `brottCond(p, H)`
  - 244 `brottEvent(ix, iy, t, cond)`
  - 250 `brottMake(ix, iy, t, u, cond)`
  - 261 `brottNear(p, T, cond)`
  - 270 `brottRel(e, p, T)`
  - 276 `brottSide(e, head)`
  - 288 `brottMinute(cond)`

## `src/js/core/03c-stability.js` (312 linjer)

STABILITY: hydrostatics, the boat's motions in a sea, and what they do to the work aboard

- **1** STABILITY: hydrostatics, the boat's motions in a sea, and what they do to the work aboard
  - 11 `hullOf(type)`
- **20** Where the load stands aboard (OB15, 09.11.2026; docs/planer/om-bord.md kap. 5, S1–S3; Jonas 09.11.2026: «Jeg ønsker jo at båten
  - 41 `stabPlaces(type)`
  - 61 `stabPull(b = S.boat)`
  - 69 `stabLoad(b = S.boat)`
  - 82 `stabOf(type = S.boat.type, load = stabLoad()`
  - 111 `motionAt(p, H, head, kn, St = stabOf()`
  - 126 `windHeel(St, U)`
  - 129 `stabState(M)`
  - 138 `boatHead(H, b = S.boat)`
  - 140 `motionHere(H, b = S.boat)`
  - 147 `hsWork(p, H)`
  - 151 `stabTick(H)`
- **167** THE HULL IN THE SEA: buoyancy per section (Fysikk 4 F2, 07.11.2026; docs/planer/fysikk-4-sjo-og-skrog.md, Jonas' choice 2B)
  - 177 `hullSections(type, zb, zs)`
  - 207 `secArea(H, i, h)`
  - 212 `secBreadth(H, i, h)`
  - 221 `hullRest(H, D, zW)`
  - 244 `hullTrimmed(H, D, zG, L0, key)`
  - 267 `hullX(R)`
  - 282 `hullStep(H, R, X, eta, deta, dt, o)`

## `src/js/core/03d-quota.js` (567 linjer)

Quotas for cod, haddock and saithe north of 62° N. The regulation as it stood from 1 October 2026 (J-187-2026, fiskeridir.no)

- **1** Quotas for cod, haddock and saithe north of 62° N. The regulation as it stood from 1 October 2026 (J-187-2026, fiskeridir.no)
  - 20 `norQuota(sp, tac)`
  - 30 `codChain(N)`
  - 37 `tacOf(sp, y)`
  - 40 `yearQuota(y)`
- **54** the closed group: quota lengths the game sells, with J-187-2026's quota factors and quantities (§§ 16, 18, 19). Cod is a fixed
  - 71 `licQ(l, H, len)`
  - 83 `sellerCod(id, H)`
  - 90 `openUsedSave(q)`
  - 92 `openUsedLoad()`
  - 93 `freshQuota()`
  - 94 `licStart(lic)`
- **95** the stocks and the total quotas year by year. History and the advice for 2027 from the Institute of Marine Research (hi.no,
  - 137 `kystAt(T, y)`
  - 138 `kystF(lat, H)`
  - 146 `stockYear(sp, y, sd)`
  - 163 `ssbAt(sp, H)`
  - 164 `stockF(sp, H)`
- **166** the open group's season. About 2 100 boats fish the group quota down a day at a time (more in the skrei season and on days
  - 177 `qyOf(y)`
  - 184 `qyBoats(Y, y)`
  - 185 `qyStep(Y, y, d)`
  - 203 `quotaNewYear(y)`
  - 207 `qyAt(H)`
  - 209 `codStopDoy(y)`
  - 210 `openMaxAdd(H)`
  - 215 `ffPlan(y)`
  - 223 `ffPct(H)`
- **225** the closed group's register: a fixed number of rights (1 622 in the cod fishery north of 62° N on 17.10.2025, case document
  - 243 `npcReg()`
  - 245 `regSend(fn, id)`
  - 250 `regTake(id)`
  - 252 `regFree(id)`
  - 254 `regSeller(id, H)`
- **256** structure quotas (forskrift om spesielle kvoteordninger for kystfiskeflåten, J-244-2025): quota lengths 11–27.99 m may buy a
  - 264 `structFits(l, add)`
  - 265 `structRoom(l, id)`
  - 266 `structPrice(id, H)`
  - 268 `structIn(l, id, H)`
  - 269 `licExtra(l)`
  - 271 `structExpire(l, y)`
- **272** the special scheme for quota lengths under 11 m (kap. 2, from 2025): an owner with two such boats, both owned since the year
  - 274 `twoOK(la, lb, y)`
- **275** quota cooperation (J-187-2026 § 31): two closed-group boats under 11 m with different owners; both owners aboard, the passive
  - 279 `coopOffer(H)`
  - 280 `coopOK(l, y)`
- **282** the ocean permits (H1 of docs/planer/havsteget.md, 03.11.2026). Jonas' choices the same day: V1 A (the autoliner first), V2 B
- **304** the snow crab's regulation year by year, as data (V4 of docs/planer/havsteget-h3-snokrabbe.md, Jonas 06.11.2026: «Gjør det som blir
  - 323 `snoQuota(H)`
  - 325 `snoRoom(H)`
  - 328 `snoFlexNewYear(q, y)`
  - 334 `snoYear(y)`
- **349** the quota price that lives (KM5 of docs/planer/kvotemarkedet.md, steg 64; Jonas 07.11.2026, V4 B: «V4, anbefalt»)
  - 371 `kpkOut(H, y)`
  - 379 `kpkCodIx(H)`
  - 382 `kpkAt(H)`
  - 392 `havLicFor(type)`
  - 394 `havF(id, sp, y)`
  - 405 `havGroup(id, y)`
  - 408 `havQ(l, H)`
  - 416 `havLicWhy(type)`
  - 423 `havOffer(id, H)`
  - 426 `havValue(l, H)`
  - 440 `snoLicValue(y)`
  - 446 `havPrice(type, H)`
  - 448 `havLicTake(type, H)`
- **452** ling and tusk for vessels of 28 m and over (H2a of docs/planer/havsteget-h2-autoline.md, 05.11.2026). J-128-2026 (2026) and the
  - 460 `lbStop(y)`
  - 464 `lbShare(sp, H)`
  - 466 `lbNews(H)`
- **472** Greenland halibut (blåkveite) for vessels under 28 m (J-241-2025, the regulation for 2026; docs/blakveite.md 2-3, 07.10.2026)
  - 480 `bkSeason(y)`
  - 483 `bkOpen(H)`
  - 489 `bkDirect(H, len)`
  - 491 `bkState(H)`
  - 494 `bkAllow(H, bk, all)`
  - 499 `bkLanded(H, bk, all)`
  - 501 `bkNews(H)`
- **507** cod south of 62° N (Ø10c, steg 68, 11.11.2026; docs/systemer/kvoter-og-regler.md 5.28e). Forskrift 19. desember 2025 nr. 2805 om
  - 541 `sorOpenId()`
  - 542 `sorAcc()`
  - 545 `sorCodAboard()`
  - 548 `sorRoom(k, q, acc)`
  - 550 `sorLeft(k)`
  - 557 `sorConf(byc, codHold, q, acc)`
  - 566 `sorLanded(q, ok)`

## `src/js/core/03e-rules.js` (601 linjer)

The rules along the coast (R2 of the rules plan, 05.10.2026). rulesAt() takes a place, a time, the boat's length, the gear and the

  - 33 `ruPip(rings, x, y)`
  - 34 `ruIn(P, x, y)`
  - 40 `ruBlock(bx, by)`
  - 58 `ruBits(p)`
  - 75 `ruSeaBlock(bx, by)`
  - 89 `ruSea(p)`
  - 93 `ruShelf(p)`
  - 98 `ruSkag(p, b = ruBits(p)`
  - 109 `ruNsjo(p, ll = LL(p)`
  - 128 `zoneLic(c)`
  - 129 `zoneLicApply(c)`
  - 133 `insideFjord(p)`
  - 134 `insideBaseline(p)`
  - 136 `blDist(p)`
  - 142 `ruHom(p)`
  - 148 `landsdel(p)`
  - 149 `ruLok(p)`
  - 151 `ruZone(p)`
  - 152 `ruAt(id, p)`
  - 154 `ruLineName(ref)`
  - 169 `kcQuota(ll)`
  - 186 `ruSeaRules(c, q, ll, md, add)`
  - 259 `rulesAt(q)`
  - 456 `f26In(f, ll)`
  - 476 `ruMeshNow()`
  - 480 `ruBycWarn(k, pc)`
  - 491 `ruByc(q)`
  - 507 `ruBlockMsg(q)`
  - 509 `ruMinSize(sp, p)`
  - 514 `fjordLimits(p, H)`
  - 542 `ruCtx()`
  - 546 `ruNow()`
  - 557 `ruLayerBlock(bx, by, q, budget, tail)`
  - 571 `ruWpQ(w)`
  - 576 `ruWpMsg(w)`
  - 583 `ruOpenNear(p, q, maxKm)`
  - 592 `ruTips()`

## `src/js/core/03f-fiske.js` (387 linjer)

The fishing along the coast as it really was, and where the fish is from it (B2 of docs/planer/bestand-og-flaate.md, 01.11.2026).

  - 33 `fkData()`
  - 39 `fkIndex(fs)`
  - 46 `fkCell(sp, area, m, gear, lg)`
- **54** the location of a 2 km cell (ruLok kept per cell, plan 5b: looked up per cell and hour, not per point)
  - 56 `lokCands(bx, by)`
  - 63 `lokOfCell(p)`
- **71** the migrations (MIG): HI's descriptions, as curves of time and place
- **120** where the fish swim: the heading of the schools and of the good patches, by species, season and place
  - 129 `migOffshore(lat, lon)`
  - 137 `migHeading(sp, lat, lon, mf)`
  - 153 `migNode(si, sp, ix, iy, k, T, mw, kind)`
  - 161 `migDir(sp, p, k, T, mw, kind)`
  - 168 `mfOfH(H)`
- **170** the fish up and down in the water: by night most species rise from the bottom (HI; the diel vertical migration)
  - 176 `cellNight(c, H)`
  - 180 `vertZ(sp, night)`
  - 187 `gearVertF(sp, key, p, H)`
  - 195 `biteF(sp, p, H)`
- **201** the field from the notes: per species a Float32Array of locations × 12 months against Senja (NaN: no figure)
  - 203 `fkNeighbours()`
  - 211 `fkBuild()`
  - 295 `fkMonth(H)`
  - 297 `fkAt(a, l, T)`
  - 299 `skreiFront(lat, H, T)`
  - 305 `skreiPulse(c, H, T)`
  - 317 `fkAvail(sp, q, T)`
  - 355 `areaF(sp, p, H)`
  - 361 `skreiShare(p, H)`
  - 368 `skreiFlow(K, H)`
- **375** the sea's warmth: the fish go deeper when the surface is warmer than they like (B4, 02.11.2026)
  - 382 `tempDepthK(sp, c, H)`

## `src/js/core/03g-trykk.js` (212 linjer)

The fleet's pressure and the stock's baseline (B3 of docs/planer/bestand-og-flaate.md, 02.11.2026). The whole Norwegian fleet takes

  - 52 `trkAreas()`
  - 67 `trkCellW(c)`
  - 74 `trkSkreiMonths(D)`
  - 82 `trykkYear(sp, y)`
  - 138 `trkBiomass(sp, y, notes)`
  - 145 `trykkOpenScale(H)`
  - 154 `trkPlayersF(sp, y, Y)`
  - 164 `trkMonth(h)`
  - 170 `trkCell(c, H)`
  - 198 `fleetF(sp, p, H)`
  - 199 `fleetU(sp, p, H)`
  - 201 `baseAt(p, sp, H)`
  - 207 `skreiLeft(H)`

## `src/js/core/03j-felt.js` (205 linjer)

The fish on the fishing grounds as the good spots stand in the sea (Ø14 F2 of docs/planer/fangstfelt.md, 08.11.2026). Jonas 07.11.2026:

  - 31 `feltGeo()`
  - 55 `feltSd(g, x, y)`
  - 68 `feltBlock(ix, iy)`
  - 97 `feltAt(p)`
  - 110 `feltPull(g, H)`
  - 118 `feltLiftP(sp, q, H, T)`
  - 127 `feltG(EP, EP2)`
  - 133 `feltLoc(l)`
  - 189 `feltWlOf(l, sp, m)`
  - 190 `feltWl(c, sp, T)`
  - 196 `feltCellOf(c)`
  - 198 `feltCellW(c, s, M)`

## `src/js/core/03h-is.js` (71 linjer)

---------- the sea ice by month (Havsteget H1b R5, V3 A; Jonas 03.11.2026: «iskanten etter måned») ----------

- **1** the sea ice by month (Havsteget H1b R5, V3 A; Jonas 03.11.2026: «iskanten etter måned»)
  - 25 `seaIceMonth(H)`
  - 30 `seaIceCell(A, p)`
  - 36 `seaIceAt(p, H)`
  - 58 `seaIceLim(V)`
  - 60 `seaIceShut(p, H, V)`
  - 62 `seaIceOnLeg(a, b, H, V)`

## `src/js/core/03i-kvotemarked.js` (171 linjer)

Kvotemarkedet, the core (KM1 of docs/planer/kvotemarkedet.md; Jonas 07.11.2026: V1 A, V2 A, V3 A, V4 B, V5 A)

- **1** Kvotemarkedet, the core (KM1 of docs/planer/kvotemarkedet.md; Jonas 07.11.2026: V1 A, V2 A, V3 A, V4 B, V5 A)
  - 36 `kmKf(item)`
  - 38 `kmCod(item, H)`
  - 42 `kmTakst(item, H)`
- **54** the free right (V2 A, § 7): a right in the company without a boat, at most two game years, then back to the register
  - 58 `kmFree(H)`
  - 69 `kmFreeAdd(item, H)`
- **72** why it cannot be put out (a word), or null. src = {v, kind:'right'|'struct'|'two', i} for a boat's, {free:i} for a free right
  - 76 `kmWhy(src, H)`
- **90** the good as it travels (to the server and the buyer): nothing about who. A right takes its structure quotas and this year's catch on
  - 93 `kmPack(src, H)`
  - 102 `kmShare(u, l, s)`
- **103** the seller's side: the right or the structure quota leaves the boat (or the free right the company). The boat stays in the company
  - 105 `kmOut(src, H)`
- **118** the buyer's side. to = {v, how}: put (the right on a boat without one: she joins the closed group), struct (structured onto a boat
  - 122 `kmApply(item, to, H)`
  - 151 `kmStructWhy(l, item)`
  - 158 `kmLenWhy(item, len)`
- **159** why the buyer cannot take it (a word), or null. to = {v, how}; kr0 what the bid binds:
  - 162 `kmBuyWhy(item, to, kr0)`

## `src/js/core/03k-hav-fft.js` (153 linjer)

---------- the short sea as a wave field: FFT tiles (Bølgene B1, docs/planer/bolgene.md, 12.11.2026) ----------

- **1** the short sea as a wave field: FFT tiles (Bølgene B1, docs/planer/bolgene.md, 12.11.2026)
  - 23 `hfftRot(t0, t1, M)`
  - 25 `hfftHash(i)`
  - 30 `hfftLgam(x)`
  - 39 `hfftSp(L0)`
  - 46 `hfftPlan(N)`
  - 53 `hfft1(p, re, im, o, st)`
  - 62 `hfft2(p, re, im)`
  - 68 `hfftSpec(T, P)`
  - 98 `hfftFrame(T, t, out, W, outD)`
  - 125 `hfftCapFit(o1, n1, s1, o2, n2, s2, gs, n, w2 = 1, two = false)`
  - 144 `hfftMips(out, N)`

## `src/js/core/04-crew.js` (735 linjer)

crew: people with skills, habits and moods

- **1** crew: people with skills, habits and moods
  - 12 `crewHome()`
  - 34 `pickW(pairs)`
  - 35 `crewAge()`
  - 37 `skreiSeason(H)`
  - 40 `crewDerive(c)`
  - 41 `genCrew()`
  - 56 `deckSkills(ex)`
  - 58 `crewUpgrade(c)`
- **59** the share system of the coastal fleet (Økonomi 2, Ø2, 27.10.2026; docs/planer/okonomi/02-design.md)
  - 113 `lotMigrate(c)`
  - 123 `oppgPct(T, n, len)`
  - 135 `lottFishery(b = S.boat)`
  - 138 `lottM(n, len, fishery = 'juksa')`
  - 149 `tripOf(b = S.boat)`
  - 150 `tripAdd(b, k, kr0)`
  - 151 `tripCost(b = S.boat)`
- **154** the trip's line on the landing note and in the deck log (Ø8b S2, V2 A and V4 A in docs/planer/spillbarhet-fangst.md, Jonas
  - 164 `tripSum(T)`
  - 180 `tripWhy(W)`
- **224** the trip's limits on an ocean vessel (H2b of docs/planer/havsteget-h2-autoline.md, 05.11.2026). The fuel, the bait, the hooks for
  - 230 `tripHome(b = S.boat)`
  - 235 `tripLeft(b = S.boat)`
  - 252 `tripHour()`
- **262** the ocean vessel's crew as anonymous teams (H2b of docs/planer/havsteget-h2-autoline.md, V3 A; Jonas 05.11.2026: the teams
  - 275 `lagOf()`
  - 285 `lagPeople()`
  - 302 `lagOnDeck(H, under)`
  - 307 `lagMeal()`
  - 310 `lagLanded(kr)`
- **324** the provisions of an ocean vessel (H2b; Jonas 05.11.2026: «Fylles ved avgang»): the ship's chandler fills the stores aboard when she
  - 333 `provOf(b = S.boat)`
  - 334 `provFill()`
  - 340 `provMinute()`
  - 342 `crewHireWhy()`
  - 345 `lottParty()`
  - 355 `lottSplit(D)`
  - 359 `payMates()`
  - 364 `weekKr(len)`
  - 365 `lotWeek(c, H = S.t / 60)`
  - 370 `crewAboard(H, all)`
  - 373 `biDaysTxt(c)`
  - 376 `crewBiOff(H)`
  - 378 `crewEff(c, H, hs, g = 'juksa')`
- **385** what lifts or drags a person's effort just now, besides what they can and who they are (Jonas 23.10.2026: «dette skal være dynamisk
  - 391 `crewDrive(c, H, hs)`
  - 412 `crewEffort(c, H, hs)`
- **419** samhold: how the crew aboard pull together (Jonas 23.10.2026: «Samhold ja, men det må gjøres intuitivt»), 0-100 per vessel (S.team,
  - 424 `crewTeam()`
  - 429 `teamHour(H, on, hs, food)`
  - 448 `teamLine()`
  - 456 `teamEff(team, me = true, g = 'juksa')`
  - 458 `compat(a, b)`
  - 471 `crewById(id)`
  - 474 `holdNet()`
  - 483 `crewSettle(c)`
  - 492 `crewQuit(c, why, whyEn)`
- **495** Ø11.9 the employment agreement (L7; docs/systemer/sjofart-og-lover.md 2.4 and kap. 10): skipsarbeidsloven, LOV-2013-06-21-102
  - 506 `avtAddMonths(t, n)`
  - 512 `crewAvt(c)`
  - 519 `crewPos(c)`
  - 522 `crewFrist(c, t = S.t)`
  - 535 `crewNotice(c, gr)`
  - 544 `crewOppTick(c)`
  - 552 `crewStay(c)`
  - 564 `crewGrunn(c)`
  - 572 `crewLetGo(c)`
- **584** Named folk on the coast (Jonas 06.11.2026): real people who have asked to be in the game, as crew to hire at their home quay
  - 594 `namedAge(n, H)`
  - 595 `namedMake(n)`
  - 600 `namedTaken(nid)`
  - 601 `namedTick(B)`
  - 610 `borsTick(H)`
  - 620 `crewRumour()`
  - 624 `crewSeaFat(c, fishing, workF, night)`
  - 625 `crewTick(H)`
  - 697 `codRoom(H)`
- **699** the crew fly to and from Svalbard (H1b R7, 05.11.2026; docs/planer/havsteget-h1b-rammen.md V4 B)
  - 713 `flyIn(c)`
  - 722 `flyOut(c)`
  - 730 `flyTick()`

## `src/js/core/05-vessels.js` (1506 linjer)

---------- other vessels (deterministic, so every player sees the same traffic) ----------

- **1** other vessels (deterministic, so every player sees the same traffic)
  - 4 `prepRoute(r)`
  - 5 `atRoute(R, s)`
  - 23 `hashStr(t)`
  - 25 `berthSlot(q, key, big)`
  - 38 `berthShift(p, key, big)`
  - 46 `fleetBerth(i)`
  - 59 `fleetOff(f, p)`
  - 63 `fleetState(i, H)`
  - 72 `fleetState0(i, H)`
- **100** the NPC traffic along the coast (part 5 of the coast-wide plan, 03.10.2026; the user: full traffic along the coast, but only
  - 117 `coastWay(b, moored, m0)`
  - 141 `coastCells(a, z)`
  - 157 `coastWayAt(w, u, back)`
- **164** One national coastal fleet (L2/N1 of docs/planer/bestand-og-flaate.md, 02.11.2026)
  - 173 `flaateData()`
  - 179 `flaateApply(t)`
  - 200 `openDone(day0)`
  - 205 `heldShare(lg)`
  - 211 `coastGround(G, dI, i, H)`
  - 216 `coastState(b, H, hod = hodOf(H)`
- **262** where a coast boat lies at home (Jonas 18.10.2026: «npc-båter mange plasser er plassert i landmassen når de ligger ved kai»;
  - 274 `unitHit(x, z, r)`
  - 282 `dockInHarbour(x, z)`
  - 288 `moorBlocked(x, z, r)`
  - 297 `moorFree(p, hd, L, B, others)`
  - 313 `quayClear(f, a, L, out, others)`
  - 330 `docksIn(x0, z0, x1, z1)`
  - 331 `dockFree(d, others, placed)`
  - 348 `moorAround(h, p)`
  - 355 `moorHarbour(h)`
  - 438 `moorKey(h)`
  - 441 `moorStill(h)`
  - 442 `coastMoor(b)`
  - 454 `seaward(p, c)`
  - 456 `coastSpot(gr, dI, i)`
  - 459 `coastCast(b, gr, dI, i, kc, Hc, spot)`
- **473** The coast boats' own gear in the sea (Jonas 02.11.2026: «Garn, liner og annet utstyr skal være synlig og vises i kartplotteren»)
  - 482 `coastGearKind(b)`
  - 488 `coastSet(b, k, pI, i, H)`
  - 497 `coastNear(H, only)`
  - 521 `npcStates(H, only)`
  - 563 `peerName(s)`
  - 578 `peerRouteStr(p, wps, idx)`
  - 588 `peerRoute(s)`
  - 594 `routeWalk(p, R, d, hd0)`
  - 601 `ptPred(q, w, t)`
  - 616 `ptPose(T, now)`
  - 624 `ptTake(q, now)`
  - 638 `peerStates()`
  - 654 `newState()`
  - 667 `log(no, en, k)`
  - 669 `navHour()`
  - 685 `nearestPort(p)`
  - 687 `nearestYard(p)`
  - 689 `step()`
  - 710 `holdMinute(H, p)`
  - 719 `vesselStep(H)`
  - 814 `plantFuel(b)`
  - 817 `sailV(H, hs)`
  - 833 `sail(H, W, hs)`
  - 870 `sailWaiting()`
  - 871 `sailReplan(pl, b, gp)`
  - 927 `iceWhy(p, tried)`
  - 929 `sailStop(pl, b, why)`
  - 937 `haltPlan(need)`
  - 947 `arrive(w)`
  - 968 `unstuckWhy()`
  - 974 `unstuckSpot()`
  - 987 `agFree()`
  - 998 `unstuck()`
- **1012** making fast and casting off with people (OB2, 09.11.2026; docs/planer/om-bord.md F1-F3): the short spells round a quay, on the
  - 1020 `moorPhase(b)`
  - 1035 `dock(pid, berth)`
  - 1063 `catchFactors(H, W, hs)`
  - 1076 `stockDev(p, sp)`
  - 1082 `fish(H, W, hs)`
  - 1188 `endFishing(why)`
  - 1209 `bycHere(how)`
  - 1213 `bycAdd(sp, kg, how)`
  - 1217 `bycConf()`
  - 1220 `addCatch(sp, kg, cls, hook, opt)`
- **1242** work on deck: gutting and icing take hands and time
  - 1258 `deckHands()`
  - 1261 `deckPending()`
  - 1262 `deckEta(hands)`
  - 1267 `moveKg(x, kg, patch)`
  - 1275 `iceMinute()`
  - 1282 `iceOut(out)`
  - 1288 `deckMinute()`
- **1313** lying to in a storm (H1b R8, 05.11.2026)
  - 1330 `quayFar(b)`
  - 1334 `lieTo(W, hs)`
  - 1341 `lieToStep(W, hs)`
  - 1351 `risk(W, hs)`
  - 1379 `hullRepair()`
  - 1382 `svcOverdue()`
- **1383** the rescue boat (plan E3, 05.10.2026)
  - 1409 `rescueBases()`
  - 1418 `rescueBase(p)`
  - 1425 `rescueAis(H)`
  - 1429 `rescue(keepCatch)`
  - 1457 `towSea(p)`
  - 1462 `towRoutes(b)`
  - 1473 `towStep(H)`
  - 1486 `towDone(t)`
  - 1495 `towPose(frac)`

## `src/js/core/05b-ferje.js` (197 linjer)

The car ferries along the whole coast (Ø15 N3 of docs/planer/npc-flaaten.md, 11.11.2026; docs/systemer/npc-trafikk.md 4.18). Every

  - 44 `ferjeInit()`
  - 70 `ferjeFind(a, b, y = 0)`
  - 74 `ferjeChain(s, W)`
  - 98 `ferjeHop(s, a, b)`
  - 106 `ferjeSailed(s, v, H0)`
  - 117 `ferjeDock(R, o)`
  - 118 `ferjeAt(s, v, w, ok)`
  - 137 `ferjeClock(H)`
  - 142 `ferjeName(s, vi)`
  - 151 `ferjeStates(s, H, wx = true, C = ferjeClock(H)`
  - 171 `kystStates(H, only)`
  - 185 `ferjeNear(H, only)`

## `src/js/core/05c-air.js` (64 linjer)

---------- aircraft over the coast (plan E4, 05.10.2026) ----------

- **1** aircraft over the coast (plan E4, 05.10.2026)
  - 35 `airLegs()`
  - 47 `airStates(H, p, km)`

## `src/js/core/05d-hav.js` (265 linjer)

The ocean fleet as NPCs (H1 of docs/planer/bestand-og-flaate.md, 02.11.2026)

- **1** The ocean fleet as NPCs (H1 of docs/planer/bestand-og-flaate.md, 02.11.2026)
  - 25 `havHeld(s)`
  - 26 `havData()`
  - 46 `havTrip(s, k)`
  - 47 `havTrip0(s, k)`
  - 56 `havOpen(g, d)`
  - 69 `havIceClear(a, b, H)`
  - 70 `havIceWay(a, b, H)`
  - 91 `havWay(s, gi, pi, H0)`
  - 104 `havWay0(s, gi, pi, key)`
  - 120 `havLeg(a, b)`
  - 134 `havBerth(s, pi, H)`
  - 143 `havV(s, tr)`
  - 147 `havVisitors(pi, H)`
  - 161 `havLand(s, tr)`
  - 162 `havLand0(s, tr)`
  - 171 `havFish(s, k, u, g)`
  - 212 `havState(s, H, near)`
  - 237 `havNear(H, only)`

## `src/js/core/05e-sjovei.js` (1243 linjer)

---------- the rules of the road: who gives way, and the NPCs and Autonav that do (Ø11.1, docs/systemer/sjofart-og-lover.md) ----------

- **1** the rules of the road: who gives way, and the NPCs and Autonav that do (Ø11.1, docs/systemer/sjofart-og-lover.md)
  - 65 `colregLim(La, Lb)`
  - 71 `colregCls(n)`
  - 84 `colregHav(s, A)`
  - 92 `colregOwnCls(b)`
  - 101 `colregAisSt(n)`
  - 122 `colregSit(a, b, o = {})`
  - 164 `sjvNeed(R, hd, sg, want, mover, gs = 1)`
  - 175 `sjvSide(R, hd, mover, want, gs)`
  - 185 `sjvSide19(rel, ov)`
- **187** the manoeuvre laid over the shared course (npc-flåten 4 A): a fixed direction off the track, ramped at the turn's rate, held,
  - 190 `sjvOffAt(E, H)`
  - 198 `sjvPhase(E, H)`
  - 204 `sjvLagAt(E, H)`
  - 209 `sjvPose(n, E, H)`
  - 230 `sjvLive()`
  - 232 `sjvOwn()`
  - 248 `sjvNarrow(n, H)`
  - 257 `sjvRoom(n, nx, ny, k)`
  - 270 `sjvRoomOn(n, E, H)`
  - 283 `sjvRoomOwn(a, nx, ny, k)`
  - 300 `sjvBackClear(M, Q, lim, gs)`
  - 316 `sjvLead(R, v)`
  - 319 `sjvBackNpc(n0, n, E, H)`
  - 326 `sjvBackOwn(A, O)`
  - 332 `sjvStart(n, R, H, mover, why, own, id)`
- **345** Ø11.2: the sight, the lanterns and the sound signals (pure; sjvEval and the views use them)
  - 349 `sjvLampNm(k, L)`
  - 360 `sjvLightNm(D0, vis)`
  - 367 `sjvSeenKm(L, vis, dark)`
  - 369 `sjvHearNm(L)`
  - 374 `sjvFogPat(c, v, L)`
  - 383 `sjvManPat(side, slow)`
  - 388 `sjvLanternSt(n)`
  - 390 `sjvMinKn()`
  - 393 `sjvSafeMs(dM)`
  - 399 `sjvVisAt(H, p)`
  - 400 `sjvDark(H, p)`
  - 404 `sjvSig(id, pat, p, L, own)`
  - 412 `sjvFogSigs(H, list, A, gs, vis, dark)`
  - 430 `sjvFogCapV()`
  - 437 `sjvCapV()`
- **439** one look: the encounters round the boat you follow (at most once a game tenth of a minute, a real second)
  - 440 `sjvEval(H, list)`
  - 575 `sjvNearMiss(n, R, clr)`
  - 583 `colregNpc(H, out, only)`
  - 597 `sjvTrack(list)`
- **599** Autonav
  - 603 `sjvFresh(model)`
  - 613 `sjvAuto(d, h, ds, T)`
  - 630 `sjvSail(pl, b, left)`
  - 651 `sjvCreep(pl, b, L, v)`
- **660** the warning's words (the strip, the box and the card, the chart plotter)
  - 662 `sjvSay(W, how)`
  - 699 `sjvWhen(W)`
  - 701 `sjvWarn()`
- **703** Ø11.3: collisions (sjøloven kap. 8, LOV-1994-06-24-39 §§ 161-164, read on Lovdata 06.11.2026)
  - 728 `sjvHullPts(X, Z, psi, L, B)`
  - 732 `sjvInPoly(P, x, z)`
  - 739 `sjvSat(A, B)`
  - 760 `sjvSatC(A, cx, cz, r)`
  - 769 `sjvMass(n)`
  - 770 `sjvOwnMass(b = S.boat)`
  - 773 `sjvKnEq(kn, mA, mB)`
  - 775 `sjvValue(L)`
  - 780 `sjvMatOf(n)`
  - 783 `sjvOtherCost(kn, L, mat, P)`
  - 793 `sjvOwnLoss(b, c)`
  - 799 `sjvCpa(a, b, gs)`
  - 804 `sjvTrailAdd(id, e)`
  - 822 `sjvFault(T, X)`
  - 889 `sjvFaultWord(w, no)`
  - 900 `sjvFaultSay(F, name, lang)`
  - 911 `sjvSettle(b, F, c, oth, name)`
  - 922 `sjvPaySay(M, F, name, lang)`
  - 930 `sjvKr(x, no)`
  - 932 `sjvFrom()`
  - 936 `sjvTo()`
  - 943 `sjvVhf(n, rec)`
  - 957 `sjvStandBy(n, H)`
  - 968 `sjvBlow(n, kn, E, H, pre)`
- **1000** the manoeuvring model's steps (16b-dyn.js dynContact, by hand and on Autonav)
  - 1003 `sjvClock()`
  - 1010 `sjvNear(H, X, Z)`
  - 1031 `sjvImpulse(d, P, I, ve, vz, m2, gs)`
  - 1042 `sjvTouch(b, d, P)`
- **1075** the look's sweep (sjvEval), when the model does not have her
  - 1078 `sjvSweep(n, A, H, gs, on)`
- **1104** Ø11.8: the fairway: the speed limits and the cardinal marks (docs/systemer/sjofart-og-lover.md kap. 9)
  - 1124 `fartMd(H)`
  - 1126 `fartInSeason(s, md)`
  - 1128 `fartRunsFrom(b)`
  - 1138 `fartRuns()`
  - 1148 `fartInArea(i, cx, cy)`
  - 1154 `fartAt(p, H)`
  - 1173 `fartLegKn(pl, p, L, H)`
  - 1182 `fartCapMs()`
  - 1193 `farvWrongSide(p, marks)`
  - 1203 `farvLook(H)`
  - 1232 `farvRec(r)`
  - 1235 `farvWarn()`
  - 1236 `farvSay(w, how)`

## `src/js/core/06-services.js` (349 linjer)

---------- services behind the phone ----------

- **1** services behind the phone
  - 9 `coverage(p)`
  - 15 `msg(from, no, en)`
  - 18 `radio(no, en)`
  - 19 `radioForecast(H)`
  - 32 `hourly()`
  - 62 `skipPort(i)`
  - 66 `weekOf(H)`
  - 67 `npcWeekKg(i, w)`
  - 72 `myKg(H0, H1)`
  - 73 `toplist(w)`
- **80** the fishing grounds in the pub and the paper (Ø14 F3 of docs/planer/fangstfelt.md, 11.11.2026)
  - 87 `rumourAt(pt, H)`
  - 101 `rumourNeed(pt)`
  - 109 `feltSeasonIn(near, mo, H)`
  - 116 `newsThin(hp, day, mo)`
  - 125 `newsForDay(day)`
- **200** standing operations plan: a hired skipper runs a saved route on set days, lands the catch and restocks
  - 202 `autoRestock()`
  - 210 `depart()`
  - 243 `yardStale(j, b)`
  - 251 `finishJob(j)`
  - 283 `fitHours(k)`
  - 286 `jobOk(j)`
  - 291 `queueJob(j)`
  - 295 `jobsDone()`
  - 301 `shelterReturn(W, hsOver)`
  - 327 `startReturn(auto, W, home, hsOver, opsKeep)`
- **347** CORE END

## `src/js/core/06b-coastports.js` (166 linjer)

the fish receivers along the whole coast as harbours (05.10.2026, M2 of the coast plan)

- **1** the fish receivers along the whole coast as harbours (05.10.2026, M2 of the coast plan)
- **19** the registration mark (Malerverkstedet, 07.10.2026): the county's letters, a serial number and the municipality's letters,
  - 30 `regLetters(pt)`
  - 36 `regUsed(f, k, n)`
  - 37 `regOf(b)`
  - 43 `regDraw(e)`
  - 56 `callFree(p, n)`
  - 57 `callOf(b)`
  - 137 `plantsNear(p, n = 10)`
- **143** the ocean vessels at the plants (H0 of docs/planer/havsteget.md, 03.11.2026)
  - 150 `portWhy(pt, type)`

## `src/js/core/06c-steder.js` (48 linjer)

the tackle shops and the yards along the coast: the other two places of trade (07.10.2026)

- **1** the tackle shops and the yards along the coast: the other two places of trade (07.10.2026)
  - 36 `portServices(pt, berth)`
  - 44 `placesNear(p, kind, n = 3)`

## `src/js/core/06d-plan-felles.js` (74 linjer)

The plan's shared parts (Ø12 C, 08.11.2026). The old operations plan (23.10.2026: its engine and its page, DRIFTUI) was

- **1** The plan's shared parts (Ø12 C, 08.11.2026). The old operations plan (23.10.2026: its engine and its page, DRIFTUI) was
- **15** what a place gives: only what the player knows (Jonas 09.10.2026: the plan shows no expected catch; where the fish stand is found by
  - 19 `planMark(p, g)`
  - 20 `planJigRate(p)`
- **22** the legs between the places, found along the fairways (11-route.js leiaRoute) and kept in o.legs: {w [[x, y] …] the points before
  - 29 `drLeg(o, a, ap, b, bp)`
  - 36 `drLegPut(o, key, r, a, b)`
  - 42 `drFetch(o, pairs, vid)`
  - 54 `drWaiting()`
  - 56 `drLegsStale(o)`
- **58** the crew: rested, and had enough (Driftsplan 2's limits, DRP2 in 06g-plan2.js)
  - 59 `drFat()`
  - 60 `drRested()`
  - 61 `drTired()`
- **65** a closed place at the hour H (Jonas 23.10.2026); o: {fields, jigs, rig, jig}. (plan2Check asks it; the quota is not the plan's
  - 67 `drRulesWhy(o, H)`

## `src/js/core/06g-plan2.js` (472 linjer)

Driftsplan 2: the day is the plan (26.10.2026, docs/planer/driftsplan-2/02-design.md). Part 1: the model, the day and the check.

- **1** Driftsplan 2: the day is the plan (26.10.2026, docs/planer/driftsplan-2/02-design.md). Part 1: the model, the day and the check.
  - 26 `p2When(H, H0)`
  - 36 `p2MeRate(pid, anchor)`
  - 47 `p2MeRestH(e, rate)`
  - 52 `p2Units(kind, lk)`
  - 59 `p2Left(o, q)`
  - 61 `p2LineKind(o)`
  - 80 `plan2New(over)`
  - 90 `plan2Ops()`
- **107** the places: a point, a port, or a key ('H' home, 'Q' the home quay, 'M' the plant, 'A' the rest anchorage)
  - 108 `plan2P(o, k)`
  - 117 `plan2LegH(o, a, ap, b, bp, v)`
- **124** the state the day is reckoned from: where she lies, the hold, the gear in the sea and aboard, the crew, you. Tests pass their own
  - 125 `plan2State(o)`
  - 143 `plan2StateOf(o)`
  - 144 `plan2RestOk(pid)`
  - 146 `plan2Ready(kind, st, lk)`
  - 150 `plan2NextDep(o, H, from)`
  - 160 `plan2Watch(H)`
  - 161 `plan2Roles(st)`
- **167** the ocean vessel's day (H2c of docs/planer/havsteget-h2-autoline.md, 05.11.2026): the autoline in a loop on the fields, round the
  - 175 `p2AutoEnd(o, st)`
  - 185 `planDayAuto(o, H0, st)`
- **239** the day. H0: the hour the day begins (the departure). Returns {t0, steps:[{t, k, …}], end, why:[no, en], skipped:[{id, no, en}]}.
  - 243 `p2TripLen(o)`
  - 244 `p2TripLast(o, dayIndex)`
  - 249 `p2LandsToday(o, dayIndex)`
  - 255 `planDay(o, H0, st)`
- **375** the day as text: [[clock, no, en], …], one line a step, the skipped places and the reason last
  - 376 `planDayText(o, day)`
- **413** the check: errors keep the plan from being switched on, warnings only inform (as driftCheck; the rhythm's rules from Jonas 26.10.2026)
  - 417 `plan2WatchWhy(st, aboard, short)`
  - 427 `p2Kits()`
  - 428 `plan2Check(o, st)`

## `src/js/core/06h-plan2-engine.js` (580 linjer)

Driftsplan 2, part 2: the engine (26.10.2026, docs/planer/driftsplan-2/02-design.md chapter 2). It follows the day that planDay

- **1** Driftsplan 2, part 2: the engine (26.10.2026, docs/planer/driftsplan-2/02-design.md chapter 2). It follows the day that planDay
  - 8 `plan2Key(o)`
  - 11 `plan2Here(o)`
  - 23 `plan2TideMin()`
  - 24 `plan2LegOk(o, a, ap, b, bp)`
- **32** making the plan: the plant, the anchorages, the legs and the shelter ports. Async; cb(err) when done
  - 33 `plan2Make(o, cb)`
- **78** what the plan says, waits for and stops at
  - 83 `plan2ActWhy(w, why)`
  - 85 `plan2Abort(o)`
  - 88 `plan2Wait(o, k, no, en, until, open)`
  - 94 `plan2Stop(o, k, no, en, fix)`
  - 104 `plan2Pause(o)`
  - 113 `plan2Start(o)`
  - 118 `plan2Resume(o)`
  - 120 `plan2CrewWhy(o, work)`
  - 133 `plan2Wx()`
  - 138 `plan2WxAhead(o, H, dur, pts, L)`
  - 147 `plan2WxWait(o, wx, H)`
  - 154 `plan2WxFirstOk(o, H, dur, pts)`
- **155** shelter without a search (part 3): back the way she came to the last place or port she passed, and from a place the kept leg to its
  - 158 `plan2Shelter(W, hsOver)`
  - 181 `plan2Cut(o, why)`
  - 193 `plan2RulesWhy(o, H, placesOnly)`
  - 200 `plan2RulesOpenAt(o, H)`
- **201** the engine: each minute, on each vessel (05-vessels.js calls it)
  - 203 `plan2Step(H)`
  - 219 `plan2Decide(o, H)`
  - 250 `plan2MeRest(o, H)`
  - 262 `plan2SkipGiven()`
  - 272 `p2DayEnd(d)`
  - 274 `plan2Boundary(o, H)`
  - 293 `plan2Spent(o, H)`
  - 302 `plan2NewDay(o, H)`
  - 319 `plan2CostDay(o, r)`
  - 322 `plan2Caught(o, tr)`
  - 323 `plan2StatDay(o, d)`
- **324** a trip: the steps from i0 to the next port call, as waypoints on the kept legs
  - 325 `plan2Trip(o, D, i0)`
  - 402 `plan2Go(o, H, i0)`
  - 450 `plan2Sea(o, H)`
  - 499 `plan2WorkStop(o, H, W, hs)`
  - 510 `plan2WorkWait(o, H, wx, pts, port)`
  - 521 `plan2Landed(pid, k)`
  - 530 `plan2Report(pid, kg, total, landed)`
  - 542 `plan2Bait(o, s)`
  - 560 `plan2Egn(o, s)`
  - 567 `plan2WatchTick(H)`

## `src/js/core/06i-plan2-sno.js` (235 linjer)

Driftsplan 2 for the snow crab vessel (H3c of docs/planer/havsteget-h3-snokrabbe.md, 06.11.2026)

- **1** Driftsplan 2 for the snow crab vessel (H3c of docs/planer/havsteget-h3-snokrabbe.md, 06.11.2026)
  - 33 `p2SnoLenke(q, k)`
  - 44 `p2SnoFit(q, k)`
  - 57 `p2SnoSeason(H, nL)`
  - 64 `p2SnoQLeft(H, live)`
  - 71 `p2SnoState(o, st)`
  - 78 `p2SnoEnd(o, st)`
  - 94 `planDaySno(o, H0, st)`
  - 204 `p2SnoText(o, s, pl, kl, at)`
  - 216 `p2SnoCheck(o, st, ER, Wn)`

## `src/js/core/06k-plan3.js` (416 linjer)

Driftsplan 3: the plan is a ring and a gear (16.11.2026, docs/planer/driftsplan-3.md). Part 1 (DP3-1): the model and «find the plan».

- **1** Driftsplan 3: the plan is a ring and a gear (16.11.2026, docs/planer/driftsplan-3.md). Part 1 (DP3-1): the model and «find the plan».
  - 28 `plan3GearKey(rig)`
  - 41 `plan3Gear()`
  - 54 `plan3New(ring, rig, pick)`
- **61** the ring's water: points on a grid inside it where the gear can stand (sea, deep enough and not too deep, open by the rules).
  - 63 `plan3Spots(o)`
  - 79 `plan3Split(o)`
  - 92 `plan3Places(o, spots)`
- **100** the home: the place by the ring the crew sleep well at, and you when you are aboard, the nearest of them; a rorbu's night counts a
  - 102 `plan3HomeScore(c)`
  - 103 `plan3Home(o)`
  - 119 `plan3Rhythm(o)`
  - 127 `plan3Wx()`
  - 133 `plan3Roles()`
  - 142 `plan3RingWhy(o, spots)`
- **148** «find the plan»: the answers from the ring, the gear, the boat and the crew, into the v4 fields the engine reads. Pure but for the
  - 150 `plan3Derive(o, spots)`
  - 167 `plan3Apply(o)`
  - 175 `plan3Make(o, cb)`
- **184** the old plans when DRIFT3 is on (Jonas 16.11.2026: «Den slåes av og melding gies. Båten kjøres til nærmeste fiskemottak på
  - 188 `plan3Retire(o)`
- **213** DP3-2: the search with the echo sounder (16.11.2026, docs/planer/driftsplan-3.md chapter 3, «Søket med ekkoloddet»).
  - 223 `plan3Tier()`
  - 227 `plan3Reader()`
  - 239 `plan3Take(o, H)`
  - 248 `plan3Truth(p, H, take, den)`
  - 252 `plan3See(p, H, tier, take, den, ahead)`
  - 258 `plan3Clean(a, b)`
  - 269 `plan3SokPrep(o, spots)`
  - 306 `plan3SokEnd0(o, tier)`
  - 309 `plan3SnoFits(o, q, at)`
  - 315 `plan3StrKm(o, q)`
  - 323 `plan3Heads(o, q, at)`
  - 335 `plan3Lay(o, q, at, segs, hs)`
  - 342 `plan3SokEst(o)`
  - 349 `plan3SokNeed(o, st)`
  - 364 `plan3Search(o, ids, H, opt)`
  - 390 `plan3SokEnd(o, tr, H)`
  - 402 `plan3HaulWatch(o, H)`

## `src/js/core/06j-hopp.js` (156 linjer)

---------- Hopp over resten av ruta (HO1, steg 104; docs/planer/hopp.md, Jonas 12.11.2026) ----------

- **1** Hopp over resten av ruta (HO1, steg 104; docs/planer/hopp.md, Jonas 12.11.2026)
  - 23 `hopHoldOn()`
  - 25 `hopHoldOff()`
  - 27 `hopHeld(b)`
  - 30 `hopHoldFor(d)`
  - 32 `hopPrice(realMin)`
  - 38 `hopStop(pl)`
  - 45 `hopCatching()`
  - 48 `hopWait()`
  - 51 `hopCoverMax(paidMin)`
  - 52 `hopCovers(paidMin, realMin)`
  - 54 `hopMinWords(n)`
  - 56 `hopWhy()`
  - 77 `hopRun(paid)`
  - 110 `hopMatch(to)`
  - 116 `hopQuote(paid)`
  - 118 `hopSaved(real, en)`
  - 120 `hopDo(q)`
  - 144 `hopGo(paid, maxMin)`

## `src/js/core/06e-anchor.js` (242 linjer)

Anchor (Jonas 08.10.2026: «alle båter skal ha mulighet til å ligge på anker … kai skal være standard … risiko forbundet med å

- **1** Anchor (Jonas 08.10.2026: «alle båter skal ha mulighet til å ligge på anker … kai skal være standard … risiko forbundet med å
  - 15 `anchorSpot(p, boatType)`
  - 24 `anchorLoad(W, hs, expo)`
  - 26 `anchorForecast(p, H, hours, spot)`
  - 33 `anchorAlarm(kind, n)`
  - 37 `anchorAwake()`
- **38** the current (Fysikk 4 F8a, 10.11.2026; docs/planer/fysikk-4-sjo-og-skrog.md F8): the stream through the sounds, the tide's own
  - 66 `stromNear(p)`
  - 68 `stromAt(q, p, dh)`
  - 76 `curCoastWay(p)`
  - 79 `stromSum(p, dh)`
  - 84 `curAt(p, H)`
  - 111 `curBoat(b, H)`
- **117** the ground tackle and how she lies to it
  - 123 `anchorGear(type)`
  - 129 `anchorReach(out, h, a)`
  - 137 `anchorForce(type, p, H)`
  - 147 `dropAnchor(auto)`
  - 162 `weighAnchor(silent)`
  - 169 `anchorUpIn()`
  - 174 `anchorSwing(H)`
  - 204 `anchorTick(H, W, hs)`
  - 233 `driftAnchorage(pid)`

## `src/js/core/07f-kar.js` (101 linjer)

the fish tubs (docs/planer/fiskekar-dekk.md, Jonas 04.11.2026)

- **1** the fish tubs (docs/planer/fiskekar-dekk.md, Jonas 04.11.2026)
  - 8 `karN(type, lv)`
  - 10 `karSteps(type)`
  - 16 `tubLoads(hold, n)`
- **30** packing a tub: where each fish lies (Jonas: «fisken gradvis fyller karret opp og ser realistisk ut, uten clipping»)
  - 47 `karIn(dims, y)`
  - 50 `inRR(x, z, hx, hz, r, g)`
  - 53 `fishCorners(x, z, yaw, L, b)`
  - 56 `fishFits(dims, x, y, z, yaw, L, b)`
  - 59 `tubPack(dims, spec, seed)`
  - 92 `karRefund()`

## `src/js/core/07-harbours.js` (719 linjer)

harbours: quays, berths and mooring

- **1** harbours: quays, berths and mooring
  - 27 `unitsAt(x, z)`
  - 32 `unitDredge(p, d)`
  - 42 `quayFace(pid, kind)`
- **73** the NPC boats' berths at the quays of the map data (part 4 of the coast-wide plan; the user's wish 03.10.2026: the quays made
  - 98 `siteWhy(type, pid, naust)`
  - 117 `sitePockE(s, x, z)`
  - 128 `siteOut(s)`
  - 138 `siteDredge(p, d)`
- **145** L1 (01.11.2026; Jonas: «Båtene skal benytte seg av de ekte kaiene vi har laget modeller av og som vi har plassert rundt om i
  - 153 `quayReal(f)`
  - 168 `faceReserved(f)`
  - 182 `quayFree(f)`
  - 200 `quayOut(f, a, L, all, wet)`
  - 220 `hullDry(p, hd, L, B)`
  - 225 `npcBerths(group, p, boats, R = 0.6)`
  - 265 `apprClr(q)`
  - 266 `clearLine(a, b)`
  - 269 `quayLand(q)`
  - 270 `quayLandLine(a, b)`
  - 277 `quayLandLeg(a, b)`
  - 291 `approachPath(pt)`
  - 348 `exitWps(pt, to)`
  - 349 `entryWps(pt, from)`
  - 364 `berthPose(pid, type, kind = 'main')`
- **398** the way in to a berth and out of it (the user's list 04.10.2026: «legge til og fra kai uten å gå gjennom landmasse og
  - 404 `berthBlocked(p, m = 2, bk = 0)`
  - 413 `berthClear(a, b, m, bk = 0)`
  - 416 `berthPath(from, bp, mm)`
- **444** landing the catch
  - 467 `landFreeze()`
  - 473 `landPlan(type, kg, hold)`
  - 492 `landState(L, t)`
  - 501 `mottakOpen(H)`
  - 503 `mottakNext(H)`
  - 507 `mottakWhen(H, no, from)`
- **513** The queue at the plant (docs/planer/etter-tonys-test.md K1–K4, K6; Jonas 07.11.2026, V2 A and V3 A)
  - 524 `landSlots(pt)`
  - 525 `landQueueOn()`
  - 527 `landQueueAsk(force)`
  - 547 `landQueueGo()`
  - 554 `landQueueEnd()`
  - 560 `landLook(pts)`
  - 566 `startLanding(ops)`
  - 580 `landStart(pt, lp, kg, ops)`
  - 592 `finishLanding()`
  - 601 `iceChute(kg)`
- **603** the bunker quay: moving along the harbour and filling fuel
  - 616 `quayPos(b)`
  - 631 `portBusy(b)`
  - 632 `startShift(to, after)`
  - 642 `startFueling(ops)`
  - 655 `quayMinute()`
  - 672 `buyIce(kg, free)`
- **682** the tackle shop on the quay, in every harbour: hand jig, ice and halibut gear
  - 688 `shopBuy(k, kg, free)`

## `src/js/core/07c-naust.js` (241 linjer)

Father's naust by the home harbour, and the shop on the Finnsnes quay: where the 3D view sets them (05.10.2026)

- **1** Father's naust by the home harbour, and the shop on the Finnsnes quay: where the 3D view sets them (05.10.2026)
  - 17 `shoreSpot(cx, cz, r0, r1, o)`
  - 51 `naustClash(x, z, ux, uz, nx, nz, withBld)`
  - 69 `naustVecOk(cx, cz)`
  - 89 `naustWay(from, pid, lim = SITE_DRAFT + LEIA.minOver, site = null)`
  - 127 `naustFind(pid)`
  - 144 `naustWayOk(n, pid)`
  - 146 `naustSite()`
  - 172 `naustFace(pid)`
  - 185 `shopNearFind(n)`
  - 191 `shopNear()`
  - 199 `naustTarget(pt, r)`
  - 206 `shopSite()`
- **210** the naust as a home (05.10.2026; Jonas chose it from the list, 4): set it to rights step by step
  - 225 `naustRest(b)`
  - 227 `naustWhy(k)`
  - 235 `naustBuy(k)`

## `src/js/core/07d-rorbu.js` (95 linjer)

the rorbuer along the coast: a cheap bed ashore and a quay to lie at (05.10.2026)

- **1** the rorbuer along the coast: a cheap bed ashore and a quay to lie at (05.10.2026)
  - 31 `rorbuIn(x0, y0, x1, y1)`
  - 40 `rorbuSite(R)`
  - 65 `rorbuFace(pid)`
  - 73 `rorbuTarget(pt, r)`
  - 87 `rorbuSoon(p, r)`

## `src/js/core/07e-havn.js` (278 linjer)

A berth in the coast's harbours for the player's boats (Jonas 23.10.2026: «Båten burde som oftest ligge til en skikkelig kai

- **1** A berth in the coast's harbours for the player's boats (Jonas 23.10.2026: «Båten burde som oftest ligge til en skikkelig kai
  - 25 `isBerth(id)`
  - 27 `havnStore()`
  - 28 `havnPlace(id)`
  - 43 `havnTown(p)`
  - 55 `havnSide(p, T, force)`
  - 59 `havnName(p, side)`
  - 64 `havnLocal(t, hi)`
  - 80 `havnsNear(p, r)`
  - 91 `havnNm(H)`
  - 100 `havnTaken(H, vid)`
  - 114 `havnSlabs(cx, cz, R)`
  - 119 `havnOnSlab(S0, x, z)`
  - 125 `havnHullFree(p, hd, L, B, d, others, piers, slabs)`
  - 141 `havnBerths(H, type, vid, n)`
  - 180 `havnMoor(h)`
  - 183 `havnPlaceOf(H, b, type)`
  - 193 `havnPrune(keep)`
  - 200 `havnFace(pid)`
  - 202 `havnFind(p, r, type)`
  - 208 `havnTapNear(pt, r)`
  - 214 `havnOptions(p, r, type)`
- **219** held: the berth is the vessel's while she lies there, or while it is her plan's home (06g-plan2.js o.home)
  - 220 `havnHold(id)`
  - 224 `havnFree(id)`
  - 232 `havnMinute()`
  - 240 `havnBlocked(x, z, r)`
- **245** the server (D: «Serveren holder rede på hvem som ligger hvor»): what the others hold in a harbour, asked at most every two minutes;
  - 248 `havnCloud()`
  - 249 `havnAsk(hid)`
  - 258 `havnPut(id, s)`
  - 266 `havnRenew()`
  - 267 `havnDrop(id)`
  - 268 `havnMoved(id)`

## `src/js/core/08-lore.js` (67 linjer)

the old ways at sea: superstition as lore

- **1** the old ways at sea: superstition as lore
  - 21 `loreTeller()`
  - 23 `hearLore(id, from, no, en)`
  - 31 `loreDepart()`
  - 38 `loreTurnBack()`
  - 39 `loreWater()`
  - 40 `loreRename(nm)`
  - 41 `loreNewBoat(nm)`
  - 43 `loreHour()`
  - 55 `lorePub()`

## `src/js/core/09-tattoos.js` (43 linjer)

sailors' tattoos: rewards that come by themselves

- **1** sailors' tattoos: rewards that come by themselves
  - 20 `tatCounts()`
  - 28 `tatAdd(k, n)`
  - 29 `tatTripStart()`
  - 30 `tatTripEnd(pid)`
  - 36 `tatLanding(pid)`
  - 38 `checkTattoos()`

## `src/js/core/09b-records.js` (42 linjer)

Personal records: the biggest fish you have landed of each species (Jonas 09.10.2026: «Nå kjører vi kun på største fisk man har

- **1** Personal records: the biggest fish you have landed of each species (Jonas 09.10.2026: «Nå kjører vi kun på største fisk man har
  - 9 `recState()`
  - 19 `recPlace(p)`
  - 20 `recCatch(sp, kg, how)`

## `src/js/core/09c-seasons.js` (161 linjer)

the seasons as events (05.10.2026; Jonas chose it from the list of what makes people play on, 5)

- **1** the seasons as events (05.10.2026; Jonas chose it from the list of what makes people play on, 5)
- **41** the seasons as shared events (30.10.2026; docs/forslag.md A2, point 7 of docs/research/oppdrag-gap-analyse.md)
  - 66 `evIn(e, p)`
  - 69 `evAt(H, port, sps)`
  - 74 `evClose(e, y, top)`
  - 84 `seasonNow(H)`
  - 90 `seasonNext(H, n = 8)`
  - 100 `festDays(y)`
  - 106 `festField(y)`
  - 110 `festCatch(sp, kg)`
  - 116 `festBoard(y)`
  - 123 `seasonDay(H)`
  - 142 `seasonNews(day)`
  - 151 `seasonTalk(H)`
  - 153 `seasonGrid()`

## `src/js/core/09d-folk.js` (164 linjer)

the people on the quay (05.10.2026; Jonas chose it from the list of what makes people play on, 7)

- **1** the people on the quay (05.10.2026; Jonas chose it from the list of what makes people play on, 7)
  - 25 `folkState()`
  - 37 `folkPf(id)`
  - 39 `folkSold(id, kg)`
- **47** the plant's hands comment on the landing (Jonas 08.10.2026: «arbeiderne på fiskemottakene kommenterer fangsten vår med tekst over
  - 109 `plantLine(pt, ls, rnd)`
  - 131 `plantSay(pt, ls)`
  - 141 `folkShop()`
  - 148 `folkPort(H)`

## `src/js/core/09e-fartstid.js` (112 linjer)

Fartstid: years at sea, 0 to 40 (Jonas 07.10.2026; docs/engasjement.md, arbeidslista 1)

- **1** Fartstid: years at sea, 0 to 40 (Jonas 07.10.2026; docs/engasjement.md, arbeidslista 1)
  - 15 `fsNeed(n)`
  - 17 `fsOf(p)`
  - 23 `fsSeed()`
  - 27 `fsState()`
  - 28 `fsText(p, long)`
  - 32 `fsAdd(pts, aboard)`
  - 40 `fsYear(y)`
  - 49 `fsMinute()`
  - 56 `fsLand(total)`
  - 58 `fsRested(realMs)`
- **60** Your own skills (RANK1-a, docs/planer/rank1.md, Jonas 16.11.2026: «siden litt av storyen i spillet er at man arver en båt, så må
  - 77 `fsSkills()`
  - 92 `fsLearn(k, m = 1)`
  - 102 `fsSkillMinute(st)`
  - 107 `fsYearSkills(y)`
  - 110 `fsLvlText(p)`
  - 111 `fsXp(p)`

## `src/js/core/09f-merker.js` (231 linjer)

Merker: «Første uke på sjøen» and the long badges (Jonas 07.10.2026; docs/engasjement.md, arbeidslista 1.5 and 3)

- **1** Merker: «Første uke på sjøen» and the long badges (Jonas 07.10.2026; docs/engasjement.md, arbeidslista 1.5 and 3)
  - 25 `achVisits()`
  - 26 `achVisitPort(pid)`
  - 96 `achState()`
  - 112 `achAdd(k, n)`
  - 113 `achSale(total, sps)`
  - 114 `achCatch(sp, cls)`
  - 116 `achMinute()`
  - 127 `achTripEnd(bad)`
- **132** the gifts: what fits the player now, in three tiers (seven in ten common, two good, one rare), bigger in later chapters
  - 134 `achPool(scale)`
  - 158 `achDraw(key, scale)`
  - 166 `achGive(key, scale, title)`
- **175** checking: each milestone in an open chapter, the chapters' own rewards, and the long badges
  - 177 `achCheck(quiet)`
  - 205 `achChapter(ch)`
  - 218 `achSeed()`
- **229** the first tow and the first repair are free (core/05-vessels.js rescue, hullRepair)
  - 230 `freeFirst(k)`

## `src/js/core/09g-turer.js` (1038 linjer)

Turoppdrag: missions from where the boat is (07.10.2026; docs/engasjement.md point 4)

- **1** Turoppdrag: missions from where the boat is (07.10.2026; docs/engasjement.md point 4)
  - 84 `turState()`
  - 90 `turRebase(T)`
  - 104 `turV()`
  - 105 `turRange()`
  - 110 `turCap()`
  - 114 `turOwn()`
  - 125 `turRate()`
  - 127 `turWeek()`
  - 131 `turSlow()`
  - 133 `turFinal(m)`
  - 135 `turSpOk(sp)`
  - 139 `turForm()`
  - 141 `turClass(hGame)`
  - 146 `turFishH(kg, sp)`
  - 162 `turCan(a, b, hGame, back, fc = true)`
- **172** the quotas: what is left to land of a species (kg; Infinity where nothing limits it)
  - 178 `turRoom(sp, H)`
- **186** the offers
  - 187 `turPlants()`
  - 192 `turMe()`
  - 198 `turOrder(cand, me)`
  - 200 `turBest(o, cls, used, me = turMe()`
  - 207 `turBestAt(o, q, h, cls, me)`
  - 223 `turFrakt(o, cls, used, me = turMe()`
- **239** something happens under way
  - 242 `turEventRoll(m)`
  - 248 `turTipAt(m)`
  - 255 `turEventFire(m, b)`
- **274** the search: where does the species stand
  - 277 `turLeteSamples(c, sp, H)`
  - 285 `turLeteQs(c, sp, samples)`
  - 302 `turLete(o, cls, me = turMe()`
  - 324 `turLeteMinute(m, b)`
  - 337 `turLetePlace(p)`
  - 345 `turLeteAnswer(id, qi, opt)`
- **362** the people: who sends a mission, and what they remember
  - 367 `turManagerSays(m, n)`
  - 377 `turAsk(T = turState()`
- **391** the chain: three links for a manager who knows the boat (docs/planer/oppdrag-2.md K1, Jonas 30.10.2026 «Ja»)
  - 401 `turChainNext(prev)`
  - 422 `turChainEnd(m, ok)`
- **431** the first mission
  - 434 `turFirst(o)`
  - 449 `turFirstEnsure(T = turState()`
  - 460 `turGarn(o)`
  - 478 `turValue(L)`
  - 485 `turSlep(o, cls, fix = null)`
  - 507 `turSos(Q)`
  - 531 `turNpcs()`
  - 544 `turMinute()`
  - 573 `turStuck(T, b)`
  - 582 `turProveMinute(m, b)`
  - 606 `turSesong(o)`
  - 627 `turStages(m)`
  - 634 `turSesongStage(m)`
- **647** survey fishing for Havforskningsinstituttet
  - 654 `turProve(o, cls, fix = null)`
  - 684 `turProveFish(m)`
  - 697 `turProveDone(m)`
  - 704 `turEkkoSaw(m)`
- **712** a picture of a lighthouse for Kystposten
  - 722 `turLysNext(m, from)`
  - 725 `turFoto(o, cls, near = null, fix = null)`
  - 748 `turFotoAt()`
  - 751 `turFotoTake(m, seen, img)`
  - 771 `turMake()`
  - 797 `turEnsure(force)`
  - 818 `turWay()`
  - 825 `turDetour(m, way = turWay()`
- **837** taking, doing and finishing
  - 838 `turTake(id)`
  - 866 `turDrop(id)`
  - 871 `cargoJob(kg, no, en, out)`
  - 872 `turLoad(m)`
  - 881 `turSpawn(m)`
  - 900 `turEnd(m, ok, why, how)`
  - 919 `turPayOut(m, from, no, en, part)`
  - 928 `turDock(pid)`
  - 945 `turSale(pid, bySp)`
  - 958 `turHauled(s)`
  - 962 `turHour()`
  - 981 `turWhat(m)`
- **993** the trip as it starts: when it will be there, and a word from the crew (or the memory of Father, alone aboard)
  - 1007 `turSay(who, no, en, k)`
  - 1012 `turDepart()`
  - 1032 `turMechanic()`

## `src/js/core/09h-press.js` (262 linjer)

Kystposten: the coast's paper (07.10.2026)

- **1** Kystposten: the coast's paper (07.10.2026)
  - 23 `pressState()`
  - 26 `pressPut(kind, d, loc)`
- **37** the words
  - 41 `pressWho(it)`
  - 47 `pressStory(it)`
  - 141 `pressTop()`
  - 153 `pressBygde()`
  - 166 `pressLand(local)`
- **176** «Kvoteprisen denne uka» (KM5, steg 64): once a game week on the front page, the quota price (kpkAt in 03d-quota.js, the same
  - 179 `pressKvote()`
- **195** the market: a record price, the highest in a year (Jonas 07.10.2026: «Ta rekordpriser»)
  - 200 `pressIx(sp, d)`
  - 201 `pressHigh(sp, d)`
  - 202 `pressRecords(d)`
  - 203 `pressPrice(sp, d)`
  - 218 `pressDay(H)`
- **222** the year's first skrei: the first cod landing north of Stad (62° N) after the skrei season begins (09c-seasons.js), from the
  - 224 `pressSkreiH(y)`
  - 226 `pressSkrei()`
  - 237 `pressList(local)`
  - 260 `pressUnread()`
  - 261 `pressSeen()`

## `src/js/core/09i-look.js` (116 linjer)

looks: how the people of the game look (Jonas 10.10.2026: character customisation, and the crew in the same clothes so nobody looks alike)

- **1** looks: how the people of the game look (Jonas 10.10.2026: character customisation, and the crew in the same clothes so nobody looks alike)
  - 31 `lookDefault()`
  - 33 `lookClean(l)`
  - 45 `lookKit(l)`
- **56** the crew's looks: drawn from the id, by age and sex
  - 57 `lookHash(s)`
  - 58 `lookRng(seed)`
  - 59 `lookPick(r, pairs)`
  - 61 `lookFromSeed(seed, sex, age, job)`
  - 81 `lookAllCrew()`
  - 83 `lookOf(c)`
  - 98 `leadAboard()`
  - 104 `lookQuay(id, i)`
  - 111 `lookFromKey(s)`

## `src/js/core/09j-kystvakt.js` (352 linjer)

Kystvakta: the inspection at the quay or on the field (Oppdrag 2 V1, 30.10.2026; docs/planer/oppdrag-2.md, docs/systemer/kvoter-og-regler.md 5.30)

- **1** Kystvakta: the inspection at the quay or on the field (Oppdrag 2 V1, 30.10.2026; docs/planer/oppdrag-2.md, docs/systemer/kvoter-og-regler.md 5.30)
- **18** the check at sea aboard an ocean vessel (H2e of docs/planer/havsteget-h2-autoline.md, 06.11.2026): the inspectors come over by the
  - 27 `kvRib(min)`
  - 36 `kvSampleFish(g, sp, w, p)`
  - 40 `kvHaulKeep(g, s)`
  - 49 `kvMix(ms, p, gear, most)`
  - 66 `kvAlong(a, b)`
  - 72 `kvMarks(s)`
  - 73 `kvHavCheck(b, sets, H, len, add, most)`
- **112** (H3e of docs/planer/havsteget-h3-snokrabbe.md, 10.11.2026) the check at sea aboard the snow crab vessel. Beside the position along
  - 126 `kvSnoCheck(b, ss, H, add)`
  - 163 `kvState()`
  - 166 `kvReady()`
  - 176 `kvHour()`
  - 184 `kvArrive()`
  - 197 `kvOff(bB, sh, where)`
  - 205 `kvPose(b)`
  - 225 `kvSide(b)`
  - 226 `kvMinute()`
  - 235 `kvNpcs()`
  - 239 `kvSums(sets, inside)`
  - 241 `kvMostSp(sets)`
  - 246 `kvCheck(b)`
  - 288 `kvWhat(r)`
  - 300 `kvWhatHav(r)`
  - 314 `kvWhatSno(r)`
  - 333 `kvFinish()`

## `src/js/core/10-gear.js` (957 linjer)

passive gear: nets, line and pots that stand in the sea while the boat is away

- **1** passive gear: nets, line and pots that stand in the sea while the boat is away
  - 23 `autoL(pg)`
  - 35 `autoRoom()`
  - 105 `kingArea(p)`
  - 111 `newPGear()`
- **112** bait (the user's list 04.10.2026): five kinds, each good for its own. Krabbe is the cheapest and fair on everything; reke is for
  - 137 `jigTake(sp, H, tackle)`
  - 142 `baitMixF(w, sp)`
  - 144 `baitOf(pg)`
  - 146 `btOf(L0)`
  - 148 `baitPick(pg, kg)`
  - 150 `baitFromHold(sp, kg)`
  - 163 `setLog(s, no, en, k)`
  - 164 `mySets(vid)`
  - 167 `hasHauler(kind)`
  - 172 `haulerX(kind, eq = S.equip, type)`
  - 173 `setterX(kind, eq = S.equip, type)`
- **178** the rig: a boat is rigged for one kind of fishing at a time. Jigging needs a hand jig or reels; line and pots
  - 184 `rigGuess()`
  - 190 `rigOf()`
  - 199 `gearReserve()`
  - 206 `handGear(kind, type = S.boat && S.boat.type)`
  - 209 `rigNoRoom(kind, type = S.boat && S.boat.type)`
  - 210 `rigHas(r)`
  - 213 `rigWrong(kind)`
  - 215 `haulerNoFit(kind)`
  - 225 `rigBlock(r)`
  - 237 `rigSet(r)`
- **239** what the vessel owns: aboard, ashore (baiting, mending) and in the sea
  - 240 `ownedUnits(kind)`
  - 247 `gearRoom(kind)`
- **249** buying (in port)
  - 252 `buyGate(what, spec, lv)`
  - 276 `tierGate(k, lv)`
  - 297 `jigTierBack(type, n0, lv)`
  - 304 `tierBuy(k, lv)`
  - 314 `buyGear(what, spec, n)`
  - 349 `joinNets(id1, id2)`
  - 350 `splitNets(id, n)`
- **352** rules for setting at a place
  - 354 `segDist(p, a, b)`
  - 355 `nearSet(p, km)`
  - 356 `gearRules(kind, spec, p)`
  - 390 `setGeom(p, hdg, km)`
  - 397 `setGeomExact(p, hdg, km)`
- **399** the work at sea: status stays 'fishing' with b.gop, so deck work, rest rules, auto-return and the tub pause work as before
  - 400 `gopUnitMin(g, H, hs)`
  - 425 `startSet(kind, spec, fishAfter, hdg)`
  - 448 `startHaul(sid, reset, fishAfter)`
  - 467 `endLines(op, kind, d)`
  - 470 `thiefOf(s)`
  - 480 `haulSlow(g)`
  - 485 `gearOpMinute(H, W, hs)`
  - 510 `finishSet(g, H)`
  - 522 `gopEnd(g)`
  - 524 `gopAfter(b = S.boat)`
  - 528 `gearUnset(s, n)`
  - 538 `gopAbort(why)`
  - 558 `gearBack(s, n, cond, W)`
  - 565 `wearNets(s, g)`
  - 574 `haulUnit(g, H, SL)`
  - 592 `landFish(sp, kg, key, mesh, p, H, hook, fresh, g)`
  - 608 `netLen(w)`
  - 609 `retain(sp, key, mesh, w)`
  - 616 `sampleSel(sp, key, mesh, p, H)`
  - 619 `landCrabs(g, n, kg)`
  - 630 `finishHaul(g, H)`
- **670** a station on a route or the standing plan: haul what stands here and set it again, or set new gear if nothing stands here.
  - 673 `cycleSpec(kind, want, n)`
  - 687 `gearCycle(w, fishAfter)`
  - 705 `opsGearNeeds(o)`
  - 715 `opsGearAfter()`
- **721** in the sea, every hour: catch, losses, weather and deadlines (company level)
  - 722 `soakHour(s, H)`
  - 769 `potsOver(type = S.boat && S.boat.type, pg = S.pgear, sets = mySets()`
  - 772 `potsUnfit()`
  - 794 `gearHour(H)`
  - 832 `reportLost(sid)`
  - 840 `netMended(l)`
- **841** in port: baiting at the shed or by the crew, mending by the crew or at the net loft in Finnsnes
  - 847 `egnOrder(lk, n, bait)`
  - 861 `egnHands()`
  - 870 `egnSelf(lk, n, bait)`
  - 891 `stripSelf(lk, bait, n, then)`
  - 905 `mendSelf(nid)`
  - 916 `botOrder(nid)`
  - 927 `gearJob(j)`
  - 939 `gearJobCancel(j)`
  - 946 `shoreTick()`

## `src/js/core/10b-gearcare.js` (274 linjer)

gear care: wear, mending, hooks, jig tackle, and the tackle shop's service and buy-back (Jonas 08.10.2026)

- **1** gear care: wear, mending, hooks, jig tackle, and the tackle shop's service and buy-back (Jonas 08.10.2026)
  - 22 `careInit(pg)`
  - 34 `careHands(g)`
- **36** the catch factors of worn gear
  - 39 `jigKind()`
  - 40 `jigQ()`
  - 42 `jigWear()`
  - 44 `jigKr(k)`
  - 47 `jigSetsKr(pg = S.pgear, b = S.boat)`
- **50** wear in one haul (what the string looks like when it comes back): used by finishHaul and a stopped haul
  - 51 `wearOf(s, g)`
  - 66 `careBack(s, n, W)`
- **75** buying (the tackle shop): hooks in packs and spare jig sets
  - 76 `careBuy(what, spec, n)`
- **89** the autoline's hooks changed aboard (H2b of docs/planer/havsteget-h2-autoline.md, 05.11.2026; HI report 2024-11: about 5 % of the
  - 97 `autoFixHour()`
  - 101 `autoFixSpend()`
- **114** the crew's work in port (and the shop's, in half the time for a fee): hooks, line, pots, jig tackle, nets
  - 115 `hooksNeed(lk)`
  - 120 `seaWork()`
  - 124 `careWhy()`
  - 125 `careShopWhy()`
  - 128 `careQuote(what, key, shop)`
  - 141 `careGate(shop)`
  - 143 `careQueue(j, fee)`
  - 144 `hooksJob(lk, shop)`
  - 154 `lineFix(lk, shop)`
  - 162 `potFix(shop)`
  - 171 `netShop(nid)`
  - 181 `jigJob(k)`
  - 189 `jigChoose(k)`
  - 191 `careJobDone(j)`
  - 200 `careJobCancel(j)`
- **208** the shop buys gear back: a quarter of the new price times the condition (never above it)
  - 209 `sellValue(what, key, n)`
  - 220 `sellGear(what, key, n)`
- **234** upkeep by the crew when the boat lies in port with nothing else to do: once an hour, one job at a time, from what is in the store
  - 236 `careTick()`
- **259** what the crew says about the gear (Jonas 09.10.2026: «Tidvis kan mannskapet komme med kommentarer tilknyttet dette som feks å kommentere
  - 262 `gearTalk()`

## `src/js/core/10c-pick.js` (62 linjer)

Bestilt til henting (M2 in docs/planer/butikker-og-sponsorer.md, 10.2b, V12 A; Jonas 30.10.2026)

- **1** Bestilt til henting (M2 in docs/planer/butikker-og-sponsorer.md, 10.2b, V12 A; Jonas 30.10.2026)
  - 11 `pickState()`
  - 13 `pickKr(o)`
  - 28 `pickName(o)`
  - 46 `pickAdd(port, w, k, s, n)`
  - 59 `pickDrop(id)`

## `src/js/core/10d-snokrabbe.js` (192 linjer)

the snow crab (H3a of docs/planer/havsteget-h3-snokrabbe.md, 06.11.2026)

- **1** the snow crab (H3a of docs/planer/havsteget-h3-snokrabbe.md, 06.11.2026)
- **59** the drift ice over the strings (H3c, V3 B; Jonas 06.11.2026). Sources, read 06.11.2026 unless said: HI 2023-51 (Humborstad et al.):
  - 77 `snoIceOf(a, b, H)`
  - 80 `snoIceHour(s, H)`
  - 98 `snoField()`
  - 119 `snoArea(p, H)`
  - 128 `snoW(cw, soft)`
  - 129 `snoCrab(m)`
  - 138 `snoPts(s)`
  - 141 `snoSoak(s, H)`
  - 156 `landSno(g, n)`
  - 171 `snoHaulDone(g, s)`
  - 181 `snoSoftAt(p)`
  - 186 `snoTend(s, a, mid)`

## `src/js/core/10e-krabbefabrikk.js` (126 linjer)

the snow crab aboard: the factory for the clusters and the live crab in the tanks (H3b of docs/planer/havsteget-h3-snokrabbe.md,

- **1** the snow crab aboard: the factory for the clusters and the live crab in the tanks (H3b of docs/planer/havsteget-h3-snokrabbe.md,
  - 37 `snoUh(H)`
- **40** live or frozen, a choice for the trip (S.boat.snoMode: 'frys', the default, or 'lev'); only a vessel with tanks can go live
  - 43 `snoSetMode(m)`
- **49** the tanks
  - 61 `snoDayF(x, H, rho, T, flow)`
  - 64 `snoDeadLot(hr)`
  - 67 `snoTankHour(H)`
- **75** the stowing of a crab the sorting kept (landSno, 10d-snokrabbe.js): the dead to the freezer round, a live trip's crab into the
  - 77 `snoStow(c, k)`
- **85** the prices (kr/kg round weight). SNOP: the clusters (SPECIES pm) and the live crab (pmL) by month are the landing notes' (beløp for
  - 96 `snoPrice(port, x, H)`
- **101** the quota at a landing (landConf and sell, ui/08-actions.js): the live crab first on the extra quota (J-237-2025 § 4: «til
  - 104 `snoLandQ(H, q)`
- **110** the landing of the live crab: pumped from the tanks into tubs on deck and lifted ashore with the crane, KARLV.kg of crab a tub and a
- **114** the trip of a snow crab vessel (tripLeft, 04-crew.js): the bait for the pots at the trip's pace (a pot baited at each setting, half
  - 117 `snoTrip(R, b, d)`

## `src/js/core/09k-market.js` (372 linjer)

Kystmegleren: boat sales between players (B1–B8 in docs/planer/etter-tonys-test.md; Jonas 07.11.2026, V4 A, V5 A, V6 A)

- **1** Kystmegleren: boat sales between players (B1–B8 in docs/planer/etter-tonys-test.md; Jonas 07.11.2026, V4 A, V5 A, V6 A)
  - 14 `mktState()`
  - 21 `mbYardNear(pos)`
  - 23 `mbBounds(value)`
  - 24 `mbPriceWhy(value, start, buynow)`
  - 39 `mbLicSold(lic)`
  - 44 `mbValue(v)`
  - 45 `mbOpsOn(v)`
  - 48 `mbWhy(v)`
  - 62 `mbPack(v, yard)`
  - 72 `mbCond(P)`
  - 75 `mbUnpack(P, port)`
  - 93 `mbLock(v, r, o, yard)`
- **99** KM4 (docs/planer/kvotemarkedet.md kap. 4.4; Jonas 07.11.2026, V2 A: the seller chooses whether the right follows the boat, taking
  - 109 `mbMoveWhy(src, to, H)`
  - 125 `mbMoveLen(src, to, H)`
  - 135 `mbMove(src, to, H)`
  - 169 `mbBuyWhy(L, kr0)`
  - 178 `mbWishHits(list)`
- **180** the quick sale (B4): to the broker for 90 % of her value, at once, from anywhere she lies in port; the loans are paid first
  - 181 `mbQuickWhy(v)`
  - 185 `mbDrop(v)`
  - 192 `mbQuickSell(vid)`
- **202** the quota market in the save (KM3 of docs/planer/kvotemarkedet.md; the goods and the rules are core/03i-kvotemarked.js, the server
  - 206 `kmState()`
  - 211 `kmKey(src)`
  - 217 `kmSrcOf(key, item)`
  - 227 `kmPutWhy(src, H)`
  - 239 `kmLock(src, r, o, key)`
  - 246 `kmUnlock(key, lid)`
  - 256 `mbKm(r, d, k, M)`
- **300** the ledger (broker_pending): every krone bound, given back or paid, every boat handed over, applied once (S.mkt.mb.done keeps
  - 304 `mbApply(rows)`
- **352** delivery (10.2b «Få henne levert»): a skipper from the yard sails a boat of yours that nobody is aboard to the port you choose, for
  - 356 `mktDelWhy(v, to)`
  - 357 `mktDeliver(vid, to)`
  - 363 `mktHour(H)`

## `src/js/core/09l-sponsor.js` (72 linjer)

Sponsorer (M6 in docs/planer/butikker-og-sponsorer.md 4 and 5; CLAUDE.md: a real name, logo or product only with a written

- **1** Sponsorer (M6 in docs/planer/butikker-og-sponsorer.md 4 and 5; CLAUDE.md: a real name, logo or product only with a written
  - 9 `spSet(rows)`
  - 16 `spOf(kind, target)`
  - 18 `spSponsors()`
  - 20 `spUrl(site)`
- **21** a partner's paint design (M8 F5, steg 44 11.11.2026): a placement 'look' on 'paint' is a whole paint for the boat, free, marked
  - 29 `spPaintLiv(r, type)`
  - 48 `spWorn(L)`
  - 50 `spPaintIn(s)`
  - 56 `spPaintLogo(r)`

## `src/js/core/09m-kystkart.js` (38 linjer)

Kystkartet: the collection for the whole coast (docs/planer/oppdrag-2.md K2, docs/engasjement.md arbeidslista 7)

- **1** Kystkartet: the collection for the whole coast (docs/planer/oppdrag-2.md K2, docs/engasjement.md arbeidslista 7)
  - 9 `kkState()`
  - 18 `kkHomAt(p)`
  - 20 `kkFish(p)`
  - 21 `kkMarks(K)`
  - 23 `kkFyr(fi)`
  - 26 `kkPlantsHad()`
  - 31 `kkCount()`
  - 37 `kkMinute()`

## `src/js/core/09n-ukas.js` (41 linjer)

Ukas fangst: the Sunday card (docs/planer/oppdrag-2.md U1, docs/engasjement.md arbeidslista 6; Jonas 30.10.2026: «10. Ja.»)

- **1** Ukas fangst: the Sunday card (docs/planer/oppdrag-2.md U1, docs/engasjement.md arbeidslista 6; Jonas 30.10.2026: «10. Ja.»)
  - 10 `ukeState()`
  - 12 `ukeBig(sp, kg)`
  - 15 `ukeSum(w)`
  - 34 `ukeDue()`
  - 40 `ukeLast()`

## `src/js/core/09o-kapplop.js` (405 linjer)

Kappløpet Lindesnes–Nordkapp, the core (KL1, steg 116a; docs/planer/kapplop.md, Jonas 12.11.2026)

- **1** Kappløpet Lindesnes–Nordkapp, the core (KL1, steg 116a; docs/planer/kapplop.md, Jonas 12.11.2026)
  - 69 `lopState()`
  - 71 `lopCls(V)`
  - 80 `lopLastSun(y, m)`
  - 81 `lopOslo(ms)`
  - 84 `lopWeek(ms)`
  - 96 `lopMinH(nm, vmax, trim)`
  - 100 `lopVcap(type)`
  - 111 `lopLegEnd(r, pid, p)`
  - 113 `lopOutCap(o)`
  - 120 `lopLegPut(run, j)`
  - 132 `lopTime(run, now)`
  - 141 `lopOn(vid)`
  - 144 `lopCpOf(pid)`
  - 149 `lopWhyNot()`
  - 158 `lopStart()`
  - 169 `lopEnd(how)`
  - 193 `lopHm(min)`
  - 196 `lopDepart()`
  - 205 `lopDock(pid)`
  - 224 `lopCross(a, c, vmax)`
  - 229 `lopSosNow()`
  - 245 `lopSosEnd(r, t, p)`
  - 255 `lopMinute()`
  - 291 `lopTick()`
- **299** the tasks on the way (KL1b, steg 116b; kapplop.md «Oppgavene underveis (x-faktoren)», V5 B)
  - 311 `lopSurp(j, cls, wk)`
  - 313 `lopKind(spec, V)`
  - 319 `lopLys(m, H, hTot)`
  - 325 `lopLysDrop(m, say = true)`
  - 328 `lopTaskWhat(m)`
  - 338 `lopTasks()`
  - 340 `lopMake(run, j, role, spec)`
  - 363 `lopLegTasks(run, j)`
  - 377 `lopLoad(m)`
  - 379 `lopTaskEnd(m, ok, how)`
  - 399 `lopLegClose(r, j)`

## `src/js/core/11-route.js` (755 linjer)

---------- Autonav (once «Følg leia»): a route along the fairway ----------

- **1** Autonav (once «Følg leia»): a route along the fairway
  - 39 `leiaTideCredit(a, b)`
  - 53 `leiaIceSet(a, b)`
  - 61 `leiaIceLeg(p, q)`
  - 75 `legLandIn(p, q, L, s0, s1)`
  - 79 `legNearPt(pt, z)`
  - 91 `legRunsWalk(W, ms)`
  - 102 `legRunsW(p, q, z)`
  - 104 `legRuns(p, q, z)`
  - 110 `legRunsAsync(p, q, z)`
  - 116 `legIdx(runs, L, n, last)`
  - 126 `leiaGrid(x0, y0, x1, y1, c, mask)`
  - 133 `leiaRocks(G)`
  - 142 `leiaShore(G, p)`
  - 152 `leiaCost(G, v, sd)`
  - 170 `leiaNearCell(G, p, sd, km = 1, free)`
  - 177 `leiaHeap()`
  - 185 `leiaSlice(st, t0, at)`
  - 188 `leiaSearch(G, s, t, sd, st)`
  - 219 `leiaFind(from, to, sd, st)`
  - 233 `leiaFind1(from, to, sd, st, pad, c0)`
  - 286 `leiaCorridor(pp, R, c, sd, st)`
  - 302 `leiaCorridor1(pp, bb, R, c, sd, st, first, last)`
  - 321 `leiaHarbourClr(pt, ports)`
  - 327 `leiaPortsBy(p, q)`
  - 331 `leiaLegOk(p, q, sd, margin)`
  - 358 `leiaLegOkL(p, q, sd, margin, tick)`
  - 366 `leiaLegFail(p, q, tick, endP, endQ, strict)`
  - 390 `rockOnLeg(a, b, r)`
  - 399 `leiaMend(P, sd, st, strict)`
  - 440 `leiaStraighten(P, sd, margin, st)`
  - 468 `leiaPull(P, sd, st)`
  - 502 `leiaRoute(a, b, aPort, bPort, opt)`
  - 557 `leiaLaneMend(a, wps, aPort, bPort)`
  - 579 `leiaSplit(a, b, aPort, bPort, opt, r0)`
  - 612 `leiaLane(p, goal, km)`
  - 643 `leiaPocket(p, sd)`
  - 660 `leiaPocketOut(e, sd, st)`
  - 670 `leiaRoute0(a, b, aPort, bPort, pocket, opt0)`

## `src/js/core/11b-obstacles.js` (310 linjer)

WHAT A ROUTE MUST NOT SAIL THROUGH (Jonas 05.10.2026: «autoruter aldri skal gå gjennom 3d elementer eller landmasse», along

- **1** WHAT A ROUTE MUST NOT SAIL THROUGH (Jonas 05.10.2026: «autoruter aldri skal gå gjennom 3d elementer eller landmasse», along
  - 27 `obsDetourAny(a, b)`
  - 30 `obsBridge(br)`
  - 62 `deckAt(L, x, z)`
  - 68 `obsIndex()`
  - 105 `obsDist(o, ax, az, bx, bz)`
  - 121 `obsCounts(o, air)`
  - 127 `obsSegHit(a, b, clr)`
  - 152 `obsRock(a, b)`
  - 158 `obsSafe(a, b, ref)`
  - 180 `obsWays(o, a, b)`
  - 231 `obsTurnable(a, w, b, pre)`
  - 241 `obsDetour(a, b, depth = 3, ref)`
  - 260 `obsRoute(a, wps, auto)`
  - 264 `obsRoute0(a, wps)`
  - 284 `obsLoad(pts, ms = 4000)`
  - 299 `obsSail(pl, b)`

## `src/js/core/11c-leinett.js` (155 linjer)

---------- The fairway network (step 2 of the coast-wide Autonav, 08.10.2026) ----------

- **1** The fairway network (step 2 of the coast-wide Autonav, 08.10.2026)
  - 26 `lnetNear(p, km, max)`
  - 32 `lnetAhead(p, q, km, max, skip)`
  - 38 `lnetPath(srcs, dsts)`
  - 53 `lnetLoad(P)`
  - 64 `lnetAccess(p, i, sd, st, straight)`
  - 84 `lnetDists(srcs)`
  - 90 `lnetExit(A, end, sd, st)`
  - 117 `lnetRoute(from, to, sd, st)`

## `src/js/core/12-heat.js` (128 linjer)

---------- the echo-sounder heat map: how much fish there is around the boat ----------

- **1** the echo-sounder heat map: how much fish there is around the boat
  - 15 `heatTier()`
  - 22 `heatSpecies()`
  - 35 `heatSample(p, H)`
  - 45 `heatValue(v, sp)`
- **47** a usual haul, for the catch marks and the plan
  - 57 `heatSoakShare(kind, T)`
  - 62 `heatRigFactor()`
  - 67 `heatReset()`
  - 70 `heatTick()`
  - 105 `heatWork()`
  - 124 `heatAt(p)`
  - 127 `schoolDrift(sp, p, H)`

## `src/js/core/13-work.js` (468 linjer)

work aboard: stations, and how the crew share them

- **1** work aboard: stations, and how the crew share them
  - 55 `catchGut(b)`
  - 60 `catchIce()`
- **61** the mate (Jonas 23.10.2026: «vi må kunne definere 1 fra mannskapet til å være styrmann ombord»): one of the crew, the same one
  - 64 `setMate(id)`
- **67** the skipper (Jonas 23.10.2026: «når jeg/brukeren ikke er ombord må det utnevnes en skipper og en styrmann ombord»): one of the crew,
  - 71 `actingSkipper()`
  - 72 `setSkipper(id)`
- **75** what a person is used to: minutes at each station (c.hab), fading by a fifth a month. The station with most of them, once it is
  - 78 `crewRole(c)`
  - 80 `habSeed(c)`
- **81** how good a person is at a station's work (1-5): you have the helm as the skipper, and at the rest the flat 3.2 from before
  - 85 `stSkill(c, k, ctx, sk)`
  - 103 `workScore(p, k, ctx, need, sk)`
  - 115 `restScore(p)`
  - 126 `workWhy(p, k, ctx, sk)`
  - 137 `stPlaces(st, ctx)`
  - 148 `workCtx(as)`
- **164** the crew's own jobs as stations: where they may be worked (in port, or at sea while she goes or lies still: seaWork), how many can
  - 166 `jobsOpen(as)`
  - 167 `jobPlaces(j)`
  - 178 `jobCoop(j, n)`
  - 182 `jobW(j)`
  - 188 `jobRate(j, A)`
  - 195 `jobMinute(j, A)`
  - 205 `jobWait(j)`
  - 210 `workAssign(as)`
- **307** the boat's own hands at the quay (OB4, 11.11.2026, docs/planer/om-bord.md F10, F11, F23; Jonas 09.11.2026: «at arbeidet ombord
  - 315 `quayRoles(P, ctx)`
- **328** the deck washed down, the packed lunch and the cold, as roles on those on a break (OB14, 11.11.2026, docs/planer/om-bord.md F12,
  - 342 `washMin()`
  - 344 `deckWash()`
  - 346 `lunchNow()`
  - 347 `deckRoles(P, ctx)`
  - 364 `deckDoing(p)`
- **366** what a person does on a break (Jonas 23.10.2026: «La det også stå hva de gjør når de ikke har en aktiv arbeidsoppgave som feks: lener
  - 382 `crewVice(c)`
  - 384 `idleEnv()`
  - 392 `idleWeights(p, ctx, E, mates)`
  - 415 `idleAssign(P, ctx)`
  - 429 `idleText(p)`
  - 437 `workDoing(p)`
  - 447 `workTeam(st, g, as)`
  - 454 `workMinute()`

## `src/js/core/14-crewlife.js` (741 linjer)

life aboard: learning, meals, the rest rule and what the crew says

- **1** life aboard: learning, meals, the rest rule and what the crew says
- **3** learning: an hour on a station trains that skill. The young, the eager and the content learn fastest, and it gets
  - 6 `ageLearn(a)`
  - 13 `stationSkill(st)`
  - 30 `learnHour(c)`
- **40** meals (Ø8b M3, Jonas 06.11.2026: «Frokost 06:30, Lunsj 12:30, Middag 18:30, Nattmat 00:30», and «Mannskapet står ikke nødvendigvis
  - 51 `mealState()`
  - 52 `foodScore()`
  - 55 `nextMealAt(t)`
  - 61 `mealDue()`
  - 64 `crewAsleep(p, A)`
  - 68 `mealAwake(A)`
  - 73 `cookPick(P)`
  - 78 `mealMinute(A)`
  - 97 `serveMeal(q, cook, me, dish)`
- **109** what the crew says: lines driven by the situation and by each person's ways. [no, en, trait the line suits]
  - 226 `dialectAt(p)`
  - 227 `dialectOf(c)`
  - 231 `dialectText(key, text)`
  - 235 `crewDialect(c, text)`
  - 265 `crewSay(c, sit, vars)`
  - 287 `vitalsTalk(on)`
  - 297 `sayHour(H, on, hs)`
- **317** advice from those who know (Jonas 23.10.2026: «de kan gjerne ta initiativ og komme med kommentarer knyttet til driften om de vet
  - 321 `crewAdvice(H, on, W, fs)`
  - 335 `adviceGround(H)`
- **348** mistakes on deck (Jonas 23.10.2026: «Ja, det kan de godt gjøre. Det skaper realisme»): now and then a fish slips over the side, the
  - 352 `crewRand()`
  - 357 `crewSlip(team)`
  - 377 `railLost(kg)`
  - 385 `railWeek(id = S.cur)`
- **387** Del 2 of «mannskap med liv» (docs/mannskap-plan.md; Jonas 17.10.2026): each person's life beside the work
  - 393 `crewLife(c)`
  - 404 `lifeStory(c, no, en)`
  - 406 `lifeEarn(c, sum)`
  - 408 `lifeOff(c, days, no, en, sno, sen)`
  - 410 `lifeDay(c, H)`
  - 426 `lifeInjury(c, hs)`
  - 429 `lifeOffTick(c)`
  - 432 `lifeDepart(c)`
  - 451 `alumniGround(a)`
  - 456 `alumniStates(H)`
  - 463 `lifeHail(H)`
- **470** the small errands (Oppdrag 2, punkt 2; steg 45a, 12.11.2026; docs/planer/oppdrag-2.md, 5.6 in docs/systemer/folk-om-bord.md)
  - 487 `errandLine(c)`
  - 497 `errandMay(c)`
  - 503 `errandPick(c, r = crewRand)`
  - 518 `errandAskText(c, E)`
  - 527 `errLapse(c, E)`
  - 531 `errandHour(H)`
  - 551 `errandAnswer(id, yes)`
  - 561 `errandDone(c)`
  - 571 `alumniReturn(B)`
- **580** the apprentice (Oppdrag 2, punkt 8; steg 45b, 12.11.2026; docs/planer/oppdrag-2.md, 5.6 in docs/systemer/folk-om-bord.md)
  - 622 `laerTaken(B)`
  - 627 `laerMake()`
  - 637 `laerBors(B)`
  - 645 `laerSign(c)`
  - 651 `laerSkill(k)`
  - 653 `laerStream(p, H)`
  - 659 `laerGale(p, H)`
  - 661 `laerSaw(c, H, prev)`
  - 668 `laerAsk(c, k)`
  - 675 `laerAnswer(id, i)`
  - 685 `laerHour(H)`
  - 698 `laerDone(c, boat, hp)`
- **703** The breaking sea and the slamming (Ø9 F7; Jonas 13.11.2026: «Bare varsel og skrekk»): the most seasoned hand aboard calls it, at
  - 720 `crewBrott(kind, side)`

## `src/js/core/14b-sikkerhet.js` (593 linjer)

Ø11.6: man overboard (SK2 the risk, SK3 the event; docs/planer/lover-regler-sikkerhet.md kap. 6, docs/systemer/sjofart-og-lover.md kap. 6)

- **1** Ø11.6: man overboard (SK2 the risk, SK3 the event; docs/planer/lover-regler-sikkerhet.md kap. 6, docs/systemer/sjofart-og-lover.md kap. 6)
- **48** pure: the sea, the rate, the time in the water, the sight
  - 50 `mobSeaX(W, hs, r)`
  - 52 `mobSeaF(x)`
  - 55 `mobIcing(T, W, sst)`
  - 57 `mobRate(w, o)`
  - 58 `mobLimMin(T)`
  - 59 `mobAbleMin(T)`
  - 62 `mobSightKm(o)`
  - 70 `mobLee(H, p, k)`
  - 78 `mobRnd(k)`
- **80** who is on deck (core/13-work.js workAssign, every call; the minute's own call, as undefined, is kept)
  - 82 `mobDeck(P, as)`
  - 88 `mobWeight(p)`
  - 97 `mobOnDeck()`
  - 102 `mobState(H, W, hs)`
- **109** when the game is open, on the boat she follows, and she can do something
  - 110 `mobLive()`
  - 112 `mobCan()`
- **119** the minute (core/05-vessels.js risk): the event going on, or the dice
  - 120 `mobRisk(W, hs)`
  - 137 `mobNear(q, on, o)`
  - 143 `mobRec(r)`
- **145** the rescue: the rescue boat from the nearest station, or the helicopter when it is there sooner
  - 146 `mobRescue(p)`
- **160** the fall
  - 161 `mobStart(q, on, o)`
  - 179 `mobVhf(M)`
- **189** where she is, and what is seen (live: at fraction f of the minute)
  - 190 `mobAt(f)`
  - 193 `mobAlong()`
  - 196 `mobSightOf(p, buoyOnly)`
  - 204 `mobSeen(pos)`
- **207** the player's actions (ui/10s-mob.js): the MOB mark, the lifebuoy, Autonav: MOB, the lift
  - 208 `mobMark(pos)`
  - 216 `mobThrow(pos)`
  - 224 `mobTarget()`
  - 233 `mobRoute()`
  - 254 `mobLiftOpts(pos, kn)`
  - 266 `mobLift(how, pos, kn)`
  - 281 `mobLiftHolds()`
- **287** the minute of the event
  - 288 `mobStep()`
  - 310 `mobAway()`
- **318** the end: who got her up, the sick leave (V8 A), the report after § 475 and § 47, the badge
  - 319 `mobEnd(out, how)`
  - 349 `withVesselId(vid, fn)`
  - 355 `mobReport(M, tIn, out, how, days)`
  - 362 `mobCrewHour()`
- **369** Ø11.7: the emergency stop, the near misses on the Sikkerhet card, distress near by (SK4, SK6, L8; docs/systemer/sjofart-og-lover.md kap. 7)
  - 380 `mobStop(g, W, hs)`
- **396** SK6 the near misses the log tells of: shallow water ahead that Autonav stopped for (core/05-vessels.js sailReplan, the net under
  - 400 `mobScan()`
  - 414 `mobSafeTrip(t0)`
  - 439 `mobSafeRows(max)`
- **464** L8 distress near by (sjøloven § 135 «Havsnød», kapittel 6 «Skipsføreren»; the text is read only in summary on Lovdata, kap. 2.2)
  - 479 `sosCan()`
  - 484 `sosMinute(W, hs)`
  - 493 `sosPlace(k)`
  - 502 `sosRadio(no, en)`
  - 504 `sosCall(k, p)`
  - 523 `sosStep(Q)`
  - 528 `sosSweep()`
  - 530 `sosOther(Q)`
  - 536 `sosDecline()`
  - 538 `sosAnswer()`
  - 552 `sosMobStart(Q, eta)`
  - 565 `sosMobEnd(M, out, how)`
  - 589 `sosNpc()`

## `src/js/core/15-energy.js` (189 linjer)

your own energy: a day at sea empties it, a night ashore fills it

- **1** your own energy: a day at sea empties it, a night ashore fills it
  - 14 `alarmAck()`
  - 39 `restRate(b)`
  - 45 `restStart()`
  - 59 `restEnd(quiet)`
  - 65 `restMinute()`
  - 80 `rorbuTip(p)`
  - 84 `restTip(b)`
- **94** Skippertak (Jonas 12.10.2026): an energy drink, for real money only (never for the game's kroner), in three sizes
  - 108 `fleetCrews()`
  - 111 `giveSkip(k, end, t0)`
  - 126 `energyMinute()`
  - 150 `fallAsleep(v, doze)`
  - 164 `wakeUp()`
  - 170 `wakeEarly(back)`
  - 182 `sleepDrift(H)`

## `src/js/core/16-helm.js` (74 linjer)

MANUAL HELM (the user's wish 03.10.2026)

- **1** MANUAL HELM (the user's wish 03.10.2026)
  - 11 `helmOn()`
  - 13 `simRate()`
  - 14 `helmCan()`
  - 16 `helmTake()`
  - 26 `helmOff()`
  - 29 `helmStep(dt)`
  - 36 `helmPose(frac)`
  - 45 `moorAll(p, r)`
  - 57 `helmMoorable()`
  - 61 `helmMoor()`
  - 63 `helmCast()`
  - 69 `helmCastDone(pid, kind)`

## `src/js/core/16b-dyn.js` (977 linjer)

HOW THE BOAT MOVES: a manoeuvring model (Fysikk 1; Jonas 18.10.2026)

- **1** HOW THE BOAT MOVES: a manoeuvring model (Fysikk 1; Jonas 18.10.2026)
  - 33 `dynHumpG(Fr)`
  - 35 `dynRes(P, u, capF = 1)`
  - 38 `dynPar(V)`
  - 65 `dynInt(P, s, thr, rud, h, capF, E)`
  - 107 `dynMove(s, h, E)`
- **113** the stream (Ø9 F8b, docs/planer/fysikk-4-sjo-og-skrog.md F8)
  - 123 `curSogF(C, hd, v)`
  - 132 `curLegH(a, w, vKn, H)`
  - 144 `dynSog(b = S.boat)`
  - 151 `sailSogF(b = S.boat)`
  - 172 `dynThrEq(P, u, capF)`
  - 174 `dynUeq(P)`
- **175** the calibration: measured on the model itself, once a vessel
  - 176 `dynTurn(P, V, u0 = V.vcruise * KN_MS)`
  - 187 `dynAccel(P)`
  - 193 `dynStops(P)`
  - 198 `dynCal(key, sx = 1)`
  - 217 `dynCalEng(base, sx, ck)`
  - 224 `dynCalOf(b = S.boat)`
  - 226 `dynCalRun(key, V, P, sx)`
  - 243 `dynStopDist(cal, v)`
  - 247 `dynVStop(cal, d)`
- **248** the wind and the sea on her this tick (Fysikk 2)
  - 261 `dynEnv(b, d, cal, H, dtG = 0)`
- **300** squat, the bank and the shallow water (Ø9 F5, docs/planer/fysikk-4-sjo-og-skrog.md; Barrass, Norrbin, Schlichting)
  - 306 `dynSquat(P, u, narrow)`
  - 313 `dynShallowF(P, h, v)`
  - 320 `dynWall(O, x, z, cap)`
  - 335 `dynBankF(P, d0, gl, h)`
  - 341 `dynBank(E, d, P, force)`
  - 347 `dynBankAt(E, d, P, k, force)`
  - 360 `keelClear(b = S.boat, H = S.t / 60)`
- **364** contact: the hull against the piers, the breakwaters and the harbour units' quays (Fysikk 2)
  - 373 `dynObsNear(X, Y, R)`
  - 380 `dynInside(O, x, z)`
  - 391 `dynContact(b, d, P, O)`
- **418** with no way on: she drifts (Fysikk 2)
  - 424 `dynDrift(type, p, H)`
  - 455 `lieHelmCan(why)`
  - 461 `lieTurn(type, hd, D, U)`
  - 472 `gearBuoyNear(p)`
  - 474 `gearLieCrew()`
  - 476 `gearWatch(b)`
  - 484 `lieDrift(H)`
- **530** the state, in step with the boat the rest of the game reads
  - 531 `dynState(b)`
  - 542 `dynWrite(b, d)`
  - 547 `dynCan()`
  - 553 `dynLive()`
  - 558 `dynPose()`
  - 567 `dynRest()`
  - 568 `dynLivePose(frac)`
  - 570 `dynHaltNeed()`
- **571** the tick
  - 572 `dynTick(dt)`
  - 585 `dynMinute(H, W)`
- **592** by hand (16-helm.js): the throttle and the rudder into the model
  - 593 `dynHelm(d, dtG)`
- **614** the line she follows: out from the quay, the route's waypoints as the chart plotter draws them, to the harbour she ends in
  - 616 `dynLineBuild(pl, dep)`
  - 680 `dynHandsPast(T, pl, L)`
  - 691 `dynHandsOn(pl)`
  - 693 `dynHands(T, k)`
  - 699 `dynTight(T, c)`
  - 713 `dynLineAt(T, s)`
  - 719 `dynSeg(T, s)`
  - 720 `dynSegHd(T, i)`
  - 721 `dynLineProj(T, x, z, s0, back = 30)`
  - 731 `dynLineHd(T, s, r0)`
  - 738 `dynGroundAhead(T, s, look)`
  - 754 `dynAvoid(d, P)`
- **780** the autopilot
  - 781 `dynAuto(d, dtG)`
  - 976 `dynTrackView()`

## `src/js/core/16c-hull.js` (207 linjer)

---- Fysikk 3: what the blows and the groundings do to the hull (Jonas 18.10.2026: «kollisjoner og grunnstøting skal få

- **1** Fysikk 3: what the blows and the groundings do to the hull (Jonas 18.10.2026: «kollisjoner og grunnstøting skal få
  - 21 `hullD(b = S.boat)`
  - 23 `hullOld(b = S.boat)`
  - 26 `hullSync(b = S.boat)`
  - 28 `hullLeak(b = S.boat)`
  - 35 `hullHit(kn, E, what, b = S.boat)`
  - 45 `hullSay(r)`
  - 52 `bedRock(p)`
  - 60 `hullGround(p, kn, b = S.boat)`
  - 69 `hullMinute()`
  - 92 `hullCost(b = S.boat, d = b.dmg || {})`
- **99** the hull insurance (kasko)
  - 104 `kaskoSign(b = S.boat)`
  - 110 `kaskoEnd(b = S.boat)`
  - 112 `kaskoHour()`
  - 118 `hullLeft(b = S.boat)`
  - 125 `hullBill(b = S.boat)`
  - 131 `hullOrder(auto, b = S.boat)`
  - 146 `hullMended(j, b = S.boat)`
- **153** The slamming in the minute step (Ø9 F7; Jonas 13.11.2026: «Bare varsel og skrekk»): repeated hard slams at speed make the crew
  - 167 `slamRate(b = S.boat, H = S.t / 60, hard = 1)`
  - 199 `slamMinute()`

## `src/js/ui/01-i18n.js` (120 linjer)

the logo (src/brand/logo.svg, the user's anchor of 03.11.2026), filled with currentColor: the sign-in's gate (ui/10f-cloud.js) and the

- **4** i18n
  - 117 `t(k, ...a)`

## `src/js/ui/02-format-state.js` (238 linjer)

---------- formatting ----------

- **1** formatting
  - 3 `dayKey(d)`
  - 4 `dayNum(k)`
  - 7 `holdFmt()`
  - 12 `fmt(n, d = 0)`
  - 13 `kr(n)`
  - 20 `cashFx(delta)`
  - 43 `realMin(gameMin)`
  - 44 `realDur(gameMin)`
  - 52 `inReal(gameMin)`
  - 54 `gameDur(gameMin)`
  - 57 `durBoth(gameMin)`
  - 59 `whenTxt(T)`
  - 60 `dur(h)`
  - 64 `hm(H)`
  - 65 `dayStr(H)`
  - 66 `clockStr(H)`
  - 67 `coordStr(p)`
  - 73 `dirName(deg)`
- **76** persistence
  - 88 `tabMark()`
  - 89 `tabMine()`
  - 95 `tabLose()`
  - 111 `saveJson(o)`
  - 129 `save()`
  - 132 `saveStoreKb()`
  - 135 `migrateV2(o)`
  - 147 `load()`
- **167** UI state
  - 178 `booting()`
  - 179 `loaderGone()`
  - 188 `toastPlace(el)`
  - 194 `toastClear()`
  - 198 `awayQuiet()`
  - 199 `toast(msg, ms)`
  - 216 `saveCode()`
  - 224 `codeRead(code)`
  - 232 `loadCode(code)`

## `src/js/ui/03a-chart.js` (226 linjer)

THE CHART'S VECTORS (phase K7 of the coast plan): the coast by level of detail, the graticule and the place names

- **1** THE CHART'S VECTORS (phase K7 of the coast plan): the coast by level of detail, the graticule and the place names
  - 12 `vReader(b)`
  - 21 `vecPath(v, sc, tol, keep)`
  - 41 `chartPath0(px, out)`
  - 55 `chartRings0(v)`
  - 66 `chartPath0In(out, box)`
  - 111 `vecPathsIn(v, sc, r)`
  - 123 `chartPathsIn(pk, r)`
  - 124 `chartPath(pk, lv, px)`
  - 127 `chartCoast(ctx, x0, y0, kx, ky, W, H, dpr, fish)`
  - 162 `fmtDM(v, pos, neg)`
  - 166 `chartGrid(ctx, x0, y0, kx, ky, W, H, dpr, fish)`
- **187** the place names
  - 190 `chartNamesOf(pk, entry, sc, ox, oy)`
  - 203 `chartNamesSvg(vx0, vy0, vx1, vy1, u, taken, part)`

## `src/js/ui/03-map.js` (922 linjer)

---------- map ----------

- **1** map
  - 2 `followChart()`
  - 11 `applyView()`
  - 24 `toMap(cx, cy)`
  - 26 `txt(p, s, cls, size, extra = '')`
  - 38 `placeOwnIds()`
  - 42 `placeOwn(p, ids)`
  - 44 `plotCol(d)`
  - 45 `cssRGB(name)`
- **46** chart painted at screen resolution for the current view (crisp at any zoom, like a real chart plotter)
  - 56 `chartView(scale)`
  - 62 `paintChart(scale)`
  - 77 `chartPan()`
  - 83 `chartWhole(V)`
  - 89 `chartCompose(V, tiles, budget)`
  - 123 `chartWork()`
  - 134 `chartFlush()`
  - 140 `chartTile(V, i, j, q)`
  - 156 `chartWant(V)`
  - 164 `chartPump()`
  - 174 `chartLoadLine()`
  - 180 `chartWarm(wps)`
  - 187 `chartWarmNext()`
  - 191 `chartCame(pk)`
  - 206 `ruLayerCanvas(A)`
  - 215 `chartVectors(V, again)`
  - 274 `chartRaster(d, PW, PH, x0, y0, pkx, pky, V, st)`
  - 281 `chartRasterJob(d, PW, PH, x0, y0, pkx, pky, V, st, scr)`
  - 404 `scheduleChart()`
  - 407 `renderBase()`
  - 421 `updateMapButtons()`
  - 437 `tapName(mp, rr)`
  - 456 `renderStatic()`
  - 564 `portIcon(p, s, u)`
  - 585 `anchorPath(x, y, s, u)`
  - 593 `soundingsSvg(vx0, vy0, vx1, vy1, u, taken)`
  - 612 `scheduleStatic()`
  - 617 `aisTrack(id, H)`
  - 622 `aisInfo(n)`
  - 641 `sjvChartSvg(u, bp)`
  - 651 `renderAisCard()`
  - 659 `curArrowsOf(q, u, H, lab, halo)`
  - 672 `curArrowsSvg(u)`
  - 690 `renderDyn()`
  - 779 `pinAdd(mp)`
  - 784 `pinOpen(id, fresh)`
  - 804 `pinKb()`
  - 835 `ptrUp(e)`
  - 865 `unzoom()`
  - 872 `portByLabel(pt)`
  - 877 `addWaypoint(pt)`

## `src/js/ui/03b-route.js` (329 linjer)

---------- the route editor: waypoint names, a timeline for the list, undo and redo, moving and inserting points ----------

- **1** the route editor: waypoint names, a timeline for the list, undo and redo, moving and inserting points
  - 6 `wpTag(w)`
  - 14 `draftTimeline()`
- **23** history: every change to the draft can be undone and redone, 100 steps per vessel; it is not saved
  - 26 `draftEdit(fn)`
  - 31 `draftUndo()`
  - 32 `draftRedo()`
  - 33 `draftForget(all)`
  - 36 `routeChanged()`
- **38** the floating undo and redo buttons over the zoom buttons on the chart
  - 40 `renderRouteTools()`
  - 58 `routePlayMode()`
  - 66 `routePause()`
  - 72 `routePlay()`
  - 77 `routeUndoRedo(redo)`
- **79** moving a point with a finger, and inserting one on a leg with its «+» handle
  - 84 `legEnds(i)`
  - 86 `insHandles()`
  - 91 `routeGrab(mp)`
  - 102 `routeDragMove(g, mp)`
  - 107 `routeDragCancel(g)`
  - 108 `routeDragEnd(g)`
  - 120 `routeFocus(i)`
  - 126 `mapToClient(p)`
- **128** «Autonav» (the button in the chart plotter, and the dock's Auto-nav): the next tap on the chart is where to go, and the route
  - 131 `leiaArm(on)`
  - 141 `draftWay(start, goal, aPort, gPort, atN, port, nt)`
  - 186 `leiaTo(pt, buoy, act)`
  - 243 `deepNear(p, maxKm)`
  - 253 `leiaStops()`
  - 258 `leiaCompare()`
- **275** the sea along the route (Ø8, 06.11.2026): the wave height on each leg at the minute the boat is there, as the local forecast gives it
  - 283 `draftSea(tl)`
  - 302 `routeSeaWatch()`
  - 307 `routeSeaDraw()`

## `src/js/ui/03g-planmap.js` (71 linjer)

The operations plan on the chart plotter (Driftsplan 3, DP3-3, 16.11.2026, docs/planer/driftsplan-3.md): «Velg sted i kartet» on

- **1** The operations plan on the chart plotter (Driftsplan 3, DP3-3, 16.11.2026, docs/planer/driftsplan-3.md): «Velg sted i kartet» on
- **43** the chart: a tap sets or moves the ring (03-map.js pointer handlers); nothing is dragged

## `src/js/ui/03c-heat.js` (133 linjer)

---------- the heat map on the chart plotter (cells: core/12-heat.js) ----------

- **1** the heat map on the chart plotter (cells: core/12-heat.js)
  - 29 `heatIndex(v, steps)`
  - 39 `heatImage()`
  - 59 `heatPaint(force)`
  - 83 `heatDrawInto(g, p, ox, oy, k, plain)`
- **88** the box with the instrument, its range, the species and the scale
  - 93 `heatReadout()`
  - 104 `heatBar(steps)`
  - 113 `heatBox(on)`

## `src/js/ui/03d-setmode.js` (92 linjer)

---------- «Sett ut»: draw the gear on the chart as a line out from the boat, as long as the gear is, and confirm ----------

- **1** «Sett ut»: draw the gear on the chart as a line out from the boat, as long as the gear is, and confirm
  - 9 `setEnd()`
  - 10 `setLabelNow()`
  - 19 `setWhy()`
  - 30 `setWarn()`
  - 36 `setModeStart(c)`
  - 47 `setModeFrame()`
  - 54 `setSvg(u)`
  - 65 `setAim(mp)`
  - 66 `setCount(d)`
  - 67 `renderSetBar()`
  - 81 `setModeEnd(go, stay)`

## `src/js/ui/03e-miniplot.js` (157 linjer)

---------- the little chart in 3D (the user's wish 02.10.2026) ----------

- **1** the little chart in 3D (the user's wish 02.10.2026)
  - 14 `miniRadius()`
  - 21 `miniBg(c, R, k, W, H, dpr)`
  - 67 `miniStep(until)`
  - 74 `miniFrame(t)`
  - 80 `miniSoundings(g, x0, y0, k, BW, BH, dpr, night)`
  - 94 `miniPaint()`
  - 139 `miniSjv(ctx, X, Y, p, dpr)`

## `src/js/ui/03f-search.js` (118 linjer)

Search in the chart plotter (Jonas 09.10.2026: «Kan du bygge inn en søke-knapp i kartplotteren slik at man kan søke opp plasser?

- **1** Search in the chart plotter (Jonas 09.10.2026: «Kan du bygge inn en søke-knapp i kartplotteren slik at man kan søke opp plasser?
  - 9 `srchKind(p)`
  - 16 `srchItems()`
  - 31 `srchPos(s)`
  - 39 `srchFind(q)`
  - 50 `srchEsc(s)`
  - 53 `srchFetch()`
  - 59 `srchRender()`
  - 68 `srchOpen(on)`
  - 85 `srchGo(it)`
  - 89 `srchCard()`
  - 113 `srchSvg(u)`

## `src/js/ui/04-panels-instruments.js` (375 linjer)

---------- estimates ----------

- **1** estimates
  - 2 `estimate()`
- **13** panels
  - 15 `renderTabs()`
  - 18 `setTab(k)`
  - 21 `statusText()`
  - 37 `nextEvent()`
  - 55 `setHtml(el, h)`
  - 84 `hudFigures()`
  - 111 `hudShortEv(txt)`
  - 112 `hudLine3(how)`
  - 148 `hullWarn(b)`
  - 157 `hudGoYard()`
  - 166 `renderHud()`
  - 235 `liveFrac()`
  - 236 `livePose(frac)`
  - 263 `vnoise2(x, y, s)`
  - 269 `microBottom(p, d)`
- **271** instruments: GPS and echo sounder
  - 357 `hudCardOpen(on)`
  - 366 `hudClasses(stripOn, cardOn)`
  - 370 `hudFold(which)`

## `src/js/ui/05-tattoo-art.js` (184 linjer)

---------- sailors' tattoos: the flash and the seated sailor they go on ----------

- **1** sailors' tattoos: the flash and the seated sailor they go on

## `src/js/ui/05a-itemcard.js` (186 linjer)

The item card (M1 in docs/planer/butikker-og-sponsorer.md, 30.10.2026)

- **1** The item card (M1 in docs/planer/butikker-og-sponsorer.md, 30.10.2026)
- **7** the pictures: 64 × 40, a light sea line under the things that float or stand on deck
- **75** the painted pictures (13.11.2026, Jonas: «skikkelige bilder til alt som selges», gouache, everything but the boats): one atlas,
  - 88 `icAtlas()`
  - 97 `icPic(k)`
- **106** what each thing does, in numbers from the code ([no, en]); the long story is in the Håndboka (ITEM_HB)
  - 146 `icTierLine(k, lv)`
  - 174 `itemCard(o)`

## `src/js/ui/phone/00-shell.js` (72 linjer)

---------- the phone ----------

- **1** the phone
  - 71 `setBadge()`

## `src/js/ui/phone/01-haill-fiske-service.js` (216 linjer)

--- workshop: service, fitting and getting the gear ready, one job after the other while the boat is in port

- **1** workshop: service, fitting and getting the gear ready, one job after the other while the boat is in port
  - 3 `haill()`
- **24** Kaiboden in one window (Jonas 16.11.2026: «ha alle boosters samlet i samme vindu … og heller gjemme bort de man allerede eier»;
  - 32 `kbShop()`
- **74** the tackle shop on the quay: a purchase takes two taps, the second one confirms the price
  - 81 `fiske()`
  - 95 `svcWorn()`
  - 97 `service()`
  - 120 `iceCard()`
  - 137 `jobStrip(aboard)`
  - 158 `jobTick(root, force)`
  - 178 `verksted()`

## `src/js/ui/phone/02-havn-last-agn-ordre.js` (60 linjer)

the old tabs live on as phone apps

  - 2 `havn()`
  - 3 `last()`
- **4** the pages of the dock's drawer (ui/10c-dock.js): the market, the village and the yard in port, the inventory everywhere
  - 5 `lever()`
  - 6 `isApp()`
  - 8 `agn()`
  - 39 `ordPage(key, first)`
  - 52 `oppdrag()`
  - 53 `ordl()`
  - 54 `ordEarlier()`

## `src/js/ui/phone/03-regler.js` (63 linjer)

the Regler app (R3 of the rules plan, 05.10.2026): «Her og nå» answers «can I fish here?» for your boat, gear and target where she is,

  - 8 `ruList(r)`
  - 11 `ruWhere(p)`
  - 19 `ruGrid(p, len, H, hand)`
  - 23 `ruChk()`
  - 25 `ruHere()`
  - 31 `ruCheck()`
  - 46 `ruLearn()`
  - 57 `regler()`

## `src/js/ui/phone/04-kvote.js` (89 linjer)

the Kvote app: your quotas, the open group's season, the stocks, and the market for rights (core/03d-quota.js)

  - 5 `kvote()`
  - 13 `kvSor()`
  - 26 `kvOpen(H)`
  - 43 `kvStock(H)`
  - 61 `kvReg(H)`

## `src/js/ui/phone/04b-kvotemarked.js` (213 linjer)

Kvotemarkedet: Kvote → Marked (KM3 of docs/planer/kvotemarkedet.md; Jonas 07.11.2026 V1 A–V5 A, valg 15 A 10.11.2026)

- **1** Kvotemarkedet: Kvote → Marked (KM3 of docs/planer/kvotemarkedet.md; Jonas 07.11.2026 V1 A–V5 A, valg 15 A 10.11.2026)
  - 29 `kxQ(it, H)`
  - 32 `kxCommon(H)`
  - 39 `kxCard(Q)`
  - 49 `kxBoats(it)`
  - 53 `kxChoice(key, it, pa)`
  - 62 `kxFacts(it, H)`
  - 71 `kxSheet(Q)`
  - 93 `kxForm(src)`
  - 112 `kxOwn(src, H)`
  - 121 `kxMine(H)`
  - 141 `kxWishCard()`
  - 151 `kxList(kind)`
  - 159 `kxSold(H)`
  - 165 `kvMkt(H)`
  - 176 `kxBoatRow(v)`
  - 183 `kmAct(a, d)`

## `src/js/ui/phone/05-rigg-innst-admin.js` (153 linjer)

the rig: one kind of fishing at a time, chosen in Om bord › Redskap when none of the boat's gear is in the sea (D4, Jonas 13.11.2026:

  - 4 `rigg()`
  - 15 `beholdning()`
  - 30 `crewTab()`
  - 44 `logg()`
  - 67 `fellesskap()`
  - 76 `innstGfx()`
  - 98 `innst()`
  - 128 `admin()`

## `src/js/ui/phone/06-render.js` (118 linjer)

D5: where the big phone stands on a tablet, and how wide it is. It leaves the status box and the small chart in sight: beside them

  - 7 `place()`
  - 24 `show(on, a)`
  - 26 `status()`
  - 32 `tickHome()`
  - 44 `pairCards()`
  - 60 `render()`
  - 67 `shell(a)`
  - 71 `page(a)`
  - 72 `dact(cur, a, d)`
- **78** Trim: more speed for the boat you are aboard for a while (core BOOSTS; Jonas 05.10.2026: sold for real money, the time in game
  - 83 `trim()`
- **99** Skippertak (core/15-energy.js SKIP): an energy drink for real money only, for you and the crews of the whole fleet
  - 103 `skipApp()`

## `src/js/ui/phone/07-patch.js` (1741 linjer)

--- the patch notes: what the latest updates brought, newest first; a new id at the top shows a badge until the app is opened

- **1** the patch notes: what the latest updates brought, newest first; a new id at the top shows a badge until the app is opened
  - 1729 `patch()`

## `src/js/ui/phone/08-home-papers-merker.js` (133 linjer)

the home screen (UI 2, U2-6; Jonas 06.11.2026, V6 A and V2 A in docs/planer/ui-2-staaende.md): the clock, the weather and the cash,

  - 7 `home()`
  - 26 `nowCards(na)`
  - 46 `nearHint(kind)`
- **50** the seaman's life: the tattoos you have earned, and the old ways at sea you have heard of
  - 51 `tattoos()`
  - 69 `papBladB()`
  - 74 `papPermit()`
  - 80 `papZlic()`
  - 85 `papKv()`
  - 91 `papBiz()`
  - 97 `fsChip()`
  - 101 `fsCard()`
  - 113 `merker()`
  - 125 `lore()`

## `src/js/ui/phone/09-vaer-post-salg-redning.js` (206 linjer)

--- weather

- **1** weather
  - 2 `sunTimesOld(H)`
  - 3 `vaer()`
- **26** newspaper
  - 28 `post()`
- **34** sales organisation
  - 38 `salg(s)`
- **184** rescue
  - 185 `redning()`
- **205** vessels: my vessel overview and the market

## `src/js/ui/phone/10-fartoy.js` (346 linjer)

  - 14 `goals()`
  - 39 `goalsCard()`
- **44** «Båten og utstyret» (OPP4 of docs/planer/oppgraderinger.md, 07.11.2026; Jonas: «én side for båten og utstyret»: «enig»): every
  - 58 `haulNow(kind)`
  - 62 `haulNow0(kind)`
  - 73 `tierLad(k, pg, fxOf)`
  - 79 `oneLad(k, base, pg, fx, nm)`
  - 142 `ladders()`
  - 159 `kitCard()`
  - 160 `kitCard0()`
- **189** the boat market: tabs for the open group, boats with a closed-group right, the coastal fleet over 11 m and the ocean fleet;
  - 198 `mkCard(k, O)`
  - 202 `market()`
  - 234 `specSecs(k, O)`
  - 258 `sheet(k, O)`
  - 310 `fartoy(tab0)`
- **345** the company: the fleet at a glance and what needs you. The vessel apps work on the vessel picked at the top (default: the one you follow)

## `src/js/ui/phone/11-rederi.js` (88 linjer)

  - 6 `selRow()`
  - 8 `vSummary()`
  - 45 `rederi()`
- **87** equipment

## `src/js/ui/phone/12-utstyr-redskap.js` (261 linjer)

the yard's upgrades (hold, engine, the antifouling coat and the outboard) or the shop's (electronics, haulers, the jigging machine and the clothes)

  - 2 `utstyr(mode)`
- **85** gear: in the sea, aboard (baiting and mending), and the shop
- **86** gear care (core/10b-gearcare.js): the condition of the gear aboard, and what the crew can do about it in port
- **91** a line kind as it stands (Jonas 20.10.2026, tilbakemelding #74: «hva båten har slags fiskeredskaper ombord og hva disse eventuelt er
  - 95 `lineCard(lk, o)`
  - 120 `egnChooser(lk, o)`
  - 146 `autoCard()`
  - 158 `careAboard(inPort, p)`
  - 185 `redskap(tab0)`

## `src/js/ui/phone/13-mannskap-bank-meld.js` (225 linjer)

--- crew

- **1** crew
  - 4 `candidates()`
- **5** the crew, person by person
  - 9 `traitChips(c, all)`
  - 11 `lifeHtml(c)`
  - 17 `errHtml(c)`
  - 25 `laerHtml(c)`
  - 33 `avtHtml(c, lottKv)`
  - 38 `personCard(c, cand)`
  - 45 `bors()`
  - 61 `mannskap()`
- **90** bank (Økonomi 2, Ø1): two tabs, the accounts with the statement, and the year's accounts (core/03-simulation.js book, ACCT)
  - 97 `ledger()`
  - 108 `accounts()`
  - 134 `bank()`
- **187** messages
  - 188 `meld()`
- **195** actions
  - 202 `switchVessel(k)`

## `src/js/ui/phone/13b-nettet.js` (158 linjer)

Nettet and the tackle shop on the quay (M2 in docs/planer/butikker-og-sponsorer.md, Jonas 30.10.2026)

- **1** Nettet and the tackle shop on the quay (M2 in docs/planer/butikker-og-sponsorer.md, Jonas 30.10.2026)
- **6** the keeper: a name per shop (Finnsnes keeps Solveig, who met you on the first trip), a line by what is going on, in the dialect
  - 9 `shopMem(pt)`
  - 11 `shopBought(no, en)`
  - 12 `keeperLine(pt)`
- **26** what the boat needs now, from her own state: each a chip that takes you to its card
  - 27 `buyList()`
  - 44 `shopTop(cur)`
- **64** fetching a reservation: the same purchase as over the counter; null when it went, else why not (a string)
  - 68 `equipTry(k)`
  - 70 `equipBuy(k)`
  - 94 `clothBuy(k)`
  - 101 `pickTake(o)`
- **113** the Net: the bookmarks, and the web shop
  - 115 `nett()`
  - 127 `netShop()`

## `src/js/ui/phone/13c-megler.js` (256 linjer)

Kystmegleren: boats players sell to each other (B1–B8 in docs/planer/etter-tonys-test.md, Jonas 07.11.2026; EAFC's auction house)

- **1** Kystmegleren: boats players sell to each other (B1–B8 in docs/planer/etter-tonys-test.md, Jonas 07.11.2026; EAFC's auction house)
  - 19 `mbLeftTxt(ms)`
  - 29 `mgNear(Q)`
  - 31 `mgCard(Q)`
  - 60 `mbKeepOf(v)`
  - 65 `mgOwnRow(v, quick)`
  - 84 `mbForm(v)`
  - 109 `megler()`
  - 132 `mgWishCard()`
  - 141 `mgSheet(Q)`
- **176** KM4: «Flytt hjemmelen til …» (Rederi «⋯», and the free rights under the fleet). mlSel = {vid} a boat's right or {key} a free right
  - 178 `mlSrc()`
  - 179 `mbLicSheet()`
  - 197 `mbMoveBtn(v)`
  - 199 `mbFreeCard()`
  - 205 `tiLicRow()`
  - 210 `mgHere()`
  - 218 `mgAfter(key, okNo, okEn)`
  - 220 `mgAct(a, d)`

## `src/js/ui/phone/14-act.js` (384 linjer)

  - 2 `act(a, d)`
- **9** the receipt after a buy for kroner (Jonas 06.11.2026, Tony's test: «Det skal ikke være tvil om et kjøp er gjennomført»): one
  - 14 `ownedTxt(w, s)`
  - 29 `receipt(nm, w, s)`
  - 39 `act0(a, d)`

## `src/js/ui/05b-work.js` (178 linjer)

the Mannskap page in the drawer (once «Arbeid»): the samhold on top, «På dekk nå» as chips of who stands where, and one card per

- **1** the Mannskap page in the drawer (once «Arbeid»): the samhold on top, «På dekk nå» as chips of who stands where, and one card per
- **34** «På dekk nå» (Jonas 23.10.2026: brikker): who stands where, nothing to tap, and in one line what waits on deck
  - 134 `lagCardHtml()`
  - 148 `energyUi()`

## `src/js/ui/05d-plan2.js` (266 linjer)

The operations plan's page (the Drift app; phone/06-render.js, 14-act.js). Driftsplan 3 since DP3-3 (16.11.2026,

- **1** The operations plan's page (the Drift app; phone/06-render.js, 14-act.js). Driftsplan 3 since DP3-3 (16.11.2026,
- **22** Nå: the step she is on and when it ends, what she waits for and until when, or why she stopped
- **50** the day: today's as the engine follows it (with «← nå»), or the next as planDay reckons it from the answers
- **79** Driftsplan 3 (DP3-3, 16.11.2026, docs/planer/driftsplan-3.md): two choices, Sted and Redskap (Jonas 16.11.2026: «Spilleren [får]
- **150** the top: Start or Pause, Nå, and the button that fixes a stop
- **168** the statistics (R9): today, the last seven days, and all
- **185** the page

## `src/js/ui/05e-merker.js` (86 linjer)

---------- Merker: what the player sees of «Første uke på sjøen» and the long badges (core/09f-merker.js) ----------

- **1** Merker: what the player sees of «Første uke på sjøen» and the long badges (core/09f-merker.js)
  - 9 `achShow(fresh)`
  - 18 `achPump()`
  - 31 `achWhenFree(f)`
  - 32 `achCard(title, lead, items)`
  - 38 `achChapterCard(ch)`
- **47** the Merker app's pages (ui/05-phone.js merker)
  - 48 `achWeek()`
  - 69 `achLong()`
  - 80 `achChip()`

## `src/js/ui/05f-turer.js` (191 linjer)

---------- Turoppdrag in the Oppdrag app (core/09g-turer.js): the board made from where the boat is, and the missions taken ----------

- **1** Turoppdrag in the Oppdrag app (core/09g-turer.js): the board made from where the boat is, and the missions taken
  - 7 `turCard(m, act, det)`
  - 52 `turAskCards()`
  - 67 `turPage()`
  - 87 `turGo(id)`
  - 99 `turSail(end, toPort, o = {})`
  - 117 `turSvg(u, inV)`
- **131** the measuring board (Havforskningsinstituttet's sample, core turProveFish): each fish lies with its snout against the board's
  - 136 `turMeasure(id)`
- **172** the lighthouse picture: the shutter shows within 3 km of the lighthouse while the 3D view is up; without it the card's button
  - 176 `turFotoKeep(id, img)`
  - 177 `turFotoSrc(id)`
  - 178 `turFotoUi()`
  - 182 `turFotoShoot(id)`

## `src/js/ui/05g-press.js` (86 linjer)

---------- Kystposten on the phone (core/09h-press.js): the front page and the local tab, a story to read on, the unread count on

- **1** Kystposten on the phone (core/09h-press.js): the front page and the local tab, a story to read on, the unread count on
  - 8 `pressImg(s, small)`
  - 15 `pressPage(local)`
  - 28 `pressArticle(s)`
  - 34 `pressFind(key)`
  - 36 `pressNotify(s)`
  - 43 `pressFlush()`
  - 54 `pressFetch(force)`
  - 70 `pressSkreiFetch()`
  - 80 `pressKvoteFetch()`
  - 85 `pressStart()`

## `src/js/ui/05h-kystkart.js` (91 linjer)

---------- Kystkartet: the collection on one chart (core/09m-kystkart.js; docs/planer/oppdrag-2.md K2) ----------

- **1** Kystkartet: the collection on one chart (core/09m-kystkart.js; docs/planer/oppdrag-2.md K2)
  - 10 `kkGeo()`
  - 24 `kkChartSvg()`
  - 37 `kkRows(c)`
  - 45 `kkTab()`
- **60** the same marks over the chart plotter (03-map.js renderStatic)
  - 61 `kkSvg(u, inV)`
  - 75 `kkBar()`
  - 84 `kkChart(on)`

## `src/js/ui/05i-ukas.js` (122 linjer)

---------- Ukas fangst: the Sunday card (core/09n-ukas.js; docs/planer/oppdrag-2.md U1) ----------

- **1** Ukas fangst: the Sunday card (core/09n-ukas.js; docs/planer/oppdrag-2.md U1)
  - 13 `ukeLag(w)`
  - 21 `ukeEvents(w)`
  - 29 `ukeLines(w)`
  - 51 `ukeDates(w)`
  - 53 `ukeHtml(w)`
  - 60 `ukeShow(w)`
  - 64 `ukeBind(w)`
  - 65 `ukeRedraw()`
  - 70 `ukeTick()`
  - 79 `ukeSesongCard(H)`
- **85** the picture: the card drawn on a canvas, 1080 x 1350, shared as a file or saved
  - 86 `ukeCanvas(w)`
  - 108 `ukeLogo()`
  - 112 `ukeShare(w)`

## `src/js/ui/05j-catchfeed.js` (56 linjer)

---------- «Kystlys» U4: the catch as it comes over the rail (docs/planer/ui-redesign.md, 04.11.2026) ----------

- **1** «Kystlys» U4: the catch as it comes over the rail (docs/planer/ui-redesign.md, 04.11.2026)
  - 54 `catchFeed(sp, kg)`
  - 55 `catchRec(sp, kg)`

## `src/js/ui/05k-ordbok.js` (74 linjer)

---------- Ordboka: the trade's words explained where they stand (UI-redesign U10, grep 6) ----------

- **1** Ordboka: the trade's words explained where they stand (UI-redesign U10, grep 6)
  - 30 `ordbok(root)`
  - 46 `ordTip(el, head, text)`

## `src/js/ui/05l-kapplop.js` (234 linjer)

---------- Kappløpet on the screen (KL2, steg 117; docs/planer/kapplop.md KL2; the rules are in core/09o-kapplop.js) ----------

- **1** Kappløpet on the screen (KL2, steg 117; docs/planer/kapplop.md KL2; the rules are in core/09o-kapplop.js)
  - 24 `lopClock()`
- **41** the tab
  - 42 `lopPage()`
  - 86 `lopBoard(cls0, wk)`
  - 107 `lopButtons(r, mine)`
  - 121 `lopTaskCard(m)`
  - 145 `lopReg()`
  - 147 `lopQuit()`
  - 154 `lopGo()`
- **160** the course in the chart, while she is registered: the checkpoints with their names, the finish line, and the legs as thin
  - 165 `lopLegWay(r, j)`
  - 170 `lopSvg(u, inV)`
- **188** the card at a checkpoint and at the finish (once each; a checkpoint passed with the game closed shows when it opens, within a day)
  - 189 `lopUi()`
  - 198 `lopCpHtml(r)`
  - 205 `lopGoalHtml(e)`
  - 212 `lopPop(inner)`
- **221** the card in the Sesong app: the race this week and your best time (the board for everyone is KL3)
  - 222 `lopSeasonCard()`

## `src/js/ui/06-logbook.js` (116 linjer)

---------- deck log ----------

- **1** deck log
  - 7 `longDate(day)`

## `src/js/ui/06b-book-tabs.js` (67 linjer)

---------- the deck log's other tab: the sales (D4, 14.11.2026: the tabs for seasons, events and gear went out, Jonas 13.11.2026) ----------

- **1** the deck log's other tab: the sales (D4, 14.11.2026: the tabs for seasons, events and gear went out, Jonas 13.11.2026)
- **9** sales: the landing notes, one to a page
  - 10 `bookSales()`
  - 59 `gearLogEntry(s)`
  - 63 `bookTabPages(t, spread)`

## `src/js/ui/06c-notebook.js` (44 linjer)

Father's naust: setting it to rights and the trophy wall (core/07c-naust.js, core/09b-records.js)

- **1** Father's naust: setting it to rights and the trophy wall (core/07c-naust.js, core/09b-records.js)

## `src/js/ui/06d-season-folk.js` (79 linjer)

the phone's Sesong and Folk apps (05.10.2026; the rules are in core/09c-seasons.js and core/09d-folk.js)

- **1** the phone's Sesong and Folk apps (05.10.2026; the rules are in core/09c-seasons.js and core/09d-folk.js)

## `src/js/ui/06e-feedback.js` (315 linjer)

Tilbakemelding: the players' feedback on the phone (05.10.2026)

- **1** Tilbakemelding: the players' feedback on the phone (05.10.2026)

## `src/js/ui/06f-fishguide.js` (181 linjer)

the phone's Fiskeguide app (08.10.2026; Jonas: «en intuitiv app til telefonen der spillere kan gå inn å lese kjapt om hvor de burde

- **1** the phone's Fiskeguide app (08.10.2026; Jonas: «en intuitiv app til telefonen der spillere kan gå inn å lese kjapt om hvor de burde
- **74** the gear (20.10.2026: read from the model, as it fishes): how much each takes of the species against the plain jig (1). The jig
- **100** the month view
- **116** the year view
- **124** the species card

## `src/js/ui/07-guide.js` (445 linjer)

  - 1 `renderClock()`
  - 10 `mottakShut()`
  - 11 `chartMode()`
  - 13 `chartNight()`
  - 15 `echoSettings()`
  - 24 `chartSettings()`
  - 37 `panelRoute()`
  - 112 `echoSvg()`
  - 131 `panelFish()`
  - 160 `gutToggle(b)`
  - 165 `valueEst(sp, g)`
  - 166 `panelHold()`
  - 187 `fcChart()`
  - 202 `panelWx()`
  - 236 `landText(short)`
  - 249 `deckText(short)`
  - 269 `quayText(short)`
  - 275 `panelPort()`
  - 305 `portSlip()`
  - 383 `landWarn(p)`
  - 401 `landQText(short)`
  - 409 `landQOthers()`
  - 418 `landPage()`
  - 434 `panelLog()`
  - 439 `renderPanel()`
  - 443 `panelBusy()`

## `src/js/ui/07b-first-trip.js` (328 linjer)

---------- «Første tur»: the guided first trip every new player goes through ----------

- **1** «Første tur»: the guided first trip every new player goes through
  - 16 `tutAt()`
  - 25 `tutEv(k, settle)`
  - 30 `tutLoadEv(room)`
  - 33 `tutFishEv()`
  - 35 `tutMark(k)`
  - 36 `tutSettle(k)`
  - 42 `tutFieldWp(list)`
  - 51 `dockApp(menu, item, page, inner)`
  - 56 `phoneApp(app, inner)`
  - 68 `tutNaustTry()`
  - 75 `tutIntroGo()`
  - 158 `tutAdrift()`
  - 166 `tutDriftTip(d)`
  - 180 `tutStartWhy()`
  - 193 `tutTip(st)`
  - 216 `tutReveal(el)`
  - 222 `tutRect(T0)`
  - 228 `tutStep()`
  - 239 `tutNormKg(sale)`
  - 245 `tutFinish()`
  - 246 `tutScrollSlip()`
  - 249 `tutAllow(what)`
  - 267 `tutView(st)`
  - 274 `tutUpdate()`
  - 297 `tipPlace(txt, T0, o)`
  - 322 `tipToast()`

## `src/js/ui/07c-handbook.js` (286 linjer)

Håndboka: chapters 2–6 of the on-boarding as drips, and the app that keeps every tip (docs/onboarding.md 3–4, Jonas 09–10.10.2026)

- **1** Håndboka: chapters 2–6 of the on-boarding as drips, and the app that keeps every tip (docs/onboarding.md 3–4, Jonas 09–10.10.2026)
  - 10 `hbState()`
  - 213 `hbPick()`
  - 221 `hbEv(id, how)`
  - 222 `hbDone(id)`
  - 223 `hbSkip(ch, id)`
  - 225 `hbReady()`
- **227** what the phone shows (Onboarding 2, O5, V7 A, 27.10.2026)
  - 236 `appShown(id)`
  - 243 `appUnlock(id)`
  - 245 `appSeen(id)`
  - 246 `hbUpdate()`

## `src/js/ui/10g-wardrobe.js` (204 linjer)

Garderoben: the player changes how his figure looks (Jonas 10.10.2026)

- **1** Garderoben: the player changes how his figure looks (Jonas 10.10.2026)
- **22** the right-hand side: what the current tab offers
- **63** the little renderer

## `src/js/ui/08-actions.js` (533 linjer)

actions

  - 6 `doAct(el)`
  - 78 `panelInput(e)`
  - 84 `panelChange(e)`
  - 114 `landConf(H, q, acc)`
  - 156 `sell()`
- **304** modal
  - 306 `modal(html)`
  - 315 `boatUnnamed()`
  - 316 `boatChristen(nm)`
  - 318 `showIntro(namesOnly)`
- **336** «Mens du var borte» (Jonas 07.10.2026: «en følelse av instant-belønning»)
  - 346 `awayStart(mins, realMs)`
  - 351 `awayEnd()`
  - 352 `showAway(A)`
- **414** time
  - 420 `playMinutes(n, away)`
  - 424 `catchUp(realMs)`
  - 435 `tick()`
  - 472 `deliverOrder()`
- **482** chrome
  - 483 `applyLang()`
- **496** screens: full-screen 3D, or the chart plotter for route planning
  - 497 `setBodyView(v3d)`
  - 503 `openPlotter()`
  - 508 `plotSetRender()`
  - 512 `plotSetOpen(on)`
  - 525 `kinoUi()`

## `src/js/ui/08b-letter.js` (127 linjer)

---------- the opening: the letter from Father ----------

- **1** the opening: the letter from Father
  - 28 `letterPic(k)`
  - 32 `letterSound(kind)`
  - 44 `showLetter(done)`

## `src/js/ui/08c-start.js` (175 linjer)

«Hvor står fars naust?»: where a new game starts (05.10.2026)

- **1** «Hvor står fars naust?»: where a new game starts (05.10.2026)
  - 23 `startInfo(pt)`
  - 45 `startSeaMax(q, H0)`
  - 47 `startRing(pt)`
  - 48 `startWx(pt, H0)`
  - 56 `showStart(done)`
  - 118 `tutMixAt(q, H, len, land)`
  - 129 `tutFieldNear(pt, land, skip)`
  - 153 `chooseStart(pt, onProgress)`

## `src/js/ui/09-hand-fishing.js` (87 linjer)

---------- fishing by hand: jig, strike on the bite, reel without snapping the line ----------

- **1** fishing by hand: jig, strike on the bite, reel without snapping the line

## `src/js/ui/09b-pub.js` (368 linjer)

---------- the pub in 3D: a stool at the bar, seen in first person (Jonas 08.10.2026) ----------

- **1** the pub in 3D: a stool at the bar, seen in first person (Jonas 08.10.2026)
- **15** the model: the GLB as it is (positions as 16-bit, colours as bytes), straight into the GPU
- **89** matrices (column-major)
- **101** a frame
- **145** what can be tapped
- **171** the panels
- **223** the bartender: the evening's talk in the place's dialect, and a round for the crew
- **248** the old hand at the bar with the echo sounder's news (tilbakemelding #58; Jonas 09.10.2026: «i puben 1 gang per spilldøgn»)
- **296** the notice board: Kystposten, the week's best, the trips
- **307** the round table: the hands looking for a berth (the crew exchange)
- **314** the top bar
- **327** open and close

## `src/js/ui/09c-naust3d.js` (303 linjer)

---------- Father's naust in 3D: the trophy wall with the biggest fish of each species (Jonas 09.10.2026) ----------

- **1** Father's naust in 3D: the trophy wall with the biggest fish of each species (Jonas 09.10.2026)
- **18** the model, as the pub reads it
- **91** matrices (column-major)
- **104** a frame
- **162** what can be tapped
- **198** the panels
- **250** the top bar, open and close

## `src/js/ui/09c-pubsoc.js` (243 linjer)

---------- the pub's social side (ui/09b-pub.js; supabase/migrations/20261009120000_pub.sql) ----------

- **1** the pub's social side (ui/09b-pub.js; supabase/migrations/20261009120000_pub.sql)
- **11** who is here tonight: the players' boats lying in this harbour
- **57** the harbour's fiskarlag
- **73** the club's notice board: fixed lines, never free text (F2, 20261030160000_lag_board.sql)
- **155** the week's quiz: five questions from the bank, the same for everyone in a game week

## `src/js/ui/10-rod-acts.js` (113 linjer)

---------- the jig game: jigging by hand yourself, and the buttons and hooks around it ----------

- **1** the jig game: jigging by hand yourself, and the buttons and hooks around it
  - 111 `refreshAll()`

## `src/js/ui/10-gear-ui.js` (240 linjer)

passive gear on screen: the action bar, the fish panel, the chart and the route

- **1** passive gear on screen: the action bar, the fish panel, the chart and the route
  - 8 `setState(s)`
- **15** the bait as the player sees it (Jonas 20.10.2026, after tilbakemelding #74: «det må gjøres mer intuitivt hva båten har slags
  - 27 `tubState(lk)`
  - 36 `tubsHtml(lk)`
  - 44 `tubWords(st)`
  - 49 `tubLegend(lk)`
  - 56 `setBaitTxt(s)`
  - 62 `setWhat(s)`
  - 69 `setLabel(s, short)`
  - 76 `setChoices(all)`
  - 98 `gopText()`
  - 106 `gearActs(LS)`
  - 127 `jigSets()`
  - 137 `gearPanel()`
  - 158 `gearSvg(u)`
  - 184 `otherGearHit(p, r)`
  - 185 `otherGearCard(s)`
  - 193 `gearHit(p, r)`
  - 195 `buoyStandoff(s, e)`
  - 200 `gearTap(hit)`
  - 212 `wpActOptions(w)`
  - 218 `wpActLabel(a)`
  - 224 `wpActCycle(w)`
  - 229 `gearDoAct(act, el)`

## `src/js/ui/10c-dock.js` (616 linjer)

---------- the dock: round buttons along the bottom that follow what the boat is doing, and the drawer at the side ----------

- **1** the dock: round buttons along the bottom that follow what the boat is doing, and the drawer at the side
- **415** the drawer
- **522** the calm (UI 2, U2-4, 07.11.2026; docs/planer/ui-2-staaende.md 4.5, Jonas' V8 A 06.11.2026)
  - 589 `renderActs()`
  - 602 `showroomTick()`

## `src/js/ui/10d-helm.js` (51 linjer)

THE HELM ON THE SCREEN (core/16-helm.js; the user's wish 03.10.2026)

- **1** THE HELM ON THE SCREEN (core/16-helm.js; the user's wish 03.10.2026)

## `src/js/ui/10e-sound.js` (392 linjer)

SOUND (the user's wish 03.10.2026)

- **1** SOUND (the user's wish 03.10.2026)
- **85** inside Father's naust (Jonas 09.10.2026: «Kjør på med lyd i naustet»; ui/09c-naust3d.js)
- **144** the music (Jonas 05.10.2026: «rolig ambient instrumentaler som svak stemning i bakgrunnen. Må kunne skrus av i innstillinger»)
- **312** the whistle and the bell (Ø11.2; sjøveisreglene FOR-1975-12-01-5 rules 32-35 and vedlegg III, read 06.11.2026)

## `src/js/ui/10f-cloud.js` (979 linjer)

THE CLOUD (04.10.2026; docs/lansering.md E and F)

- **1** THE CLOUD (04.10.2026; docs/lansering.md E and F)
  - 11 `cloudChannel()`
  - 12 `cloudCfg(raw, host, ch)`
  - 20 `cloudOn()`
  - 28 `adminOk()`
  - 30 `pubHost()`
  - 34 `cloudS()`
  - 40 `cloudGpu()`
  - 47 `cloudDev()`
  - 54 `cloudMeta()`
- **71** talking to Supabase
  - 72 `cloudToken()`
- **73** guests (06.10.2026; Jonas: «nye brukere ikke trenger å logge inn til å starte med», the account after the third landing)
  - 79 `guestGet()`
  - 80 `guestAuth(path, body)`
  - 88 `guestToken()`
  - 96 `guestStart()`
  - 102 `cloudRpc(fn, args, opt)`
- **114** the gate: before the game starts
  - 115 `cloudGateShow(html)`
  - 123 `cloudGateHide()`
  - 127 `worldSync()`
  - 132 `cloudGate()`
- **202** after the start: hooks, measurements, the save
  - 203 `cloudStart()`
  - 228 `cloudAsk()`
  - 238 `cloudConsent(yes, by)`
  - 244 `cloudBegin()`
  - 254 `cloudEv(k, d)`
  - 255 `cloudFlush(end)`
- **264** the errors (04.10.2026; caught everywhere since 02.11.2026, js/errtrap.js)
  - 275 `srcMapStr(s)`
  - 288 `errNoise(msg)`
  - 293 `cloudErr(msg, src, stack, kind)`
  - 304 `errSend(e)`
  - 308 `errQueue()`
  - 309 `errKeep(list)`
  - 313 `errFlush()`
  - 337 `errStart()`
- **346** a page that stops or stands still while it is on the screen
  - 353 `aliveRead()`
  - 354 `aliveBeat(gone)`
  - 365 `aliveCheck()`
  - 389 `hangWatch()`
- **403** the save between devices (05.10.2026; supabase/migrations/20261005200000_save_sync.sql)
  - 410 `syncGet()`
  - 411 `syncSet(rev, at, rv, sq)`
  - 417 `deviceId()`
  - 421 `deviceName()`
  - 426 `cloudStatus(s)`
  - 427 `cloudStatusText()`
  - 436 `saveSum(o)`
  - 440 `sumText(m)`
  - 447 `cloudChoose(here, cloud, when, box)`
  - 462 `cloudKeptNote(where)`
  - 467 `cloudTake(cs)`
  - 473 `cloudSync(cs)`
  - 504 `cloudSaveSoon(closing, manual)`
  - 543 `cloudSoon(ms)`
- **544** one device at a time (13.10.2026, supabase/migrations/20261013120000_active.sql)
  - 554 `cloudFp()`
  - 555 `cloudClaim(wait)`
  - 568 `cloudBeat()`
  - 584 `cloudWake()`
  - 590 `cloudPassed(h)`
  - 605 `cloudHeldShow(h)`
  - 614 `cloudPlayHere()`
  - 624 `cloudCheckHead()`
  - 633 `cloudConflict(cl, moved)`
  - 663 `cloudHist()`
  - 668 `cloudRestore(id)`
- **679** what is measured: the game's own functions, wrapped once they are all defined
  - 680 `cloudHooks()`
- **703** the account card in Settings
  - 704 `cloudCard()`
  - 728 `histRows()`
  - 740 `cloudAccountDel()`
  - 751 `cloudMediaDel()`
  - 757 `cloudAct(a, d)`
- **791** registering, for a guest: in the game's own words, never a wall before the third landing
  - 800 `guestHave()`
  - 806 `guestAsk(why)`
  - 832 `nameWhy(v)`
  - 849 `namesKept()`
  - 850 `namesKeep(o)`
  - 852 `namesApply()`
  - 860 `nameTake(n, quiet)`
  - 870 `nameCheck()`
  - 885 `nameSuggest()`
  - 894 `nameAsk(why, reason)`
  - 919 `guestOpenAsk()`
  - 927 `nameNudge(force)`
  - 940 `guestNudge(step)`
  - 952 `guestLogin(src)`
  - 958 `guestRegister(signIn)`
  - 973 `guestGift()`

## `src/js/ui/10g-push.js` (210 linjer)

PUSH NOTIFICATIONS (05.10.2026, the list's 9: «Push-varsler i appen»; supabase/migrations/20261005120000_push.sql and

- **1** PUSH NOTIFICATIONS (05.10.2026, the list's 9: «Push-varsler i appen»; supabase/migrations/20261005120000_push.sql and
  - 30 `pushHas()`
  - 32 `pushKey()`
  - 39 `pushOn()`
  - 53 `pushOff()`
  - 63 `pushAuto()`
  - 66 `pushAsk()`
  - 78 `pushItems(now)`
  - 178 `pushPlan(away)`
  - 186 `pushStart()`
  - 194 `pushCardRow()`
  - 201 `pushCatToggle(k)`
  - 206 `pushToggle()`

## `src/js/ui/10h-world.js` (424 linjer)

---------- the shared world V3: the other players' boats (05.10.2026; supabase/migrations/20261005220000_presence.sql) ----------

- **1** the shared world V3: the other players' boats (05.10.2026; supabase/migrations/20261005220000_presence.sql)
  - 14 `worldSig()`
  - 15 `worldTick()`
  - 55 `gearSync(now)`
  - 73 `peerLogo(hid, ver)`
- **83** the shared world V2 (05.10.2026; core/03-simulation.js WSH): one sea, one quota and one market. Every ten minutes, and soon
  - 92 `worldShare()`
- **118** the leaderboards (05.10.2026; Salgslaget → Toppliste; supabase/migrations/20261006020000_toplist.sql): the players of the whole
  - 133 `worldTop(w, grp, kind, mo)`
  - 158 `worldTopMoreOk(e)`
  - 162 `worldTopMore(e)`
  - 175 `worldTopWatch(e)`
  - 187 `bygdeTop(w)`
  - 200 `evTop(ev, y)`
  - 211 `evCloseTick()`
- **217** the race Lindesnes–Nordkapp in the cloud (KL3, steg 118; supabase/migrations/20261113200000_kapplop.sql, core/09o-kapplop.js)
  - 224 `lopSync()`
  - 259 `lopTop(wk)`
- **269** the real-time relay (Ø16, S2 in docs/planer/sanntid-posisjoner.md, 05.11.2026; Jonas «kjør på» 03.11.2026: «like smooth som når
  - 286 `rtUrl()`
  - 293 `rtWant()`
  - 294 `rtTick()`
  - 302 `rtRetry(ms)`
  - 303 `rtClose(code, ms)`
  - 304 `rtOpen()`
  - 321 `rtSend(now)`
  - 335 `rtClock(T, p)`
  - 336 `rtRecv(data)`
  - 357 `rtVel(B, i)`
  - 363 `rtPose(id)`
  - 376 `rtTurn(B)`
  - 410 `worldStart()`

## `src/js/ui/10i-shop.js` (440 linjer)

THE SHOP (05.10.2026; supabase/migrations/20261006040000_shop.sql, supabase/functions/shop-checkout and stripe-webhook)

- **1** THE SHOP (05.10.2026; supabase/migrations/20261006040000_shop.sql, supabase/functions/shop-checkout and stripe-webhook)
  - 42 `shopMode()`
  - 48 `realKr(nok)`
  - 50 `shopLabel(nok)`
  - 55 `shopWhat(k, g)`
  - 70 `payBuy(k, give, extra)`
  - 78 `shopFine()`
  - 81 `shopGo(k, extra)`
  - 97 `shopYard()`
  - 101 `shopGive(g, srv)`
  - 123 `shopThanks(rc)`
  - 147 `shopBack(list)`
  - 177 `haillProbe()`
  - 185 `haillTell(now)`
  - 191 `haillTell1()`
- **213** HS4: the server is the truth
  - 217 `srvOnly()`
  - 220 `pubAsk()`
  - 227 `achHaillAsk()`
  - 232 `yardUsed()`
  - 242 `srvImport(st)`
  - 255 `shopClaim4()`
  - 271 `srvApply(st)`
  - 360 `shopWords(gifts, thanks)`
  - 367 `shopClaim()`
  - 421 `shopStart()`

## `src/js/ui/10j-paint.js` (274 linjer)

THE PAINT SHOP (Malerverkstedet; Jonas 06.10.2026, docs/engasjement.md): a button of its own under Verft. Your own boat lies

- **1** THE PAINT SHOP (Malerverkstedet; Jonas 06.10.2026, docs/engasjement.md): a button of its own under Verft. Your own boat lies
  - 228 `logoSet(L)`
  - 236 `logoCheck()`
  - 247 `cosSrv(owned)`
  - 253 `giveCos(k)`
  - 269 `regSet(n)`

## `src/js/ui/10q-buymoment.js` (44 linjer)

The moment a boat is bought (M5 in docs/planer/butikker-og-sponsorer.md): the top and the end of the purchase

- **1** The moment a boat is bought (M5 in docs/planer/butikker-og-sponsorer.md): the top and the end of the purchase

## `src/js/ui/10r-sponsor.js` (115 linjer)

Sponsorer in the game (M6, core/09l-sponsor.js): the list from the cloud, the sponsored item card, the link out and the

- **1** Sponsorer in the game (M6, core/09l-sponsor.js): the list from the cloud, the sponsored item card, the link out and the
- **67** the signs' measure, the rules (IAB/MRC Intrinsic In-Game Advertising Measurement Guidelines 2.0, the draft of 14.06.2022;

## `src/js/ui/10s-broker.js` (133 linjer)

Kystmegleren and the cloud (B1–B8 in docs/planer/etter-tonys-test.md, supabase/migrations/20261107140000_broker.sql)

- **1** Kystmegleren and the cloud (B1–B8 in docs/planer/etter-tonys-test.md, supabase/migrations/20261107140000_broker.sql)

## `src/js/ui/10t-kvotemarked.js` (147 linjer)

Kvotemarkedet and the cloud (KM3 of docs/planer/kvotemarkedet.md; the server is KM2, supabase/migrations/20261108230000_kvotemarked.sql)

- **1** Kvotemarkedet and the cloud (KM3 of docs/planer/kvotemarkedet.md; the server is KM2, supabase/migrations/20261108230000_kvotemarked.sql)

## `src/js/ui/10s-mob.js` (179 linjer)

---------- man overboard on the screen (Ø11.6; the core is core/14b-sikkerhet.js) ----------

- **1** man overboard on the screen (Ø11.6; the core is core/14b-sikkerhet.js)
- **48** the actions
- **89** the panel
- **130** the core's word
- **144** the chart plotter (ui/03-map.js renderDyn): the mark, the line to it, the lifebuoy and the person
- **166** the Sikkerhet card in the Redning app (Ø11.7 SK6): the near misses with the day, the place, what each teaches and its source,

## `src/js/ui/10k-friends.js` (134 linjer)

---------- Venner: friends between players (Jonas 09.10.2026; supabase/migrations/20261009180000_friends.sql) ----------

- **1** Venner: friends between players (Jonas 09.10.2026; supabase/migrations/20261009180000_friends.sql)

## `src/js/ui/10l-share.js` (89 linjer)

---------- shared catch marks (Jonas 09.10.2026; supabase/migrations/20261009200000_shared_marks.sql) ----------

- **1** shared catch marks (Jonas 09.10.2026; supabase/migrations/20261009200000_shared_marks.sql)

## `src/js/ui/10m-guestbook.js` (98 linjer)

---------- the guestbooks and Kystfareren (Jonas 09.10.2026; supabase/migrations/20261009220000_guestbook.sql) ----------

- **1** the guestbooks and Kystfareren (Jonas 09.10.2026; supabase/migrations/20261009220000_guestbook.sql)
- **62** Kystfareren: the parts of the coast by where the place lies (natLL), south to north

## `src/js/ui/10n-hail.js` (83 linjer)

---------- tuting and the six phrases at sea (Jonas 09.10.2026; supabase/migrations/20261009240000_hails.sql) ----------

- **1** tuting and the six phrases at sea (Jonas 09.10.2026; supabase/migrations/20261009240000_hails.sql)

## `src/js/ui/10o-ptow.js` (174 linjer)

---------- towing between players (Jonas 09.10.2026; supabase/migrations/20261009260000_tows.sql) ----------

- **1** towing between players (Jonas 09.10.2026; supabase/migrations/20261009260000_tows.sql)
  - 15 `ptowTowing()`
  - 17 `ptowStep()`
- **32** the one who needs help
- **71** the helper
- **115** the polling
- **129** the chart: the asks near, and the card

## `src/js/ui/10p-install.js` (170 linjer)

put the game on the home screen (Jonas 11.10.2026: «Det er viktig at brukerne laster ned spillet»)

- **1** put the game on the home screen (Jonas 11.10.2026: «Det er viktig at brukerne laster ned spillet»)
- **70** a new build is out: «Oppdater nå» (Jonas 06.11.2026: «Varsel ved oppdatering for å kjøre refresh på appen»)
- **109** the test edition's label (L1a, 10.11.2026, docs/planer/lansering-plan.md)
- **140** the browser card on the loading screen (Jonas 03.11.2026, after tilbakemelding #107-#109)

## `src/js/ui/10u-hopp.js` (145 linjer)

---------- Hopp over resten av ruta: the fast-forward button, the card and the purchase (HO2–HO3, steg 105–106; docs/planer/hopp.md) ----------

- **1** Hopp over resten av ruta: the fast-forward button, the card and the purchase (HO2–HO3, steg 105–106; docs/planer/hopp.md)
  - 24 `hopUi()`
  - 29 `hopOpen()`
  - 38 `hopCard(h, q)`
  - 63 `hopHoldTick()`
  - 82 `hopPress(paid, id, min, quiet)`
  - 103 `hopUse(id)`
  - 115 `hopVoid(id, why)`
  - 127 `hopDeliver(id, d)`

## `src/js/ui/10v-profil.js` (117 linjer)

The profile and the founders' badge (Jonas 16.11.2026, before the launch: «profil-side med brukernavn, fartstid, ferdigheter,

- **1** The profile and the founders' badge (Jonas 16.11.2026, before the launch: «profil-side med brukernavn, fartstid, ferdigheter,

## `src/js/ui/11-boot.js` (443 linjer)

---------- boot ----------

- **1** boot
  - 13 `bootStep(next)`
  - 14 `bootAway()`
  - 15 `bootGate(on)`
  - 17 `bootInfo()`
  - 19 `bootDone()`
  - 58 `bootgWrite()`
  - 60 `bootgOk()`
  - 63 `bootgArm()`
  - 72 `bootgNote(s)`
  - 81 `bootgIn()`
  - 88 `bootgOut()`
  - 91 `bootgClear(over)`
  - 93 `bootgReport()`
  - 102 `bootgRescue()`
  - 104 `bootgSafe()`
  - 115 `bootgSay()`
  - 116 `bootMap()`
  - 141 `boot3dAsk()`
  - 146 `boot3dShown()`
  - 156 `boot3dSend()`
  - 157 `modelsReady()`
  - 158 `dataEls()`
  - 159 `dataEarly()`
  - 171 `dataGet(el, opt)`
  - 185 `bootData()`
  - 193 `bootDataLate()`
  - 208 `modelsLabel()`
  - 215 `bootMapLoad()`
  - 246 `chart0Load()`
  - 247 `bootGame()`
  - 425 `bootFail(e)`

## `src/js/ui/11b-watchdog.js` (89 linjer)

THE WATCHDOG (L1d, 10.11.2026, docs/planer/lansering-plan.md; Jonas, valg 16 V4 B: a push when the game is down or hangs)

- **1** THE WATCHDOG (L1d, 10.11.2026, docs/planer/lansering-plan.md; Jonas, valg 16 V4 B: a push when the game is down or hangs)
  - 18 `send(msg, extra)`
  - 44 `wdWhere()`
  - 51 `wdBeat(off)`

## `src/js/figpose.js` (351 linjer)

the new people's skeleton (Folk 2, FB6, steg 124): bone matrices from local turns, without WebGL

- **1** the new people's skeleton (Folk 2, FB6, steg 124): bone matrices from local turns, without WebGL
  - 17 `figRot(axis, deg)`
  - 22 `figQuat(q)`
  - 27 `figBetween(a, b)`
  - 35 `figSkel(ex, sex)`
  - 44 `figPose(sk, local, root, opt)`
  - 63 `figArms(sk, L, out, fwd, el)`
- **74** from the joints the work asks for to the bones' turns (FB7, steg 125)
  - 86 `figTo(a, b)`
  - 92 `figAxis(R)`
  - 96 `figFrac(R, k)`
  - 98 `figTwist(R, a)`
  - 108 `figIk(S, T, l1, l2, pole)`
  - 118 `figLens(sk)`
  - 134 `figProfile(meshes, sk, C)`
  - 150 `figProfAt(P, y, r, back)`
  - 156 `figProfMax(P, ya, yb, r, back)`
  - 158 `figProfIn(P, a, y, r)`
  - 165 `figHead(o, sk)`
  - 176 `figHandRest(ex, sex, side)`
  - 183 `figGripAt(ex, sex, grip, side)`
  - 191 `figArmOut(S, E, W, Rc, sg)`
  - 210 `figFromJoints(sk, J)`
  - 261 `figStand(sk, seated, hands, S)`
  - 271 `figHandTurn(H0, x, y, z)`
  - 274 `figPoses(sk)`
  - 297 `figGrip(ex, sex, grip, L, side)`
  - 305 `figSkin(p, nor, j, w, M)`
  - 323 `figPalette(maxVectors, other)`
  - 327 `figSplit(j, w, maxB, nBones)`
  - 345 `figGL(nb)`

## `src/js/vessel3d.js` (1882 linjer)

- **2** VESSEL MODELS
  - 7 `VB()`
- **60** palette (rgb and gloss)
- **69** the hull: lofted from stations (s = 0 at the transom or stern post, 1 at the stem)
  - 75 `hullShape(H)`
  - 120 `hullBuild(o, hs, lod)`
  - 153 `hullCap(hs)`
- **160** fittings
  - 162 `wallWin(o, gb, A0, B0, A1, B1, sill, top, nwin, wallC, frameC, mull)`
  - 174 `partHouse(o, gb, p, y0, hs)`
  - 196 `partMast(o, p, base)`
  - 205 `partExhaust(o, p, base)`
  - 207 `partRails(o, hs, p)`
  - 212 `partGallows(o, hs, p)`
  - 216 `partHauler(o, hs, p)`
  - 221 `partDavit(o, hs, p)`
  - 226 `partTubs(o, hs, p)`
  - 235 `partPots(o, hs, p)`
  - 238 `partRaft(o, p, base)`
  - 239 `partFenders(o, hs, p)`
  - 241 `partEngineBox(o, hs, p)`
  - 242 `partThwart(o, hs, p)`
  - 244 `partTiller(o, hs, p)`
  - 245 `partJukse(o, hs, p)`
  - 247 `partPort(o, hs, p)`
  - 249 `partDrum(o, hs, p)`
  - 252 `partShelter(o, hs, p)`
  - 257 `partBlock(o, gb, p, y0, hs)`
  - 262 `partFunnel(o, p, base)`
  - 263 `partGantry(o, hs, p)`
  - 266 `partRamp(o, hs, p)`
  - 267 `partDoors(o, hs, p)`
  - 268 `partCrane(o, hs, p)`
  - 269 `partBlockP(o, hs, p)`
  - 270 `partNetBin(o, hs, p)`
- **272** one spec per type: the hull and the fittings. The skiff is hand-built in view3d.js
- **361** detailed models from GLB files (tools/boats, built in Blender from the yards' drawings)
  - 375 `glbParse(b64)`
  - 438 `glbLoad(type)`
  - 445 `glbPart(type, name)`
  - 447 `glbPeek(G, name)`
  - 451 `f32cat(...A)`
  - 454 `f32moved(p0, ...M)`
  - 460 `glbPaint(part, liv)`
  - 468 `glbZones(type)`
  - 475 `glbModel(type, lod, liv, own)`
- **499** the life-saving gear's places that the models from 45 m do not have yet (Ø11.5, 06.11.2026; until Ø4 revises them and gives them
- **522** the ladder aft (FOR-2013-11-22-1404 § 63, read on Lovdata 06.11.2026: «På fartøyets aktre del skal det være montert fast leider med
- **542** the place over the stern for the line setter or the net chute (OPP5, 10.11.2026; tools/deck/oppgr.py): [x, y, z, ry, mag], the
  - 565 `mobCut(o, boxes)`
  - 574 `vesselSpec(type)`
  - 575 `buildVesselModel(type, lod, liv, own)`
  - 616 `vesselGeo(type, hs, sp, house, anch)`
  - 628 `vesselModel(type)`
  - 629 `geoOf(type)`
- **636** the paint shop (ui/10j-paint.js; Jonas 06.10.2026): the hull colours a player can paint their own boat in, in VC's scale. A boat's
  - 655 `modelLiv(L)`
  - 664 `hullLiv(b)`
  - 665 `livKey(liv)`
  - 667 `livGeo(liv)`
  - 674 `livStr(b)`
  - 694 `livPen(s)`
  - 696 `livMark(s)`
  - 701 `livPaint(s)`
  - 708 `livFlag(s)`
  - 709 `livParse(s, type)`
- **715** paint designs (Malerverkstedet): a stripe under the sheer (ripe), a second colour on the lower topsides (totone), a stripe at the
  - 719 `topsides(type)`
  - 737 `designLines(TS, liv)`
  - 746 `glbDesign(type, part, liv)`
  - 780 `designFits(type, k)`
  - 787 `kitLiv(liv)`
- **789** flags (Malerverkstedet, 07.10.2026): the ensign at the stern as a picture, so any nation and shape can fly. Each flag is drawn here
- **838** the company logo (Malerverkstedet, 07.10.2026): made here from a sign, initials and two colours, or the player's own picture
  - 849 `logoCanvas(cv, L, img)`
  - 865 `logoStrips(type)`
  - 886 `stripBare(type, st)`
  - 901 `logoStr(L)`
  - 902 `logoParse(s)`
  - 906 `flagCanvas(cv, code, shape, logo)`
  - 918 `flagOf(L)`
- **919** the boat's name on her hull (Jonas 07.10.2026: «Pass på at båtnavnet vises godt på skroget på alle båtene»): a strip on each side
  - 928 `hullTris(type)`
  - 945 `sideStrip(type, frac, hMax, aspect, drop, band)`
  - 985 `nameStrips(type)`
  - 1021 `stripProud(type, st)`
  - 1044 `stripPaint(type, st)`
  - 1065 `markStrips(type)`
  - 1078 `stripSearch(type, lh, first0, fr, PAINT, avoid)`
  - 1103 `callStrips(type)`
  - 1109 `callRGB(type, liv)`
  - 1112 `anchorLen(bw)`
  - 1115 `markRGB(type, liv)`
  - 1124 `hullRGB(type, liv)`
- **1134** where the name is painted (Jonas 04.11.2026: «Det som er mest vanlig er at navnet på båten skrives i blokkbokstaver på kanten av
  - 1145 `facingTris(P, dir, keep)`
  - 1160 `rayZ(T, x, y, dir, za, zb)`
  - 1171 `crossStrip(T, xa, xb, y0, y1, z0, zw, dir, off)`
  - 1182 `crossPaint(T, xa, xb, y0, y1, dir, za, zb)`
  - 1193 `halfWidth(T, y, z0, zw, dir, wmax)`
  - 1204 `houseFront(type, P, Gl, V)`
  - 1247 `transom(type, P, V)`
  - 1282 `namePlaces(type)`
  - 1300 `placeRGB(type, p, liv)`
  - 1308 `nameInkLight(rgb)`
- **1312** the name's lettering (TP2, steg 109; Jonas 12.11.2026, V4 B: «Tre skrifter og farge»): three letterings real boats carry, block
  - 1321 `contrastOf(a, b)`
  - 1324 `nameStyle(L)`
  - 1326 `livName(s)`
  - 1327 `livHome(s)`
  - 1329 `nameInk(under, c)`
  - 1333 `npcKit(L, B)`
  - 1339 `npcModelKey(type, lod, liv)`
  - 1340 `npcModel(type, lod, liv)`
  - 1341 `npcModelDrop(k)`
  - 1343 `personVB(B, x, y, z, seated, hands, suit, kit)`
- **1356** people from tools/harbour/arbeider.py: one body in parts, posed at its joints and painted per kit
  - 1375 `vestKit(K)`
  - 1390 `wkPart(name, kit)`
  - 1400 `wkPut(B, o, ax, s, at)`
  - 1410 `wkLimb(B, o, A, E, r)`
  - 1417 `figureVB(B, x, y, z, seated, hands, kit)`
- **1437** the new people (Folk 2, FB6, steg 124): one skinned figure per look, from src/data/folk2.b64
  - 1447 `figSkelOf(sex)`
  - 1453 `figPart(name, kit, sex)`
  - 1469 `figParts(kit, opt)`
  - 1482 `figMesh(kit, opt)`
  - 1496 `figProfOf(sex, torso, vest)`
  - 1501 `figHeadOf(sex)`
  - 1509 `figBake(B, x, y, z, seated, hands, kit)`
  - 1518 `figDraws(M, maxB)`
  - 1527 `figPal(M, bones)`
  - 1530 `vesselSVG(type, w, h)`
- **1568** the deck map: where people can walk on each type (the crew plan, docs/mannskap-plan.md)
  - 1575 `deckMap(type)`
  - 1728 `deckPass(M, k, q)`
  - 1733 `passLine(M, A, B)`
  - 1735 `linkPass(M, k, q)`
  - 1739 `deckComp(M)`
  - 1748 `deckPath(M, a, b)`
- **1780** the lanterns after Sjøveisreglene (FOR-1975-12-01-5, rules 22–30, read on Lovdata 17.10.2026; docs/batplan.md del 11)
  - 1793 `lanterns(G, V, st)`
  - 1836 `deckPoints(type)`

## `src/js/deckcrew.js` (2052 linjer)

- **2** CREW3D: the people aboard as agents who walk the deck (docs/mannskap-plan.md, del 1; Jonas 17.10.2026: no teleporting)
  - 14 `crewSim(src)`
- **51** the kit on the deck, out of the walking map
- **130** the nets aboard in their tubs (F8, OB3): NET_TUB nets to a 460 l tub (assumed; a 27.5 m net is some 35-40 l in a heap), the
- **161** setting the line and the nets (F4, F20, OB3; Jonas 09.11.2026: «at arbeidet ombord utføres på en så ekte måte som mulig»): the
- **235** the line tubs, each by itself (steg 125f; STAMPER, Jonas 15.11.2026: «tomme linebøtter stables i hverandre etter hvert som
- **409** the landing, the ice and the freight at the quay (OB4, 11.11.2026; docs/planer/om-bord.md F10, F11, F22, F23; Jonas 09.11.2026:
- **493** the deck washed down, the packed lunch and the cold (OB14, 11.11.2026, docs/planer/om-bord.md F12-F14; the roles 'spyl',
- **515** the wooden stools (steg 125f; Jonas 15.11.2026: «en trekrakk i stedet for de hvite kassene når de egner eller har pause», and for
- **567** where the work is on this deck: [x, z, heading, task] in the boat's frame (the heading as the view draws it: 0 forward, +pi/2 to starboard)
- **678** what the game says: everyone's station this minute, and the boat's state
- **701** the lines and the fenders round a quay (OB2, Jonas 09.11.2026; docs/planer/om-bord.md F1-F3)
- **819** a free person: something to do for a while, by the weather, the hour and their nature
- **825** no limb through a wall, the rail or anything else (Jonas 23.10.2026: «Sørg også for at mannskapet aldri "clipper" gjennom vegger,
- **1008** the work at its place, clear of everything: at the rail the hands go to the rail's own top (a step back when it is close), at the
- **1030** a cell of one's own: the goals already given are taken, and a new one at least SEP from them (the nearest free cell within a metre)
- **1043** the agents follow the people aboard
- **1184** the body on its way, clear of everything: the shoulders and the chest and back as upright lines; one that would go through a wall
- **1217** no way over the deck between two parts of it (fore and aft of the house on the big boats): through the house, out of sight for
- **1225** the sea legs' room where someone stands (FB4; seaLegs' room, rail and stepOk). Someone upright in the world on a deck that
  - 1377 `sternKit(vt)`
  - 1379 `moorSpots(G, sd)`
  - 1387 `npcCrewCtx(n, G)`
- **1393** the sea legs (FB4, steg 120, 13.11.2026; docs/planer/folk-2.md; Jonas: «at mannskapet oppfører seg som ekte mennesker»): someone
  - 1426 `seaState()`
  - 1430 `seaKnee(dref, dnow)`
- **1431** the feet walking (FB3, steg 121, 16.11.2026; docs/planer/folk-2.md FB3; Jonas 16.11.2026: «Start FB3 i en ny økt»): a foot on
  - 1467 `footState()`
  - 1470 `footSpots(s)`
  - 1472 `footLen(v, reach)`
  - 1487 `footStep(s, inp)`
  - 1494 `footStep1(s, inp)`
- **1550** the limbs (FB2, steg 123, 13.11.2026; docs/planer/folk-2.md; Jonas: «Kjør på med FB2 i en ny økt»): the upper arm, the forearm,
  - 1880 `limbLen(c)`
  - 1892 `ik2(Rt, Tg, L1, L2, pole, o)`
  - 1903 `torsoPt(q, b, tw)`
  - 1905 `torsoInv(q, b, tw)`
  - 1912 `reachBody(sh, tg, reach, b0, o)`
  - 1928 `armIk(s, tg, sd, L, o, cl)`
  - 1973 `armHand(s, hd, sd, L, o, cl)`
  - 1979 `legDrop(hips, feet, L, most)`
  - 1998 `seaLegs(s, inp)`

## `src/js/view3d/00-head.js` (185 linjer)

- **2** 3D VIEW (plain WebGL, no dependencies)
  - 61 `pxTick(dt, fps, now)`
  - 69 `qualSet()`
  - 88 `qmDown(why)`
  - 96 `qmAlive(on)`
  - 101 `qmCrashCheck()`
  - 109 `qmFrame(rdt, now)`
  - 115 `qualTick(dt, fps, now)`
- **157** math
  - 158 `persp(fovy, asp, n, f)`
  - 159 `viewDir(f, up)`
  - 166 `mul(a, b)`
  - 167 `model(px, py, pz, yaw, pitch, roll)`
- **175** noise
  - 176 `vn2(x, y, s)`
  - 180 `vnh(a, b, s)`
  - 181 `fbm(x, y, o, s)`
  - 182 `ridged(x, y)`
  - 183 `rng(seed)`

## `src/js/view3d/01-shaders.js` (914 linjer)

---------- shaders ----------

- **1** shaders
- **178** the sea by the shore (Fysikk 4, F4, 09.11.2026)
- **308** the foam map (Fysikk 4, F1): the foam the boat and the sea leave in the water
- **420** the boat's own foam, when she has way on
- **428** where a slam and the spray land (F3b): four patches, fixed names
- **430** the whitecaps, as the sea shader finds them (WCAPS, F3): where the waves break, the compression of the surface over the
  - 802 `cloudStep(dt)`
  - 809 `skyFrame(u, Hh, tn, bv)`
  - 827 `glsl3(src, fs)`
  - 840 `progStart(vs, fs, attrs, nm = '?')`
  - 850 `progEnd(P)`
  - 860 `program(vs, fs, attrs, nm = '?')`
  - 862 `progWait(list)`
  - 868 `programA(vs, fs, attrs, nm)`
  - 869 `buf(data, target, usage)`
  - 874 `airSet(u, terr)`
  - 889 `sunT0()`
  - 896 `attr(loc, b, size)`
  - 912 `upload(pos, col, idx)`

## `src/js/view3d/02-mesh-terrain.js` (108 linjer)

---------- mesh builder ----------

- **1** mesh builder
  - 2 `MB()`
- **45** terrain
  - 84 `terrRaw(x, z, dil)`

## `src/js/view3d/03-berths-naust.js` (450 linjer)

---------- The water at the berths the company holds in the coast's harbours (core/07e-havn.js) ----------

- **1** The water at the berths the company holds in the coast's harbours (core/07e-havn.js)
  - 8 `berthPits()`
  - 34 `npcPits()`
  - 52 `berthPit(x, z, h)`
- **67** Father's naust and the Finnsnes shop (tools/harbour/naust.py, butikk.py; where: core/07c-naust.js)
  - 84 `rorbuNow()`
  - 90 `sitesNow()`
  - 131 `siteLift(F, o, u, nn)`
  - 141 `siteTerr(x, z, h)`
  - 163 `onSite(x, z)`
  - 173 `tileIn(kind, tx, ty)`
  - 174 `tileH(L, kind, x, z)`
  - 181 `terrH(x, z)`
  - 190 `unitTerr(x, z, h0)`
  - 223 `terrCoarse(x, z, dil)`
  - 233 `forestAt(x, z)`
  - 245 `forestCell(one, LF, ct, c, r)`
  - 252 `coverAt(x, z, cv, ck, k)`
  - 280 `satRead(L, x, z)`
  - 292 `satAt(x, z, cv, o)`
  - 300 `covBlk(LC, bx, by)`
  - 304 `coverRing(LC, ix, iz)`
  - 314 `coverClass(x, z)`
  - 332 `runAll(g)`
  - 334 `sliceRun(J, end)`
  - 335 `meshBegin(x0, z0, sx, sz, n, hf)`
  - 339 `meshRows(B, until)`
  - 357 `gridIdx(n)`
  - 380 `meshEnd(B)`
  - 381 `makeMesh(x0, z0, sx, sz, n, hf)`
  - 382 `freeMesh(m)`
  - 384 `nearSurf(M, x, z)`
  - 394 `unitPatch(U, M)`
  - 419 `buildPatches()`
  - 428 `buildTerrain()`
  - 437 `stream3d()`

## `src/js/view3d/04-vec-packs.js` (399 linjer)

---------- the coast's packs (01c-vec.js, part 4 of the coast-wide plan): buildings, roads, bridges, piers and breakwaters ----------

- **1** the coast's packs (01c-vec.js, part 4 of the coast-wide plan): buildings, roads, bridges, piers and breakwaters
  - 8 `tileStatics()`
  - 37 `tileStep()`
  - 57 `drawTileStatics(TM, eye)`
  - 68 `meshTask(kind, cur, x0, z0, span, n, hf, done)`
  - 87 `meshStep()`
  - 105 `recolorAll(sn)`
  - 106 `recolorStep()`
  - 111 `staleMesh(kind)`
  - 112 `staleOver(pk)`
  - 124 `updateFar()`
  - 135 `meshH(m, x, z)`
  - 140 `shadeH(x, z, dd)`
  - 142 `shSeed(m, old)`
  - 151 `updateShadows()`
  - 190 `sunGridStep(key, d)`
  - 223 `sgUpload(J)`
  - 231 `updateMid()`
  - 243 `finStream()`
  - 257 `updateNear()`
  - 261 `nearWanted()`
  - 271 `fineWanted()`
  - 293 `recolor(m, snow)`
- **387** the breakwaters' armour stones: a mesh a breakwater, drawn only within STONE_R of the eye (beyond it a stone is less than a
  - 391 `stonesOf(list, build)`
  - 396 `drawStones(list, TM, eye)`

## `src/js/view3d/05-quays-breakwaters.js` (425 linjer)

---------- villages and quays ----------

- **1** villages and quays
  - 10 `fyrInto(m, f)`
  - 32 `coneInto(m, x, y, z, r, h, k)`
  - 38 `ballInto(m, x, y, z, r, k)`
  - 43 `prismInto(m, x, y0, z, r, y1, n, k)`
  - 51 `arrowInto(m, x, y, z, deg, k)`
  - 61 `figInto(m, x, y, z, square, k)`
  - 71 `bandsInto(m, x, y0, z, w, y1, ks)`
  - 74 `topInto(m, x, y, z, s, kind)`
  - 88 `markInto(m, mk, tag, solid = true)`
  - 127 `marksStatics()`
  - 138 `buildStatics()`
  - 176 `pierInto(m, q, tag)`
  - 197 `pierPiles(m, q)`
  - 205 `fitAdd(tag, f)`
  - 206 `fitDrop(tag)`
  - 207 `drawFits(eye, VP)`
  - 219 `seaOff(cx, cz, nx, nz, L, ax, az)`
  - 222 `quayFit(m, x, z, ax, az, nx, nz, L)`
  - 237 `slabInto(m, pts, tag, cut)`
  - 256 `bridgeInto(m, br, tag)`
- **297** breakwaters (the user's wish 03.10.2026: they shelter the boats at the quays, and should look it)
  - 305 `rockInto(m, x, y, z, sx, sy, sz, seed, k)`
  - 320 `moundTop(x, z)`
  - 329 `moundInto(m, pts, seed, unit, tag, sm)`
- **393** harbour fittings along the berth faces: tyres hung on chains, a timber fender beam, the yellow edge and bollards
  - 395 `obox(nb, c, u, n, len, wid, y0, h, k)`
  - 401 `buildHarbourFittings()`

## `src/js/view3d/06-buildings-lights.js` (415 linjer)

---------- real buildings (OpenStreetMap), streamed in 1 km chunks inside the terrain corridor ----------

- **1** real buildings (OpenStreetMap), streamed in 1 km chunks inside the terrain corridor
  - 6 `bldCells(key)`
  - 14 `vecBldIn(t, key)`
  - 18 `loadBuildings()`
  - 39 `onQuayStrip(x, z)`
  - 48 `bldNear(x, z, r)`
  - 55 `bldOnUnit(B, i)`
  - 67 `buildChunk(key, detail)`
- **104** details: chimney, windows, doors (only close to the boat)
  - 148 `addTrees(m, key, srcs, snowy, c)`
  - 183 `addRoads(m, key, snowy)`
  - 204 `freeChunk(c)`
  - 205 `updateChunks(maxBuilds)`
  - 222 `drawBuildings(TM)`
  - 245 `lightBridgeY(o)`
  - 248 `lightY(L, x, z)`
  - 252 `lightOn(L, t)`
  - 253 `drawSeaLights(VP, eye, t, near)`
- **268** lights that light up round them at night (the user's wish 03.10.2026)
  - 273 `pickLights(eye, t)`
  - 298 `plSet(u)`
  - 303 `drawBeams(VP, eye, t)`
  - 354 `workLights(type, G)`
  - 371 `airGlow()`
  - 372 `drawWorkCones(VP, eye, t, BMrel, VG)`
  - 408 `drawChunkLights(VP, eye)`

## `src/js/view3d/07-harbour-unit.js` (271 linjer)

---------- the harbour unit (tools/harbour/kaimottak.py): quay, fish plant, crane, forklift, ice silo and bunker station in one ----------

- **1** the harbour unit (tools/harbour/kaimottak.py): quay, fish plant, crane, forklift, ice silo and bunker station in one
  - 8 `unitModel(v)`
  - 20 `onUnit(x, z, m)`
  - 24 `craneGeo(P, q)`
  - 32 `drawUnitParts(P, eye, q, st, k, ch, T)`
- **46** the yard's ship lift (tools/harbour/steder.py; Jonas 07.10.2026: «dock eller slipvogn som kan tørrlegge alle båtene»)
  - 54 `liftStep(dt, b)`
  - 67 `drawYardLift(U, eye, M, UM)`
  - 76 `drawUnits(eye, VP, near, far, skip)`
  - 95 `siteSnow(P, snow)`
  - 109 `siteModel(k)`
  - 119 `drawSites(eye, VP, near, far)`
- **128** sponsors' signs (M7, docs/planer/butikker-og-sponsorer.md F2 and 4.4)
  - 158 `signFlag(t)`
  - 173 `signTex(sp)`
  - 187 `signSeen(M, F, VP, eye)`
  - 199 `drawSigns(eye, VP)`
  - 237 `signOcc(VP)`
  - 256 `signUi(ok, M, F, VP, now)`
  - 270 `signTake()`

## `src/js/view3d/08-plants.js` (884 linjer)

---------- fish plants: the harbour unit's crane, forklift, door and chute at work, and the people on the quay ----------

- **1** fish plants: the harbour unit's crane, forklift, door and chute at work, and the people on the quay
  - 3 `plantLayout(pt)`
  - 13 `buildPlants()`
  - 23 `buildPlantParts()`
  - 62 `roundAt(R, T)`
  - 73 `plantRounds(P)`
  - 95 `workLow(st, T, idx)`
  - 132 `shovelPath(st, eye, T, idx, y)`
  - 156 `workTurn(st, eye, T, idx)`
  - 174 `drawShovel(G, B, tip, full, c, box, top)`
- **185** the cold on the people on deck (OB14, F14): when the cold and the wet cost (13-work.js idleEnv().cold over CHILL), the hood of
  - 190 `deckChill()`
  - 191 `hoodOf(col)`
  - 202 `coldLook(l)`
- **203** the sea legs in the drawing (FB4, steg 120; deckcrew.js seaLegs and SJOBEIN): for someone on a deck at sea (st.sea: whose
  - 211 `seaSet(sim, a, M)`
  - 214 `deckN(M)`
  - 215 `seaNow(st, h, y)`
  - 226 `bootM(foot, h, n)`
  - 231 `leanM(h, lr, lf)`
  - 240 `footNow(st, LL)`
  - 247 `drawWorker(P, st, eye, T, idx)`
  - 252 `drawWorker0(P, st, eye, T, idx)`
- **402** the work on deck, step by step (Jonas 20.10.2026: «Alle deler av arbeidsprosessene må ha egne animasjoner»); the places the
- **512** the breaks (Jonas 23.10.2026: «Husk at vi må ha animasjoner for alle handlinger og aktiviteter»; core/13-work.js idleAssign)
- **569** the legs, the torso, the head and the arms (FB2, steg 123; deckcrew.js LEMMER, ik2, armIk, reachBody, legDrop): the hands
- **632** what he holds close is put clear of his own trunk before the hands are solved, and the hands are where the thing has its
- **750** the new figure (FB7): the joints above in his own frame (x to his right, y up, z back, from where he stands), turned into
- **819** the props of the deck work (the poses above): the fish in the hands and on the table, the guts over the rail, the crate and the

## `src/js/view3d/09-landing-deck.js` (1073 linjer)

---------- landing the catch ----------

- **1** landing the catch
  - 23 `deckSlots(kind)`
  - 39 `fkRun(P, back, Q)`
  - 58 `legAt(g, w)`
  - 67 `landLoad(L, j)`
  - 85 `drawLiveTub(KL, M, K, j)`
  - 91 `hatchSide(G, Hh)`
  - 92 `hatchFishOpen()`
  - 93 `hatchOpenK()`
  - 96 `landOff(L)`
  - 100 `landBack(L)`
  - 111 `shipQuay(P, BMrel, eye, VG)`
  - 117 `shipAim(C, x, z, hook)`
  - 119 `shipPark(C)`
  - 123 `landScene(P, T, BMrel, eye)`
  - 243 `follow(P, key, st, T, v)`
  - 251 `drawPlant(P, eye, VP, T, BMrel)`
  - 324 `plantsCoast(eye)`
  - 332 `nearestPlant(eye)`
- **334** work on deck: the bleeding tub and the gutting table on the after deck; whoever works the deck guts or ices there
  - 336 `deckActivity()`
- **345** the deck kit (the user's wish 19.10.2026, tools/deck/*.py): the fish tubs, the gaff and the knife, the gutting table and
  - 349 `kit(f, nm)`
  - 352 `kitX(f)`
- **363** the hands in their grips (tools/harbour/hender.py): the meshes once for all the figures (the glove is the same on every look),
  - 373 `handMeshes()`
  - 386 `handFrame(z0, sp, side)`
- **393** nothing through a person (Jonas 13.11.2026: «Sørg for at objekter ikke kan clippe inn i menneskene»; the tests' measure of
  - 401 `thingPts(m)`
  - 408 `thingName(m)`
  - 411 `thingBox()`
  - 413 `thingClip(tol)`
  - 434 `handSpecs(st, F, R, hands)`
  - 480 `toolM(A, dir)`
  - 490 `dkFv()`
  - 506 `flapK(T, w)`
  - 508 `flap(T, w, k, sp, kg)`
  - 512 `tug(T, w, m)`
  - 514 `fishSplash(E, kg, n)`
  - 522 `fishSurf(id, y, E, kg, T, w)`
  - 531 `dkEvent(kind, at, sp, kg, o)`
  - 537 `dkFor(who, p, task)`
  - 545 `dkEv(e, BMrel, G)`
  - 547 `catchQ()`
  - 554 `dkTick()`
  - 576 `dkWet(bp, hr)`
  - 580 `dkWetDraw(VP)`
  - 585 `dkBloodDraw(VP)`
  - 596 `rigAt(G, kind, d)`
  - 601 `drawNetTub(BMrel, at, fill, ry)`
  - 609 `drawLineTubs(BMrel, at, n, baited, green, ry, fill)`
  - 620 `drawTub1(M, f, green, top, coil)`
  - 627 `magTubs(BMrel, G)`
  - 630 `magPts(G)`
- **632** the line tubs where the deck crew's account has them (steg 125f, deckcrew.js STAMPER and lineTubs): every tub by itself, in
  - 636 `drawStamper(BMrel, G, LT, fill)`
  - 644 `stamperNow(G)`
  - 647 `drawTubList(BMrel, G, d, F, at)`
  - 656 `drawLineOp(BMrel, G, d, g)`
- **666** the nets aboard (F8, OB3): NET_TUB to a tub, the tubs where the deck has room for them (deckcrew.js netTubs), the first ones
  - 669 `netsAboard(g)`
  - 671 `netTubsNow(G, d, n)`
  - 675 `netFrom(G, d, g)`
  - 676 `drawNets(BMrel, G, d, n)`
  - 678 `drawNetsOp(BMrel, G, d, g)`
  - 682 `jobTubs(j)`
  - 686 `drawMendNet(BMrel, G, d, R)`
  - 700 `drawRigRest(BMrel, G, d)`
- **717** the kit on the model's places (G.kit, from the boat's model; tools/deck): the life-saving gear the rules ask for (V.lsa,
  - 723 `boyeCanvas(txt)`
  - 729 `boyeTex()`
  - 736 `ladderMesh(L)`
  - 744 `boyeQ()`
  - 745 `drawSafety(BMrel, G, VP, t)`
  - 786 `cargoUnits(G)`
  - 787 `drawCargo(BMrel, G, hide)`
  - 802 `crFrames(X, Q, BMrel, p)`
  - 811 `crLink(X, a2)`
  - 814 `drawCrane(BMrel, G, VP, t, d)`
- **875** the fish tubs on an open boat's deck (core/07f-kar.js, docs/planer/fiskekar-dekk.md, Jonas 04.11.2026)
  - 886 `karPlan(key, spec, kg, dims)`
  - 894 `karSpec()`
  - 896 `drawKarLoad(M, load, key, washed)`
  - 915 `karPlaces(vt)`
  - 919 `drawCatchTubs(BMrel, vt, skip, washed)`
  - 925 `karTop(vt, i)`
  - 928 `karFilling(vt)`
- **929** the ice box (tools/deck/fisk.py iskasse, the 300 l tub in blue): it stands on deck at its place (the model's kit.iskasse, under
  - 932 `iceBoxAt(vt)`
  - 938 `iceBoxTop(vt)`
  - 943 `drawIceBox(BMrel, vt, shovelIn)`
  - 954 `shaftM(A, B)`
- **958** the sling (tools/deck/fisk.py slynge_*): the master link on the crane's hook at H (eye-relative, its top), a strap from the ring
  - 960 `drawSling(H, M, swing, k)`
- **978** the bleeding tub (Jonas 04.11.2026: «se at blodet og fisken fyller karet på en ordentlig måte»): the 300 l tub at the model's
  - 982 `drawBleedTub(BMrel, W, d, ux, uz, KT, KW)`
  - 1005 `dkTub(G)`
  - 1006 `drawDeck(BMrel, eye, VP, t, DK)`

## `src/js/view3d/10-gear.js` (800 linjer)

---------- passive gear: buoys at both ends of every set, and the work over the rail when setting and hauling ----------

- **1** passive gear: buoys at both ends of every set, and the work over the rail when setting and hauling
  - 3 `buildGear()`
- **45** the autoline's marks over the stern (H2d2, 06.11.2026)
  - 50 `aMarks(a, b, n, zc)`
  - 63 `aMarksOf(s, zc, key)`
  - 69 `autoMarks(BMrel, eye, t)`
  - 90 `aLive(M, m, t)`
  - 91 `aMarksPush(L, M, filt)`
  - 93 `drawGearSea(eye, t, VP, H)`
  - 130 `drawAutoDrops(eye, t)`
  - 160 `underProf(s, kind)`
  - 178 `drawGearUnder(VP, eye)`
  - 239 `drawSetting(BMrel, t, g, G, stack, x0, over)`
  - 285 `drawAutoSet(BMrel, t, g, G)`
  - 299 `haulFish(g)`
  - 309 `haulModel(kind)`
  - 319 `gopHauls()`
  - 333 `potDeck(G, HP, sx, d, pw, vt, ph)`
  - 344 `potSet()`
  - 349 `potPlaces(G, d, HP, sx, PS)`
  - 357 `drawPotStacks(BMrel, K, n, PS)`
  - 366 `stackTop(K, i, d, PS)`
  - 370 `potsAboard()`
  - 371 `drawPotsAboard(BMrel, G, d, n)`
  - 383 `tankAt(x, z, d, vt)`
  - 401 `drawPots(BMrel, t, g, G, HP, sx, d, skiff, seg)`
  - 463 `drawCrabTank(BMrel, G, d, sx, HP)`
  - 472 `autoPort(G)`
  - 477 `aCleanS(HM, L)`
  - 479 `drawAutoSlides(BMrel)`
  - 486 `drawHaulRest(BMrel, G, d, VP)`
- **509** the upgrades one can see on deck (OPP5 of docs/planer/oppgraderinger.md, 10.11.2026; tools/deck/oppgr.py)
  - 514 `sternPick()`
  - 517 `magLegs(vt, G, P, X)`
  - 519 `drawStern(BMrel, G, VP)`
  - 531 `gaffRail(vt, G)`
  - 551 `drawGaffRest(BMrel, G, VP)`
  - 560 `drawUpg(BMrel, G, d, VP)`
  - 563 `snoHauler(BMrel, G, VP, a)`
- **565** the snow crab vessel's work (H3d2, 08.11.2026; her places are the model's, tools/boats/krabbe50.py anchors.snok and kit.pots,
  - 580 `snoCrabs(BMrel, p, n, pr)`
  - 582 `snoWork(BMrel, t, u, g, s, G, d, base, KP, XP, seg, PS)`
  - 677 `snoSort(BMrel, u, s, g, TS, TB, TW, TL, hole, dch, dOut, TUB, ST, k0…)`
  - 693 `drawGearOp(BMrel, eye, VP, t)`

## `src/js/view3d/11-bunker.js` (65 linjer)

---------- bunker quays: a tank in its bund, the pump with its meter and hose reel, the sign; someone from the boat holds the nozzle ----------

- **1** bunker quays: a tank in its bund, the pump with its meter and hose reel, the sign; someone from the boat holds the nozzle
  - 3 `buildBunkers()`
  - 31 `nearestBunker(eye)`
  - 32 `drawBunker(B, eye, VP, T, BMrel)`

## `src/js/view3d/12-skiff.js` (479 linjer)

---------- boat ----------

- **1** boat
- **3** the starter boat: a 19 ft centre-console skiff, modelled in detail
  - 92 `NB()`
  - 101 `seaLook(l, helm)`
  - 105 `lookMesh(look)`
- **112** the new people (Folk 2, FB7, steg 125): a look's whole figure as one skinned mesh (vessel3d.js figMesh), or two or three
  - 117 `figGrips(ex, sex)`
  - 118 `figOf(K)`
  - 124 `figFree(K)`
  - 127 `drawFig(f, Mb, M)`
  - 136 `nSetup(VP)`
  - 139 `nUni(u, VP)`
  - 145 `wearOn(t)`
  - 146 `wearOff()`
  - 154 `wetTick(key, M, sv, len, beam, top, spd)`
  - 165 `lifeOn(key, M, sv, type, age, keep, spd, G)`
  - 173 `lifeOff()`
  - 177 `bendOn(Fl)`
  - 178 `bendOff()`
  - 181 `drawN(m, M)`
  - 183 `texStrip(Pb, Pt)`
  - 184 `texQuad(P0, P1, P2, P3)`
  - 185 `mkTex()`
  - 186 `upTex(t, cv)`
  - 187 `drawTexQuad(q, tex, M, VP, lit, nrm)`
- **195** the open boats worked by hand: one kit per type
  - 205 `refreshPeople(K)`
  - 219 `useHand(t)`
  - 225 `handKit(t)`
  - 250 `buildSkiff()`

## `src/js/view3d/13-instruments.js` (838 linjer)

---------- the skiff's live instruments ----------

- **1** the skiff's live instruments
  - 13 `engineOn()`
  - 14 `paintPlotter()`
  - 66 `dial(g, cx, cy, r, v0, v1, v, a0, a1, ticks, labels, title, redFr…)`
  - 77 `paintGauges(dt)`
  - 93 `paintVhf()`
  - 105 `placeQ(t)`
  - 108 `drawNames(t, M, VP, liv, nm, port, other, sty)`
  - 129 `buyAt()`
  - 134 `buyShow(nm)`
  - 143 `markCanvas(cv, txt, light)`
  - 149 `markTex(t, liv)`
  - 157 `imgOf(src)`
  - 158 `curLogo()`
  - 159 `logoTexOf(L, img)`
  - 167 `logoQ(t)`
  - 168 `drawLogo(t, M, VP, L, img)`
  - 173 `imgCors(src)`
  - 177 `markQ(t)`
  - 178 `drawMark(t, M, VP, liv)`
  - 182 `callQ(t)`
  - 183 `drawCall(t, M, VP, liv)`
  - 197 `nameCanvas(cv, nm, ink, rv, font)`
  - 225 `nameTex(nm, ink, aspect, mark, font)`
  - 236 `revealTex(nm, ink, aspect, rv, font)`
  - 244 `drawNPCNames(kit, VP)`
  - 256 `paintHand()`
  - 265 `limbM(A, B, r)`
  - 274 `figLive(BMrel, fg)`
  - 286 `armTo(BMrel, W, Sw, Hw, sd, sp)`
  - 304 `skSpot(k)`
  - 314 `skGrid()`
  - 327 `skPath(A, Bp)`
  - 345 `skPathAt(Pt, s)`
  - 351 `skWalkStep(want)`
  - 361 `skWalkDraw(BMrel)`
  - 371 `gunTop(z, side)`
  - 378 `drawSkiff(BMrel, VP, dt, showSkipper, showCrew)`
  - 612 `drawSkiffGlass(BMrel, VP)`
  - 622 `jigRail(t, G)`
  - 655 `drawJigRail(BMrel, VP, t, G, dt)`
  - 690 `drawGlass(m, BMrel, VP)`
  - 709 `drawDrops(m, BMrel, VP, t)`
  - 720 `buildBoat()`
  - 746 `buildFlag()`
  - 758 `flagTex()`
  - 771 `mastTop(G)`
  - 776 `clothInto(a, ph, appW)`
  - 788 `clothStep(C, t, appW)`
  - 789 `updateFlag(t, appW)`
  - 802 `peerFlagTex(n)`
  - 814 `drawPeerFlags(kit, VP, t, H)`

## `src/js/view3d/14-sea.js` (729 linjer)

---------- sea ----------

- **1** sea
  - 3 `buildPatch()`
  - 32 `seaCell(x, z)`
  - 37 `buildSea()`
- **47** the waves: wind sea and swell from the sea model (03b-sea.js)
  - 61 `specW(L0)`
  - 68 `spreadSd(f, ia)`
  - 76 `waveDTStep(dt)`
  - 82 `updateWaves(dt, H)`
- **164** the near field: the short sea rides with the boat
  - 175 `nfStep()`
  - 217 `nfShift(ex, ez)`
- **227** the boat's own waves (the uniforms of WAKE_GLSL)
  - 234 `wakeTrack(x, z, fx, fz, ds)`
  - 253 `wakeTU(u, ox, oz)`
  - 254 `updateWake()`
  - 283 `wakeHFast(x, z)`
- **296** the foam map: the foam the boat and the sea leave in the water (Fysikk 4, F1, 27.10.2026)
  - 310 `foamFree()`
  - 311 `foamInit()`
  - 329 `wavePh()`
  - 339 `foamStep(dt, t)`
  - 407 `foamSplash(Dx, Dz)`
  - 428 `foamNPC(qx, qz, Dx, Dz, gx, gz)`
  - 468 `foamBind(u, t)`
  - 485 `grpAt(i, c, x, z, t)`
- **494** The breaking sea in the view (Ø9 F7, 03b-sea.js): the group the core's rule has on the water near her (brottNear), drawn as one
  - 503 `brvE(x, z)`
  - 504 `brvStep()`
  - 522 `brvSet(u)`
- **554** the sea by the shore (Fysikk 4, F4, 09.11.2026)
  - 569 `shoalPrep(J)`
  - 570 `shoalCell(J, k, land, dd)`
  - 574 `shoalSweep(J, end)`
  - 588 `shoalPut(J)`
  - 594 `shTex(u, v, out)`
  - 601 `shoalAt(x, z)`
  - 615 `shW(c, SH, out)`
  - 621 `surfK(h)`
  - 623 `surfStep(t)`
  - 629 `shoalBind(u, t)`
- **637** the sea state over the near terrain and the whole map
  - 644 `ssLevel(n, unit)`
  - 646 `ssRect(L)`
  - 647 `ssWork(L, until)`
  - 670 `ssStep(rdt)`
  - 672 `ssBlend(L)`
  - 674 `ssTex(L, x, z, out)`
  - 681 `ssAt(x, z)`
  - 691 `seaQ(S, ren)`
  - 694 `seaDisp(x, z, t, S, fade, SH)`
  - 718 `seaFade(x, z)`
  - 719 `seaH(x, z, t)`
  - 725 `seaHFast(x, z, t)`
  - 727 `shoalHere(x, z)`

## `src/js/view3d/14b-fft.js` (271 linjer)

---------- the short sea from FFT tiles (Bølgene B1, docs/planer/bolgene.md, 12.11.2026) ----------

- **1** the short sea from FFT tiles (Bølgene B1, docs/planer/bolgene.md, 12.11.2026)
  - 13 `fftWorker()`
  - 32 `fftOff(why)`
  - 38 `fftInit()`
  - 59 `fftParams(t)`
  - 81 `fftBlInit()`
  - 98 `fftBlGot(tC)`
  - 105 `fftBlend(now)`
  - 122 `fftGot(D)`
  - 148 `fftKeep(a)`
  - 155 `fftKeepS(bufs)`
  - 164 `fftTrH(x, z, only2)`
  - 182 `fftAt(x, z, lod)`
  - 194 `fftA0()`
  - 197 `fftSyncAt(tw)`
  - 205 `fftStep(t)`
  - 226 `fftBind(u, eye)`
  - 260 `seaShared(u, t)`

## `src/js/view3d/15-env-mooring.js` (226 linjer)

---------- environment ----------

- **1** environment
  - 3 `pal(el)`
  - 12 `wetSet(H)`
  - 25 `computeEnv(H)`
- **71** mooring: in along the quay, then the lines: aft spring first, bow line, stern line, fore spring (and in reverse when casting off)
  - 81 `buildMooring()`
  - 83 `berthNow()`
  - 89 `approach(F, bp, u0, du0)`
  - 100 `pathM(pts)`
  - 105 `pathAt(M, s)`
  - 106 `lieAlongside(dt, bp)`
  - 109 `moorStep(dt, bp, at = dt)`
- **149** where the work with the lines and the fenders is in the view, every frame (OB2): the spell as the view has it ('prep' and 'in' the
  - 152 `moorView(bp)`
  - 162 `moorTick(bp)`
  - 188 `drawCoil(BMrel, P, sd)`
  - 193 `drawMooring(BMrel, eye, VP, t)`

## `src/js/view3d/16-motion.js` (322 linjer)

---------- boat motion ----------

- **1** boat motion
  - 2 `currentFrac()`
  - 3 `predict(frac)`
- **11** along the route (Jonas 06.10.2026: «båten strengt må følge rutestreken som lages i kartplotteren», «Svingingen kan være
  - 24 `trkBuild(pl, dep)`
  - 51 `trkAt(T, s)`
  - 57 `trkProj(T, x, z, s0, back = 30)`
  - 67 `trkOn()`
  - 83 `trkHaltNeed()`
  - 88 `trkStep(dt, pr)`
  - 130 `dynSoon()`
  - 133 `dynFollow(dt)`
  - 141 `updateBoat(dt, t, frac, rdt)`
- **240** the hull in the sea: buoyancy per section (Fysikk 4 F2, 07.11.2026; docs/planer/fysikk-4-sjo-og-skrog.md, Jonas' choice 2B)
  - 256 `hullSea(G, Bs, t, tf, dt)`
  - 278 `hullMove(dt, b)`
  - 298 `slamLog(v)`
- **307** particles
  - 311 `spawn(x, y, z, vx, vy, vz, life, g)`
  - 313 `drawPts(n, mode, VP, col, size, round, off, mx)`

## `src/js/view3d/17-draw.js` (296 linjer)

---------- drawing ----------

- **1** drawing
  - 2 `litSetup(VP)`
  - 8 `drawLit(m, M, hole)`
  - 17 `terProg(q)`
  - 36 `dryIdx(m, thr)`
  - 52 `dryThr(eye, near)`
  - 61 `drawTerrain(TM, eye, VP, near)`
  - 89 `buildGround()`
  - 100 `maskOr(J, x, z)`
  - 101 `groundStep()`
  - 141 `buildLandMask()`
  - 164 `lmStep()`
  - 211 `skyMask(eye, Vm, fov, asp, farZ)`
  - 222 `seaRing(u, eye, y, R, Hl)`
  - 239 `drawSea(VP, eye, t, far, drop)`

## `src/js/view3d/17b-inland-water.js` (152 linjer)

---------- the fresh water: lakes, ponds, rivers, streams and waterfalls (G2 of docs/planer/grafikk-natur-og-miljo.md) ----------

- **1** the fresh water: lakes, ponds, rivers, streams and waterfalls (G2 of docs/planer/grafikk-natur-og-miljo.md)
  - 26 `waterData(tx, ty)`
  - 42 `waterMesh(P, A)`
  - 82 `waterNear(W, ex, ez)`
  - 110 `freeWater(m)`
  - 114 `updateWater(eye)`
  - 131 `staleWater(pk)`
  - 135 `drawWater(VP, eye)`

## `src/js/view3d/17c-trees.js` (103 linjer)

---------- the trees (G4 of docs/planer/grafikk-natur-og-miljo.md) ----------

- **1** the trees (G4 of docs/planer/grafikk-natur-og-miljo.md)
  - 12 `treeExt()`
  - 14 `treeModels()`
  - 39 `treeSpecies(needle, x, z, y, h, r)`
  - 47 `treeChunk(c, key, occ, snowy)`
  - 55 `treePlant(c)`
  - 73 `treeFree(c)`
  - 75 `treeSeasonU()`
  - 79 `drawTrees(VP, eye)`

## `src/js/view3d/17d-vind.js` (96 linjer)

---------- the wind turbines and the power lines over the sea (G7 of docs/planer/grafikk-natur-og-miljo.md) ----------

- **1** the wind turbines and the power lines over the sea (G7 of docs/planer/grafikk-natur-og-miljo.md)
  - 11 `vindModels()`
  - 37 `vdGround(x, z, now)`
  - 43 `vdSpan(s, now)`
  - 51 `vdBuild(eye, now)`
  - 71 `drawVind(VP, eye, dt, far)`

## `src/js/view3d/17e-life.js` (174 linjer)

---------- life in the landscape (G9 of docs/planer/grafikk-natur-og-miljo.md) ----------

- **1** life in the landscape (G9 of docs/planer/grafikk-natur-og-miljo.md)
  - 13 `lifeModels()`
  - 26 `lifeCls(x, z)`
  - 34 `lifeGrid(eye, g, R, salt, f)`
  - 38 `lifeBuild(eye, now)`
  - 99 `roadAt(xs, zs, cum, s)`
  - 103 `drawLife(eye, t, VP)`
  - 146 `lifePts(VP, eye, t, far)`

## `src/js/view3d/17f-near.js` (92 linjer)

---------- the near field on land (G8 of docs/planer/grafikk-natur-og-miljo.md) ----------

- **1** the near field on land (G8 of docs/planer/grafikk-natur-og-miljo.md)
  - 12 `nearModels()`
  - 33 `nearSquare(i, j)`
  - 61 `drawNear(VP, eye, t)`
  - 62 `drawNear0(VP, eye, t)`

## `src/js/view3d/17g-marina.js` (61 linjer)

---------- the small-boat harbours (G10 of docs/planer/grafikk-natur-og-miljo.md) ----------

- **1** the small-boat harbours (G10 of docs/planer/grafikk-natur-og-miljo.md)
  - 9 `marinaModels()`
  - 27 `marinaBuild(eye, now)`
  - 49 `drawMarinas(eye, t, VP)`

## `src/js/view3d/17h-shore.js` (93 linjer)

---------- the beaches, the shingle and the cliffs by the sea (G10 of docs/planer/grafikk-natur-og-miljo.md) ----------

- **1** the beaches, the shingle and the cliffs by the sea (G10 of docs/planer/grafikk-natur-og-miljo.md)
  - 8 `shoreData(tx, ty)`
  - 71 `updateShore(eye)`
  - 86 `staleShore(pk)`
  - 87 `drawShore(VP)`

## `src/js/view3d/17i-rocks.js` (181 linjer)

---------- the skerries (Ø13 K4, docs/planer/kartrelease-o13.md; the rest of G10, 11.11.2026) ----------

- **1** the skerries (Ø13 K4, docs/planer/kartrelease-o13.md; the rest of G10, 11.11.2026)
  - 28 `rockShape(qx, qy)`
  - 37 `rockPoint(S, ang, s, out)`
  - 49 `rockCol(S, x, y, z, out)`
  - 80 `updateRocks(eye)`
  - 114 `drawRocks(VP, eye)`
  - 139 `drawRockFoam(VP, eye, t)`
  - 175 `rocksInfo(ax, az)`

## `src/js/view3d/18-setup.js` (265 linjer)

---------- setup ----------

- **1** setup
  - 30 `seaMarksSettle()`
  - 94 `prep()`
  - 95 `initGL(pre)`
  - 212 `init()`
  - 243 `anchorAlarm3d(kind)`
  - 246 `sayBoat(id, txt)`
  - 248 `sayWorker(pid, idx, nm, no, en)`
  - 252 `crewFx3d(c, kind, o)`
  - 254 `say3d(c, no, en)`
  - 258 `buildLabels()`
  - 259 `resize()`

## `src/js/view3d/19-wildlife-npc.js` (200 linjer)

---------- wildlife ----------

- **1** wildlife
  - 2 `bodyLoft(m, L, R, prof, col, belly, y0)`
  - 6 `buildWild()`
  - 33 `wildSpawn(t)`
  - 47 `blow(x, y, z)`
  - 48 `drawWild(eye, t, dt, M0)`
  - 102 `drawBlows(VP, eye, dt)`
- **112** other vessels
  - 113 `shipHull(m, L, B, D, F, hull, bottom, deck)`
  - 120 `windows(m, x0, x1, y, z, h, col, sideX)`
  - 121 `buildNPC()`
  - 151 `pvm(t, liv)`
  - 165 `pvmHull(t, liv, tier)`
  - 176 `ownTier(t, M)`
  - 184 `personMesh(kind, look, key)`
  - 196 `people()`

## `src/js/view3d/20-trawl-seine.js` (607 linjer)

---------- the trawl (tools/boats/tral60.py; Jonas 06.10.2026: «en tråler har slike tråldører på hekken som senkes i havet ved

- **1** the trawl (tools/boats/tral60.py; Jonas 06.10.2026: «en tråler har slike tråldører på hekken som senkes i havet ved
  - 8 `trawlKit(t)`
  - 15 `ropeKit()`
  - 22 `alongM(A, d)`
  - 29 `trawlState(now)`
  - 38 `drawTrawl(t, A, BMrel, now, stO)`
- **63** the purse seine (tools/boats/not75.py; Jonas 06.10.2026: «Denne kan både bruke ringnot og trål og trenger dermed
  - 69 `seineState(now)`
  - 79 `drawSeine(t, A, BMrel, VP, now, stO)`
  - 121 `footsOf(A, me)`
  - 122 `drawDeckCrew(BMrel, eye, VP, t, G)`
  - 247 `spHold(f)`
  - 250 `deckWork(G)`
  - 258 `drawHelmKit(BMrel, eye, G)`
  - 270 `sailOf(t)`
  - 271 `drawSail(t, M, set)`
  - 275 `drawHatch(t, G, M, k)`
  - 282 `shipCraneOf(t)`
  - 283 `shipCraneAim(C, pose)`
  - 290 `drawShipCrane(t, G, M, pose)`
  - 300 `drawVessel(t, G, BMrel, VP, skipper, ncrew, onDeck, liv, named)`
  - 345 `npcGear(n)`
  - 357 `npcGearT(n)`
  - 378 `npcKB(t, lod, liv)`
  - 382 `nkbCap()`
  - 390 `npcMesh(n, lod)`
  - 404 `npcWarm(eye)`
  - 421 `seineAnch(G)`
  - 431 `npcClock(Hf)`
  - 439 `npcHead(n, t)`
  - 454 `npcFollow(n, t)`
  - 473 `npcRev(n)`
  - 482 `npcPhase(id)`
  - 487 `kvDraw(n, eye, t)`
  - 495 `kvRibDraw(n, R, G, M, eye, t)`
  - 521 `npcFrame(H)`
  - 522 `drawNPC(eye, t, H, VP)`
  - 583 `npcCrewDraw(n, K, eye, t)`

## `src/js/view3d/21-rescue-anchor.js` (255 linjer)

---------- the rescue boat (tools/boats/redning.py) and its tow line, where core/05-vessels.js towPose says ----------

- **1** the rescue boat (tools/boats/redning.py) and its tow line, where core/05-vessels.js towPose says
  - 4 `drawTowLine(BMrel, VP)`
- **14** the boat's own anchor (tools/deck/anker.py, core/06e-anchor.js; Jonas 21.10.2026)
  - 27 `frameM(o, z, up, s)`
  - 29 `drawMany(m, Ms)`
  - 31 `ancMesh(bw)`
  - 36 `ancStow(F, P, bw, L)`
  - 47 `rodePts(A, F, Lr, n)`
  - 60 `rodeDraw(pts, dm, rope, wy, Lr, CH, M)`
  - 82 `ancSplash(x, y, z, n, up)`
  - 85 `drawNPCAnchor(n, K)`
  - 89 `drawAnchor(BMrel, eye, VP, t)`
- **137** man overboard (Ø11.6, core/14b-sikkerhet.js): the person in the water, the lifebuoy with its light and its smoke, and the
  - 147 `mobKitBack()`
  - 149 `mobLook(M)`
  - 154 `drawMob(BMrel, eye, VP, t)`
  - 216 `drawMobLights(VP, t)`
  - 226 `buildRescue()`
  - 232 `drawRescue(BMrel, eye, VP, t)`
  - 247 `drawRescueLights(VP, t)`

## `src/js/view3d/22-docks-air.js` (269 linjer)

---------- the coast harbours' floating docks and mooring buoys (core/05-vessels.js moorHarbour, tools/harbour/brygge.py) ----------

- **1** the coast harbours' floating docks and mooring buoys (core/05-vessels.js moorHarbour, tools/harbour/brygge.py)
  - 5 `buildDocks()`
  - 14 `quayFill()`
  - 25 `drawDocks(eye, t, VP)`
- **83** the floating docks among the packs' piers (01c-vec.js flyteTile, tools/harbour/brygge.py; tilbakemelding #94)
  - 96 `floatFree(k)`
  - 97 `floatJob(t, FD, solid)`
  - 148 `drawFloats(eye, t, VP)`
- **166** aircraft (tools/air/fly.py) where core/05c-air.js airStates puts them, within about 15 km of the eye
  - 168 `buildAir()`
  - 173 `drawAir(eye, t, H, VP)`
  - 187 `drawAirLights(VP, t)`
  - 197 `drawNPCGlass(VP)`
- **198** the lanterns in thick weather (Ø11.2; sjøveisreglene rule 20 c and vedlegg I, read 06.11.2026)
  - 204 `lanternFog()`
  - 205 `lampFade(d, kind, L, LF)`
  - 218 `lampArc(M, lp, lk)`
  - 231 `lampsMore(L3, st, len)`
  - 239 `drawNPCLights(VP)`

## `src/js/view3d/23-camera-frame.js` (104 linjer)

---------- the chase camera stays out of solid things ----------

- **1** the chase camera stays out of solid things
  - 7 `camSolid(x, z, sx, sz, ry, y0, y1, tag)`
  - 14 `camBuildings(key)`
  - 22 `camBld(B, idx, tag)`
  - 33 `camDropTag(tag)`
  - 36 `camFree(o, e)`
  - 59 `camInside(x, y, z)`
  - 66 `compassStrip(W, H, dpr)`
  - 81 `compassDraw(az, p)`
- **94** frame
  - 98 `fpsEl()`

## `src/js/view3d/24-cinema.js` (806 linjer)

---------- cinema (the user's wish 03.10.2026; a director of fourteen shots 01.11.2026) ----------

- **1** cinema (the user's wish 03.10.2026; a director of fourteen shots 01.11.2026)
  - 24 `kinoLand()`
  - 31 `kinoSight(a, b)`
  - 36 `kinoWant(K, t, B)`
  - 82 `kinoOk(K, t)`
  - 92 `kinoMake(type, t, land)`
  - 112 `kinoNext(t, want, why)`
  - 130 `kinoCam(t, rdt)`
  - 155 `introStart(sec)`
- **161** the picture watched (02.11.2026; Jonas: «Det er viktig at vi fanger opp så mye potensielle feil som oppstår så fort som
  - 180 `gfxErr(msg, ctx)`
  - 185 `glReport(e, tag)`
  - 187 `glProbe(tag)`
  - 194 `gfxStart(now)`
  - 202 `gfxJudge(px, day, vis)`
  - 209 `gfxPix(j)`
  - 216 `gfxNaN(eye, VPn)`
  - 226 `gfxEnd(now, eye, VPn, W, Hh)`
  - 268 `frameClock(raw)`
  - 284 `frame()`
  - 289 `frame0()`
  - 518 `snapTake()`
  - 523 `drawRoute(VP, eye)`
  - 546 `driftSpray(VP, eye, dt, t, col)`
  - 573 `drawSmoke(VP, eye, BM, dt)`
  - 614 `scupperWater(VP, eye, BM, dt, t, col)`
  - 648 `splashFoam(x, z, r, a)`
  - 650 `drawEffects(VP, eye, BM, dt, t)`
  - 788 `updateLabels(VP, eye, W, Hh)`

## `src/js/view3d/25-controls.js` (282 linjer)

---------- controls ----------

- **1** controls
  - 14 `studioHud()`
  - 24 `paintView(on)`
  - 29 `paintAim(C, yawW)`
  - 40 `tryView(k)`
  - 41 `hoist(k)`
  - 43 `tryEq()`
  - 49 `liftY(k)`
  - 53 `showroom(type)`
  - 62 `show(on, auto)`
  - 78 `bench(ks, ns)`
  - 101 `benchPeers(n)`
- **128** the profile (#prof, F1)
  - 138 `pqInit()`
  - 146 `pqPoll()`
  - 155 `profBegin(rdt, j0)`
  - 158 `profMark(k)`
  - 162 `profEnd()`
  - 172 `prof(sets)`
