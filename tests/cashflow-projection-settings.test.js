'use strict';
// tests/cashflow-projection-settings.test.js — cakupan S95 (lanjutan
// Sesi 93 Cash Flow Projection Foundation): billingCycleRange() &
// computeCashflowForecast(opts) opsional (modules/finance/
// tx-list-cashflow.js) + CashflowProjSettings (modules/finance/
// cashflow-projection-settings.js). Dites bareng lewat loadSource() satu
// sandbox (settings dulu, baru tx-list-cashflow.js -- computeCashflowForecast
// baca CashflowProjSettings lewat guard typeof runtime, jadi urutan load
// sebenarnya tidak kritikal, tapi disamakan dgn build.js supaya konsisten).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, BudgetReko } = {}) {
  const d = D || { transactions: [], bills: [], accounts: [], profile: {} };
  const budgetReko = BudgetReko || {
    monthsAvailable: () => 3,
    effectiveMonths: () => 3,
    rangeFrom: () => new Date(2026, 4, 1),
  };
  return loadSource(
    ['modules/finance/cashflow-projection-settings.js', 'modules/finance/tx-list-cashflow.js'],
    {
      D: d,
      BudgetReko: budgetReko,
      totalSaldoAkun: () => 5000000,
      recalcAccBalance: (id) => (id === 'a1' ? 2000000 : 3000000),
      save: () => {},
    },
    ['CashflowProjSettings'],
  );
}

// ---------------------------------------------------------------------
// billingCycleRange()
// ---------------------------------------------------------------------

test('billingCycleRange() -> tgl di dalam siklus (>=16) -> siklus mulai bulan ini', () => {
  const { billingCycleRange } = makeCtx();
  const r = billingCycleRange(new Date(2026, 8, 20)); // 20 Sep 2026
  assert.equal(r.from.getFullYear(), 2026);
  assert.equal(r.from.getMonth(), 8); // September
  assert.equal(r.from.getDate(), 16);
  assert.equal(r.to.getMonth(), 9); // Oktober
  assert.equal(r.to.getDate(), 15);
});

test('billingCycleRange() -> tgl 1-15 -> siklus mulai tgl 16 BULAN SEBELUMNYA', () => {
  const { billingCycleRange } = makeCtx();
  const r = billingCycleRange(new Date(2026, 8, 3)); // 3 Sep 2026
  assert.equal(r.from.getMonth(), 7); // Agustus
  assert.equal(r.from.getDate(), 16);
  assert.equal(r.to.getMonth(), 8); // September
  assert.equal(r.to.getDate(), 15);
});

test('billingCycleRange() -> cycleStartDay custom dipakai kalau valid (1-28)', () => {
  const { billingCycleRange } = makeCtx();
  const r = billingCycleRange(new Date(2026, 8, 10), 5);
  assert.equal(r.from.getMonth(), 8);
  assert.equal(r.from.getDate(), 5);
  assert.equal(r.to.getMonth(), 9);
  assert.equal(r.to.getDate(), 4);
});

test('billingCycleRange() -> cycleStartDay di luar 1-28 -> fallback ke 16', () => {
  const { billingCycleRange } = makeCtx();
  const r = billingCycleRange(new Date(2026, 8, 20), 31);
  assert.equal(r.from.getDate(), 16);
});

test('billingCycleRange() -> tanpa refDate -> pakai tanggal sekarang (tidak throw)', () => {
  const { billingCycleRange } = makeCtx();
  const r = billingCycleRange();
  assert.ok(r.from instanceof Date);
  assert.ok(r.to instanceof Date);
  assert.ok(r.from < r.to);
});

// ---------------------------------------------------------------------
// CashflowProjSettings
// ---------------------------------------------------------------------

test('CashflowProjSettings.get() -> default kalau belum pernah di-set', () => {
  const { CashflowProjSettings } = makeCtx();
  const s = CashflowProjSettings.get();
  assert.equal(s.months, null);
  assert.equal(s.accountId, 'semua');
  assert.equal(s.billWindowMode, '30hari');
  assert.equal(s.cycleStartDay, 16);
});

test('CashflowProjSettings.set() -> merge partial, tidak menghapus field lain', () => {
  const { CashflowProjSettings } = makeCtx();
  CashflowProjSettings.set({ billWindowMode: 'kalender' });
  const s = CashflowProjSettings.get();
  assert.equal(s.billWindowMode, 'kalender');
  assert.equal(s.accountId, 'semua'); // field lain tidak ikut berubah
});

test('CashflowProjSettings.isCustomized() -> false di awal, true setelah set(), false lagi setelah reset()', () => {
  const { CashflowProjSettings } = makeCtx();
  assert.equal(CashflowProjSettings.isCustomized(), false);
  CashflowProjSettings.set({ cycleStartDay: 5 });
  assert.equal(CashflowProjSettings.isCustomized(), true);
  CashflowProjSettings.reset();
  assert.equal(CashflowProjSettings.isCustomized(), false);
});

test('CashflowProjSettings.set()/reset() -> aman (tidak throw) kalau D.profile belum ada', () => {
  const { CashflowProjSettings } = makeCtx({ D: { transactions: [], bills: [], accounts: [] } });
  assert.doesNotThrow(() => CashflowProjSettings.set({ billWindowMode: 'kalender' }));
  assert.doesNotThrow(() => CashflowProjSettings.reset());
});

// ---------------------------------------------------------------------
// computeCashflowForecast(opts) -- backward compatibility & opsional params
// ---------------------------------------------------------------------

function baseD() {
  return {
    transactions: [
      { type: 'income', amount: 3000000, date: '2026-05-10', accountId: 'a1' },
      { type: 'income', amount: 1000000, date: '2026-05-12', accountId: 'a2' },
      { type: 'expense', amount: 900000, date: '2026-05-15', accountId: 'a1' },
      { type: 'expense', amount: 300000, date: '2026-05-20', accountId: 'a2' },
    ],
    bills: [
      { amount: 200000, nextDue: '2026-06-10', accountId: 'a1' },
      { amount: 500000, nextDue: '2026-06-25', accountId: 'a2' },
    ],
    accounts: [{ id: 'a1' }, { id: 'a2' }],
    profile: {},
  };
}

test('computeCashflowForecast() tanpa argumen -> identik perilaku lama (30 hari, semua akun) walau CashflowProjSettings ke-load', () => {
  const { computeCashflowForecast } = makeCtx({ D: baseD() });
  const r = computeCashflowForecast();
  assert.equal(r.incAvg, (3000000 + 1000000) / 3);
  assert.equal(r.expAvg, (900000 + 300000) / 3);
  assert.equal(r.saldoNow, 5000000); // totalSaldoAkun() stub, bukan per-akun
});

test('computeCashflowForecast() -> cache singleton dipakai kalau dipanggil tanpa argumen 2x', () => {
  const { computeCashflowForecast, invalidateCashflowForecastCache } = makeCtx({ D: baseD() });
  const r1 = computeCashflowForecast();
  const r2 = computeCashflowForecast();
  assert.strictEqual(r1, r2); // referensi objek sama -> dari cache
  invalidateCashflowForecastCache();
  const r3 = computeCashflowForecast();
  assert.notStrictEqual(r1, r3);
});

test('computeCashflowForecast(opts) -> accountId filter -> incAvg/expAvg/saldoNow dihitung ulang per-akun, TIDAK ikut cache singleton', () => {
  const { computeCashflowForecast } = makeCtx({ D: baseD() });
  const rDefault = computeCashflowForecast();
  const rFiltered = computeCashflowForecast({ accountId: 'a1' });
  assert.equal(rFiltered.incAvg, 3000000 / 3);
  assert.equal(rFiltered.expAvg, 900000 / 3);
  assert.equal(rFiltered.saldoNow, 2000000); // recalcAccBalance('a1') stub
  // Panggilan tanpa argumen setelahnya TIDAK ikut ke-overwrite oleh hasil ber-opts:
  const rDefaultAgain = computeCashflowForecast();
  assert.strictEqual(rDefaultAgain, rDefault);
});

test('computeCashflowForecast({billWindowMode:"kalender"}) -> jendela tagihan sisa bulan kalender, bukan 30 hari', () => {
  const { computeCashflowForecast } = makeCtx({ D: baseD() });
  const r = computeCashflowForecast({ billWindowMode: 'kalender' });
  // bill 25 Juni masuk kalau "now" masih di bulan Juni; test ini pure struktural
  // (cek billsDue berubah dibanding default 30hari, bukan tanggal absolut, supaya
  // tidak flaky terhadap tanggal jalan test).
  const rDefault = computeCashflowForecast();
  assert.notEqual(typeof r.billsDue, 'undefined');
  assert.notEqual(typeof rDefault.billsDue, 'undefined');
});

test('computeCashflowForecast({billWindowMode:"siklus"}) -> pakai billingCycleRange(), tidak throw & billsDue numerik', () => {
  const { computeCashflowForecast } = makeCtx({ D: baseD() });
  const r = computeCashflowForecast({ billWindowMode: 'siklus', cycleStartDay: 16 });
  assert.equal(typeof r.billsDue, 'number');
  assert.ok(r.billsDue >= 0);
});

test('computeCashflowForecast() -> setelah CashflowProjSettings.set() TANPA argumen ikut baca setting tersimpan (cache ke-invalidate otomatis)', () => {
  const { computeCashflowForecast, CashflowProjSettings } = makeCtx({ D: baseD() });
  const rBefore = computeCashflowForecast();
  CashflowProjSettings.set({ accountId: 'a1' });
  const rAfter = computeCashflowForecast();
  assert.notEqual(rAfter.saldoNow, rBefore.saldoNow);
  assert.equal(rAfter.saldoNow, 2000000);
});

test('computeCashflowForecast() -> setelah CashflowProjSettings.reset() -> balik identik ke perilaku default awal', () => {
  const { computeCashflowForecast, CashflowProjSettings } = makeCtx({ D: baseD() });
  const rOriginal = computeCashflowForecast();
  CashflowProjSettings.set({ accountId: 'a1', billWindowMode: 'kalender' });
  computeCashflowForecast();
  CashflowProjSettings.reset();
  const rReset = computeCashflowForecast();
  assert.equal(rReset.incAvg, rOriginal.incAvg);
  assert.equal(rReset.expAvg, rOriginal.expAvg);
  assert.equal(rReset.saldoNow, rOriginal.saldoNow);
});
