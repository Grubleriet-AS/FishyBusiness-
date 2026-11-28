// The vec worker's read of a tile's bytes can fail on iOS Safari with «NotReadableError: The I/O read operation failed.» (klynge:695a13c5,
// 28.11.2026): a passing failure of the browser's own read, which the main thread's decoding gets round. It is tried once more in the
// worker after a short pause, then decoded here, without console.error; any other error from the worker still goes to console.error.
const timers = [], workers = [];
export const stubs = {
  setTimeout:(f, ms) => { timers.push({f, ms}); return timers.length; },
  Worker:function (){ this.sent = []; this.postMessage = d => this.sent.push(d); this.terminate = () => {}; workers.push(this); }
};

export default function (t){
  const K = t.K, VEC = K.get('VEC'), MAPD = K.get('MAPD'), vecTile = K.get('vecTile');
  const man = MAPD.man, errs = [], ce = console.error;
  MAPD.man = {tile:50, block:5};
  const pack = (tx, ty) => { const pk = {tile:[tx, ty], idx:new Map(), buf:new Uint8Array(1)}; MAPD.byTile.set('vec:' + tx + ':' + ty, pk); return pk; };
  const READ = 'NotReadableError: The I/O read operation failed.';
  console.error = (...a) => errs.push(a.join(' '));
  try {
    pack(3, 4);
    t.eq(vecTile(3, 4), null, 'flisa sendes til arbeideren');
    const w = workers[0];
    t.eq(w ? w.sent.length : 0, 1, 'én melding til arbeideren');
    w.onmessage({data:{id:w.sent[0].id, err:READ}});
    t.eq(errs.length, 0, 'en lesefeil i arbeideren gir ingen console.error');
    t.ok(!VEC.tiles.has('3:4'), 'flisa dekodes ikke på hovedtråden før det nye forsøket');
    t.ok(timers.length === 1 && timers[0].ms > 0 && timers[0].ms <= 1000, 'nytt forsøk etter en kort pause');
    timers.splice(0).forEach(q => q.f());
    t.eq(w.sent.length, 2, 'det nye forsøket går til arbeideren');
    w.onmessage({data:{id:w.sent[1].id, err:READ}});
    t.ok(VEC.tiles.has('3:4'), 'feiler det igjen, dekodes flisa på hovedtråden');
    t.eq(errs.length, 0, 'og fortsatt ingen console.error');
    t.eq(timers.length, 0, 'ikke et tredje forsøk');

    // a read error, then the second try comes through
    pack(3, 5); vecTile(3, 5);
    w.onmessage({data:{id:w.sent[2].id, err:READ}});
    timers.splice(0).forEach(q => q.f());
    const D = w.sent[3];
    w.onmessage({data:{id:D.id, r:K.get('vecDecode')(D)}});
    t.ok(VEC.tiles.has('3:5'), 'det nye forsøket i arbeideren gir flisa');
    t.eq(errs.length, 0, 'uten console.error');

    // any other error is still logged, and decoded here at once
    pack(3, 6); vecTile(3, 6);
    w.onmessage({data:{id:w.sent[4].id, err:'TypeError: x is undefined'}});
    t.ok(VEC.tiles.has('3:6'), 'en annen feil dekodes på hovedtråden med en gang');
    t.eq(errs.length, 1, 'en annen feil gir console.error');
  } finally { console.error = ce; MAPD.man = man; for (const k of ['3:4', '3:5', '3:6']){ MAPD.byTile.delete('vec:' + k); VEC.tiles.delete(k); } }
}
