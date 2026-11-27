#!/usr/bin/env python3
"""Corrections to the fine coast (coast2) at single places (steg 142, 26.11.2026; Jonas' choice 8: «Rett kartet per sted»: where stone or
land stands in the way and a channel does not help, the map is put right at the place, so it takes the boats it takes today).

The list is tools/map/rett.json. An entry names a tile, a class of ring (molo: a breakwater's rings, class 2 and 3; land: 0 and 1) and a
cut: a line through «at» (game metres, x east and z south) with the direction «ut»; of the rings of that class that reach within «box»
(x0, z0, x1, z1, game metres) the part beyond the line (where (p - at) . ut > 0) is taken away. A breakwater mapped longer than it is
(OpenStreetMap's line widened to 12 m, chart.py BW_HALF) is shortened that way.

It is applied in two places, so it holds whichever builds the coast: chart.py coast2 (a new kart- release) and game.py (the release in
use, as the whole coast is joined for the build: the chart pack's coast2 block of the tile is decoded, cut and packed again). A cut
that has been made already changes nothing, so a release that has it is left as it is.
Pure Python (game.py runs in the deploy without shapely).
    python3 tools/map/rett.py            (lists the entries and what they would cut in tools/map/out/game/)
"""
import json, os, zlib
HERE = os.path.dirname(os.path.abspath(__file__))
LIST = os.path.join(HERE, 'rett.json')
CLS = {'molo': (2, 3), 'land': (0, 1)}
TOL = 1.0   # m: a point this near beyond the line is on it (a cut's crossings are rounded to the whole metre), so a cut made already is not made again

def entries(tx, ty):
    if not os.path.exists(LIST): return []
    return [e for e in json.load(open(LIST, encoding='utf-8'))['rett'] if e['tile'] == [tx, ty]]

# the coast2 bytes <-> [(class, [(x, y) ...])] in metres from the tile's corner (chart.py coast2, vectors.lines)
def decode(b):
    at = 0
    def vi():
        nonlocal at
        v = s = 0
        while True:
            q = b[at]; at += 1; v |= (q & 127) << s; s += 7
            if q < 128: return v
    out = []
    for _ in range(vi() if b else 0):
        c = vi(); k = vi(); x = y = 0; P = []
        for _ in range(k):
            z1 = vi(); z2 = vi(); x += (z1 >> 1) ^ -(z1 & 1); y += (z2 >> 1) ^ -(z2 & 1); P.append((x, y))
        out.append((c, P))
    return out

def encode(rings):
    out = bytearray()
    def vu(v):
        while True:
            q = v & 127; v >>= 7
            if v: out.append(q | 128)
            else: out.append(q); return
    zz = lambda v: (v << 1) if v >= 0 else ((-v << 1) - 1)
    vu(len(rings))
    for c, P in rings:
        vu(c); vu(len(P)); px = py = 0
        for x, y in P: x, y = int(round(x)), int(round(y)); vu(zz(x - px)); vu(zz(y - py)); px, py = x, y
    return bytes(out)

# a ring (closed, points as tuples) cut by the half-plane f(p) <= 0 (Sutherland-Hodgman): the points kept and the crossings, rounded
# to the whole metre as the data's are (a point that rounds over the line is pulled back to it along the cut's own axis is not
# needed: a metre at the tip of a breakwater is within what is mapped)
def clip(P, f):
    out = []; n = len(P)
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]; fa, fb = f(a), f(b)
        if fa <= 0: out.append(a)
        if (fa <= 0) != (fb <= 0):
            t = fa / (fa - fb); q = (round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t))
            if not out or out[-1] != q: out.append(q)
    while len(out) > 1 and out[0] == out[-1]: out.pop()
    return out

# land taken away inside a convex area «rute» (game metres): the land ring cut to the area (clip against each of its sides) and put back
# as a hole turning the other way, so the nonzero rule the game fills with (01d-coast.js) makes it sea there and nothing outside it
# changes. (Pure Python: a ring minus an area needs a polygon library, a ring cut to a convex area does not.)
def area2(P): return sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))
def cut_to(P, R):
    s = 1 if area2(R) > 0 else -1
    for i in range(len(R)):
        a, b = R[i], R[(i + 1) % len(R)]
        f = lambda p, a=a, b=b: -s * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]))
        P = clip(P, f)
        if len(P) < 3: return []
    return P

def holes(tx, ty, rings, E, ox, oy):
    out, n = [], 0
    have = {tuple(P) for c, P in rings if c == 1}
    for e in E:
        R = [(x - ox, z - oy) for x, z in e['rute']]
        for c, P in rings:
            if c != 0: continue
            xs = [p[0] for p in P]; zs = [p[1] for p in P]
            if max(xs) < min(r[0] for r in R) or min(xs) > max(r[0] for r in R) or max(zs) < min(r[1] for r in R) or min(zs) > max(r[1] for r in R): continue
            Q = cut_to([(round(x), round(y)) for x, y in P], R)
            if len(Q) < 3 or abs(area2(Q)) < 2: continue
            H = tuple(reversed(Q))
            if H in have: continue
            out.append((1, list(H))); n += 1
    return out, n

def apply(tx, ty, rings, T=50000):
    E = entries(tx, ty)
    if not E: return rings, 0
    ox, oy = tx * T, ty * T; n = 0; res = []
    L = [e for e in E if e['klasse'] == 'land']
    if L:
        H, n = holes(tx, ty, rings, L, ox, oy); rings = list(rings) + H
    E = [e for e in E if e['klasse'] != 'land']
    for c, P in rings:
        for e in E:
            if c not in CLS[e['klasse']]: continue
            x0, z0, x1, z1 = e['box']; xs = [p[0] + ox for p in P]; zs = [p[1] + oy for p in P]
            if max(xs) < x0 or min(xs) > x1 or max(zs) < z0 or min(zs) > z1: continue
            ax, az = e['at']; ux, uz = e['ut']
            f = lambda p: (p[0] + ox - ax) * ux + (p[1] + oy - az) * uz
            if all(f(p) <= TOL for p in P): continue
            P = clip(P, f); n += 1
        if len(P) >= 3: res.append((c, P))
    return res, n

# a line (open) cut by the half-plane f(p) <= 0: the pieces left, each of two points or more
def clip_line(P, f):
    out, cur = [], []
    for i, a in enumerate(P):
        fa = f(a)
        if i:
            b = P[i - 1]; fb = f(b)
            if (fa <= 0) != (fb <= 0):
                t = fb / (fb - fa); q = (round(b[0] + (a[0] - b[0]) * t), round(b[1] + (a[1] - b[1]) * t))
                if fb <= 0: cur.append(q); out.append(cur); cur = []
                else: cur = [q]
        if fa <= 0: cur.append(a)
    out.append(cur)
    return [c for c in out if len(c) >= 2 and any(c[k] != c[0] for k in range(len(c)))]

# the vec packs' piers and breakwaters (the 'pier' entry: lines, class 1 a breakwater, as an outline where it closes): a breakwater
# the list cuts is cut the same way here, so the map, the observer and the 3D view, which read these, agree with the coast
def apply_vec(tx, ty, lines, T=50000):
    E = [e for e in entries(tx, ty) if e['klasse'] == 'molo']
    if not E: return lines, 0
    ox, oy = tx * T, ty * T; n = 0; res = []
    for c, P in lines:
        parts = [P]
        if c == 1:
            for e in E:
                x0, z0, x1, z1 = e['box']; ax, az = e['at']; ux, uz = e['ut']
                f = lambda p: (p[0] + ox - ax) * ux + (p[1] + oy - az) * uz
                nxt = []
                for Q in parts:
                    xs = [p[0] + ox for p in Q]; zs = [p[1] + oy for p in Q]
                    if max(xs) < x0 or min(xs) > x1 or max(zs) < z0 or min(zs) > z1 or all(f(p) <= TOL for p in Q): nxt.append(Q); continue
                    n += 1; closed = len(Q) > 3 and abs(Q[0][0] - Q[-1][0]) < 1 and abs(Q[0][1] - Q[-1][1]) < 1
                    if closed:
                        R = clip(Q[:-1], f)
                        if len(R) >= 3: nxt.append(R + [R[0]])
                    else: nxt += clip_line(Q, f)
                parts = nxt
        res += [(c, Q) for Q in parts]
    return res, n

def vec_block(raw, tx, ty):
    if not any(e['klasse'] == 'molo' for e in entries(tx, ty)): return None
    R, n = apply_vec(tx, ty, decode(zlib.decompress(raw, -15)))
    if not n: return None
    z = zlib.compressobj(9, zlib.DEFLATED, -15); return z.compress(encode(R)) + z.flush(), len(R)

# a coast2 block (raw deflate, as the packs keep it) of tile tx, ty with the cuts made; None when nothing was cut
def block(raw, tx, ty):
    if not entries(tx, ty): return None
    R, n = apply(tx, ty, decode(zlib.decompress(raw, -15)))
    if not n: return None
    z = zlib.compressobj(9, zlib.DEFLATED, -15); return z.compress(encode(R)) + z.flush()

if __name__ == '__main__':
    import sys
    sys.path.insert(0, HERE); import game
    d = os.path.join(HERE, 'out', 'game'); man = json.load(open(os.path.join(d, 'manifest.json'))); B = man['tile'] // man['block']
    for e in json.load(open(LIST, encoding='utf-8'))['rett']:
        tx, ty = e['tile']
        for pk in man['packs']:
            if pk['kind'] not in ('chart', 'vec') or [tx, ty] not in pk.get('tiles', [pk['tile']]): continue
            head, rest = game.read(d, pk)
            for bl in head['blocks']:
                if pk['kind'] == 'chart' and bl[0] == 'coast2' and bl[1] == tx * B and bl[2] == ty * B:
                    R0 = decode(zlib.decompress(rest[bl[3]:bl[3] + bl[4]], -15)); R1, n = apply(tx, ty, R0)
                    print(json.dumps({'id': e['id'], 'tile': e['tile'], 'cut': n, 'rings': [len(R0), len(R1)], 'points': [sum(len(p) for _, p in R0), sum(len(p) for _, p in R1)]}))
                if pk['kind'] == 'vec' and bl[0] == 'pier':
                    L0 = decode(zlib.decompress(rest[bl[3]:bl[3] + bl[4]], -15)); L1, n = apply_vec(tx, ty, L0)
                    print(json.dumps({'id': e['id'], 'vec': True, 'cut': n, 'lines': [len(L0), len(L1)]}))
