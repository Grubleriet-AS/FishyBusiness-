"""The service worker's install when the net hiccups (klynge:d71d3758, klynge:d95debbe, 20.11.2026): sw.js put its seven files in the
page cache with one Cache.addAll, so one file that did not come (a dropped connection, a page closed in the middle) failed the whole
install, the worker was thrown away, and the error trap sent «Cache.addAll() encountered a network error» twice. Now each file goes in
by itself: the install holds when a file does not come, a file that is not there keeps the copy from the cache before (so the app
still opens offline after an update), and only a file the server answers with an error (a file missing from the build) is told.

It builds dist-pwa/ (KYST_PWA=1) and serves it from a server of its own that can drop the connection for a chosen file or answer 404,
and can give sw.js another version (an update). A bare page registers the worker; the game itself is not started. Prints OK or FEIL."""
import os, subprocess, sys, threading, functools, http.server, asyncio
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist-pwa')
CTL = {'drop': set(), 'gone': set(), 'v': ''}


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + str(extra)) if extra else ''))


class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

    def do_GET(self):
        p = self.path.split('?')[0].lstrip('/')
        if p == 'blank.html':
            b = b'<!doctype html><meta charset="utf-8"><title>sw</title>'
            self.send_response(200); self.send_header('Content-Type', 'text/html'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
        if p in CTL['drop']:
            self.close_connection = True; self.connection.shutdown(2); return     # the net drops: no answer at all
        if p in CTL['gone']:
            self.send_error(404); return
        if p == 'sw.js':
            b = open(os.path.join(DIST, 'sw.js'), 'rb').read().replace(b"const V = '", b"const V = '" + CTL['v'].encode(), 1)
            self.send_response(200); self.send_header('Content-Type', 'text/javascript'); self.send_header('Cache-Control', 'no-cache'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
        return super().do_GET()


class Srv(http.server.ThreadingHTTPServer):
    def handle_error(self, request, client_address): pass


REG = """async () => {
  const got = []; navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.dsbErr) got.push(...e.data.dsbErr.map(x => x.msg)); });
  navigator.serviceWorker.startMessages();
  const reg = await navigator.serviceWorker.register('sw.js', {updateViaCache:'none'}); if (reg.installing || reg.waiting) {} else await reg.update();
  const w = reg.installing || reg.waiting || reg.active; if (!w) return {st:'redundant', names:[], files:[], errs:got};
  const st = await new Promise(res => { if (w.state === 'activated' || w.state === 'redundant') return res(w.state);
    w.addEventListener('statechange', () => { if (w.state === 'activated' || w.state === 'redundant') res(w.state); }); setTimeout(() => res('timeout:' + w.state), 20000); });
  await new Promise(r => setTimeout(r, 500));
  const names = (await caches.keys()).filter(k => k.startsWith('kyst-page-'));
  const files = names.length ? (await (await caches.open(names[names.length - 1])).keys()).map(q => q.url.split('/').pop() || './') : [];
  return {st, names, files, errs:got};
}"""


async def main():
    env = dict(os.environ, KYST_PWA='1'); env.pop('KYST_DIST', None)
    r = subprocess.run(['node', 'build.mjs'], cwd=ROOT, env=env, capture_output=True, text=True)
    check(r.returncode == 0 and os.path.exists(os.path.join(DIST, 'sw.js')), 'dist-pwa/ bygges med KYST_PWA=1', r.stderr[-300:])
    srv = Srv(('127.0.0.1', 0), functools.partial(H, directory=DIST)); threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:%d/' % srv.server_port
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # 1. the first visit, and the net drops one file (the big icon): the worker is installed anyway, with the other six
        ctx = await b.new_context(); pg = await ctx.new_page()
        await pg.goto(base + 'blank.html')
        CTL['drop'] = {'icon-512.png'}
        a = await pg.evaluate(REG)
        check(a['st'] == 'activated', 'en fil som ikke kommer ved installasjonen, feller ikke service workeren', a['st'])
        check(len(a['names']) == 1 and set(a['files']) >= {'./', 'index.html', 'manifest.webmanifest', 'manifest.json', 'icon-192.png'}, 'de andre filene ligger i sidelageret', a['files'])
        check(not a['errs'], 'et nettbrudd ved installasjonen meldes ikke som feil', a['errs'])
        # 2. an update (a new version of sw.js) while index.html does not come: the new page cache keeps the copy from before
        CTL['drop'] = set(); CTL['v'] = 'u1-'
        a = await pg.evaluate(REG)
        CTL['drop'] = {'index.html', ''}; CTL['v'] = 'u2-'
        c = await pg.evaluate(REG)
        check(c['st'] == 'activated' and len(c['names']) == 1 and c['names'][0].startswith('kyst-page-u2-'), 'oppdateringen installeres selv om siden ikke kommer', (c['st'], c['names']))
        check('index.html' in c['files'] and './' in c['files'], 'siden fra før ligger i det nye sidelageret (spillet åpner uten nett)', c['files'])
        # 3. a file the server does not have (a build without it) is still told, and the install holds
        CTL['drop'] = set(); CTL['gone'] = {'icon-192.png'}; CTL['v'] = 'u3-'
        d = await pg.evaluate(REG)
        check(d['st'] == 'activated' and d['names'][:1] != [] and d['names'][0].startswith('kyst-page-u3-') and any('icon-192.png' in e for e in d['errs']), 'en fil som mangler på tjeneren, meldes', (d['st'], d['errs']))
        await b.close()
    srv.shutdown()


asyncio.run(main())
