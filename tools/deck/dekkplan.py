"""The decks of the coast's boats drawn from above (steg 125c, Jonas 15.11.2026): what stands on deck, where each man works and the
way of the fish, from tests/out/dekkplan.json (node tests/unit/run.mjs dekkplan writes it from the models). One picture a boat type
to docs/planer/dekk/<type>.png, 100 px a metre, the bow up. A plan to decide the places from; nothing in the game reads it.

  node tests/unit/run.mjs dekkplan && python3 tools/deck/dekkplan.py

The proposals (docs/planer/dekk/forslag.json, made by hand, boat by boat) are laid over the decks and held to the rules by the test,
which writes them into dekkplan.json; here each boat is drawn twice, side by side: as she is today, and the proposal with what is
moved or new in green, what is taken out crossed over, and the way of the fish numbered. The form of forslag.json:
  {type: {thing: [x, z, ry] or [x, z, ry, across, along] for a new one or one of another size, station: [x, z, the way he looks],
          "slipp": [x, z] where the fish is let fall, "ut": [stations and things taken off the deck]}}
The boat's frame: x to starboard, z aft, metres; a heading of 0 is ahead, pi/2 to starboard.
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = json.load(open(os.path.join(ROOT, 'tests', 'out', 'dekkplan.json'))); GREEN = (0, 140, 60)
OUT = os.path.join(ROOT, 'docs', 'planer', 'dekk'); os.makedirs(OUT, exist_ok=True); PX = 100
COL = {'bløggekar': (200, 70, 70), 'sløyebord': (70, 110, 200), 'haler': (60, 60, 60), 'iskasse': (120, 200, 230), 'linestamper': (150, 150, 150), 'garnkar': (170, 150, 110), 'luke': (40, 40, 40), 'kran': (230, 170, 40), 'fiskekar': (230, 130, 60), 'sløyeplass': (70, 110, 200)}
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15); FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
except Exception: F = FS = ImageFont.load_default()

def short(n): return {'sløyeplass (båtens egen)': 'sløyeplass'}.get(n, n)
for B in D:
    xs = [c[0] for c in B['cells']]; zs = [c[1] for c in B['cells']]; x0, x1, z0, z1 = min(xs) - 0.7, max(xs) + 0.7, min(zs) - 0.6, max(zs) + 0.6
    N = B.get('forslag'); pw = int((x1 - x0) * PX) + 20; Wd, Hd = pw * (2 if N else 1) + 470, max(int((z1 - z0) * PX) + 110, 620); im = Image.new('RGB', (Wd, Hd), 'white'); g = ImageDraw.Draw(im)
    g.text((10, 8), '%s (%s)  %.1f m lang, %.1f m bred, %s' % (B['name']['no'] if isinstance(B['name'], dict) else B['name'], B['type'], B['len'], B['beam'], 'åpen båt' if B['open'] else 'lasterom' if B['hold'] and B['hold'].get('kind') == 'rom' else 'kar på dekk'), fill='black', font=F)
    g.text((10, 30), 'baug opp · rute = 1 m · grått = der en kan stå', fill=(90, 90, 90), font=FS)
    c = B['c']
    def panel(ox, title, things, stations, drop, way, moved=(), gone_t=(), gone_s=(), col_way=(200, 0, 0)):
        P = lambda x, z: ((x - x0) * PX + 10 + ox, (z - z0) * PX + 80)   # (z grows aft: the bow is up)
        g.text((ox + 10, 54), title, fill='black', font=F)
        for x, z, y in B['cells']: g.rectangle([P(x - c / 2, z - c / 2), P(x + c / 2, z + c / 2)], fill=(232, 232, 232) if abs(y - B['deckY']) < 0.35 else (244, 244, 240))
        for m in range(int(math.floor(x0)), int(math.ceil(x1)) + 1): g.line([P(m, z0), P(m, z1)], fill=(210, 210, 210))
        for m in range(int(math.floor(z0)), int(math.ceil(z1)) + 1): g.line([P(x0, m), P(x1, m)], fill=(210, 210, 210))
        def box(q, col, w=3, fill=None):
            cs, sn = math.cos(q['ry']), math.sin(q['ry']); pts = [P(q['x'] + cs * a * q['hw'] + sn * b2 * q['hl'], q['z'] - sn * a * q['hw'] + cs * b2 * q['hl']) for a, b2 in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            if fill: g.polygon(pts, fill=fill)
            g.line(pts + [pts[0]], fill=col, width=w); return pts
        def cross(x, z, r=0.3): a, b = P(x - r, z - r), P(x + r, z + r); g.line([a, b], fill=(200, 0, 0), width=3); g.line([(a[0], b[1]), (b[0], a[1])], fill=(200, 0, 0), width=3)
        for q in gone_t: box(q, (190, 190, 190), 2); cross(q['x'], q['z'])
        for q in sorted(things, key=lambda q: q['name'] in moved):
            col = next((v for k, v in COL.items() if q['name'].startswith(k)), (0, 0, 0)); new = q['name'] in moved
            box(q, GREEN if new else col, 5 if new else 3, (205, 238, 212) if new else None)
            if new: bb = g.textbbox((0, 0), short(q['name']), font=FS); cx, cy = P(q['x'], q['z']); g.text((cx - bb[2] / 2, cy - 7), short(q['name']), fill=(0, 90, 40), font=FS)
        for (i, w) in enumerate(way):
            a, b = P(w['p'][0], w['p'][1]), P(w['p'][2], w['p'][3]); g.line([a, b], fill=col_way, width=3 if N and col_way == GREEN else 2)
            if col_way == GREEN: g.ellipse([b[0] - 5, b[1] - 5, b[0] + 5, b[1] + 5], fill=GREEN)
        for s in gone_s: x, y = P(s['x'], s['z']); g.ellipse([x - 22, y - 22, x + 22, y + 22], outline=(190, 190, 190), width=2); g.text((x - 20, y - 7), s['name'][:5], fill=(160, 160, 160), font=FS); cross(s['x'], s['z'], 0.22)
        for s in stations:
            x, y = P(s['x'], s['z']); work = s['name'] in ('haler', 'bløgger', 'sløyer', 'pakker'); new = s['name'] in moved; col = GREEN if new else (200, 0, 120) if work else (150, 150, 150); r = 22 if work else 10
            if work: g.ellipse([x - r, y - r, x + r, y + r], fill='white')
            g.ellipse([x - r, y - r, x + r, y + r], outline=col, width=(5 if new else 3) if work else 1); g.line([(x, y), (x + math.sin(s['h']) * (r + 14), y - math.cos(s['h']) * (r + 14))], fill=col, width=3 if work else 1)
            if work: g.text((x - 20, y - 7), s['name'][:5], fill=col, font=FS)
        if drop: dx, dy = P(*drop); g.line([(dx - 7, dy), (dx + 7, dy)], fill=col_way, width=4); g.line([(dx, dy - 7), (dx, dy + 7)], fill=col_way, width=4)
    # the way of the fish today: the hauler, where it falls, the bleeding tub, the gutter, then the hold's hatch or the fish tub
    T = {q['name']: q for q in B['things']}; S = {s['name']: s for s in B['stations']}; way = []
    if 'haler' in S: way.append(('haleren', S['haler']['x'], S['haler']['z']))
    way.append(('slippet', B['drop'][0], B['drop'][1]))
    if 'bløggekar' in T: way.append(('bløggekaret', T['bløggekar']['x'], T['bløggekar']['z']))
    if 'sløyer' in S: way.append(('sløyeren', S['sløyer']['x'], S['sløyer']['z']))
    end = T.get('luke') or T.get('fiskekar 1')
    if end: way.append((end['name'], end['x'], end['z']))
    W0 = [{'a': a, 'b': b2, 'd': math.hypot(bx - ax, bz - az), 'p': [ax, az, bx, bz]} for (a, ax, az), (b2, bx, bz) in zip(way, way[1:])]
    panel(0, 'I dag', B['things'], B['stations'], B['drop'], W0)
    lx = pw * (2 if N else 1) + 20; ly = 56
    y = [ly]
    def put(txt, fill='black', font=FS, dy=18): g.text((lx, y[0]), txt, fill=fill, font=font); y[0] += dy * (txt.count('\n') + 1)
    put('Fiskens vei i dag (meter):', font=F, dy=24); tot = 0
    for w in W0: tot += w['d']; put('%s → %s: %.1f' % (w['a'], w['b'], w['d']), fill=(200, 0, 0) if w['d'] > 1.6 else 'black')
    put('i alt %.1f m' % tot); y[0] += 10
    if N:
        mv = set(N['moved']); gone = set(N['ut']); nd = N['drop'] if any(s['name'] == 'bløgger' for s in N['stations']) else None
        panel(pw, 'Forslag', N['things'], N['stations'], nd, N['way'], mv, [q for q in B['things'] if q['name'] in gone or (q['name'].startswith('sløyeplass') and 'sløyebord' in mv)], [s for s in B['stations'] if s['name'] in gone], GREEN)
        put('Fiskens vei i forslaget (meter):', font=F, dy=24); t2 = 0
        for w in N['way']: t2 += w['d']; put('%s → %s: %.1f' % (w['a'], w['b'], w['d']), fill=(0, 110, 50))
        put('i alt %.1f m' % t2, fill=(0, 110, 50)); y[0] += 8
        if mv: put('Flyttes eller nytt (grønt):\n  ' + ', '.join(sorted(mv))[:60] + ('\n  ' + ', '.join(sorted(mv))[60:] if len(', '.join(sorted(mv))) > 60 else ''), fill=(0, 110, 50)); y[0] += 4
        if gone: put('Tas av dekket (rødt kryss):\n  ' + ', '.join(sorted(gone)), fill=(200, 0, 0)); y[0] += 4
        for m in N.get('kjent', []): put('Holder ikke regelen:\n  ' + m, fill=(200, 0, 0)); y[0] += 4
        for m in N.get('bad', []): put('BRUDD: ' + m, fill=(200, 0, 0))
        y[0] += 10
    seen = set()
    for q in B['things'] + (N['things'] if N else []):
        if q['name'] in seen: continue
        seen.add(q['name']); col = next((v for k, v in COL.items() if q['name'].startswith(k)), (0, 0, 0)); g.rectangle([lx, y[0] + 2, lx + 14, y[0] + 14], outline=col, width=3); g.text((lx + 22, y[0]), q['name'] + ('' if q.get('fixed', True) else ' (når det er om bord)'), fill='black', font=FS); y[0] += 20
    put('\nring = arbeidsplass, streken er veien han\nser · kryss (+) = der fisken slippes ·\ngrønt = flyttet eller nytt i forslaget', fill=(90, 90, 90))
    im.save(os.path.join(OUT, B['type'] + '.png')); print(B['type'], im.size, 'vei i dag %.1f m' % tot, ('forslag %.1f m' % sum(w['d'] for w in N['way'])) if N else '')
