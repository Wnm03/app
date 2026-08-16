'use strict';
// tests/s625-deltx-revert-bill-regression.test.js — Sesi 625, Bug A (audit
// DELETE transaksi pembayaran).
//
// Temuan audit: delTx() (tx-list-cashflow.js) TIDAK memanggil
// revertBillFromDeletedTx(t) (tagihan-kalender.js) sama sekali -- beda dari
// deleteBillHistoryTx() (jalur DELETE lain, lewat modal 📋 Riwayat
// Pembayaran) yang SUDAH memanggilnya (lihat referensi implementasi di
// tagihan-kalender.js baris ~854). Akibatnya: hapus transaksi pembayaran
// lewat tombol 🗑 di List Transaksi biasa TIDAK membalikkan:
//   - D.bills (sisaTenor/nextDue)
//   - D.billsArchive (reaktivasi kalau bill td sudah lunas/diarsip)
//   - D.debts (saldo utang)
//   - D.piutang (auto-piutang "Ditanggung Bersama" yg autoTxId-nya nunjuk
//     ke transaksi yg dihapus)
//
// Pola harness SAMA PERSIS dgn tests/s519-*.test.js (delTx() end-to-end) &
// tests/s327-tagihan-sync-integrity.test.js (revertBillFromDeletedTx()) --
// load file SOURCE ASLI lewat loadSource(), 0 re-implementasi logic di
// sini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  const ctx = loadSource(
    [
      'modules/finance/tagihan-kalender.js',
      'modules/finance/tx-list-cashflow.js',
    ],
    {
      D,
      save: () => {},
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      sameId: (a, b) => String(a) === String(b),
      askConfirm: async () => true,
      toast: () => {},
      renderDashboard: () => {}, renderKeuangan: () => {}, renderCnTab: () => {}, renderProductList: () => {},
      renderShop: () => {}, renderShopRecent: () => {}, renderStockList: () => {},
      renderBillList: () => {}, checkBills: () => {}, renderBillHistory: () => {}, renderBillArchive: () => {},
      renderDebtList: () => {}, renderKekayaanBersih: () => {}, hitungZakatMaal: () => {}, renderSettings: () => {},
    },
    ['delTx', 'revertBillFromDeletedTx', 'isLatestBillPaymentTx'],
  );
  return ctx;
}

function baseD(overrides) {
  return Object.assign({ bills: [], billsArchive: [], debts: [], piutang: [], transactions: [] }, overrides || {});
}

// ------------------------------------------------------------------
// 1. delete pembayaran utang -> saldo utang kembali
// ------------------------------------------------------------------
test('delTx(): hapus pembayaran utang mengembalikan saldo D.debts', async () => {
  const D = baseD({
    bills: [{ id: 'b1', kind: 'utang', debtId: 'd1', name: 'Utang Bank', amount: 100000, nextDue: '2026-09-01' }],
    debts: [{ id: 'd1', name: 'Utang Bank', nilai: 400000, lunas: false }],
    transactions: [{ id: 1, billLinkId: 'b1', amount: 100000, payMethod: 'utang', type: 'expense', date: '2026-08-10' }],
  });
  const ctx = makeCtx(D);
  await ctx.delTx(1);
  assert.equal(D.debts[0].nilai, 500000, 'sisa utang harus kembali +100000');
  assert.equal(D.transactions.length, 0);
});

// ------------------------------------------------------------------
// 2. delete pembayaran tagihan -> bill kembali aktif jika sebelumnya lunas
// ------------------------------------------------------------------
test('delTx(): hapus pembayaran tagihan yg sudah lunas mereaktivasi dari D.billsArchive ke D.bills', async () => {
  const D = baseD({
    billsArchive: [{ id: 'b2', kind: 'tagihan', name: 'PBB', amount: 200000, completedAt: '2026-08-01' }],
    transactions: [{ id: 2, billLinkId: 'b2', amount: 200000, payMethod: 'tagihan', type: 'expense', date: '2026-08-01' }],
  });
  const ctx = makeCtx(D);
  await ctx.delTx(2);
  assert.equal(D.billsArchive.length, 0, 'arsip harus kosong lagi');
  assert.equal(D.bills.length, 1, 'bill harus kembali aktif');
  assert.equal(D.bills[0].id, 'b2');
  assert.equal(D.bills[0].completedAt, undefined, 'completedAt harus dilepas');
  assert.equal(D.transactions.length, 0);
});

// ------------------------------------------------------------------
// 3. delete pembayaran cicilan -> sisa tenor/nextDue kembali benar
// ------------------------------------------------------------------
test('delTx(): hapus pembayaran cicilan mengembalikan sisaTenor & nextDue (pakai snapshot billPrevNextDue)', async () => {
  const D = baseD({
    bills: [{ id: 'b3', kind: 'cicilan', name: 'Motor', sisaTenor: 5, tenor: 12, nextDue: '2026-09-01' }],
    transactions: [{ id: 3, billLinkId: 'b3', amount: 150000, payMethod: 'cicilan', type: 'expense', date: '2026-08-01', billPrevNextDue: '2026-08-01' }],
  });
  const ctx = makeCtx(D);
  await ctx.delTx(3);
  assert.equal(D.bills[0].sisaTenor, 6, 'sisa tenor harus kembali +1');
  assert.equal(D.bills[0].nextDue, '2026-08-01', 'nextDue harus kembali ke snapshot');
  assert.equal(D.transactions.length, 0);
});

// ------------------------------------------------------------------
// 4. delete pembayaran langganan -> nextDue kembali benar
// ------------------------------------------------------------------
test('delTx(): hapus pembayaran langganan mengembalikan nextDue (pakai snapshot billPrevNextDue)', async () => {
  const D = baseD({
    bills: [{ id: 'b4', kind: 'langganan', name: 'Internet', freq: 'bulanan', nextDue: '2026-09-01' }],
    transactions: [{ id: 4, billLinkId: 'b4', amount: 300000, payMethod: 'langganan', type: 'expense', date: '2026-08-01', billPrevNextDue: '2026-08-01' }],
  });
  const ctx = makeCtx(D);
  await ctx.delTx(4);
  assert.equal(D.bills[0].nextDue, '2026-08-01');
  assert.equal(D.transactions.length, 0);
});

// ------------------------------------------------------------------
// 5. auto-piutang terkait transaksi ikut dibersihkan
// ------------------------------------------------------------------
test('delTx(): hapus transaksi pembayaran bill ikut membersihkan D.piutang auto (autoTxId) yang belum lunas', async () => {
  const D = baseD({
    bills: [{ id: 'b5', kind: 'tagihan', name: 'Listrik', freq: 'bulanan', nextDue: '2026-09-01' }],
    piutang: [{ id: 'p1', autoTxId: 5, nilai: 50000, lunas: false }],
    transactions: [{ id: 5, billLinkId: 'b5', amount: 100000, payMethod: 'tagihan', type: 'expense', date: '2026-08-01', billPrevNextDue: '2026-08-01' }],
  });
  const ctx = makeCtx(D);
  await ctx.delTx(5);
  assert.equal(D.piutang.length, 0, 'auto-piutang belum lunas yg autoTxId-nya menunjuk tx yg dihapus harus ikut hilang');
});

// ------------------------------------------------------------------
// 6. transaksi biasa tanpa billLinkId tetap berperilaku seperti sebelumnya
// ------------------------------------------------------------------
test('delTx(): transaksi biasa tanpa billLinkId -- 0 efek samping ke bills/debts/piutang (no-op revert, backward compatible)', async () => {
  const D = baseD({
    bills: [{ id: 'bX', kind: 'cicilan', sisaTenor: 3, nextDue: '2026-09-01' }],
    debts: [{ id: 'dX', nilai: 100000, lunas: false }],
    piutang: [{ id: 'pX', autoTxId: 999, nilai: 10000, lunas: false }],
    transactions: [{ id: 6, type: 'expense', amount: 20000, category: 'Makan', date: '2026-08-10' }],
  });
  const ctx = makeCtx(D);
  await ctx.delTx(6);
  assert.equal(D.transactions.length, 0);
  assert.equal(D.bills[0].sisaTenor, 3, 'bill lain tidak boleh tersentuh');
  assert.equal(D.debts[0].nilai, 100000, 'debt lain tidak boleh tersentuh');
  assert.equal(D.piutang.length, 1, 'piutang lain tidak boleh tersentuh');
});

// ------------------------------------------------------------------
// 7. double-revert guard -- hapus id yang sama 2x tidak boleh dobel-revert
// ------------------------------------------------------------------
test('delTx(): panggil 2x dgn id yang sama tidak dobel-mengembalikan saldo utang (t sudah undefined di panggilan ke-2)', async () => {
  const D = baseD({
    bills: [{ id: 'b7', kind: 'utang', debtId: 'd7', name: 'Utang Kartu', amount: 50000, nextDue: '2026-09-01' }],
    debts: [{ id: 'd7', name: 'Utang Kartu', nilai: 200000, lunas: false }],
    transactions: [{ id: 7, billLinkId: 'b7', amount: 50000, payMethod: 'utang', type: 'expense', date: '2026-08-10' }],
  });
  const ctx = makeCtx(D);
  await ctx.delTx(7);
  assert.equal(D.debts[0].nilai, 250000);
  await ctx.delTx(7); // tx sudah tidak ada -> t undefined -> revertBillFromDeletedTx no-op
  assert.equal(D.debts[0].nilai, 250000, 'saldo tidak boleh berubah lagi di panggilan ke-2');
});
