'use strict';
/** S2897 — perbaikan audit S2896: P4-1 sinkron utang bagi hasil saat boot/restore, P4-2 rename/merge pemilik menyebar ke bagiHasil, P4-3 penanda "menunggu koreksi laba", P2-1 service worker offline. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadSource } = require('./helpers/loadSource');
const sameId = (a, b) => String(a) === String(b);
const ROOT = path.join(__dirname, '..');

function mk(D, saveFn) {
  let n = 0; const calls = { save: 0 };
  const r = loadSource(['modules/home/renovasi.js', 'modules/finance/tx-renov.js'], {
    D, sameId, todayStr: () => '2026-11-20', uid: () => 'u' + (++n),
    save: () => { calls.save++; return saveFn ? saveFn() : true; }, toast() {},
    escapeHtml: String, fmt: (x) => 'Rp' + Math.round(x), fmtFull: (x) => 'Rp' + Math.round(x),
    document: { getElementById: () => null }, totalSaldoAkun: () => 0, closeModal() {}, openModal() {}, renovAccountOwners: undefined,
  }, ['Renov']);
  r.__calls = calls; return r;
}
const accSelf = (id) => ({ id, name: id, ownership: 'SELF', includeInBalance: true });
function wall() {
  const items = [{ id: 'i1', name: 'a', harga: 4307418, paid: true, txId: 't1' }, { id: 'i2', name: 'b', harga: 304482, paid: false, txId: null, payments: [] }];
  const p = { id: 'p1', name: 'wallpanel', klien: 'mba indah', dana: 'klien', rab: 7000000, status: 'selesai', atestasi: { semuaBiayaTercatat: true }, items, labaLedger: [],
    bagiHasil: { labaManual: 2388100, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 33.499434697, isSelf: true }, { ownerId: 'home1', ownerName: 'home in', porsi: 66.500565303, isSelf: false }] } };
  const D = { profile: { nama: 'W' }, renovProjects: [p], accounts: [accSelf('bri'), accSelf('cash')], piutang: [], debts: [],
    transactions: [
      { id: 'd1', type: 'income', amount: 3500000, accountId: 'bri', renovDpProjectId: 'p1', date: '2026-11-14' },
      { id: 'd2', type: 'income', amount: 3500000, accountId: 'bri', renovDpProjectId: 'p1', date: '2026-11-16' },
      { id: 't1', type: 'expense', amount: 4307418, accountId: 'bri', renovProjectLinkId: 'p1', renovItemLinkId: 'i1', deductionOwnerId: 'SELF', date: '2026-11-16' },
    ] };
  return { p, D };
}

// ---------- P4-1 ----------
test('P4-1: sinkron-semua membuat utang yang hilang (ledger ada, utang tidak), sekali save, lalu idempoten', () => {
  const { p, D } = wall(); const r = mk(D);
  r.renovAkuiLaba(p, 2388100, { kunci: 'k1' });
  assert.equal(D.debts.length, 1);
  D.debts.length = 0; // simulasi restore backup lama / sinkron dari perangkat belum-patch
  r.__calls.save = 0;
  assert.equal(r.renovSyncBagiHasilUtangSemua(), true);
  assert.equal(D.debts.length, 1); assert.equal(D.debts[0].linkedOwnerId, 'home1'); assert.ok(D.debts[0].nilai > 0);
  assert.equal(r.__calls.save, 1);
  assert.equal(r.renovSyncBagiHasilUtangSemua(), false, 'kedua kali tidak ada perubahan');
  assert.equal(r.__calls.save, 1, 'tidak save lagi');
});

test('P4-1: tanpa proyek klien/bagi hasil/ledger = no-op tanpa save', () => {
  const { p, D } = wall(); const r = mk(D);
  assert.equal(r.renovSyncBagiHasilUtangSemua(), false); // belum ada laba diakui
  p.dana = 'pribadi'; assert.equal(r.renovSyncBagiHasilUtangSemua(), false);
  const r2 = mk({ debts: [] }); assert.equal(r2.renovSyncBagiHasilUtangSemua(), false);
  assert.equal(r.__calls.save + r2.__calls.save, 0);
});

test('P4-1: save gagal -> utang dikembalikan', () => {
  const { p, D } = wall(); const r = mk(D);
  r.renovAkuiLaba(p, 2388100, { kunci: 'k1' }); D.debts.length = 0;
  const r2 = mk(D, () => false);
  assert.equal(r2.renovSyncBagiHasilUtangSemua(), false);
  assert.equal(D.debts.length, 0, 'rollback');
});

test('P4-1: boot memanggil sinkron setelah mesin klien siap (app-init-runtime + akun.js)', () => {
  const rt = fs.readFileSync(path.join(ROOT, 'modules/shared/app-init-runtime.js'), 'utf8');
  const ak = fs.readFileSync(path.join(ROOT, 'modules/finance/akun.js'), 'utf8');
  assert.match(rt, /renovSyncBagiHasilUtangSemua/); assert.match(ak, /renovSyncBagiHasilUtangSemua/);
});

// ---------- P4-2 ----------
function regCtx(D) {
  return loadSource(['modules/shared/owner-registry.js'], { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => true }, ['OwnerRegistry']);
}
test('P4-2: rename menyebar ke D.renovProjects[].bagiHasil.owners (bukan SELF) dan sinkron utang tidak mengembalikan nama lama', () => {
  const { p, D } = wall(); D.ownerRegistry = [{ id: 'home1', name: 'home in' }];
  const r = mk(D); r.renovAkuiLaba(p, 2388100, { kunci: 'k1' });
  const reg = regCtx(D);
  const res = reg.OwnerRegistry.rename('home1', 'home out');
  assert.equal(res.ok, true); assert.equal(res.bagiHasil, 1); assert.equal(res.debts, 1);
  assert.equal(p.bagiHasil.owners[1].ownerName, 'home out'); assert.equal(p.bagiHasil.owners[0].ownerName, 'W');
  r.renovAkuiLaba(p, 1, { kunci: 'k2' }); // peristiwa laba berikutnya -> sinkron
  assert.equal(D.debts.filter((d) => !d.lunas)[0].name, 'home out');
});

test('P4-2: merge memindah bagiHasil + renovBagiOwnerId; konflik source+target satu proyek membatalkan merge', () => {
  const { p, D } = wall(); D.ownerRegistry = [{ id: 'home1', name: 'home in' }, { id: 'o2', name: 'Budi' }];
  const r = mk(D); r.renovAkuiLaba(p, 2388100, { kunci: 'k1' });
  const reg = regCtx(D);
  const res = reg.OwnerRegistry.merge('home1', 'o2');
  assert.equal(res.ok, true); assert.equal(res.bagiHasil, 1);
  assert.equal(p.bagiHasil.owners[1].ownerId, 'o2'); assert.equal(p.bagiHasil.owners[1].ownerName, 'Budi');
  assert.equal(D.debts[0].linkedOwnerId, 'o2'); assert.equal(D.debts[0].renovBagiOwnerId, 'o2');
  const before = r.renovSyncBagiHasilUtang(p); assert.equal(before, false, 'tidak ada utang ganda setelah merge');
  assert.equal(D.debts.filter((d) => !d.lunas).length, 1);
  // konflik
  const w2 = wall(); w2.p.bagiHasil.owners.push({ ownerId: 'o2', ownerName: 'Budi', porsi: 0, isSelf: false });
  w2.D.ownerRegistry = [{ id: 'home1', name: 'home in' }, { id: 'o2', name: 'Budi' }];
  const res2 = regCtx(w2.D).OwnerRegistry.merge('home1', 'o2');
  assert.equal(res2.ok, false); assert.equal(res2.reason, 'conflict'); assert.equal(w2.p.bagiHasil.owners[1].ownerId, 'home1');
});

// ---------- P4-3 ----------
test('P4-3: kalimat status memberi penanda saat menunggu koreksi laba; tanpa penanda tetap persis', () => {
  const ctx = loadSource(['modules/finance/dana-titipan-portfolio-render.js'], { escapeHtml: String, fmt: (n) => 'Rp ' + Math.round(Math.abs(n || 0)), D: {} }, ['DanaTitipanPortfolioPresenter']);
  const R = ctx.DanaTitipanPortfolioPresenter || ctx.window.DanaTitipanPortfolioPresenter;
  const o = { principalAmount: null, bagiHasilTotal: 1588100 };
  assert.equal(R._ownerStatusSentence(o), 'Pokok belum dicatat · Bagi hasil proyek belum dibayar Rp 1,59 jt');
  assert.equal(R._ownerStatusSentence({ ...o, bagiHasilKoreksi: true }), 'Pokok belum dicatat · Bagi hasil proyek belum dibayar Rp 1,59 jt (menunggu koreksi laba)');
});
test('P4-3: agregasi menandai pemilik bila proyek butuh koreksi laba', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/finance/dana-titipan-aggregation-api.js'), 'utf8');
  assert.match(src, /bagiHasilKoreksiSet/); assert.match(src, /o\.bagiHasilKoreksi\s*=/); assert.match(src, /koreksiDiperlukan/);
});

// ---------- P2-1 ----------
function swCtx(extra) {
  const listeners = {}; const ctx = { self: { location: { origin: 'http://x' }, addEventListener: (t, f) => { listeners[t] = f; }, skipWaiting() {}, clients: { claim: async () => {} } },
    URL, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, console, fetch: async () => { throw new Error('offline'); } };
  Object.assign(ctx, extra); vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), ctx); return { ctx, listeners };
}
test('P2-1: precache memuat semua aset lokal index.html (kecuali yang dimuat lewat ?v= tetap tanpa query)', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const pre = new Set([...sw.match(/PRECACHE_URLS = \[([\s\S]*?)\]/)[1].matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]));
  for (const f of ['index.html', 'app_production.html']) {
    const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of h.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)) {
      const u = m[1]; if (/^(https?:|data:|mailto:|\/\/)/.test(u) || !/\.(js|css|json|svg|png|ico)(\?|$)/.test(u)) continue;
      assert.ok(pre.has(u.replace(/\?.*$/, '').replace(/^\.\//, '')), f + ' memuat ' + u + ' tetapi tidak ada di PRECACHE_URLS');
    }
    for (const u of pre) assert.ok(fs.existsSync(path.join(ROOT, u)), 'file precache tidak ada: ' + u);
  }
});
test('P2-1: offline: request ber-?v= jatuh ke cache tanpa query (ignoreSearch) dan tetap 503 bila benar-benar tidak ada', async () => {
  const store = new Map([['http://x/app-bundle-a.min.js', 'BUNDLE']]);
  const caches = { match: async (req, opt) => { const u = typeof req === 'string' ? req : req.url; if (store.has(u)) return { body: store.get(u) }; if (opt && opt.ignoreSearch) { const k = u.split('?')[0]; if (store.has(k)) return { body: store.get(k) }; } return undefined; }, open: async () => ({ put() {} }), keys: async () => [] };
  const { listeners } = swCtx({ caches });
  const run = async (url) => { let out; const e = { request: { method: 'GET', url, mode: 'no-cors', headers: { get: () => '' } }, respondWith: (p) => { out = p; } }; listeners.fetch(e); return out; };
  assert.equal((await run('http://x/app-bundle-a.min.js?v=2910')).body, 'BUNDLE');
  assert.equal((await run('http://x/tidak-ada.js?v=1')).status, 503);
});

test('P2-1+: precache tahan satu URL gagal; activate tidak menghapus cache lama bila cache baru kosong', async () => {
  const mk = (failUrl, newCount) => {
    const added = []; const deleted = [];
    const cacheNew = { addAll: async () => { throw new Error('404'); }, add: async (u) => { if (u === failUrl) throw new Error('x'); added.push(u); }, keys: async () => new Array(newCount) };
    const caches = { open: async () => cacheNew, keys: async () => ['kw-cache-v1', 'kw-cache-v2910'], delete: async (k) => { deleted.push(k); }, match: async () => undefined };
    const { listeners } = swCtx({ caches }); return { listeners, added, deleted };
  };
  const a = mk('./app-bundle-a.min.js', 3); let p; await new Promise((res) => { a.listeners.install({ waitUntil: (x) => { p = x; } }); res(); }); await p;
  assert.ok(a.added.length >= 10 && !a.added.includes('./app-bundle-a.min.js'));
  const b = mk('', 0); await new Promise((res) => { b.listeners.activate({ waitUntil: (x) => { p = x; } }); res(); }); await p;
  assert.deepEqual(b.deleted, [], 'cache baru kosong: cache lama dipertahankan');
  const c = mk('', 5); await new Promise((res) => { c.listeners.activate({ waitUntil: (x) => { p = x; } }); res(); }); await p;
  assert.deepEqual(c.deleted, ['kw-cache-v1']);
});
