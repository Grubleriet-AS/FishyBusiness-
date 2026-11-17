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
        print('sidefeil', errs)
        await br.close()


asyncio.run(main())
