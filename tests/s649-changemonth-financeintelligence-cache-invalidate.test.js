'use strict';
// tests/s649-changemonth-financeintelligence-cache-invalidate.test.js —
// regresi BUG-012 (TODO.md, "FinanceIntelligence & Risk Dashboard"):
//   FinanceIntelligence men-cache hasil panggilan TANPA argumen eksplisit
//   (mis. incomeVsExpense()/budgetSummary() bulan default -- lihat
//   _ivxCache/invalidateCache() di finance-intelligence.js). Cache ini
//   diinvalidate lewat hook yang sama dgn cache saldo akun
//   (save()/renderPageContent()).
//
//   changeMonth()/changeTxListMonth() (tx-list-cashflow.js) mengganti
//   curMonth/curYear (bulan aktif yang jadi acuan default cache itu) TAPI
//   dipanggil LANGSUNG dari tombol ‹ › navigasi bulan -- tidak lewat
//   save() atau renderPageContent(), cuma renderKeuangan(). Akibatnya
//   kartu turunan yang baca FinanceIntelligence tanpa argumen (mis.
//   "Skor Kesehatan Finansial") tetap nampilkan angka cache bulan
//   SEBELUMNYA sampai ada save()/pindah-halaman lain yang kebetulan
//   invalidate cache-nya.
//
// Fix: changeMonth() panggil FinanceIntelligence.invalidateCache() secara
// eksplisit sebelum renderKeuangan(), pola sama renderPageContent()
// (modules-render.js). Pakai loadSource harness, FinanceIntelligence
// di-stub minimal (cuma butuh invalidateCache() sbg spy) -- 0 kebutuhan
// muat file finance-intelligence.js asli (fokus test ini murni: DIPANGGIL
// atau tidak, bukan isi cache-nya -- sudah dicakup
// tests/finance-intelligence-cache.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(extra) {
  let invalidateCalls = 0;
  const FinanceIntelligence = {
    invalidateCache() { invalidateCalls++; },
  };
  const ctx = loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    Object.assign(
      {
        FinanceIntelligence,
        closeModal: () => {},
        renderKeuangan: () => {},
        curMonth: 7,
        curYear: 2026,
        txListPage: 3,
      },
      extra || {},
    ),
    [],
  );
  return { ctx, getInvalidateCalls: () => invalidateCalls };
}

test('changeMonth() — panggil FinanceIntelligence.invalidateCache() sebelum renderKeuangan(), supaya kartu turunan (mis. Skor Kesehatan Finansial) ikut refresh ke bulan baru', () => {
  const { ctx, getInvalidateCalls } = makeCtx();
  ctx.changeMonth(1);
  assert.equal(getInvalidateCalls(), 1, 'invalidateCache() harus terpanggil tepat 1x tiap ganti bulan');
  assert.equal(ctx.curMonth, 8);
});

test('changeMonth() — navigasi mundur lintas tahun (Jan -> Des tahun sebelumnya) tetap invalidate cache (0 regresi jalur wrap-around)', () => {
  const { ctx, getInvalidateCalls } = makeCtx({ curMonth: 0, curYear: 2026 });
  ctx.changeMonth(-1);
  assert.equal(ctx.curMonth, 11);
  assert.equal(ctx.curYear, 2025);
  assert.equal(getInvalidateCalls(), 1);
});

test('changeTxListMonth() — alias changeMonth(), ikut invalidate cache juga (dipakai tombol ‹ › kartu "Semua Transaksi")', () => {
  const { ctx, getInvalidateCalls } = makeCtx();
  ctx.changeTxListMonth(1);
  assert.equal(getInvalidateCalls(), 1);
});

test('changeMonth() — FinanceIntelligence belum dimuat (guard typeof) -> tidak throw, 0 regresi utk halaman/test yang tidak load modul ini', () => {
  const ctx = loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    {
      closeModal: () => {},
      renderKeuangan: () => {},
      curMonth: 7,
      curYear: 2026,
      txListPage: 3,
    },
    [],
  );
  assert.doesNotThrow(() => ctx.changeMonth(1));
});

test('changeMonth() — txListPage direset ke 1 & curMonth berubah (0 regresi perilaku lama)', () => {
  const { ctx } = makeCtx({ txListPage: 5 });
  ctx.changeMonth(1);
  assert.equal(ctx.txListPage, 1);
  assert.equal(ctx.curMonth, 8);
});
