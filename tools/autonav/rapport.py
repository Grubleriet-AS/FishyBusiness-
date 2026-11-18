#!/usr/bin/env python3
"""The hunt's findings put together (tools/autonav/jakt.py; the autonav routine, docs/planer/autonav-null-treff.md): the touches in
treff.jsonl grouped by what was touched, the phase, how near the route's start or end (the 40 m round the ends where nothing counts as
an obstacle, HIND.ctx.free), the boat's size, her speed and the place, with the trips in turer.jsonl for the touches per 1000 trips.
A touch at her own berth (own: under a knot within 1.5 lengths of the start or end) is counted apart, not as a hit.
    python3 tools/autonav/rapport.py [--state DIR] [--runs K] [--md FILE]
--runs K takes the last K runs of tilstand.json only (by their scenario numbers); --md writes the tables as Markdown too.
"""
import argparse, collections, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LEN = {'skiff': 5.9, 'trebat': 7, 'snekke': 7.9, 'plastsjark': 9.45, 'sjark': 10.57, 'hurtigsjark': 10.99, 'sjarkny': 10.99, 'breisjark': 10.99,
       'kyst15': 14.99, 'kyst21': 21, 'ringnot38': 38.55}


def band(v, edges, names):
    for e, n in zip(edges, names):
        if v < e: return n
    return names[-1]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--state', default=os.path.join(ROOT, 'docs', 'planer', 'autonav-jakt'))
    ap.add_argument('--runs', type=int, default=0); ap.add_argument('--md')
    a = ap.parse_args()
    H = [json.loads(l) for l in open(os.path.join(a.state, 'treff.jsonl'), encoding='utf-8') if l.strip()]
    T = [json.loads(l) for l in open(os.path.join(a.state, 'turer.jsonl'), encoding='utf-8') if l.strip()]
    if a.runs:
        st = json.load(open(os.path.join(a.state, 'tilstand.json'))); rs = st['runs'][-a.runs:]
        inr = lambda j: any(r['from'] <= j < r['to'] for r in rs)
        H = [h for h in H if inr(h['j'])]; T = [t for t in T if inr(t['j'])]
    real0 = [h for h in H if not h['own']]
    # one touch is one event: the lines of the same kind on the same trip (scenario and destination) less than 60 m apart are one
    # (land and the bottom are logged per 50 m cell, a pier per pier: a boat dragging along a quay is one touch, not five)
    import math
    real, last = [], {}
    for h in real0:
        k = (h['j'], h.get('to'), h['what']); p = last.get(k)
        if p and math.hypot((h['lat'] - p['lat']) * 111e3, (h['lon'] - p['lon']) * 111e3 * math.cos(math.radians(h['lat']))) < 60:
            p['knMax'] = max(p['knMax'], h['knMax']); last[k] = dict(p, lat=h['lat'], lon=h['lon']); continue
        real.append(h); last[k] = h
    out = []
    say = lambda s='': (print(s), out.append(s))
    nT = len(T)
    say('Turer: %d (scenarier %d), treff: %d (%.0f per 1000 turer; %d linjer i loggen), turer med minst ett treff: %d (%.0f %%), berøringer ved egen kaiplass: %d'
        % (nT, len({t['j'] for t in T}), len(real), 1000 * len(real) / max(1, nT), len(real0), sum(1 for t in T if t['hits']), 100 * sum(1 for t in T if t['hits']) / max(1, nT), len(H) - len(real0)))
    def table(title, key, n=12):
        c = collections.Counter(key(h) for h in real); say(); say('| %s | treff | per 1000 turer |' % title); say('|---|---|---|')
        for k, v in c.most_common(n): say('| %s | %d | %.0f |' % (k, v, 1000 * v / max(1, nT)))
    # (the bottom inside a harbour apart: there the game counts the water as dredged, groundCheck and the route do not ask the depth)
    table('Hva', lambda h: h['what'] + (' (i havna)' if h['what'] == 'grunn' and h.get('harb') else ''))
    # whether the boat model itself would have felt it (dynContact: PIERBOX and the harbour units; sjvTouch: marks, turbines, bridge
    # piers and players' boats), or whether she goes through it unseen (the coast's piers, quay decks, slabs, breakwaters, floating docks,
    # the rorbuer's and the naust's quays, bridge decks, the coast's own vessels)
    def seen(h):
        w = h['what']
        if w in ('land', 'grunn', 'grunnstøting'): return 'land og grunn (grunnsjekken)'
        if h.get('model') or w in ('merke', 'brupilar', 'vindturbin') or (w == 'kai' and str(h.get('id', '')).startswith('unit@')) or (w == 'båt' and h.get('player')): return 'båtmodellen kjenner det'
        return 'båtmodellen kjenner det ikke'
    table('Kjenner spillet det?', seen)
    table('Fase', lambda h: h['phase'])
    table('Hva og fase', lambda h: '%s, %s' % (h['what'], h['phase']), 16)
    table('Avstand fra rutas start eller mål', lambda h: band(min(h['dS'], h['dE']), [40, 100, 300, 1e9], ['under 40 m', '40-100 m', '100-300 m', 'over 300 m']))
    table('Båt', lambda h: band(LEN.get(h.get('type'), 10), [9, 12, 16, 25, 1e9], ['under 9 m', '9-12 m', '12-16 m', '16-25 m', 'over 25 m']))
    table('Fart', lambda h: band(h['knMax'], [1, 3, 5, 1e9], ['under 1 knop', '1-3 knop', '3-5 knop', 'over 5 knop']))
    table('Sted (nærmeste havn)', lambda h: (h.get('near') or ['?'])[0], 15)
    table('Slik båten ble satt (fart, tidevann)', lambda h: '%s, %s' % (h.get('speed'), h.get('tide')))
    # the trips with no route or that did not get there: not hits, but places the hunt could not test
    bad = [t for t in T if t.get('why')]
    say(); say('Turer som ikke kom fram eller ikke fant rute: %d' % len(bad))
    for t in bad[:12]: say('- %s → %s: %s' % (t.get('name'), t.get('to'), (t.get('why') or '')[:120]))
    if a.md: open(a.md, 'w', encoding='utf-8').write('\n'.join(out) + '\n')


main()
