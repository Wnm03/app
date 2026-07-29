'use strict';
// tests/tagihan-kalender.test.js — cakupan pertama untuk logic murni
// modules/finance/tagihan-kalender.js (Modul Tagihan/Bill & Kalender Jatuh
// Tempo). Sebelumnya NOL test sama sekali.
//
// Fokus ke 5 fungsi yang TIDAK menyentuh DOM (bisa dites lewat loadSource):
//   - getBillOccurrencesInRange() / getBillOccurrencesInMonth() -- kalkulasi
//     tanggal jatuh tempo berulang (mingguan/bulanan/tahunan/sekali/cicilan
//     dgn sisa tenor). Bug di sini = tagihan salah muncul di kalender, atau
//     lebih parah: TIDAK muncul sama sekali (user lupa bayar).
//   - getBillStats() -- ringkasan overdue/jatuh-tempo-minggu-ini/outstanding
//     cicilan yg dipakai di banner & dashboard.
//   - getBillAnomalyInfo() -- deteksi nominal tagihan melonjak >25% dari
//     rata-rata histori (badge peringatan sebelum user bayar).
//   - cashflowActionSuggestion() -- teks saran nominal/hari saat proyeksi
//     kas defisit.
//
// Fungsi DOM-heavy (setBillType, openBillModal, saveBill, checkBills, dst)
// SENGAJA belum dites di sini -- kandidat lanjutan pakai pola fakeDom seperti
// tests/tx-transfer.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeBillCalc(D) {
  return loadSource(
    ['modules/shared/format-tema.js', 'modules/finance/tagihan-kalender.js'],
    { D },
    ['BILLCAL_MAX_ITER', 'BILL_ANOMALY_THRESHOLD_PCT'],
  );
}

function baseD(overrides = {}) {
  return { bills: [], transactions: [], ...overrides };
}

// ================= getBillOccurrencesInRange() =================

test('getBillOccurrencesInRange() — freq "sekali": muncul 1x kalau nextDue di dalam range, di luar itu kosong', () => {
  const { getBillOccurrencesInRange } = makeBillCalc(baseD());
  const bill = { nextDue: '2026-03-15', freq: 'sekali' };
  const inRange = getBillOccurrencesInRange(bill, new Date('2026-03-01'), new Date('2026-03-31'));
  assert.equal(inRange.length, 1);
  const outOfRange = getBillOccurrencesInRange(bill, new Date('2026-04-01'), new Date('2026-04-30'));
  assert.equal(outOfRange.length, 0);
});

test('getBillOccurrencesInRange() — freq "bulanan": muncul tiap bulan sesuai tanggal jatuh tempo', () => {
  const { getBillOccurrencesInRange } = makeBillCalc(baseD());
  const bill = { nextDue: '2026-01-05', freq: 'bulanan' };
  const occ = getBillOccurrencesInRange(bill, new Date('2026-01-01'), new Date('2026-04-30'));
  assert.equal(occ.length, 4, 'harus muncul Jan/Feb/Mar/Apr = 4x');
  // occ lahir dari push() DI DALAM vm context -> beda realm dari Array host,
  // jadi deepEqual butuh Array.from() dulu (sama pola dgn tests/refleksi-selfcare.test.js).
  assert.deepEqual(Array.from(occ, (d) => d.getMonth()), [0, 1, 2, 3]);
});

test('getBillOccurrencesInRange() — freq "mingguan": interval 7 hari', () => {
  const { getBillOccurrencesInRange } = makeBillCalc(baseD());
  const bill = { nextDue: '2026-01-01', freq: 'mingguan' };
  const occ = getBillOccurrencesInRange(bill, new Date('2026-01-01'), new Date('2026-01-31'));
  assert.equal(occ.length, 5, '1,8,15,22,29 Jan = 5x dalam 31 hari');
});

test('getBillOccurrencesInRange() — freq "tahunan": interval 1 tahun', () => {
  const { getBillOccurrencesInRange } = makeBillCalc(baseD());
  const bill = { nextDue: '2024-06-01', freq: 'tahunan' };
  const occ = getBillOccurrencesInRange(bill, new Date('2024-01-01'), new Date('2027-01-01'));
  assert.equal(occ.length, 3, '2024/2025/2026 = 3x');
});

test('getBillOccurrencesInRange() — cicilan dgn sisaTenor: berhenti setelah sisaTenor kali, TIDAK lanjut selamanya', () => {
  const { getBillOccurrencesInRange } = makeBillCalc(baseD());
  const bill = { nextDue: '2026-01-01', freq: 'bulanan', kind: 'cicilan', sisaTenor: 3 };
  const occ = getBillOccurrencesInRange(bill, new Date('2026-01-01'), new Date('2030-01-01'));
  assert.equal(occ.length, 3, 'hanya 3x sesuai sisaTenor, walau range 4 tahun ke depan');
});

test('getBillOccurrencesInRange() — nextDue kosong/invalid -> array kosong, tidak error', () => {
  const { getBillOccurrencesInRange } = makeBillCalc(baseD());
  assert.equal(getBillOccurrencesInRange({ nextDue: null, freq: 'bulanan' }, new Date(), new Date()).length, 0);
  assert.equal(getBillOccurrencesInRange({ nextDue: 'invalid', freq: 'bulanan' }, new Date(), new Date()).length, 0);
});

test('getBillOccurrencesInRange() — freq tidak dikenal -> berhenti setelah 1 kemunculan (tidak infinite loop)', () => {
  const { getBillOccurrencesInRange } = makeBillCalc(baseD());
  const bill = { nextDue: '2026-01-01', freq: 'entah' };
  const occ = getBillOccurrencesInRange(bill, new Date('2026-01-01'), new Date('2027-01-01'));
  assert.equal(occ.length, 1);
});

// ================= getBillOccurrencesInMonth() =================

test('getBillOccurrencesInMonth() — bulanan, hanya hitung occurrence di bulan yang diminta', () => {
  const { getBillOccurrencesInMonth } = makeBillCalc(baseD());
  const bill = { nextDue: '2026-01-10', freq: 'bulanan' };
  assert.equal(getBillOccurrencesInMonth(bill, 2026, 0).length, 1, 'Januari (bulan index 0) harus ada 1x');
  assert.equal(getBillOccurrencesInMonth(bill, 2026, 5).length, 1, 'Juni (bulan index 5) harus ada 1x');
  assert.equal(getBillOccurrencesInMonth(bill, 2025, 0).length, 0, 'Januari 2025 (sebelum nextDue) harus kosong');
});

test('getBillOccurrencesInMonth() — mingguan bisa muncul lebih dari 1x dalam satu bulan', () => {
  const { getBillOccurrencesInMonth } = makeBillCalc(baseD());
  const bill = { nextDue: '2026-02-01', freq: 'mingguan' };
  const occ = getBillOccurrencesInMonth(bill, 2026, 1); // Februari
  assert.ok(occ.length >= 4, `harus minimal 4x tagihan mingguan dalam sebulan, dapat ${occ.length}`);
});

// ================= getBillStats() =================

test('getBillStats() — monthTotal cuma menjumlahkan tagihan yang jatuh tempo BULAN INI', () => {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth();
  const thisMonthDate = new Date(y, m, 15).toISOString().split('T')[0];
  const otherMonthDate = new Date(y, m === 0 ? 11 : m - 1, 15).toISOString().split('T')[0];
  const D = baseD({
    bills: [
      { id: 'b1', nextDue: thisMonthDate, amount: 100000 },
      { id: 'b2', nextDue: otherMonthDate, amount: 999999 },
    ],
  });
  const { getBillStats } = makeBillCalc(D);
  assert.equal(getBillStats().monthTotal, 100000);
});

test('getBillStats() — overdueCount menghitung tagihan yang nextDue-nya sudah lewat', () => {
  const D = baseD({
    bills: [
      { id: 'b1', nextDue: '2000-01-01', amount: 50000 },
      { id: 'b2', nextDue: '2099-01-01', amount: 50000 },
    ],
  });
  const { getBillStats } = makeBillCalc(D);
  assert.equal(getBillStats().overdueCount, 1);
});

test('getBillStats() — soonCount menghitung tagihan jatuh tempo dalam 0-7 hari ke depan', () => {
  const in3Days = new Date(); in3Days.setDate(in3Days.getDate() + 3);
  const in20Days = new Date(); in20Days.setDate(in20Days.getDate() + 20);
  const D = baseD({
    bills: [
      { id: 'b1', nextDue: in3Days.toISOString().split('T')[0], amount: 10000 },
      { id: 'b2', nextDue: in20Days.toISOString().split('T')[0], amount: 10000 },
    ],
  });
  const { getBillStats } = makeBillCalc(D);
  assert.equal(getBillStats().soonCount, 1);
});

test('getBillStats() — outstanding cuma menjumlahkan cicilan (kind==="cicilan") dgn sisaTenor, bukan tagihan biasa', () => {
  const D = baseD({
    bills: [
      { id: 'b1', kind: 'cicilan', sisaTenor: 4, amount: 500000, nextDue: '2026-01-01' },
      { id: 'b2', kind: 'tagihan', amount: 100000, nextDue: '2026-01-01' },
    ],
  });
  const { getBillStats } = makeBillCalc(D);
  assert.equal(getBillStats().outstanding, 2000000, '4 x 500000, tagihan biasa tidak ikut dihitung');
});

// ================= getBillAnomalyInfo() =================

test('getBillAnomalyInfo() — kenaikan >=25% dari rata-rata histori -> mengembalikan info anomali', () => {
  const D = baseD({
    transactions: [
      { billLinkId: 'b1', amount: 100000, date: '2026-01-01' },
      { billLinkId: 'b1', amount: 100000, date: '2026-02-01' },
    ],
  });
  const { getBillAnomalyInfo } = makeBillCalc(D);
  const info = getBillAnomalyInfo('b1', 130000); // naik 30%
  assert.ok(info);
  assert.equal(info.pctChange, 30);
  assert.equal(info.avgPrev, 100000);
});

test('getBillAnomalyInfo() — kenaikan di bawah threshold 25% -> null (bukan anomali)', () => {
  const D = baseD({
    transactions: [
      { billLinkId: 'b1', amount: 100000, date: '2026-01-01' },
      { billLinkId: 'b1', amount: 100000, date: '2026-02-01' },
    ],
  });
  const { getBillAnomalyInfo } = makeBillCalc(D);
  assert.equal(getBillAnomalyInfo('b1', 110000), null, 'naik cuma 10%, di bawah threshold 25%');
});

test('getBillAnomalyInfo() — histori kurang dari 2 pembayaran -> null (cegah false-positive)', () => {
  const D = baseD({ transactions: [{ billLinkId: 'b1', amount: 100000, date: '2026-01-01' }] });
  const { getBillAnomalyInfo } = makeBillCalc(D);
  assert.equal(getBillAnomalyInfo('b1', 500000), null, 'baru 1x histori, belum ada "biasanya" yang valid');
});

test('getBillAnomalyInfo() — currentAmount kosong/0 -> null, tidak error', () => {
  const D = baseD({ transactions: [] });
  const { getBillAnomalyInfo } = makeBillCalc(D);
  assert.equal(getBillAnomalyInfo('b1', 0), null);
  assert.equal(getBillAnomalyInfo('b1', null), null);
});

test('getBillAnomalyInfo() — nominal TURUN dari rata-rata -> null (bukan anomali kenaikan)', () => {
  const D = baseD({
    transactions: [
      { billLinkId: 'b1', amount: 200000, date: '2026-01-01' },
      { billLinkId: 'b1', amount: 200000, date: '2026-02-01' },
    ],
  });
  const { getBillAnomalyInfo } = makeBillCalc(D);
  assert.equal(getBillAnomalyInfo('b1', 100000), null);
});

// ================= cashflowActionSuggestion() =================

test('cashflowActionSuggestion() — deficit <= 0 -> string kosong (tidak ada saran)', () => {
  const { cashflowActionSuggestion } = makeBillCalc(baseD());
  assert.equal(cashflowActionSuggestion(0, 30), '');
  assert.equal(cashflowActionSuggestion(-50000, 30), '');
});

test('cashflowActionSuggestion() — deficit positif -> saran berisi total & per-hari yang benar', () => {
  const { cashflowActionSuggestion } = makeBillCalc(baseD());
  const text = cashflowActionSuggestion(300000, 30);
  assert.match(text, /Rp 300\.000/);
  assert.match(text, /Rp 10\.000/, 'per hari = 300000/30 = 10000');
});

test('cashflowActionSuggestion() — days tidak diberikan -> default 30 hari', () => {
  const { cashflowActionSuggestion } = makeBillCalc(baseD());
  const text = cashflowActionSuggestion(300000);
  assert.match(text, /30 hari/);
});
