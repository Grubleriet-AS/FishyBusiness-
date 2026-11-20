// The service worker of the app on the home screen (P1 of the PWA plan, 03.10.2026; only in dist-pwa/, which build.mjs makes with
// KYST_PWA=1). The map packs and the data files (the models, the pictures and Senja's buildings, out of the page from 29.10.2026)
// have their hash in the name and never change: they come from the cache first, and are kept until a new manifest no longer lists
// them. The page and the two manifests come from the net first, and from the cache when there is no net, so the game opens offline
// after the first visit. V is the build's own (build.mjs), so a new build gets a fresh page cache.
const V = '@V@', PAGE = 'kyst-page-' + V, MAP = 'kyst-map', DATA = 'kyst-data';
// the worker's errors (02.11.2026, the error trap): a worker has no page and no console anyone reads, so what goes wrong here (an
// install that failed, a cache that is full, a prune that stopped) is told to an open page of the game, which sends it with its own
// (ui/10f-cloud.js, the 'message' from the worker; src 'sw'). Kept here until a page is open, at most 20, while the worker lives.
const ERRS = [];
function swErr(msg, stack){ ERRS.push({msg:'sw: ' + String(msg || 'error').slice(0, 300), stack:String(stack || '').slice(0, 1500), v:V}); if (ERRS.length > 20) ERRS.shift(); swErrSend(); }
async function swErrSend(){
  try { const cs = await self.clients.matchAll({type:'window', includeUncontrolled:true}); if (!cs.length || !ERRS.length) return; cs[0].postMessage({dsbErr:ERRS.splice(0)}); } catch (e){}
}
self.addEventListener('error', e => swErr(e.message, e.error && e.error.stack));
self.addEventListener('unhandledrejection', e => { const r = e.reason; swErr(r && r.message ? (r.name && r.name !== 'Error' ? r.name + ': ' : '') + r.message : String(r), r && r.stack); });
self.addEventListener('message', e => { if (e.data && e.data.dsbErrPull) e.waitUntil(swErrSend()); });
// (20.11.2026, klynge:d71d3758: one Cache.addAll failed the whole install when a single file did not come, a dropped connection or a
// page closed in the middle, and the worker was thrown away. Each file now goes in by itself: one that does not come keeps the copy
// from the cache before, so the app still opens offline, and the fetch below puts the new one in the next time it is fetched. Only a
// file the server answers with an error, a file missing from the build, is told; a net that hiccups is not an error of the game.)
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(PAGE);
    await Promise.all(['./', 'index.html', 'manifest.webmanifest', 'map/manifest.json', 'data/manifest.json', 'icon-192.png', 'icon-512.png'].map(async f => {
      try {
        const r = await fetch(f); if (r.ok) return await c.put(f, r);
        swErr('install: ' + f + ' ' + r.status);
      } catch (x){}
      try { const old = await caches.match(f); if (old) await c.put(f, old); } catch (x){}
    }));
    await self.skipWaiting();
  })());
});
// the packs the map manifest no longer lists go (a new map release names its changed packs anew), and the data files likewise
async function prune(){
  for (const [man, store, key] of [['map/manifest.json', MAP, 'packs'], ['data/manifest.json', DATA, 'files']]){
    try {
      const r = await (await caches.open(PAGE)).match(man); if (!r) continue;
      const keep = new Set((await r.json())[key].map(p => p.file)), c = await caches.open(store);
      for (const q of await c.keys()) if (!keep.has(q.url.split('/').pop())) await c.delete(q);
    } catch (e){ swErr('prune ' + store + ': ' + (e && e.message || e), e && e.stack); }
  }
}
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('kyst-page-') && k !== PAGE) await caches.delete(k);
    await prune(); await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  const store = /\/map\/[^/]+\.wasm$/.test(u.pathname) ? MAP : /\/data\/[^/]+\.bin$/.test(u.pathname) ? DATA : null;
  if (store){
    e.respondWith(caches.open(store).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const r = await fetch(req); if (r.ok){ const cl = r.clone(); c.put(req, cl).catch(x => swErr('cache ' + store + ': ' + (x && x.name) + ': ' + (x && x.message), x && x.stack)); } return r;
    }));
    return;
  }
  e.respondWith(fetch(req).then(r => {
    if (r.ok){ const cl = r.clone(); caches.open(PAGE).then(c => c.put(req, cl)).then(() => { if (/\/(map|data)\/manifest\.json$/.test(u.pathname)) prune(); }); }
    return r;
  }).catch(async () => (await caches.match(req)) || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});
// push notifications (05.10.2026; ui/10g-push.js, supabase/functions/push-send): shown with the app's icon; a tap brings the app up
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x){ d = {body:e.data ? e.data.text() : ''}; }
  e.waitUntil(self.registration.showNotification(d.title || 'Det Store Blå', {body:d.body || '', tag:d.tag || 'dsb', icon:'icon-192.png', lang:'no'}));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    for (const c of await self.clients.matchAll({type:'window', includeUncontrolled:true})) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  })());
});
