// The shop against the database (06.11.2026, before the launch): every product the game sells for real money has a product id the
// checkout knows (SHOP_PRODUCT in ui/10i-shop.js, else shop-checkout gets '' and the purchase can never open), and the price the game
// shows is the one the database charges (supabase/migrations, the last insert of each product wins). The company logo was sold in the
// paint shop at 29 kr shown, 49 kr in the database, and with no product id, so «Kjøp» always failed.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export default function (t){
  const K = t.K, src = f => readFileSync(join(ROOT, 'src', f), 'utf8');
  // the database's prices: (id, kind, name_no, name_en, price_nok, data) rows in the migrations, in the order they run
  const DB = {}, MIG = join(ROOT, 'supabase', 'migrations');
  for (const f of readdirSync(MIG).filter(f => f.endsWith('.sql')).sort()){
    const sql = readFileSync(join(MIG, f), 'utf8');
    for (const m of sql.matchAll(/\(\s*'([a-z0-9_]+)'\s*,\s*'(?:booster|skin)'\s*,\s*'(?:[^']|'')*'\s*,\s*'(?:[^']|'')*'\s*,\s*(\d+)\s*,\s*'(\{[^']*\})'/g)) DB[m[1]] = {nok:+m[2], data:JSON.parse(m[3])};
  }
  t.ok(Object.keys(DB).length >= 15, 'produktene i migreringene er lest (' + Object.keys(DB).length + ')');
  // the game's product ids and prices
  const shop = src('js/ui/10i-shop.js'), SP = Function('return ' + shop.match(/const SHOP_PRODUCT = (\{[\s\S]*?\});/)[1])();
  const paint = src('js/ui/10j-paint.js'), pm = paint.match(/const DNOK = (\d+), NOK = (\{[^}]*\})/), DNOK = +pm[1], PNOK = Function('return ' + pm[2])();
  const COS = Function('return ' + src('js/vessel3d.js').match(/const DESIGNS = (\[[^\]]*\]), COS = \[\.\.\.DESIGNS, ([^\]]*)\]/).slice(1).join('.concat([') + '])')();
  const game = {};   // the shop's key -> the price the game shows
  for (const k in K.HAILL) if (!K.HAILL[k].reward) game[k] = K.HAILL[k].nok;
  for (const k in K.BOOSTS) game[k] = K.BOOSTS[k].nok;
  for (const k in K.SKIP) game['sk_' + k] = K.SKIP[k].nok;
  game.yard = K.YARD_NOW_NOK;
  for (const k in K.HAILL_PACKS) game['hp_' + k] = K.HAILL_PACKS[k].nok;   // (the price ladder, 16.11.2026)
  for (const k in K.PACKS) game['pk_' + k] = K.PACKS[k].nok;
  for (const k of COS) game['des_' + k] = PNOK[k] || DNOK;
  for (const [k, nok] of Object.entries(game)){
    const id = SP[k], P = id && DB[id];
    t.ok(!!id, k + ': har et produkt-id kassen kjenner (SHOP_PRODUCT)');
    t.ok(!!P, k + ': produktet ' + (id || '?') + ' finnes i databasen');
    if (P) t.eq(nok, P.nok, k + ': prisen spillet viser er den databasen tar (' + nok + ' kr)');
  }
  // the hop over the rest of a route (HO3): its price is the server's for the minutes (shop_quote_hop); the product's own price is the least
  t.eq(DB.hopp && DB.hopp.nok, K.HOP.min, 'hopp: produktets pris i databasen er minsteprisen (' + K.HOP.min + ' kr); resten regnes etter minuttene');
  t.eq(SP.hopp, 'hopp', 'hopp: kassen kjenner produktet');
  // the packs (the season pack 16.11.2026, Black Week 27.11.2026): what the card says is in a pack is what the database delivers, a
  // pack with an end is refused by the server from the same moment the game takes its card away, and that moment is the end of the
  // day the card names, in Norwegian time
  for (const k in K.PACKS){ const P = K.PACKS[k], D = DB[SP['pk_' + k]], it = D && D.data.items || [], f = g => it.find(x => x.give === g) || {};
    t.eq(f('haill').n, P.haill, 'pk_' + k + ': databasen gir like mange haill som kortet sier (' + P.haill + ')');
    t.eq(f('trim').k, P.trim, 'pk_' + k + ': databasen gir trimmen kortet sier (' + P.trim + ')');
    t.eq(f('skip').k, P.skip, 'pk_' + k + ': databasen gir Skippertaket kortet sier (' + P.skip + ')');
    t.eq(D && D.data.until != null ? Date.parse(D.data.until) : null, P.until == null ? null : P.until, 'pk_' + k + ': serverens slutt er spillets slutt');
    t.ok(P.nok < K.packWorth(P), 'pk_' + k + ': pakken koster mindre enn delene hver for seg (' + P.nok + ' mot ' + K.packWorth(P) + ' kr)'); }
  { const B = K.PACKS.blackweek;
    t.eq([0, 1, 2, 3, 4, 8, 10, 11].map(K.haillCheapest).join(), '0,39,78,99,138,229,307,328', 'haill den billigste veien butikken selger dem: pakkene på 1, 3 og 8');
    t.eq(K.packWorth(K.PACKS.sesong), 436, 'Sjøværspakken: innholdet koster ellers 436 kr (4 haill som 3 + 1)');
    t.eq(K.packWorth(B), 905, 'Black Week: innholdet koster ellers 905 kr (10 haill som 8 + 1 + 1)');
    t.eq(K.packWorth(B) - B.nok, 406, 'Black Week: «Du sparer 406 kr»');
    t.eq(Math.round((1 - B.nok / K.packWorth(B)) * 100), 45, 'Black Week: «Spar 45 %» er regnet fra de ekte prisene');
    t.eq(new Date(B.until).toLocaleString('sv-SE', {timeZone:'Europe/Oslo'}), '2026-12-01 00:00:00', 'Black Week: slutten er midnatt etter mandag 30.11 i norsk tid');
    t.ok(K.packOn(B, B.until - 1) && !K.packOn(B, B.until) && !K.packOn(B, B.until + 864e5), 'Black Week: i salg til slutten, ikke fra og med den');
    t.ok(K.packOn(K.PACKS.sesong, B.until + 864e5), 'Sjøværspakken har ingen slutt'); }
  // and the other way: every product the database sells (not the thank-you, which is never bought) is one the game sells
  const sold = new Set(Object.values(SP));
  for (const id of Object.keys(DB).filter(id => !DB[id].data.reward)) t.ok(sold.has(id), id + ': databasens produkt selges i spillet');
}
