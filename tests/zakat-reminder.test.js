'use strict';
// tests/zakat-reminder.test.js — Regression test untuk
// modules/finance/zakat-reminder.js (sesi lanjutan, antrian
// AUDIT-DASHBOARD-INSIGHT-COVERAGE.md §2 "Zakat" — Penghasilan & Maal,
// Fitrah ditunda). Lihat catatan lengkap di kepala zakat-reminder.js soal
// kenapa formula DIDUPLIKASI (bukan reuse langsung Zakat.hitungPenghasilan()/
// hitungMaal() yang DOM-bound), kenapa haul dibaca READ-ONLY, dan kenapa
// exclusion "sudah dibayar" hanya perlu untuk Penghasilan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function isoMonthsAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function makeCtx(D, extra) {
  const ctx = loadSource(
    ['modules/finance/zakat-reminder.js'],
    Object.assign({
      D,
      fmtFull: (n) => `Rp${n}`,
      totalSaldoAkun: () => (D._saldoAkun || 0),
      totalPiutangValue: () => (D._piutang || 0),
      totalDebtValue: () => (D._debtValue || 0),
      totalCicilanOutstanding: () => (D._cicilan || 0),
    }, extra || {}),
    ['ZakatReminder'],
  );
  return ctx.ZakatReminder;
}

// --- Zakat Penghasilan ---

test('penghasilanReminder(): income bulan ini di bawah nisab -> kosong', () => {
  const D = {
    transactions: [{ type: 'income', amount: 1000000, date: new Date().toISOString() }],
    pajakZakat: { nisabPenghasilanBulan: 7640144, zakatLog: [] },
  };
  assert.equal(makeCtx(D).penghasilanReminder().length, 0);
});

test('penghasilanReminder(): income >= nisab -> 1 item warning, jumlah = 2.5% income bulan ini', () => {
  const D = {
    transactions: [{ type: 'income', amount: 10000000, date: new Date().toISOString() }],
    pajakZakat: { nisabPenghasilanBulan: 7640144, zakatLog: [] },
  };
  const r = makeCtx(D).penghasilanReminder();
  assert.equal(r.length, 1);
  assert.equal(r[0].severity, 'warning');
  assert.equal(r[0].jumlah, Math.round(10000000 * 0.025));
});

test('penghasilanReminder(): transaksi expense/bulan lain tidak ikut dihitung ke incomeBulan', () => {
  const D = {
    transactions: [
      { type: 'expense', amount: 50000000, date: new Date().toISOString() },
      { type: 'income', amount: 10000000, date: isoMonthsAgo(60) },
    ],
    pajakZakat: { nisabPenghasilanBulan: 7640144, zakatLog: [] },
  };
  assert.equal(makeCtx(D).penghasilanReminder().length, 0);
});

test('penghasilanReminder(): sudah dicatat di zakatLog bulan ini -> dikecualikan walau masih wajib', () => {
  const D = {
    transactions: [{ type: 'income', amount: 10000000, date: new Date().toISOString() }],
    pajakZakat: {
      nisabPenghasilanBulan: 7640144,
      zakatLog: [{ jenis: 'penghasilan', tanggal: new Date().toISOString().slice(0, 10), jumlah: 250000 }],
    },
  };
  assert.equal(makeCtx(D).penghasilanReminder().length, 0);
});

test('penghasilanReminder(): log bulan LALU tidak ikut mengecualikan bulan berjalan', () => {
  const D = {
    transactions: [{ type: 'income', amount: 10000000, date: new Date().toISOString() }],
    pajakZakat: {
      nisabPenghasilanBulan: 7640144,
      zakatLog: [{ jenis: 'penghasilan', tanggal: isoMonthsAgo(60), jumlah: 250000 }],
    },
  };
  assert.equal(makeCtx(D).penghasilanReminder().length, 1);
});

// --- Zakat Maal ---

test('maalReminder(): totalHarta di bawah nisab -> kosong (haul tidak relevan)', () => {
  const D = {
    _saldoAkun: 1000000,
    assets: [],
    pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: isoMonthsAgo(400) },
  };
  assert.equal(makeCtx(D).maalReminder().length, 0);
});

test('maalReminder(): cukup nisab TAPI haulMaalMulai belum ada (null) -> kosong, TIDAK menulis D (read-only)', () => {
  const D = {
    _saldoAkun: 200000000,
    assets: [],
    pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: null },
  };
  const r = makeCtx(D).maalReminder();
  assert.equal(r.length, 0);
  assert.equal(D.pajakZakat.haulMaalMulai, null, 'tidak boleh auto-mulai haul (beda dari Zakat.hitungMaal() render function)');
});

test('maalReminder(): cukup nisab & haul sudah >=354 hari -> 1 item warning, jumlah = 2.5% totalHarta', () => {
  const D = {
    _saldoAkun: 200000000,
    assets: [],
    pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: isoMonthsAgo(400) },
  };
  const r = makeCtx(D).maalReminder();
  assert.equal(r.length, 1);
  assert.equal(r[0].severity, 'warning');
  assert.equal(r[0].jumlah, Math.round(200000000 * 0.025));
});

test('maalReminder(): cukup nisab tapi haul baru berjalan (<354 hari) -> kosong', () => {
  const D = {
    _saldoAkun: 200000000,
    assets: [],
    pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: isoMonthsAgo(30) },
  };
  assert.equal(makeCtx(D).maalReminder().length, 0);
});

test('maalReminder(): utang mengurangi totalHarta lewat FI.totalDebt() apa adanya', () => {
  const D = {
    _saldoAkun: 200000000,
    assets: [],
    pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: isoMonthsAgo(400) },
  };
  const FI = { totalDebt: () => 190000000 };
  const r = makeCtx(D, { FI }).maalReminder();
  // totalHarta = 200jt - 190jt = 10jt, nisab = 85jt -> tidak cukup nisab
  assert.equal(r.length, 0);
});

test('maalReminder(): aset zakatable dihitung via MultiOwnerEngine.selfOwnedValue() kalau tersedia', () => {
  const D = {
    _saldoAkun: 0,
    assets: [{ id: 'a1', zakatable: true, nilai: 200000000 }],
    pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: isoMonthsAgo(400) },
  };
  const MultiOwnerEngine = { selfOwnedValue: (a, v) => v * 0.5 }; // porsi 50%
  const r = makeCtx(D, { MultiOwnerEngine }).maalReminder();
  // asetZakatable = 100jt, di bawah nisab 85jt? 100jt >= 85jt -> masih wajib
  assert.equal(r.length, 1);
  assert.equal(r[0].jumlah, Math.round(100000000 * 0.025));
});

// --- summary() ---

test('summary(): gabungan penghasilan+maal, warningCount = jumlah item (semua severity warning)', () => {
  const D = {
    transactions: [{ type: 'income', amount: 10000000, date: new Date().toISOString() }],
    _saldoAkun: 200000000,
    assets: [],
    pajakZakat: {
      nisabPenghasilanBulan: 7640144,
      hargaEmasPerGram: 1000000,
      haulMaalMulai: isoMonthsAgo(400),
      zakatLog: [],
    },
  };
  const s = makeCtx(D).summary();
  assert.equal(s.total, 2);
  assert.equal(s.warningCount, 2);
  assert.equal(s.all.length, 2);
});

test('summary(): D kosong/belum ada -> {total:0, warningCount:0, all:[]}, tidak throw', () => {
  const s = makeCtx({}).summary();
  assert.equal(s.total, 0);
  assert.equal(s.warningCount, 0);
  assert.equal(s.all.length, 0);
});
