"""LAID ASIDE (15.11.2026): the search was tuned four times and gave the tub in the middle of the deck or no place at all. The proposals
are made by hand (docs/planer/dekk/forslag.json) and held to the rules by tests/unit/dekkplan.test.mjs; running this would overwrite
them, so it stops at once. Kept for its rules (R) and its notes.

Proposals for where the bleeding tub, the gutting table, the gutter and the bleeder stand on each of the coast's boats (steg 125c,
Jonas 15.11.2026: the places shall follow the work). The work as it is done (Matis' handling guide, Mattilsynet): the fish is bled as
it comes aboard, bleeds out in a tub, is gutted on a bench as soon as it has bled, and goes to the hold or to a fish tub. So on deck:
hauler -> where the fish is let fall at his side -> the bleeder -> the bleeding tub within a short throw -> the gutting table by the
tub -> the hatch or the fish tub within a throw of the table. Every placing of the tub and the table on the free deck is tried
against that, and the one with the shortest way of the fish that moves the things the least is written to
docs/planer/dekk/forslag.json; tools/deck/dekkplan.py draws it in green. A proposal for Jonas to look at, nothing the game reads.

  node tests/unit/run.mjs dekkplan && python3 tools/deck/dekkforslag.py && python3 tools/deck/dekkplan.py docs/planer/dekk/forslag.json
"""
import json, math, os, sys
sys.exit('dekkforslag.py er lagt bort: forslagene lages for hånd i docs/planer/dekk/forslag.json (se toppkommentaren)')
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = json.load(open(os.path.join(ROOT, 'tests', 'out', 'dekkplan.json')))
R = {'toss': (0.7, 1.6), 'reach': 1.1, 'stand': 0.5, 'throw': 2.2, 'apart': 0.75, 'clear': 0.28, 'side': 1.92}   # m, and rad to either side of ahead


def rect(x, z, hw, hl, ry):
    c, s = math.cos(ry), math.sin(ry); return (x, z, hw, hl, c, s)
def inside(r, px, pz, m=0.0):
    dx, dz = px - r[0], pz - r[1]; a = dx * r[4] - dz * r[5]; b = dx * r[5] + dz * r[4]; return abs(a) <= r[2] + m and abs(b) <= r[3] + m
def corners(r, n=3):
    out = []
    for i in range(-n, n + 1):
        for j in range(-n, n + 1): a, b = r[2] * i / n, r[3] * j / n; out.append((r[0] + r[4] * a + r[5] * b, r[1] - r[5] * a + r[4] * b))
    return out
def overlap(a, b, m=0.05): return any(inside(b, x, z, m) for x, z in corners(a)) or any(inside(a, x, z, m) for x, z in corners(b))
def ang(h, x, z, tx, tz):
    d = math.atan2(tx - x, -(tz - z)) - h
    while d > math.pi: d -= 2 * math.pi
    while d < -math.pi: d += 2 * math.pi
    return abs(d)

OUT = {}; NOTE = {}
for B in [json.loads(json.dumps(dict(b, pass_=k))) for k in (0, 1, 2, 3) for b in D]:
    # (0: as she is. 1: a built-in gutting table tried as a bench that is moved. 2 and 3: the same with no bleeder: on the smallest decks the hauler bleeds the fish himself)
    if B['pass_'] and B['type'] in OUT: continue
    if B['pass_'] in (1, 3) and not any(q['name'].startswith('sløyeplass') for q in B['things']): continue
    if B['pass_'] in (1, 3):
        for q in B['things']:
            if q['name'].startswith('sløyeplass'): q.update(name='sløyebord', hw=0.31, hl=0.575 if B['len'] < 10 else 0.8)
    c = B['c']; cells = {(math.floor(x / c), math.floor(z / c)): y for x, z, y in B['cells']}; ok = lambda x, z: (math.floor(x / c), math.floor(z / c)) in cells   # (the cells' middles are at half steps)
    T = {q['name']: q for q in B['things']}; S = {s['name']: s for s in B['stations']}; hold = bool(B['hold'] and B['hold'].get('kind') == 'rom')
    if 'haler' not in S or 'bløggekar' not in T: continue
    tub0, tab0 = T['bløggekar'], T.get('sløyebord'); H = S['haler']; end = T.get('luke') if hold else T.get('fiskekar 1'); own = tab0 is None   # (own: the gutting place is built into the boat; it and its gutter stay, the tub comes to them)
    if not end or (own and 'sløyer' not in S): NOTE[B['type']] = 'ikke noe sted fisken ender, eller ingen sløyeplass'; continue
    # (what the tub and the table keep out of: the hauler, the hatch, the fish tubs, the crane; the ice box only where the packer still is)
    fixed = [rect(q['x'], q['z'], q['hw'], q['hl'], q['ry']) for q in B['things'] if q['name'] in ('haler', 'luke', 'kran') or q['name'].startswith('fiskekar') or (q['name'] == 'iskasse' and not hold)]
    keep = [(s['x'], s['z']) for s in B['stations'] if s['name'] in ('dør', 'ror', 'haler')]
    grid = [(x, z) for x, z, y in B['cells'] if abs(y - B['deckY']) < 0.35]
    sgH = 1 if H['x'] >= 0 else -1
    # (on the free deck, clear of what stands there, and against the rail on the hauler's side: what stands on a deck stands along her sides, the middle is the way)
    def fits(r):
        if not all(ok(x, z) for x, z in corners(r, 2)) or any(overlap(r, f) for f in fixed) or any(inside(r, kx, kz, 0.4) for kx, kz in keep): return False
        ext = abs(r[4]) * r[2] + abs(r[5]) * r[3]; return r[0] * sgH > 0 and any(not ok(r[0] + sgH * (ext + e), r[1]) for e in (0.2, 0.4, 0.6))
    # where the fish is let fall: at the hauler's side along the rail, fore or aft of him
    best = None
    for sgn in (1, -1):
        dx, dz = H['x'], H['z'] + sgn * 0.6
        if not ok(dx, dz): continue
        for tx, tz in grid:
            dd = math.hypot(tx - dx, tz - dz)
            if dd < 0.9 or dd > 2.4: continue
            for try_ in (0.0, math.pi / 2):
                tub = rect(tx, tz, tub0['hw'], tub0['hl'], try_)
                if not fits(tub) or inside(tub, dx, dz, 0.2): continue
                # the bleeder: a cell by the fish, clear of the hauler and the tub, the tub within a throw before him
                bl = None; solo = B['pass_'] >= 2
                if solo:
                    td = math.hypot(tx - H['x'], tz - H['z'])
                    if R['toss'][0] <= td <= R['toss'][1] and not inside(tub, H['x'], H['z'], R['clear']): bl = (H['x'], H['z'], H['h'], td)
                for bx, bz in ([] if solo else grid):
                    bd = math.hypot(bx - dx, bz - dz)
                    if bd < 0.4 or bd > 0.8 or math.hypot(bx - H['x'], bz - H['z']) < R['apart'] or inside(tub, bx, bz, R['clear']): continue
                    td = math.hypot(tx - bx, tz - bz)
                    if R['toss'][0] <= td <= R['toss'][1]:
                        hb = math.atan2(dx - bx, -(dz - bz))
                        if ang(hb, bx, bz, tx, tz) <= R['side'] and (bl is None or td < bl[3]): bl = (bx, bz, hb, td)
                if not bl: continue
                for ax, az in ([(S['sløyer']['x'], S['sløyer']['z'])] if own else grid):
                    if math.hypot(ax - tx, az - tz) > 2.2: continue
                    for tr in ((0.0,) if own else (0.0, math.pi / 2)):
                        tab = None if own else rect(ax, az, tab0['hw'], tab0['hl'], tr)
                        if not own and (not fits(tab) or overlap(tab, tub, 0.02)): continue
                        # the gutter at the middle of either long side of the table, facing it (a boat's own gutting place: where he stands today)
                        for sd in ((1,) if own else (1, -1)):
                            gx, gz = (ax, az) if own else (ax + tab[4] * sd * (tab0['hw'] + R['stand']), az - tab[5] * sd * (tab0['hw'] + R['stand']))
                            if not ok(gx, gz) or inside(tub, gx, gz, R['clear']) or any(inside(f, gx, gz, R['clear']) for f in fixed if f is not None): continue
                            if math.hypot(gx - H['x'], gz - H['z']) < R['apart'] or (not solo and math.hypot(gx - bl[0], gz - bl[1]) < R['apart']): continue
                            hg = S['sløyer']['h'] if own else math.atan2(ax - gx, -(az - gz))
                            # (the tub's nearest point to him within his reach and before him; the hatch or the fish tub within a throw and before him)
                            near = min(math.hypot(px - gx, pz - gz) for px, pz in corners(tub, 3))
                            if near > R['reach'] - 0.35 or ang(hg, gx, gz, tx, tz) > R['side']: continue
                            ed = math.hypot(end['x'] - gx, end['z'] - gz)
                            if ed > R['throw']: continue
                            turn = max(0.0, ang(hg, gx, gz, end['x'], end['z']) - R['side'])   # (he may turn and throw to a hatch behind him, as gutters do; before him is better)
                            way = 0.6 + math.hypot(bl[0] - dx, bl[1] - dz) + bl[3] + math.hypot(tx - gx, tz - gz) + ed
                            move = math.hypot(tx - tub0['x'], tz - tub0['z']) + (0 if own else math.hypot(ax - tab0['x'], az - tab0['z']))
                            sc = way + 0.35 * move + 0.6 * turn
                            if best is None or sc < best[0]: best = (sc, way, dict({'bløggekar': [tx, tz, try_], 'sløyer': [gx, gz, hg], 'slipp': [dx, dz], **({} if solo else {'bløgger': [bl[0], bl[1], bl[2]]})}, **({} if own else {'sløyebord': [ax, az, tr]})), move)
    if best:
        OUT[B['type']] = {k: [round(v, 2) for v in q] for k, q in best[2].items()}; NOTE[B['type']] = 'fiskens vei %.1f m, karet og bordet flyttet %.1f m til sammen%s' % (best[1], best[3], (' (båtens eget sløyebord må flyttes i modellen)' if B['pass_'] in (1, 3) else '') + (' (ingen egen bløgger: haleren bløgger selv)' if B['pass_'] >= 2 else ''))
    else: NOTE[B['type']] = 'ingen plassering holder alle reglene på dette dekket'
# (15.11.2026: what the search finds is not good enough to show as a proposal: with the rail rule it finds a place on three of eight decks, without it it puts
# the tub and the table in the middle of the deck. Written beside the hand-made proposals, not over them)
json.dump(OUT, open(os.path.join(ROOT, 'tests', 'out', 'dekkforslag-sok.json'), 'w'), indent=1, ensure_ascii=False)
for k, v in NOTE.items(): print(k + ': ' + v)
