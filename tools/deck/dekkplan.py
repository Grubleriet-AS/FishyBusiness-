"""The decks of the coast's boats drawn from above (steg 125c, Jonas 15.11.2026): what stands on deck, where each man works and the
way of the fish, from tests/out/dekkplan.json (node tests/unit/run.mjs dekkplan writes it from the models). One picture a boat type
to docs/planer/dekk/<type>.png, 100 px a metre, the bow up. A plan to decide the places from; nothing in the game reads it.

  node tests/unit/run.mjs dekkplan && python3 tools/deck/dekkplan.py [forslag.json]
      forslag.json: {type: {thing or station name: [x, z, ry or heading]}}: drawn in green beside what is there today
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = json.load(open(os.path.join(ROOT, 'tests', 'out', 'dekkplan.json'))); NEW = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {}
OUT = os.path.join(ROOT, 'docs', 'planer', 'dekk'); os.makedirs(OUT, exist_ok=True); PX = 100
COL = {'bløggekar': (200, 70, 70), 'sløyebord': (70, 110, 200), 'haler': (60, 60, 60), 'iskasse': (120, 200, 230), 'linestamper': (150, 150, 150), 'garnkar': (170, 150, 110), 'luke': (40, 40, 40), 'kran': (230, 170, 40), 'fiskekar': (230, 130, 60), 'sløyeplass': (70, 110, 200)}
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15); FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
except Exception: F = FS = ImageFont.load_default()

for B in D:
    xs = [c[0] for c in B['cells']]; zs = [c[1] for c in B['cells']]; x0, x1, z0, z1 = min(xs) - 0.6, max(xs) + 0.6, min(zs) - 0.6, max(zs) + 0.6
    Wd, Hd = int((x1 - x0) * PX) + 520, int((z1 - z0) * PX) + 90; im = Image.new('RGB', (Wd, Hd), 'white'); g = ImageDraw.Draw(im)
    P = lambda x, z: ((x - x0) * PX + 10, (z - z0) * PX + 60)   # (z grows aft: the bow is up)
    g.text((10, 8), '%s (%s)  %.1f m lang, %.1f m bred, %s' % (B['name']['no'] if isinstance(B['name'], dict) else B['name'], B['type'], B['len'], B['beam'], 'åpen båt' if B['open'] else 'lasterom' if B['hold'] and B['hold'].get('kind') == 'rom' else 'kar på dekk'), fill='black', font=F)
    g.text((10, 30), 'baug opp · rute = 1 m · grått = der en kan stå', fill=(90, 90, 90), font=FS)
    c = B['c']
    for x, z, y in B['cells']: a = P(x - c / 2, z - c / 2); b = P(x + c / 2, z + c / 2); g.rectangle([a, b], fill=(232, 232, 232))
    for m in range(int(math.floor(x0)), int(math.ceil(x1)) + 1): g.line([P(m, z0), P(m, z1)], fill=(210, 210, 210))
    for m in range(int(math.floor(z0)), int(math.ceil(z1)) + 1): g.line([P(x0, m), P(x1, m)], fill=(210, 210, 210))
    def box(q, col, w=3, dash=False):
        cs, sn = math.cos(q['ry']), math.sin(q['ry']); pts = [P(q['x'] + cs * a * q['hw'] + sn * b2 * q['hl'], q['z'] - sn * a * q['hw'] + cs * b2 * q['hl']) for a, b2 in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        g.line(pts + [pts[0]], fill=col, width=w); return pts
    legend = []
    for q in B['things']:
        col = next((v for k, v in COL.items() if q['name'].startswith(k)), (0, 0, 0)); box(q, col); legend.append((q['name'] + ('' if q['fixed'] else ' (når det er om bord)'), col))
        n = (NEW.get(B['type']) or {}).get(q['name'])
        if n: box(dict(q, x=n[0], z=n[1], ry=n[2] if len(n) > 2 else q['ry']), (0, 150, 60), 4); g.line([P(q['x'], q['z']), P(n[0], n[1])], fill=(0, 150, 60), width=1)
    for s in B['stations']:
        x, y = P(s['x'], s['z']); work = s['name'] in ('haler', 'bløgger', 'sløyer', 'pakker'); col = (200, 0, 120) if work else (150, 150, 150); r = 22 if work else 10
        g.ellipse([x - r, y - r, x + r, y + r], outline=col, width=3 if work else 1); g.line([(x, y), (x + math.sin(s['h']) * (r + 14), y - math.cos(s['h']) * (r + 14))], fill=col, width=3 if work else 1)
        if work: g.text((x - 20, y - 7), s['name'][:5], fill=col, font=FS)
        n = (NEW.get(B['type']) or {}).get(s['name'])
        if n: nx, ny = P(n[0], n[1]); g.ellipse([nx - 22, ny - 22, nx + 22, ny + 22], outline=(0, 150, 60), width=4); g.line([(nx, ny), (nx + math.sin(n[2]) * 36, ny - math.cos(n[2]) * 36)], fill=(0, 150, 60), width=4); g.text((nx - 20, ny - 7), s['name'][:5], fill=(0, 150, 60), font=FS)
    dx, dy = P(*B['drop']); g.line([(dx - 8, dy - 8), (dx + 8, dy + 8)], fill=(200, 0, 0), width=3); g.line([(dx - 8, dy + 8), (dx + 8, dy - 8)], fill=(200, 0, 0), width=3)
    # the way of the fish today: the hauler, where it falls, the bleeding tub, the gutter, then the hold's hatch or the fish tub
    T = {q['name']: q for q in B['things']}; S = {s['name']: s for s in B['stations']}; way = []
    if 'haler' in S: way.append(('haleren', S['haler']['x'], S['haler']['z']))
    way.append(('slippet', B['drop'][0], B['drop'][1]))
    if 'bløggekar' in T: way.append(('bløggekaret', T['bløggekar']['x'], T['bløggekar']['z']))
    if 'sløyer' in S: way.append(('sløyeren', S['sløyer']['x'], S['sløyer']['z']))
    end = T.get('luke') or T.get('fiskekar 1')
    if end: way.append((end['name'], end['x'], end['z']))
    lx = int((x1 - x0) * PX) + 40; ly = 70; g.text((lx, ly), 'Fiskens vei i dag (meter):', fill='black', font=F); ly += 24; tot = 0
    for (a, ax, az), (b2, bx, bz) in zip(way, way[1:]):
        dd = math.hypot(bx - ax, bz - az); tot += dd; g.line([P(ax, az), P(bx, bz)], fill=(200, 0, 0), width=2); g.text((lx, ly), '%s → %s: %.1f' % (a, b2, dd), fill=(200, 0, 0) if dd > 1.6 else 'black', font=FS); ly += 18
    g.text((lx, ly), 'i alt %.1f m' % tot, fill='black', font=FS); ly += 30
    for nm, col in legend: g.rectangle([lx, ly + 2, lx + 14, ly + 14], outline=col, width=3); g.text((lx + 22, ly), nm, fill='black', font=FS); ly += 20
    g.text((lx, ly + 6), 'rosa ring = arbeidsplass, streken er\nveien han ser · rødt kryss = der fisken\nslippes · grønt = forslag', fill=(90, 90, 90), font=FS)
    im.save(os.path.join(OUT, B['type'] + '.png')); print(B['type'], im.size, 'vei %.1f m' % tot)
