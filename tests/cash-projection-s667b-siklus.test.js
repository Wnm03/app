'use strict';
// tests/cash-projection-s667b-siklus.test.js — Sesi S667B (lanjutan Sesi P1/Sesi 95).
// Cakupan: getMonthlyCashProjection(month,year,opts) — parameter opts BARU & OPSIONAL
// (billWindowMode/cycleStartDay, reuse CashflowProjSettings/billingCycleRange). Fokus:
// (1) backward-compat 100% (tanpa opts / opts tanpa billWindowMode='siklus' -> identik
// perilaku lama, dites lewat tests/cash-projection-p1.test.js yang TIDAK diubah), (2)
// mode 'siklus' benar pakai billingCycleRange()/getBillOccurrencesInRange().

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    workDays: [],
    bills: [],
  }, overrides);
}

function makeCtx(D, now) {
  return loadSource(
    ['modules/finance/tx-list-cashflow.js', 'modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'],
    { D, ...(now ? { Date: makeFixedDate(now) } : {}) }
  );
}

// makeFixedDate(iso) — bikin subclass Date yang selalu balikin `iso` kalau dipanggil
// tanpa argumen (new Date()), tapi tetap transparan kalau dipanggil dengan argumen
// (new Date(x)) -- getMonthlyCashProjection() pakai `new Date()` (now, acuan
// billingCycleRange) DAN `new Date(dateStr)` (parse tanggal lain) di file yang sama.
function makeFixedDate(iso) {
  const RealDate = Date;
  function FixedDate(...args) {
    if (args.length === 0) return new RealDate(iso);
    return new RealDate(...args);
  }
  FixedDate.prototype = RealDate.prototype;
  FixedDate.now = () => new RealDate(iso).getTime();
  return FixedDate;
}

test('getMonthlyCashProjection() — TANPA opts (undefined) hasilnya identik dipanggil dgn opts={} (backward-compat literal)', () => {
  const D = makeD({
    transactions: [{ type: 'income', category: 'Gaji', amount: 100000, date: '2026-08-10' }],
    bills: [{ id: 'b1', name: 'wifi', amount: 50000, nextDue: '2026-08-05', freq: 'bulanan', category: 'Tagihan' }],
  });
  const ctx = makeCtx(D);
  const rNoOpts = ctx.getMonthlyCashProjection(7, 2026);
  const rEmptyOpts = ctx.getMonthlyCashProjection(7, 2026, {});
  assert.deepEqual(rNoOpts, rEmptyOpts);
});

test('getMonthlyCashProjection() — opts.billWindowMode BUKAN "siklus" (mis. "kalender"/"30hari") tetap identik perilaku lama (getBillOccurrencesInMonth)', () => {
  const D = makeD({
    bills: [{ id: 'b1', name: 'bpjs', amount: 72500, nextDue: '2026-08-01', freq: 'bulanan', category: 'Tagihan' }],
  });
  const ctx = makeCtx(D);
  const rOld = ctx.getMonthlyCashProjection(7, 2026);
  const rKalender = ctx.getMonthlyCashProjection(7, 2026, { billWindowMode: 'kalender' });
  const r30hari = ctx.getMonthlyCashProjection(7, 2026, { billWindowMode: '30hari' });
  assert.deepEqual(rOld, rKalender);
  assert.deepEqual(rOld, r30hari);
});

test('getMonthlyCashProjection() — mode "siklus": tagihan jatuh tempo tgl 1-15 ikut siklus yg MULAI tgl 16 bulan sebelumnya (bukan bulan kalender)', () => {
  const D = makeD({
    bills: [
      // jatuh tempo 5 September -> bulan kalender target (Agustus, month=7) TIDAK
      // menangkapnya lewat getBillOccurrencesInMonth, TAPI siklus 16 Agt-15 Sep menangkap.
      { id: 'kartu-kredit', name: 'Kartu Kredit', amount: 300000, nextDue: '2026-09-05', freq: 'bulanan', category: 'Tagihan' },
    ],
  });
  const ctx = makeCtx(D, '2026-08-20T00:00:00');
  const rKalender = ctx.getMonthlyCashProjection(7, 2026, { billWindowMode: 'kalender' });
  const rSiklus = ctx.getMonthlyCashProjection(7, 2026, { billWindowMode: 'siklus' });
  assert.equal(rKalender.sisaKewajiban, 0); // tidak ketangkap kalender Agustus murni
  assert.equal(rSiklus.sisaKewajiban, 300000); // ketangkap siklus 16 Agt-15 Sep
});

test('getMonthlyCashProjection() — mode "siklus": cycleStartDay custom dihormati (bill freq "sekali", tidak berulang -- kasus paling jelas)', () => {
  const D = makeD({
    bills: [{ id: 'b1', name: 'servis motor', amount: 150000, nextDue: '2026-08-22', freq: 'sekali', category: 'Tagihan' }],
  });
  const ctx = makeCtx(D, '2026-08-25T00:00:00');
  // cycleStartDay=20 -> siklus berjalan 20 Agt-19 Sep, nextDue 22 Agt masuk.
  const rIn = ctx.getMonthlyCashProjection(7, 2026, { billWindowMode: 'siklus', cycleStartDay: 20 });
  assert.equal(rIn.sisaKewajiban, 150000);
  // cycleStartDay=25 & now=25 Agt -> siklus 25 Agt-24 Sep, nextDue 22 Agt (sudah lewat, freq
  // "sekali" jadi TIDAK berulang) TIDAK masuk.
  const rOut = ctx.getMonthlyCashProjection(7, 2026, { billWindowMode: 'siklus', cycleStartDay: 25 });
  assert.equal(rOut.sisaKewajiban, 0);
});

test('getMonthlyCashProjection() — mode "siklus": proyeksiGaji TETAP bulan kalender (tidak ikut geser siklus)', () => {
  const D = makeD({
    transactions: [
      { type: 'income', category: 'Gaji', amount: 500000, date: '2026-08-10' }, // Agustus kalender
      { type: 'income', category: 'Gaji', amount: 999999, date: '2026-09-02' }, // September, exclude walau masuk siklus 16 Agt-15 Sep
    ],
  });
  const ctx = makeCtx(D, '2026-08-20T00:00:00');
  const r = ctx.getMonthlyCashProjection(7, 2026, { billWindowMode: 'siklus' });
  assert.equal(r.proyeksiGaji, 500000); // September TIDAK ikut, gaji selalu per-kalender
});

test('getMonthlyCashProjection() — mode "siklus" tanpa billingCycleRange termuat (guard typeof) fallback aman ke perilaku lama, tidak throw', () => {
  const D = makeD({
    bills: [{ id: 'b1', name: 'x', amount: 10000, nextDue: '2026-08-01', freq: 'bulanan', category: 'Tagihan' }],
  });
  // sengaja TIDAK load tx-list-cashflow.js -> billingCycleRange undefined
  const ctx = loadSource(['modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'], { D });
  assert.doesNotThrow(() => ctx.getMonthlyCashProjection(7, 2026, { billWindowMode: 'siklus' }));
});
