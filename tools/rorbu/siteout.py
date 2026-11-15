# The deepest draught that gets out from the rorbuer and the naust the biggest boat they take has no way out from (14.11.2026, steg 126
# AS1; Ferdig når 3 in docs/planer/start/126.md: «Et sted som en båttype ikke kommer ut fra ved noe tidevann, tilbys ikke den båten, og
# spillet sier hvorfor»). tools/rorbu/rorbuvei.py moved the rorbuer it could; at these (a fjord arm shut by a sill, a bay behind a
# shoal) no point within 4.5 km held for kyst15 (14.99 m, 3.0 m). For each site the game is asked, over Playwright, as tests/allesteder.py
# asks it (ui/03b-route.js draftWay, as a tap in the chart plotter): the boat put at its berth (the rorbu's quay, or Father's naust by that plant), and Autonav asked for a way to one of the three
# nearest trade places 2-200 km off or to open water within 3 km, now or at any third hour over the next twelve. The boats up to 15 m
# are tried from the deepest draught down, and the first that finds a way stops it: its draught is the site's limit (0: none gets out;
# from the shallowest up, a small open boat turned away by the sea outside, not by the depth, would have stopped it too early). Written to src/data/siteout.json, {id: draught m}; the game offers the site only to a boat that draws
# no more (siteFits, core/07-harbours.js) and says why (siteWhy).
#   KYST_VEC=1 KYST_DIST=dist-vec node build.mjs && python3 tools/rorbu/siteout.py rorbu:rb90 naust:<plant id or name> ... [--dry]
# (in parallel: ... --dry > log in each process, then python3 tools/rorbu/siteout.py --apply log1 log2 ...)
# (with no sites: the rorbuer and the naust with no route in tests/out/allesteder.json)
import os, sys, json, asyncio
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
os.environ['KYST_DIST'] = os.environ.get('KYST_DIST') or os.path.join(ROOT, 'dist-vec')
sys.path.insert(0, os.path.join(ROOT, 'tests'))
OUT = os.path.join(ROOT, 'src', 'data', 'siteout.json')

TRY = r"""async ([kind, id]) => { const b = S.boat; TAB.held = true; S.tut = 0;
  let pid = id, berth = 'main';
  if (kind === 'rorbu'){ const R = RBID.get(id); await mapPreload([R.cand], [['sim', 3], ['chart', 3], ['vec', 1.5]]); if (!rorbuSite(R)) return {skip:'no site'}; }
  else { const pt = portById(id) || PORTS.find(q => q.mottak && !q.sted && q.name.startsWith(id)); if (!pt) return {skip:'no plant ' + id}; pid = pt.id; await mapPreload([pt.p], [['sim', 3], ['chart', 3], ['vec', 1.5]]); S.home = pid; S.naust = null;
    let n = null; for (let i = 0; i < 80 && !(n = naustSite()); i++) await new Promise(r => setTimeout(r, 100)); if (!n) return {skip:'no naust'}; berth = 'naust'; }
  // (the boats up to 15 m, one of each draught, the deepest first: a small open boat may be turned away by the sea outside, not the
  // depth, so the first that gets out sets the limit; skiff first, Åsværgården found no way for it where bigger boats may have one)
  const types = Object.keys(VESSELS).filter(t => (VESSELS[t].len || 0) <= SITE_MAXLEN && VESSELS[t].draft > 0).sort((a, c) => VESSELS[c].draft - VESSELS[a].draft || VESSELS[c].len - VESSELS[a].len)
    .filter((t, i, A) => !i || VESSELS[t].draft !== VESSELS[A[i - 1]].draft);
  // (the site's own entry left out while it is measured: with it the deeper boats read the naust as the plant's quay, berthKind, and the
  // search would start from the plant; put back after)
  const had = Object.prototype.hasOwnProperty.call(SITE_SILL, pid), was = SITE_SILL[pid]; delete SITE_SILL[pid];
  const dests = PORTS.filter(q => !q.havOnly), tried = []; let lim = 0;
  try {
  for (const t of types){
    b.type = t; if (!S.owned.includes(t)) S.owned.push(t); applyVessel(); for (const k in BERTHPOSE) delete BERTHPOSE[k];
    S.plan = null; b.status = 'port'; b.port = pid; b.berth = berth; const pt = portById(pid); b.pos = {x:pt.p.x, y:pt.p.y}; b.dyn = null;
    const from = {...(quayPos(b) || b.pos)};
    const cands = dests.filter(q => q.id !== pid && dist(q.p, from) > 2 && dist(q.p, from) < 200).sort((a, c) => dist(a.p, from) - dist(c.p, from)).slice(0, 3).map(q => ({p:q.p, id:q.id}));
    let open = null; for (let rr = 0.5; rr <= 3 && !open; rr += 0.25) for (let a = 0; a < 6.28; a += 0.26){ const c = {x:from.x + Math.cos(a) * rr, y:from.y + Math.sin(a) * rr}; try { if (!isLand(c) && depthF(c) > 15 && coastDist(c) > 0.3){ open = {p:c, id:null}; break; } } catch (e){} }
    if (open) cands.unshift(open);
    const T0 = S.t; let ok = null, last = '';
    try { for (let h = 0; h <= 12 && !ok; h += 3){ S.t = T0 + h * 60;
      for (const q of cands){ await mapPreload([q.p], [['sim', 3], ['chart', 3]]); let r = null; try { r = await draftWay(from, q.p, berth === 'naust' ? null : pid, q.id, berth === 'naust' && berthKind(b) === 'naust', pid); } catch (e){ r = {why:['error ' + String(e && e.message).slice(0, 60)]}; } if (r && r.wps){ let a = from, land = 0; for (const w of r.wps){ if (!legClear(a, w)) land++; a = w; } if (!land){ ok = {h, nm:+r.nm.toFixed(1)}; break; } r = {why:['a leg over land']}; } last = r && r.why ? r.why[0] : 'none'; } } } finally { S.t = T0; }
    tried.push([t, VESSELS[t].draft, ok ? 'ok' : String(last).slice(0, 80)]);
    if (ok){ lim = VESSELS[t].draft; break; }
  }
  } finally { if (had) SITE_SILL[pid] = was; }
  return {lim, tried, name:portById(pid).name, pid, siteDraft:SITE_DRAFT}; }"""

def put(D, r):
    """a site's limit into the data: only under the deepest draught of the boats up to 15 m (SITE_DRAFT as the game has it), where it
    matters; a site that boat gets out from has no entry"""
    if r['lim'] < r.get('siteDraft', 3.0): D[r['pid']] = r['lim']
    else: D.pop(r['pid'], None)

def apply(logs):
    """--apply <log>...: the limits from earlier --dry runs (their «  kind  id  {...}» lines) written as one, so the sites can be tried
    in several processes at once"""
    D = json.load(open(OUT)) if os.path.exists(OUT) else {}
    for f in logs:
        for line in open(f):
            if '{' not in line or not line.startswith('  '): continue
            r = json.loads(line[line.index('{'):])
            if 'lim' in r: put(D, r)
    json.dump(dict(sorted(D.items())), open(OUT, 'w'), ensure_ascii=False, separators=(',', ':')); print(len(D), 'sites in', OUT)

def main():
    if '--apply' in sys.argv: return apply([a for a in sys.argv[1:] if a != '--apply'])
    from _env import GAME, boot
    from playwright.async_api import async_playwright
    sites = [a.split(':', 1) for a in sys.argv[1:] if ':' in a]
    if not sites:
        R = json.load(open(os.path.join(ROOT, 'tests', 'out', 'allesteder.json')))
        sites = [[r['kind'], r['id']] for r in R if r.get('kind') in ('rorbu', 'naust') and str(r.get('why', '')).startswith(('route', 'no harbour'))]
    print(len(sites), 'sites', flush=True)
    async def run():
        async with async_playwright() as p:
            br = await p.chromium.launch(); pg = await (await br.new_context(viewport={'width': 1280, 'height': 800})).new_page()
            await boot(pg, GAME + ('' if 'no3d' in GAME else ',no3d')); out = {}
            for kind, i in sites:
                r = await pg.evaluate(TRY, [kind, i]); out[i] = r; print('  %-5s %-16s %s' % (kind, i, json.dumps(r, ensure_ascii=False)), flush=True)
            await br.close(); return out
    res = asyncio.run(run())
    if '--dry' in sys.argv: return
    D = json.load(open(OUT)) if os.path.exists(OUT) else {}
    for i, r in res.items():
        if 'lim' in r: put(D, r)
    json.dump(dict(sorted(D.items())), open(OUT, 'w'), ensure_ascii=False, separators=(',', ':')); print(len(D), 'sites in', OUT)

if __name__ == '__main__': main()
