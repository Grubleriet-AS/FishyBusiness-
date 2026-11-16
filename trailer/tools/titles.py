"""The trailer's words on screen and its end card, as transparent PNGs the size of the picture, drawn by Chromium from HTML.

    python trailer/tools/titles.py [--size 1080x1920] [--out trailer/out/titles]

Each place name and line from trailer/script.md in Source Serif 4 Display Semibold (tools/brand/fonts/, the game's serif, OFL), white,
as film titles (Jonas 10.11.2026: «Det må se proft, gjennomført og cinematisk ut»): the places in capitals with wide tracking and a
thin rule under, the two lines of the journey in sentence case, a faint shadow only to lift them off bright water; in the lower part of
the middle third (above TikTok's buttons). The end card lies over the last shot: the anchor logo (src/brand/logo.svg) in white with a
soft glow, the address under it in tracked capitals, and a shade that darkens the picture behind them. No map credit in the picture
(Jonas 10.11.2026); it goes in the post's text. Written: <out>/<key>.png for trailer/tools/assemble.py."""
import os, sys, argparse, asyncio, base64
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT = os.path.join(ROOT, 'tools', 'brand', 'fonts', 'SourceSerif4-Display-Semibold.ttf')
LOGO = os.path.join(ROOT, 'src', 'brand', 'logo.svg')
PLACES = {'finnsnes': 'Finnsnes', 'lofoten': 'Lofoten', 'lofotfisket': 'Lofotfisket', 'midnattssol': 'Midnattssol', 'varanger': 'Varanger',
          'hvaler': 'Hvaler', 'rorvik': 'Rørvik', 'bodo': 'Bodø', 'tromso': 'Tromsø', 'hammerfest': 'Hammerfest', 'kirkenes': 'Kirkenes',
          'svalbard': 'Svalbard', 'skottland': 'Skottland', 'faeroyene': 'Færøyene', 'gronland': 'Grønland'}
LINES = {'fra': 'Fra trebåt …', 'til': '… til snurper'}

# the launch trailer (m3, docs/planer/lanseringstrailer.md): the same shots in two languages, --lang no|en
M3 = {
  'no': {'places': {'finnsnes': 'Finnsnes', 'svalbard': 'Svalbard', 'hvaler': 'Hvaler', 'tromso': 'Tromsø', 'kirkenes': 'Kirkenes',
                    'skottland': 'Skottland', 'faeroyene': 'Færøyene', 'gronland': 'Grønland', 'varanger': 'Varanger'},
         'claims': {'hook': 'Et online fiskespill', 'start': 'Du begynner med fars gamle trebåt', 'fish': 'Du fisker selv',
                    'sell': 'Lever. Tjen. Kjøp større.', 'coast': 'Hele norskekysten', 'beyond': '… og havet utenfor',
                    'fleet': 'Eget mannskap. Egen flåte.', 'online': 'Online. Alle seiler i samme hav.'},
         'tag': 'Early access · Alt er ekte spillgrafikk', 'ea': 'Early access · Vær med fra starten', 'url': 'Spill gratis online på detstorebla.no'},
  'en': {'places': {'finnsnes': 'Finnsnes', 'svalbard': 'Svalbard', 'hvaler': 'Hvaler', 'tromso': 'Tromsø', 'kirkenes': 'Kirkenes',
                    'skottland': 'Scotland', 'faeroyene': 'Faroe Islands', 'gronland': 'Greenland', 'varanger': 'Varanger'},
         'claims': {'hook': 'An online fishing game', 'start': "You start with your father's old wooden boat", 'fish': 'You do the fishing',
                    'sell': 'Land it. Sell it. Buy bigger.', 'coast': 'The whole Norwegian coast', 'beyond': '… and the sea beyond',
                    'fleet': 'Your crew. Your fleet.', 'online': 'Online. Everyone sails the same sea.'},
         'tag': 'Early access · All footage captured in-game', 'ea': 'Early access · Join from the start', 'url': 'Play free online at detstorebla.no'},
}
SUBS = {'svalbard': '78°58′N  12°06′E'}   # a line under a place, like an entry in the log

def page(body, w, h, bg='transparent', pad=90):
    f = base64.b64encode(open(FONT, 'rb').read()).decode()
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:SS4;src:url(data:font/ttf;base64,{f}) format('truetype');}}
html,body{{margin:0;width:{w}px;height:{h}px;background:{bg};overflow:hidden}}
.t{{position:absolute;left:0;right:0;text-align:center;font-family:SS4;color:#f7f4ee;
  text-shadow:0 1px 2px rgba(0,0,0,.28),0 0 22px rgba(0,0,0,.22)}}
.cap{{text-transform:uppercase;letter-spacing:.42em;text-indent:.42em}}
.band{{position:absolute;left:-10%;right:-10%;background:radial-gradient(ellipse 50% 50% at 50% 50%, rgba(11,23,32,.62), rgba(11,23,32,.32) 55%, rgba(11,23,32,0) 100%)}}
.c{{padding:0 {pad}px}}
.rule{{position:absolute;left:50%;height:2px;background:rgba(247,244,238,.75);box-shadow:0 0 8px rgba(0,0,0,.25)}}
</style></head><body>{body}</body></html>"""

async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--size', default='1080x1920'); ap.add_argument('--out', default=None); ap.add_argument('--lang', default=None, help='no or en: the launch trailer m3 in that language')
    a = ap.parse_args(); w, h = map(int, a.size.split('x')); k = w / 1080
    a.out = a.out or os.path.join(ROOT, 'trailer', 'out', 'titles' + ('-' + a.lang if a.lang else '')); os.makedirs(a.out, exist_ok=True)
    T = M3.get(a.lang)
    svg = open(LOGO, encoding='utf-8').read().replace('currentColor', '#f5f8fc')
    logo_w = int(500 * k); logo_h = int(logo_w * 1620 / 1376)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': w, 'height': h})
        async def shot(name, html, omit=True):
            await pg.set_content(html); await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(100)
            await pg.screenshot(path=os.path.join(a.out, name + '.png'), omit_background=omit)
        y = int(h * 0.27)   # the upper third: sky in nearly every shot, below TikTok's bar at the top (the boats are low in the frame)
        if T:
            # m3: claims in sentence case over a soft dark band, places as stamps (tracked capitals, a rule, a sub-line), a small tag line
            bh = int(420 * k)
            for key, txt in T['claims'].items():
                await shot(key, page(f'<div class="band" style="top:{y - bh // 2 + int(40 * k)}px;height:{bh}px"></div>'
                                      f'<div class="t c" style="top:{y}px;font-size:{int(84 * k)}px;line-height:1.12">{txt}</div>', w, h, pad=int(90 * k)))
            ys = int(h * 0.36)
            for key, txt in T['places'].items():
                rw = int(70 * k); sub = SUBS.get(key)
                await shot(key, page(f'<div class="band" style="top:{ys - int(130 * k)}px;height:{int(360 * k)}px"></div>'
                                      f'<div class="t cap" style="top:{ys}px;font-size:{int(70 * k)}px">{txt}</div>'
                                      f'<div class="rule" style="top:{ys + int(108 * k)}px;width:{rw}px;margin-left:{-rw // 2}px"></div>'
                                      + (f'<div class="t cap" style="top:{ys + int(130 * k)}px;font-size:{int(28 * k)}px;letter-spacing:.24em;text-indent:.24em">{sub}</div>' if sub else ''), w, h))
            await shot('tag', page(f'<div class="t cap" style="top:{int(h * 0.125)}px;font-size:{int(30 * k)}px;letter-spacing:.2em;text-indent:.2em">{T["tag"]}</div>', w, h))
        for key, txt in ({} if T else PLACES).items():
            rw = int(70 * k)
            await shot(key, page(f'<div class="t cap" style="top:{y}px;font-size:{int(62 * k)}px">{txt}</div>'
                                  f'<div class="rule" style="top:{y + int(98 * k)}px;width:{rw}px;margin-left:{-rw // 2}px"></div>', w, h))
        for key, txt in ({} if T else LINES).items():
            await shot(key, page(f'<div class="t" style="top:{y - int(10 * k)}px;font-size:{int(92 * k)}px;letter-spacing:.015em">{txt}</div>', w, h))
        glow = f'filter:drop-shadow(0 0 {int(26 * k)}px rgba(255,255,255,.28)) drop-shadow(0 {int(4 * k)}px {int(18 * k)}px rgba(0,0,0,.35))'
        logo = f'<div style="position:absolute;left:{(w - logo_w) // 2}px;top:{int(h * 0.15)}px;width:{logo_w}px;height:{logo_h}px;{glow}">{svg}</div>'
        await shot('logo', page(logo, w, h))
        uy = int(h * 0.15) + logo_h + int(90 * k)
        if T:   # m3: early access over the address, both large enough to read on a phone
            await shot('url', page(f'<div class="t cap" style="top:{uy}px;font-size:{int(30 * k)}px;letter-spacing:.26em;text-indent:.26em;opacity:.92">{T["ea"]}</div>'
                                    f'<div class="t" style="top:{uy + int(70 * k)}px;font-size:{int(54 * k)}px">{T["url"]}</div>', w, h, pad=int(60 * k)))
        else:
            await shot('url', page(f'<div class="t cap" style="top:{uy}px;font-size:{int(34 * k)}px;letter-spacing:.32em;text-indent:.32em">Spill gratis på detstorebla.no</div>', w, h))
        # the shade behind the end card: darker towards the middle and the foot, so the logo stands on the picture without a box
        await shot('shade', page('<div style="position:absolute;inset:0;background:radial-gradient(ellipse 85% 55% at 50% 33%, rgba(4,12,22,.55), rgba(4,12,22,.15) 70%, rgba(4,12,22,0)),linear-gradient(to bottom, rgba(4,12,22,0) 55%, rgba(4,12,22,.45))"></div>', w, h))
        await b.close()
    print('titler i', a.out)

asyncio.run(main())
