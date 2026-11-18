"""Land in a harbour stops the boat (17.11.2026, tilbakemelding #133 and #137). groundCheck (core/01-world.js) skipped everything within
600 m of a harbour point (inHarbour: the harbours are dredged), the coast's own land too, so a boat off her line there sailed over an
island or through a mole and was stopped only by the first land outside, 600 m out. Now the depth is still not asked there, but the
coast's own land is (isLandHarbour), without a harbour unit's block and fill and the quay pockets.
Seen red before the fix: Husøy west over the island null, south through the mole 600 m, Tufjord towards where a boat ran aground 602 m.
Husøy is in every build; Tufjord (mF377) only with the whole coast. LITE. Prints OK or FEIL per check."""
from _env import GAME, boot
import asyncio, json
from playwright.async_api import async_playwright


def ok(c): return 'OK  ' if c else 'FEIL'


JS = """(async () => {
  const at = async (id, dx, dy) => { const H = portById(id); if (!H) return null; await mapNeed(H.p, 14); const a = H.p, c = {x:a.x + dx, y:a.y + dy};
    let land = 0; for (let k = 1; k <= 100; k++) if ((typeof isLandHarbour === "function" ? isLandHarbour : isLand)({x:a.x + dx * k / 100, y:a.y + dy * k / 100})) land++;
    const g = groundCheck(a, c); return {land, gc:g ? Math.round(dist(a, g) * 1000) : null}; };
  // the way out of the harbour is still free: south-west of Tufjord, and the boat leaves Husøy by Autonav as before
  return JSON.stringify({w:await at('husoy', -1.5, 0), s:await at('husoy', 0, 0.6), tuf:await at('mF377', -0.6, 0.5), tufOut:await at('mF377', 0, 0.6)}); })()"""


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await br.new_page(viewport={'width': 1200, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg)
        r = json.loads(await pg.evaluate(JS)); print(json.dumps(r))
        w, s = r['w'], r['s']
        print(ok(w['land'] > 0 and w['gc'] is not None and w['gc'] < 300), 'Husøy: a straight line west over the island stops at its shore, not on the other side', w)
        print(ok(s['land'] > 0 and s['gc'] is not None and s['gc'] < 600), 'Husøy: a line south through the mole stops at the mole, inside the harbour', s)
        if r['tuf']:
            print(ok(r['tuf']['gc'] is not None and r['tuf']['gc'] < 590), 'Tufjord: towards where a boat ran aground 602 m out, she stops at the first land in the harbour', r['tuf'])
            print(ok(r['tufOut']['land'] == 0 and r['tufOut']['gc'] is None), 'Tufjord: the way out over water is still free', r['tufOut'])
        else:
            print('(Tufjord not in this build: the whole coast is needed)')
        # a harbour unit's quay is seen as well (tilbakemelding #138 and #103: Autonav took her from the plant's quay straight into the
        # quay ahead): a leg from the water through the unit's block stops at the block; one ending at the block (her berth) is free
        q = await pg.evaluate("""(async () => { const H = portById('mN141'); if (!H) return 'none'; await mapNeed(H.p, 14); const U = UNITA.filter(u => Math.hypot(u.o[0] - H.p.x * 1000, u.o[1] - H.p.y * 1000) < 2000)[0]; if (!U) return null;
          let blk = null; for (let r = 0; r <= 120 && !blk; r += 4) for (let k = 0; k < 32 && !blk; k++){ const p = {x:(U.o[0] + Math.sin(k / 16 * Math.PI) * r) / 1000, y:(U.o[1] - Math.cos(k / 16 * Math.PI) * r) / 1000}; if (onUnitGround(p) && !landNat0(p)) blk = p; }
          if (!blk) return null; let sea = null;
          for (let r = 0.08; r <= 0.2 && !sea; r += 0.02) for (let k = 0; k < 24 && !sea; k++){ const p = {x:blk.x + Math.sin(k / 12 * Math.PI) * r, y:blk.y - Math.cos(k / 12 * Math.PI) * r}; if (!isLand(p) && !onUnitGround(p) && inHarbour(p)){ let clear = true; for (let j = 1; j < 20; j++){ const m = {x:p.x + (blk.x - p.x) * j / 20, y:p.y + (blk.y - p.y) * j / 20}; if (onUnitGround(m) || isLandHarbour(m)){ clear = j > 12; break; } } if (clear) sea = p; } }
          if (!sea) return null; const far = {x:blk.x + (blk.x - sea.x) * 0.5, y:blk.y + (blk.y - sea.y) * 0.5};
          const g = groundCheck(sea, far), g2 = groundCheck(sea, blk);
          return {through:g ? Math.round(dist(sea, g) * 1000) : null, toBlk:Math.round(dist(sea, blk) * 1000), berth:g2 ? Math.round(dist(sea, g2) * 1000) : null}; })()""")
        if q == 'none': print('(Myre not in this build: the whole coast is needed)')
        else: print(ok(q and q['through'] is not None and q['through'] <= q['toBlk'] + 5), 'Myre (#138): a leg from the water into the plant\'s quay where it stands out over the sea stops at the quay', q)
        print('sidefeil', errs)
        await br.close()


asyncio.run(main())
