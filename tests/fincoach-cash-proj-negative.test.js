'use strict';
// tests/fincoach-cash-proj-negative.test.js — Sesi R1 (AUDIT-RENCANA-fincoach-
// proyeksi-kas-negatif.md). Cakupan: kategori insight baru 'cash-proj-negative'
// di FinCoach.compute() (modules/shared/modules-calc.js), reuse
// getMonthlyCashProjection() (modules/finance/cash-projection.js).
//
// Pola load: modules-calc.js (FinCoach) + cash-projection.js (getMonthlyCashProjection)
// dimuat BARENG di satu sandbox vm (persis urutan produksi scripts/build.js — cash-
// projection.js dimuat setelah tagihan-kalender.js/modules-calc.js). Fungsi bill
// dependency getMonthlyCashProjection() (getBillStats/getBillPaidThisPeriodInfo/
// getBillOccurrencesInMonth, biasanya dari tagihan-kalender.js) di-stub langsung lewat
// extraGlobals di sini -- supaya sisaKewajiban bisa dikontrol presisi per test tanpa
// perlu memuat tagihan-kalender.js utuh (mirip pola stub fmtFull di test lain).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const now = new Date();
const y = now.getFullYear();
const m = now.getMonth();
const dInMonth = new Date(y, m, 10).toISOString().slice(0, 10);

function fmtFullStub(n) { return String(n); }

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    budgets: [],
    workDays: [],
    bills: [],
    accounts: [],
    finansialFreedom: {},
    categories: { income: [], expense: [] },
  }, overrides);
}

// billOccurrences: berapa kali tiap bill "jatuh" bulan ini (dipakai sisaKewajiban).
// Default 1x per bill, tidak ada yang sudah dibayar (getBillPaidThisPeriodInfo->null).
function loadCalcWithProjection(D, { billOccurrences = 1 } = {}) {
  return loadSource(
    ['budget.js', 'modules/shared/modules-calc.js', 'modules/finance/cash-projection.js'],
    {
      D,
      fmtFull: fmtFullStub,
      getBillStats: () => ({ monthTotal: 0, overdueCount: 0, soonCount: 0, outstanding: 0 }),
      getBillPaidThisPeriodInfo: () => null,
      getBillOccurrencesInMonth: () => Array.from({ length: billOccurrences }),
    },
    ['FI', 'SalaryAllocation', 'DanaDaruratAI', 'FinCoach'],
  );
}

test("FinCoach.compute() — proyeksiKas negatif (gaji 0, ada bill terjadwal) -> insight 'cash-proj-negative' muncul, level warning", () => {
  const D = makeD({
    transactions: [], // 0 gaji tercatat -> proyeksiGaji = 0
    bills: [{ id: 'b1', amount: 2000000 }], // 1x terjadwal bulan ini -> sisaKewajiban 2jt
  });
  const { FinCoach } = loadCalcWithProjection(D);
  const insights = FinCoach.compute({ now, m, y, txM: [], inc: 0, exp: 0 });
  const sig = insights.find((x) => x.id === 'cash-proj-negative');
  assert.ok(sig, 'insight cash-proj-negative harus muncul saat proyeksiKas < 0');
  assert.equal(sig.level, 'warning');
});

test("FinCoach.compute() — proyeksiKas >= 0 (gaji cukup menutup kewajiban) -> insight 'cash-proj-negative' TIDAK muncul", () => {
  const D = makeD({
    transactions: [
      { type: 'income', category: 'Gaji', amount: 5000000, date: dInMonth },
    ],
    bills: [{ id: 'b1', amount: 2000000 }],
  });
  const { FinCoach } = loadCalcWithProjection(D);
  const insights = FinCoach.compute({ now, m, y, txM: [], inc: 0, exp: 0 });
  const sig = insights.find((x) => x.id === 'cash-proj-negative');
  assert.equal(sig, undefined, 'proyeksiKas >= 0 tidak boleh memicu insight');
});

test("FinCoach.compute() — getMonthlyCashProjection belum dimuat (typeof guard) -> tidak throw, insight lain tetap jalan", () => {
  const D = makeD({
    accounts: [{ id: 'a1', name: 'Kas' }],
  });
  // HANYA modules-calc.js (tanpa cash-projection.js) -- persis skenario "modul belum dimuat"
  const context = loadSource(
    ['budget.js', 'modules/shared/modules-calc.js'],
    { D, fmtFull: fmtFullStub },
    ['FI', 'SalaryAllocation', 'DanaDaruratAI', 'FinCoach'],
  );
  const { FinCoach } = context;
  assert.doesNotThrow(() => {
    const insights = FinCoach.compute({ now, m, y, txM: [], inc: 0, exp: 0 });
    assert.equal(insights.find((x) => x.id === 'cash-proj-negative'), undefined);
    // insight lain (mis. all-good fallback / lainnya) tetap jalan -- minimal tidak throw & tetap array
    assert.ok(Array.isArray(insights));
  }, 'guard typeof harus mencegah throw saat getMonthlyCashProjection tidak ada');
});

test("Teks insight 'cash-proj-negative' beda kata kunci dari 'fi-surplus-neg' (Keputusan #4) -- boleh muncul bersamaan tanpa terlihat duplikat", () => {
  const D = makeD({
    transactions: [], // 0 gaji -> proyeksiKas negatif; 0 transaksi -> fiMonthlySurplus tidak trigger lewat jalur ini
    bills: [{ id: 'b1', amount: 1000000 }],
  });
  const { FinCoach } = loadCalcWithProjection(D);
  const insights = FinCoach.compute({ now, m, y, txM: [], inc: 0, exp: 0 });
  const cashProj = insights.find((x) => x.id === 'cash-proj-negative');
  assert.ok(cashProj);
  // fi-surplus-neg pakai kata kunci "surplus bulanan"; cash-proj-negative WAJIB tidak pakai kata itu
  assert.ok(!/surplus bulanan/i.test(cashProj.text), 'teks cash-proj-negative tidak boleh memakai kata kunci fi-surplus-neg ("surplus bulanan")');
  assert.ok(/kewajiban terjadwal/i.test(cashProj.text), 'teks cash-proj-negative harus jelaskan sumber sinyal (kewajiban terjadwal vs proyeksi gaji)');
});

test('FinCoach.compute() — 0 regresi: insight cash-proj-negative ikut alur array biasa (bisa di-sort/slice bareng insight lain)', () => {
  const D = makeD({
    transactions: [],
    bills: [{ id: 'b1', amount: 500000 }],
    accounts: [{ id: 'a1', name: 'Kas minus' }],
  });
  const { FinCoach } = loadCalcWithProjection(D);
  const insights = FinCoach.compute({ now, m, y, txM: [], inc: 0, exp: 0 });
  // Tidak ada penanganan khusus dibutuhkan -- cukup pastikan object insight punya shape standar
  // {id,level,icon,text} yang sama seperti kategori lain (dipakai renderDash() utk sort/slice/dismiss).
  const sig = insights.find((x) => x.id === 'cash-proj-negative');
  assert.ok(sig);
  assert.equal(typeof sig.id, 'string');
  assert.equal(typeof sig.level, 'string');
  assert.equal(typeof sig.icon, 'string');
  assert.equal(typeof sig.text, 'string');
  assert.equal(sig.action, undefined, 'Keputusan #3 -- tanpa action link');
});
