#!/usr/bin/env python3
"""Moves the places in tools/steder/rett.json along their own quay face (steg 142, 26.11.2026; Jonas' choice 8: «Rett kartet per sted»:
where a place's own quay stands in the way and a channel does not help, the map is put right at that place, so it takes the boats it
takes today). Each entry: the place's id (the one saves hold), where it stood (fra, km) and the metres to move it along its face
(langs, + the way of u = (sin a, -cos a), as 06c-steder.js lays the unit). The id stays: steder.json's «was» maps the new key to it, as
lukkflytt.py does. Running it again changes nothing (a place already moved is left); a place that is neither where it stood nor where
it is to go is reported and left. Run it after the other moves (landflytt.py, lukkflytt.py), and build again after it.
    python3 tools/steder/rett.py [--dry]
"""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
STEDER = os.path.join(ROOT, 'src', 'data', 'steder.json'); LIST = os.path.join(HERE, 'rett.json')

def key(r): return ('sv' if r[5] else 'sb') + '%d_%d' % (round(r[0] * 1000), round(r[1] * 1000))
def target(r, fra, m): a = r[2]; return [round(fra[0] + math.sin(a) * m / 1000, 3), round(fra[1] - math.cos(a) * m / 1000, 3)]

def main():
    S = json.load(open(STEDER, encoding='utf-8')); L = json.load(open(LIST, encoding='utf-8'))['rett']; was = S.setdefault('was', {}); moved = []
    ids = {was.get(key(r)) or key(r): r for r in S['r']}
    for e in L:
        r = ids.get(e['id'])
        if r is None: print('rett: %s is not in steder.json' % e['id']); continue
        to = target(r, e['fra'], e['langs'])
        if [round(r[0], 3), round(r[1], 3)] == to: print('rett: %s (%s) is moved already' % (e['id'], e['navn'])); continue
        if abs(r[0] - e['fra'][0]) > 5e-4 or abs(r[1] - e['fra'][1]) > 5e-4: print('rett: %s (%s) stands at %s, not at %s: left' % (e['id'], e['navn'], r[:2], e['fra'])); continue
        was.pop(key(r), None); r[0], r[1] = to
        if key(r) != e['id']: was[key(r)] = e['id']
        moved.append(e['navn']); print('rett: %s (%s) %+g m along its face to %s' % (e['id'], e['navn'], e['langs'], to))
    if moved and '--dry' not in sys.argv:
        S['meta']['rett'] = '%d places moved along their own quay face where Autonav 2.0 found no way out (%s), tools/steder/rett.py' % (len(L), ', '.join(e['navn'] for e in L))
        open(STEDER, 'w', encoding='utf-8').write(json.dumps(S, separators=(',', ':'), ensure_ascii=False))

if __name__ == '__main__': main()
