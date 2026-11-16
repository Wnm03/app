'use strict';
// Mesin dana klien (renovasi.js) lazy-load. Perbaikan lazy-engine sebelumnya memuatnya SAAT wrapper pertama dipanggil,
// jadi halaman sempat tampil dengan angka FISIK lalu loncat ke angka pribadi. Di sini mesin dimuat sedini mungkin:
// mulai tepat setelah load() data, ditunggu (dengan batas waktu) sebelum showMain() bila tanpa PIN, dan tidak
// menahan layar PIN. Tanpa proyek klien: tidak memuat apa pun.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { loadSource } = require('./helpers/loadSource');

const akun = fs.readFileSync('modules/finance/akun.js', 'utf8');
const grab = (re) => { const m = akun.match(re); assert.ok(m, String(re) + ' belum ada'); return m[0]; };

function mk(D, { loaded = false, mainVisible = true } = {}) {
  const calls = { ensure: 0, invalidate: 0, render: [] };
  let resolve, reject;
  const main = { style: { display: mainVisible ? 'block' : '' }, classList: { contains: (c) => c === 'u-dnone' && !mainVisible } };
  const c = {
    D, setTimeout, clearTimeout, Promise,
    document: { querySelector: () => ({ id: 'page-keuangan' }), getElementById: (id) => (id === 'mainApp' ? main : null) },
    invalidateAccBalCache: () => { calls.invalidate++; },
    renderPageContent: (p) => calls.render.push(p),
    ensureRenov: () => { calls.ensure++; return new Promise((res, rej) => { resolve = res; reject = rej; }); },
    totalSaldoAkun: () => 1000,
  };
  if (loaded) { c.saldoPribadi = () => 700; c.isAliranKlien = () => true; }
  vm.createContext(c);
  const names = ['adaProyekKlienSafe', 'ensureKlienEngineSafe', 'siapkanMesinKlienSafe'];
  vm.runInContext(grab(/let _klienEnginePending[^\n]*\n/) + names.map((n) => grab(new RegExp('function ' + n + '\\([^\\n]*\\n'))).join('\n'), c);
  return { c, calls, done: () => resolve && resolve(), fail: () => reject && reject(new Error('gagal')) };
}
const klienD = () => ({ renovProjects: [{ id: 'p', dana: 'klien' }], transactions: [] });
const tick = () => new Promise((r) => setImmediate(r));

test('siapkanMesinKlienSafe: tanpa proyek klien -> langsung siap, mesin TIDAK dimuat', async () => {
  const { c, calls } = mk({ renovProjects: [{ id: 'p', dana: 'pribadi' }], transactions: [] });
  assert.equal(await c.siapkanMesinKlienSafe(50), true);
  assert.equal(calls.ensure, 0);
});

test('siapkanMesinKlienSafe: mesin sudah dimuat -> siap, tidak memuat lagi', async () => {
  const { c, calls } = mk(klienD(), { loaded: true });
  assert.equal(await c.siapkanMesinKlienSafe(50), true);
  assert.equal(calls.ensure, 0);
});

test('siapkanMesinKlienSafe: proyek klien + belum dimuat -> menunggu muat selesai, cache dibuang', async () => {
  const { c, calls, done } = mk(klienD());
  let hasil = 'belum';
  const p = c.siapkanMesinKlienSafe(2000).then((v) => { hasil = v; });
  await tick();
  assert.equal(hasil, 'belum', 'belum selesai selagi mesin dimuat');
  assert.equal(calls.ensure, 1);
  done(); await p;
  assert.equal(hasil, true);
  assert.equal(calls.invalidate, 1);
});

test('siapkanMesinKlienSafe: lewat batas waktu -> false (tidak menahan boot), pemuatan tetap berlanjut', async () => {
  const { c, calls, done } = mk(klienD());
  assert.equal(await c.siapkanMesinKlienSafe(20), false);
  assert.equal(calls.invalidate, 0);
  done(); await tick();
  assert.equal(calls.invalidate, 1, 'selesai terlambat tetap buang cache');
  assert.deepEqual(calls.render, ['keuangan'], 'dan render ulang karena aplikasi sudah tampil');
});

test('siapkanMesinKlienSafe: muat gagal -> false, tidak melempar, dan boleh dicoba lagi', async () => {
  const { c, calls, fail } = mk(klienD());
  const p = c.siapkanMesinKlienSafe(2000);
  await tick(); fail();
  assert.equal(await p, false);
  const p2 = c.siapkanMesinKlienSafe(20);
  assert.equal(calls.ensure, 2);
  assert.equal(await p2, false);
});

test('render ulang setelah muat DILEWATI bila aplikasi belum tampil (boot / layar PIN), cache tetap dibuang', async () => {
  const { c, calls, done } = mk(klienD(), { mainVisible: false });
  const p = c.siapkanMesinKlienSafe(2000);
  await tick(); done(); await p;
  assert.equal(calls.invalidate, 1);
  assert.deepEqual(calls.render, []);
});

test('ensureKlienEngineSafe: mengembalikan promise yang sama saat sedang dimuat; null bila tidak perlu', async () => {
  const a = mk(klienD());
  const p1 = a.c.ensureKlienEngineSafe(), p2 = a.c.ensureKlienEngineSafe();
  assert.ok(p1 && typeof p1.then === 'function');
  assert.equal(p1, p2);
  assert.equal(a.calls.ensure, 1);
  const b = mk({ renovProjects: [], transactions: [] });
  assert.equal(b.c.ensureKlienEngineSafe(), null);
});

// ---- urutan boot yang SUNGGUH dieksekusi (modules/shared/app-init-runtime.js) ----
function boot({ pin, siapkan }) {
  const log = [];
  const els = {};
  const el = (id) => els[id] || (els[id] = { id, textContent: '', style: {}, classList: { add() {}, remove() {} } });
  const ctx = loadSource(['modules/shared/app-init-runtime.js'], {
    load: async () => { log.push('load'); },
    siapkanMesinKlienSafe: siapkan ? (ms) => { log.push('siapkan:' + ms); return siapkan(); } : undefined,
    applyEffectiveTheme() {}, setupPWA() {}, enableSwipeToDismiss() {},
    showPinScreen: () => log.push('pin'), showMain: () => log.push('showMain'), updateOnboardPreview() {},
    D: { googleDrive: {} }, navigator: {},
    localStorage: { getItem: (k) => (k === 'kw_pin' ? (pin ? '1234' : null) : k === 'kw_setup' ? '1' : null) },
    document: { getElementById: el, visibilityState: 'visible' },
  });
  return { ctx, log };
}

test('boot tanpa PIN: mesin mulai dimuat setelah load(), showMain() MENUNGGU mesin siap', async () => {
  let selesai; const gate = new Promise((r) => { selesai = r; });
  const { ctx, log } = boot({ pin: false, siapkan: () => gate });
  const run = ctx.__kwInitRuntime();
  await tick();
  assert.deepEqual(log, ['load', 'siapkan:1500'], 'showMain belum dipanggil selagi mesin dimuat');
  selesai(true); await run;
  assert.deepEqual(log, ['load', 'siapkan:1500', 'showMain']);
});

test('boot dengan PIN: mesin dimuat di belakang layar PIN, layar PIN TIDAK menunggu', async () => {
  const never = new Promise(() => {});
  const { ctx, log } = boot({ pin: true, siapkan: () => never });
  await ctx.__kwInitRuntime();
  assert.deepEqual(log, ['load', 'siapkan:1500', 'pin']);
});

test('boot tanpa helper (bundle lama): tetap jalan seperti semula', async () => {
  const { ctx, log } = boot({ pin: false, siapkan: null });
  await ctx.__kwInitRuntime();
  assert.deepEqual(log, ['load', 'showMain']);
});

test('boot: kegagalan menunggu mesin tidak menahan showMain', async () => {
  const { ctx, log } = boot({ pin: false, siapkan: () => Promise.reject(new Error('x')) });
  await ctx.__kwInitRuntime();
  assert.deepEqual(log, ['load', 'siapkan:1500', 'showMain']);
});
