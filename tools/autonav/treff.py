#!/usr/bin/env python3
"""The players' Autonav catch (docs/planer/autonav-null-treff.md, «Fangsten»; the game's core/16e-anvtreff.js): their route trips
(anv_trip), what their hulls touched (anv_hit) and the groundings (aground), from the Edge Function feedback-agent (op 'autonav',
supabase agent_autonav) with the token FEEDBACK_AGENT_TOKEN, as tools/feedback/agent.py talks to it.

The rows go to --out (a folder outside the repo, the scratchpad): DIR/autonav.json. To the screen only counts: the trips and the touches
per kind, per 1000 trips, by what, phase, boat, version, day and the nearest place (when the map's places can be read: src/data). In
git only those counts, never the rows.

    python3 tools/autonav/treff.py [--test] [--days 7] --out DIR
--test: the test project (what is sent from test.detstorebla.no).
"""
import argparse, collections, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'feedback'))
import agent   # noqa: E402  (its call() and the URLs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--test', action='store_true'); ap.add_argument('--days', type=int, default=7); ap.add_argument('--out', required=True)
    a = ap.parse_args()
    if a.test: agent.URL = agent.agent_url(True)
    rows = agent.call('autonav', days=a.days) or []
    os.makedirs(a.out, exist_ok=True)
    json.dump(rows, open(os.path.join(a.out, 'autonav.json'), 'w'), ensure_ascii=False)
    trips = [r for r in rows if r['kind'] == 'anv_trip' and (r.get('data') or {}).get('ph') == 'start']
    ends = [r for r in rows if r['kind'] == 'anv_trip' and (r.get('data') or {}).get('ph') == 'end']
    hits = [r for r in rows if r['kind'] == 'anv_hit']
    agr = [r for r in rows if r['kind'] == 'aground']
    n = max(1, len(trips))
    print('%s, %d days: trips %d (ended %d), touches %d (%.0f per 1000 trips), trips with a touch %d, groundings %d'
          % ('test' if a.test else 'production', a.days, len(trips), len(ends), len(hits), 1000 * len(hits) / n,
             len(set((r['data'] or {}).get('t') for r in hits)), len(agr)))
    C = collections.Counter
    for name, key in [('what', lambda d: d.get('w')), ('phase', lambda d: d.get('ph')), ('boat', lambda d: d.get('boat')), ('route', lambda d: d.get('how')),
                      ('speed', lambda d: '<1 kn' if (d.get('kn') or 0) < 1 else '1-3 kn' if d.get('kn') < 3 else '>=3 kn')]:
        print('  by %-6s %s' % (name, dict(C(key(r['data'] or {}) for r in hits).most_common(10))))
    print('  by version', dict(C(r.get('version') for r in hits).most_common(6)), '| trips by version', dict(C(r.get('version') for r in trips).most_common(6)))
    print('  by day', dict(sorted(C(r['day'] for r in hits).items())))
    # the places: the nearest harbour of the game to each touch, within 2 km (the map's places, src/data; km in the game's frame)
    try:
        st = json.load(open(os.path.join(ROOT, 'src', 'data', 'steder.json')))   # (r: [x, y (km), ..., name])
        pts = [(q[-1], q[0], q[1]) for q in st.get('r', []) if len(q) >= 3]
    except Exception:
        pts = []
    if pts:
        near = C()
        for r in hits:
            d = r['data'] or {}; x, y = d.get('x'), d.get('y')
            if x is None: continue
            nm, dd = min(((q[0], (q[1] - x) ** 2 + (q[2] - y) ** 2) for q in pts), key=lambda z: z[1])
            near[nm if dd < 4 else '(ute)'] += 1
        print('  by place', dict(near.most_common(15)))
    print('the rows:', os.path.join(a.out, 'autonav.json'))


if __name__ == '__main__':
    main()
