'use strict';
// S2830 — Saldo aktual (tanggal <= hari ini) vs saldo proyeksi (semua transaksi). Tanpa flag/migrasi data baru.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

function mk(txs, opts = {}) {
  const state = { today: opts.today || '2026-11-15' };
  const D = {
    accounts: [
      { id: 'a1', name: 'Kas', baseBalance: 1000, includeInBalance: true },
      { id: 'a2', name: 'Bank', baseBalance: 500, includeInBalance: true },
    ],
    transactions: txs,
    assets: opts.assets || [],
  };
  const ctx = loadSource(['modules/finance/akun.js'], { D, todayStr: () => state.today }, ['_accBalCache', '_totalSaldoCache']);
  return { ctx, D, state };
}
const TX = () => [
  { id: 1, accountId: 'a1', type: 'income', amount: 100, date: '2026-11-10' },
  { id: 2, accountId: 'a1', type: 'expense', amount: 30, date: '2026-11-15' }, // hari ini: realisasi
  { id: 3, accountId: 'a1', type: 'expense', amount: 400, date: '2026-11-20' }, // masa depan
  { id: 4, accountId: 'a1', type: 'expense', amount: 7, date: '2026-11-25', hitungKas: false },
  { id: 5, accountId: 'a2', type: 'transfer_in', amount: 50, date: '2026-12-01' },
  { id: 6, accountId: 'a1', type: 'expense', amount: 5 }, // tanpa tanggal: realisasi (kompatibel data lama)
];

test('S2830: saldo aktual tidak memuat transaksi bertanggal setelah hari ini', () => {
  const { ctx } = mk(TX());
  assert.equal(ctx.recalcAccBalance('a1'), 1000 + 100 - 30 - 5);
  assert.equal(ctx.recalcAccBalance('a2'), 500);
});

test('S2830: saldo proyeksi memuat semua transaksi (kecuali hitungKas:false)', () => {
  const { ctx } = mk(TX());
  assert.equal(ctx.recalcAccProjectedBalance('a1'), 1000 + 100 - 30 - 400 - 5);
  assert.equal(ctx.recalcAccProjectedBalance('a2'), 550);
});

test('S2830: total saldo aktual vs proyeksi', () => {
  const { ctx } = mk(TX());
  assert.equal(ctx.totalSaldoAkun(), 1065 + 500);
  assert.equal(ctx.totalSaldoProyeksi(), 665 + 550);
});

test('S2830: transfer bertanggal masa depan tidak mengubah saldo aktual di kedua akun', () => {
  const { ctx } = mk([
    { id: 1, accountId: 'a1', type: 'transfer_out', amount: 200, date: '2026-12-01' },
    { id: 2, accountId: 'a2', type: 'transfer_in', amount: 200, date: '2026-12-01' },
  ]);
  assert.equal(ctx.recalcAccBalance('a1'), 1000);
  assert.equal(ctx.recalcAccBalance('a2'), 500);
  assert.equal(ctx.recalcAccProjectedBalance('a1'), 800);
  assert.equal(ctx.recalcAccProjectedBalance('a2'), 700);
});

test('S2830: pergantian tanggal memperbarui saldo TANPA invalidate manual / muat ulang', () => {
  const { ctx, state } = mk(TX());
  assert.equal(ctx.recalcAccBalance('a1'), 1065);
  assert.equal(ctx.totalSaldoAkun(), 1565);
  state.today = '2026-11-20'; // hari berganti, cache dari hari lama tidak boleh dipakai
  assert.equal(ctx.recalcAccBalance('a1'), 1065 - 400);
  assert.equal(ctx.totalSaldoAkun(), 665 + 500);
  state.today = '2026-12-01';
  assert.equal(ctx.recalcAccBalance('a2'), 550);
});

test('S2830: cache tetap dipakai dalam hari yang sama (tidak hitung ulang)', () => {
  const { ctx, D } = mk(TX());
  assert.equal(ctx.recalcAccBalance('a1'), 1065);
  D.transactions.push({ id: 99, accountId: 'a1', type: 'income', amount: 1000, date: '2026-11-01' });
  assert.equal(ctx.recalcAccBalance('a1'), 1065); // masih cache sampai invalidate/save
  ctx.invalidateAccBalCache();
  assert.equal(ctx.recalcAccBalance('a1'), 2065);
});

test('S2830: saldo berjalan mengikuti urutan tanggal walau urutan input acak, termasuk baris masa depan', () => {
  const { ctx } = mk([
    { id: 3, accountId: 'a1', type: 'expense', amount: 400, date: '2026-11-20' },
    { id: 1, accountId: 'a1', type: 'income', amount: 100, date: '2026-11-10' },
    { id: 2, accountId: 'a1', type: 'expense', amount: 30, date: '2026-11-15' },
  ]);
  const m = ctx.computeAccRunningBalances('a1');
  assert.equal(m.get(1), 1100);
  assert.equal(m.get(2), 1070);
  assert.equal(m.get(3), 670); // ledger penuh: saldo setelah transaksi masa depan = proyeksi
  assert.equal(m.get(3), ctx.recalcAccProjectedBalance('a1'));
});

test('S2830: splitTxRealisasiProyeksi memisahkan pemasukan/pengeluaran realisasi dan proyeksi', () => {
  const { ctx } = mk([]);
  const r = ctx.splitTxRealisasiProyeksi([
    { type: 'income', amount: 100, date: '2026-11-10' },
    { type: 'expense', amount: 30, date: '2026-11-15' },
    { type: 'expense', amount: 400, date: '2026-11-20' },
    { type: 'income', amount: 60, date: '2026-11-30' },
    { type: 'expense', amount: 5 },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(r)), {
    realisasi: { inc: 100, exp: 35, count: 3 },
    proyeksi: { inc: 60, exp: 400, count: 2 },
  });
});

test('S2830: aset tertaut tidak menyerap transaksi masa depan sebagai realisasi', () => {
  const state = { today: '2026-11-15' };
  const D = {
    accounts: [{ id: 'a1', name: 'Kas', baseBalance: 1000, includeInBalance: true }],
    transactions: [{ id: 1, accountId: 'a1', type: 'expense', amount: 400, date: '2026-11-20' }],
    assets: [{ id: 'x', accountId: 'a1', nilai: 1000 }],
  };
  const ctx = loadSource(['modules/finance/akun.js'], { D, todayStr: () => state.today, sameId: (a, b) => String(a) === String(b) });
  // aset-misc.js punya banyak dependensi top-level; ambil fungsi sinkronnya saja dari sumber asli.
  const src = fs.readFileSync('modules/asset/aset-misc.js', 'utf8');
  const a0 = src.indexOf('function syncLinkedAssetNilaiFromAkun(opts){');
  const a1 = src.indexOf('// AssetInsight');
  assert.ok(a0 > 0 && a1 > a0);
  require('node:vm').runInContext(src.slice(a0, a1) + '\nthis.syncLinkedAssetNilaiFromAkun=syncLinkedAssetNilaiFromAkun;', ctx);
  ctx.syncLinkedAssetNilaiFromAkun();
  assert.equal(D.assets[0].nilai, 1000);
  state.today = '2026-11-20'; // hari-H: transaksi menjadi realisasi, nilai aset mengikuti
  const changed = ctx.syncLinkedAssetNilaiFromAkun();
  assert.equal(D.assets[0].nilai, 600);
  assert.equal(changed, 1);
});

test('S2830: restore backup & save() tetap membangun ulang cache; pembaruan harian terpasang', () => {
  const br = fs.readFileSync('modules/shared/backup-restore.js', 'utf8');
  assert.ok((br.match(/invalidateAccBalCache\(\)/g) || []).length >= 2);
  const a = fs.readFileSync('modules/finance/akun.js', 'utf8');
  assert.match(a, /installAccDayRollover/);
  assert.match(a, /visibilitychange/);
  assert.match(fs.readFileSync('modules/shared/modules-render-b.js', 'utf8'), /lapProyeksiNote/);
});

test('S2830: pembaruan harian — timer tengah malam & visibilitychange memanggil refresh saat hari berganti', () => {
  const state = { today: '2026-11-15' };
  const listeners = {};
  const timers = [];
  const D = { accounts: [{ id: 'a1', baseBalance: 0, includeInBalance: true }], transactions: [], assets: [] };
  let refreshed = 0;
  const doc = { visibilityState: 'visible', addEventListener: (n, f) => { listeners[n] = f; }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  const ctx = loadSource(['modules/finance/akun.js'], {
    D, todayStr: () => state.today, document: doc,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout: () => {},
    refreshAfterMutation: () => { refreshed++; },
  });
  const before = timers.length; // terpasang otomatis saat modul dimuat di browser
  assert.ok(before >= 1);
  ctx.installAccDayRollover();
  ctx.installAccDayRollover(); // idempotent
  assert.equal(timers.length, before);
  const dayTimer = timers.find((t) => t.ms >= 1000);
  assert.ok(dayTimer && dayTimer.ms <= 24 * 3600 * 1000 + 5000);
  listeners.visibilitychange(); // hari sama -> tidak refresh
  assert.equal(refreshed, 0);
  state.today = '2026-11-16';
  listeners.visibilitychange();
  assert.equal(refreshed, 1);
  listeners.visibilitychange(); // sudah ditangani
  assert.equal(refreshed, 1);
  state.today = '2026-11-17';
  const n0 = timers.length;
  dayTimer.fn(); // timer tengah malam
  assert.equal(refreshed, 2);
  assert.ok(timers.length > n0); // dijadwalkan ulang
});
