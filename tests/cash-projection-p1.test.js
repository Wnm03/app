'use strict';
// tests/cash-projection-p1.test.js — Sesi P1 (RENCANA-KERJA-toggle-hitungkas-dan-
// proyeksi-kas.md, Track 2). Cakupan: isGajiTransaction() + getMonthlyCashProjection()
// murni (modules/finance/cash-projection.js). Skenario diambil dari acceptance
// criteria di dokumen rencana + temuan audit P0 (data asli, backup 2026-08-27):
// pola gaji terbesar W (84 tx) = category "Penghasilan" + subcategory "Gaji toko",
// BUKAN category "Gaji".

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

function makeCtx(D) {
  return loadSource(['modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'], { D });
}

// --- isGajiTransaction() ---

test('isGajiTransaction() — category "Gaji" (pola dasar) terhitung', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isGajiTransaction({ type: 'income', category: 'Gaji', amount: 1 }), true);
});

test('isGajiTransaction() — TEMUAN AUDIT P0: category "Penghasilan" + subcategory "Gaji toko" (pola TERBESAR data asli W, 84 tx) tetap terhitung', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isGajiTransaction({ type: 'income', category: 'Penghasilan', subcategory: 'Gaji toko', note: '', amount: 1 }), true);
});

test('isGajiTransaction() — acceptance criteria #2: note "Gaji mingguan dari absensi..." (confirmWeeklyReset), category TIDAK mengandung "gaji", tetap terhitung', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isGajiTransaction({ type: 'income', category: 'Penghasilan', subcategory: '', note: 'Gaji mingguan dari absensi (5 hari kerja, 2026-07-05 s/d 2026-07-11)', amount: 1 }), true);
});

test('isGajiTransaction() — acceptance criteria #1: cobekLinkId SELALU exclude walau category/note match /gaji/i', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isGajiTransaction({ type: 'income', category: 'Gaji', note: 'gaji dari cobek', cobekLinkId: 'cb1', amount: 1 }), false);
});

test('isGajiTransaction() — kategori ambigu TIDAK match /gaji/i di field manapun (mis. "Tambahan"/"H"/"Bonus toko" data asli W) TIDAK terhitung', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isGajiTransaction({ type: 'income', category: 'Penghasilan', subcategory: 'Tambahan', note: 'tripod', amount: 1 }), false);
  assert.equal(ctx.isGajiTransaction({ type: 'income', category: 'Penghasilan', subcategory: 'H', note: '', amount: 1 }), false);
  assert.equal(ctx.isGajiTransaction({ type: 'income', category: 'Penghasilan', subcategory: 'Bonus toko', note: 'Bonus', amount: 1 }), false);
});

test('isGajiTransaction() — expense TIDAK pernah terhitung walau category "Gaji"', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isGajiTransaction({ type: 'expense', category: 'Gaji', amount: 1 }), false);
});

test('isGajiTransaction() — transaksi kosong/null aman (tidak throw)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isGajiTransaction(null), false);
  assert.equal(ctx.isGajiTransaction({}), false);
});

// --- getMonthlyCashProjection() ---

test('getMonthlyCashProjection() — agregasi gaji tercatat (Penghasilan/Gaji toko) bulan target, exclude bulan lain', () => {
  const D = makeD({
    transactions: [
      { type: 'income', category: 'Penghasilan', subcategory: 'Gaji toko', amount: 690000, date: '2026-06-27' },
      { type: 'income', category: 'Penghasilan', subcategory: 'Gaji toko', amount: 412000, date: '2026-06-20' },
      { type: 'income', category: 'Penghasilan', subcategory: 'Gaji toko', amount: 999999, date: '2026-07-01' }, // bulan lain, exclude
      { type: 'income', category: 'Bisnis', subcategory: 'Cobek', amount: 500000, date: '2026-06-15', cobekLinkId: 'cb1' }, // bukan gaji
    ],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(5, 2026); // Juni = index 5
  assert.equal(r.recordedGaji, 690000 + 412000);
  assert.equal(r.pendingGajiEstimate, 0);
  assert.equal(r.proyeksiGaji, 690000 + 412000);
});

test('getMonthlyCashProjection() — estimasi PENDING dari D.workDays (belum di-reset) bulan target ikut ditambahkan', () => {
  const D = makeD({
    transactions: [],
    workDays: [
      { date: '2026-08-20', total: 78929 },
      { date: '2026-08-26', total: 65000 },
      { date: '2026-07-30', total: 999999 }, // bulan lain, exclude
    ],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026); // Agustus = index 7
  assert.equal(r.pendingGajiEstimate, 78929 + 65000);
  assert.equal(r.proyeksiGaji, 78929 + 65000);
});

test('getMonthlyCashProjection() — bill yang SUDAH dibayar (nextDue sudah maju lewat markBillPaid, occurrence-nya otomatis tidak lagi di bulan target) TIDAK dipotong dua kali dari sisaKewajiban', () => {
  const D = makeD({
    transactions: [
      // wifi sudah dibayar Agustus -> markBillPaid() memajukan nextDue ke September
      { type: 'expense', billLinkId: 'bill_wifi', amount: 50000, date: '2026-08-05' },
    ],
    bills: [
      { id: 'bill_wifi', name: 'wifi', amount: 50000, nextDue: '2026-09-01', freq: 'bulanan', category: 'Tagihan' }, // sudah dibayar, nextDue sudah maju
      { id: 'bill_bpjs', name: 'bpjs', amount: 72500, nextDue: '2026-08-01', freq: 'bulanan', category: 'Tagihan' }, // belum dibayar
    ],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026); // Agustus
  // billMonthTotal HANYA bpjs -- wifi nextDue sudah di September (occurrence bulan Agustus 0, alamiah exclude)
  assert.equal(r.billMonthTotal, 72500);
  // getBillPaidThisPeriodInfo tetap nemu wifi (transaksi billLinkId match, bulan sama)
  assert.equal(r.billPaidThisPeriod, 50000);
  // sisaKewajiban TIDAK boleh 72500-50000=22500 (itu dobel-potong) -- wifi memang sudah
  // tidak ikut di occurrence Agustus sama sekali, jadi sisaKewajiban = bpjs saja
  assert.equal(r.sisaKewajiban, 72500);
});

test('getMonthlyCashProjection() — kasus tepi: bill occurrence MASIH nyangkut di bulan target TAPI sudah ada transaksi pembayaran periode ini -> tetap di-skip (bukan dobel-hitung)', () => {
  const D = makeD({
    transactions: [
      { type: 'expense', billLinkId: 'bill_edge', amount: 100000, date: '2026-08-03' },
    ],
    bills: [
      // nextDue SENGAJA belum dimajukan (simulasi data tidak konsisten/kasus tepi) --
      // occurrence Agustus tetap muncul via getBillOccurrencesInMonth, TAPI
      // getBillPaidThisPeriodInfo() sudah nemu match -> harus di-skip, bukan malah dihitung.
      { id: 'bill_edge', name: 'edge', amount: 100000, nextDue: '2026-08-01', freq: 'bulanan', category: 'Tagihan' },
    ],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026);
  assert.equal(r.billMonthTotal, 100000); // masih muncul di occurrence mentah
  assert.equal(r.sisaKewajiban, 0); // tapi di-skip krn sudah dibayar periode ini
});

test('getMonthlyCashProjection() — proyeksiKas = proyeksiGaji - sisaKewajiban, boleh negatif (tidak di-floor ke 0)', () => {
  const D = makeD({
    transactions: [
      { type: 'income', category: 'Gaji', amount: 100000, date: '2026-08-10' },
    ],
    bills: [
      { id: 'b1', name: 'besar', amount: 5000000, nextDue: '2026-08-01', freq: 'bulanan', category: 'Utang' },
    ],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026);
  assert.equal(r.proyeksiGaji, 100000);
  assert.equal(r.sisaKewajiban, 5000000);
  assert.equal(r.proyeksiKas, 100000 - 5000000);
});

test('getMonthlyCashProjection() — selalu kembalikan 3 angka terpisah (proyeksiGaji, sisaKewajiban, proyeksiKas), tidak ada mode gabungan', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(0, 2026);
  assert.equal(typeof r.proyeksiGaji, 'number');
  assert.equal(typeof r.sisaKewajiban, 'number');
  assert.equal(typeof r.proyeksiKas, 'number');
});

test('getMonthlyCashProjection() — default month/year (tanpa argumen) tidak throw', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.doesNotThrow(() => ctx.getMonthlyCashProjection());
});
