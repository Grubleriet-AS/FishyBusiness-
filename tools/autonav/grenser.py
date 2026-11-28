#!/usr/bin/env python3
"""Grensene: which ocean vessels each place takes by the quay rule (06b-coastports.js placeWhy), which of them the new planner
has a bane for, out to open water and in again, and what each part of the coast has left of plants and yards for each size
(Autonav 2.0, steg 142; Jonas 28.11.2026: places an ocean vessel has no way in to are shut to her in the chart plotter).

    python3 tools/autonav/grenser.py --tar FILE.json                      the places and the ocean vessels each takes today (the game's own rule, on the bench's page)
    python3 tools/autonav/grenser.py --tabell TAR.json TURER.jsonl [...]  the table, from that and the bench's runs (benk.py --alle --bare-rute)
    python3 tools/autonav/grenser.py --data TAR.json TURER.jsonl [...]    writes src/data/innseiling.json: the longest vessel with a way in, per place that has a limit

A place takes a type «with a bane» when the bench has a bane for her both out and in. Where the biggest the place takes has one,
the smaller ocean vessels it takes are taken to have one too (they are not all planned); where she has none, each type is planned.
--tar needs what benk.py needs (dist-vec/ with the whole coast, or KYST_DIST).
"""
import argparse, asyncio, collections, datetime, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'src', 'data', 'innseiling.json')
HAV = ['ringnot38', 'autoliner', 'snokrabbe', 'bunntral', 'pelagisk']   # by length
LEN = {'ringnot38': 38.55, 'autoliner': 45.4, 'snokrabbe': 50, 'bunntral': 60.3, 'pelagisk': 75}
LIST = r"""() => PORTS.filter(q => !(typeof HAVN !== 'undefined' && HAVN.shut && typeof isBerth === 'function' && isBerth(q.id))).map(q => ({id:q.id, navn:q.name, lat:+natLL(q.p).lat.toFixed(4), lon:+natLL(q.p).lon.toFixed(4), slag:q.mottak || q.havOnly ? 'mottak' : /verft/.test(q.sted || '') ? 'verft' : /butikk/.test(q.sted || '') ? 'butikk' : 'annet'}))"""
TAR = r"""async (id) => { const E = await BK.end({port:id}); if (E.skip) return {skip:E.skip}; const out = {}; for (const t of Object.keys(VESSELS)) if (VESSELS[t].cls === 'hav'){ const w = BK.takes(E, t); out[t] = w ? String(w) : null; } return {tar:out}; }"""


def kind(pid): return 'mottak' if pid.startswith('m') and pid[1:2].isupper() else 'verft' if pid.startswith('sv') else 'butikk' if pid.startswith('sb') else 'annet'
def del_(lat): return 'sør' if lat < 63 else 'midt' if lat < 67 else 'nord'


async def tar(path):
    sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'tests'))
    os.environ.setdefault('KYST_DIST', os.path.join(ROOT, 'dist-vec'))
    import benk  # noqa: F401 (the bench's own environment)
    src = open(os.path.join(ROOT, 'tests', 'allesteder.py'), encoding='utf-8').read().split('\nasync def main():')[0]
    ns = {'__file__': os.path.join(ROOT, 'tests', 'allesteder.py'), '__name__': 'allesteder_js'}; exec(compile(src, ns['__file__'], 'exec'), ns)
    from _env import GAME, boot
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        br = await p.chromium.launch(); res = {}; P = None
        async def page():
            pg = await (await br.new_context(viewport={'width': 1280, 'height': 800})).new_page(); await boot(pg, GAME + ('' if 'no3d' in GAME else ',no3d'))
            await pg.evaluate(ns['SETUP'], ['kyst21', 0, True]); await pg.evaluate(open(os.path.join(HERE, 'benkobs.js'), encoding='utf-8').read()); await pg.evaluate(open(os.path.join(HERE, 'benk.js'), encoding='utf-8').read()); return pg
        pg = await page(); P = await pg.evaluate(LIST)
        for k, q in enumerate(P):
            if k and k % 60 == 0: await pg.context.close(); pg = await page()   # (a fresh page: the map of the whole coast is not kept in one)
            try: r = await asyncio.wait_for(pg.evaluate(TAR, q['id']), 120)
            except Exception as e: r = {'skip': 'feil: ' + str(e)[:80]}
            res[q['id']] = dict(q, **r); print('%-22s %-28s %s' % (q['id'], q['navn'][:28], ' '.join(t for t in HAV if r.get('tar') and r['tar'].get(t) is None) or (r.get('skip') or '-')), flush=True)
        await br.close()
    json.dump({'laget': datetime.date.today().isoformat(), 'steder': res}, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0); print('skrev', path, len(res))


def les(tarfile, runs):
    T = json.load(open(tarfile, encoding='utf-8'))['steder']; ok = collections.defaultdict(dict); why = collections.defaultdict(dict)
    for f in runs:
        for l in open(f, encoding='utf-8'):
            t = json.loads(l); ty = t.get('type')
            if t.get('skip') or not ty: continue
            d, pid = t['strek'].split('-', 1); has = not t.get('ingen_rute'); o = ok[pid].setdefault(ty, {}); o[d] = has   # (a later run of the same stands: the files in the order given)
            if not has: why[pid][ty] = t['ingen_rute'].split(':', 1)[-1].split('(')[0].strip()
            elif d in ('ut', 'inn') and o.get('ut') and o.get('inn'): why[pid].pop(ty, None)
    rows = {}
    for pid, q in T.items():
        tar_ = [t for t in HAV if q.get('tar') and q['tar'].get(t) is None]; got = ok.get(pid, {}); both = lambda t: got.get(t, {}).get('ut') and got.get(t, {}).get('inn')
        small = {t: (both(t) if t in got else None) for t in ('skiff', 'kyst21')}
        big = tar_[-1] if tar_ else None; bane = {}
        for t in tar_:
            if t in got: bane[t] = bool(both(t))
            else: bane[t] = True if (big in got and both(big)) else None   # (not planned: the biggest has a bane, so she is taken to have one; None where the biggest has none or was not planned: she is to be planned herself, --rest)
        rows[pid] = dict(q, tar_=tar_, bane=bane, small=small, why=why.get(pid, {})); rows[pid]['slag'] = q['slag'] if q.get('slag') == 'mottak' else kind(pid)
    return rows


def tabell(rows):
    print('Steder: %d. Tar en havbåt etter kairegelen: %d.' % (len(rows), sum(1 for r in rows.values() if r['tar_'])))
    lim = [r for r in rows.values() if any(v is False for v in r['bane'].values())]; unk = [r for r in rows.values() if any(v is None for v in r['bane'].values())]
    print('\nSteder der en havbåt kairegelen tar, ikke har bane (%d):' % len(lim))
    print('| Sted | Slag | Del | Tar i dag | Har bane | Uten bane (årsak) |\n|---|---|---|---|---|---|')
    for r in sorted(lim, key=lambda r: (del_(r['lat']), r['slag'], r['navn'])):
        yes = [t for t in r['tar_'] if r['bane'][t]]; no = [t for t in r['tar_'] if r['bane'][t] is False]
        print('| %s (`%s`) | %s | %s | %s | %s | %s |' % (r['navn'], r['id'], r['slag'], del_(r['lat']), ', '.join(r['tar_']), ', '.join(yes) or 'ingen', ', '.join('%s (%s)' % (t, r['why'].get(t, '?')) for t in no)))
    if unk: print('\nIkke planlagt (%d): %s' % (len(unk), ', '.join(r['id'] for r in unk[:40])))
    sm = [r for r in rows.values() if r['small'].get('skiff') is False or r['small'].get('kyst21') is False]
    print('\nSteder uten bane for skiff eller kyst21 (%d): %s' % (len(sm), '; '.join('%s (%s%s)' % (r['navn'], del_(r['lat']), ''.join(', %s: %s' % (t, r['why'].get(t, '?')) for t in ('skiff', 'kyst21') if r['small'].get(t) is False)) for r in sorted(sm, key=lambda r: r['lat']))))
    print('\nHva hver landsdel har per havbåt (etter kairegelen i dag → med bane):')
    print('| Del | Slag | ' + ' | '.join(HAV) + ' |\n|---|---|' + '---|' * len(HAV))
    for dl in ('sør', 'midt', 'nord'):
        for sl in ('mottak', 'verft', 'butikk'):
            cells = []
            for t in HAV:
                a = [r for r in rows.values() if del_(r['lat']) == dl and r['slag'] == sl and t in r['tar_']]; b = [r for r in a if r['bane'][t]]; cells.append('%d → %d' % (len(a), len(b)))
            print('| %s | %s | %s |' % (dl, sl, ' | '.join(cells)))


def data(rows):
    out = {}
    for r in rows.values():
        no = [t for t in r['tar_'] if r['bane'][t] is False]
        if not no: continue
        yes = [t for t in r['tar_'] if r['bane'][t]]; w = r['why'].get(no[0], ''); k = 'bru' if 'bru' in w else 'grunt' if 'grunt' in w else 'trangt'
        out[r['id']] = [max([LEN[t] for t in yes] or [0]), k]
    json.dump({'v': 1, 'laget': datetime.date.today().isoformat(), 'om': 'The longest ocean vessel with a way in to a place, where the quay rule takes a longer one (tools/autonav/grenser.py; 06b-coastports.js placeWhy). [m, why]: grunt, trangt, bru. Not edited by hand.', 'maks': dict(sorted(out.items()))},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('skrev', OUT, len(out))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--tar'); ap.add_argument('--tabell', nargs='+'); ap.add_argument('--data', nargs='+'); ap.add_argument('--rest', nargs='+', help='the places where a type the place takes is not planned yet, for benk.py --alle --strek'); a = ap.parse_args()
    if a.tar: asyncio.run(tar(a.tar))
    elif a.tabell: tabell(les(a.tabell[0], a.tabell[1:]))
    elif a.data: data(les(a.data[0], a.data[1:]))
    elif a.rest: print(','.join(sorted(r['id'] for r in les(a.rest[0], a.rest[1:]).values() if any(v is False for v in r['bane'].values()) and any(t not in r['why'] and r['bane'][t] is not True for t in r['tar_']) or any(v is None for v in r['bane'].values()))))
    else: ap.print_help()
