'use strict';
/**
 * s292-markbillpaid-doublepay-guard.test.js — Sesi 292: guard dobel-bayar di
 * markBillPaid() (modules/finance/tagihan-kalender.js).
 *
 * Bug yang diperbaiki (laporan user): getBillPaidThisPeriodInfo() sudah ADA
 * sejak S322 (dipakai murni utk badge visual "✅ Sudah dibayar bulan ini" di
 * renderBillItemHtml), tapi TIDAK PERNAH dipanggil di markBillPaid() sendiri
 * -- jadi tombol ✅ Bayar di kartu bisa ditekan berkali-kali di periode yang
 * sama (sengaja atau ke-tap ganda): sisaTenor kepotong 2x, nextDue maju 2x,
 * 2 transaksi pengeluaran tercatat utk 1 periode yang sama.
 *
 * Fix: markBillPaid() sekarang memanggil getBillPaidThisPeriodInfo(b) di
 * AWAL (sebelum modal tanggal/jumlah pembayaran biasa). Kalau hasilnya
 * truthy (sudah ada histori pembayaran periode ini), munculkan konfirmasi
 * TAMBAHAN ("sudah dibayar periode ini, tetap bayar lagi?") sebelum lanjut.
 * Guard dipasang di markBillPaid() sendiri (bukan cuma di renderBillItemHtml)
 * supaya menutup SEMUA entry point sekaligus (SSOT) -- termasuk "Bayar Bulan
 * Depan" (advance=true).
 *
 * Test ini load fungsi ASLI lewat brace-counting manual (pola sama
 * tests/s285-bill-lunas-tanggal-bayar.test.js), dgn getBillPaidThisPeriodInfo
 * ikut di-extract ke sandbox yang sama supaya markBillPaid bisa memanggilnya.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'finance', 'tagihan-kalender.js'),
  'utf8'
);

function extractFnSource(fnName) {
  const asyncMarker = `async function ${fnName}(`;
  const plainMarker = `function ${fnName}(`;
  let start = SRC.indexOf(asyncMarker);
  if (start === -1) start = SRC.indexOf(plainMarker);
  if (start === -1) throw new Error(`"${plainMarker}" tidak ditemukan`);
  const braceOpen = SRC.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < SRC.length && depth > 0) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') depth--;
    i++;
  }
  return SRC.slice(start, i);
}

// confirmQueue: array jawaban berurutan tiap kali askConfirm() dipanggil (guard
// dobel-bayar dulu, baru konfirmasi/prompt normal setelahnya) -- kalau habis,
// fallback ke `true` (pola sama s285, biar test lama yang cuma 1x confirm biasa
// nggak perlu diubah).
function loadSandbox(D, { confirmQueue = [], promptDefault = true } = {}) {
  let uidCounter = 9000;
  const confirmCalls = [];
  const context = {
    console,
    Math,
    Date,
    D,
    uid: () => 'tx' + (++uidCounter),
    escapeHtml: (s) => s,
    fmtFull: (n) => String(n),
    sameId: (a, b) => a === b,
    askConfirm: async (msg, opts) => {
      confirmCalls.push({ msg, opts });
      return confirmQueue.length ? confirmQueue.shift() : true;
    },
    showPromptModal: async (opts) => (promptDefault ? ((opts && opts.defaultValue) || null) : null),
    toast: () => {},
    save: () => {},
    refreshBillEverywhere: () => {},
    renderDebtList: () => {},
    renderKekayaanBersih: () => {},
    hitungZakatMaal: () => {},
  };
  vm.createContext(context);
  const snippet = `${extractFnSource('getBillPaidThisPeriodInfo')}
${extractFnSource('markBillPaid')}
this.markBillPaid = markBillPaid;
this.getBillPaidThisPeriodInfo = getBillPaidThisPeriodInfo;`;
  vm.runInContext(snippet, context, { filename: 'mark-bill-paid-guard-extract.js' });
  context.__confirmCalls = confirmCalls;
  return context;
}

function withFixedToday(dateStr, fn) {
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) return new RealDate(dateStr);
      return new RealDate(...args);
    }
    static now() { return new RealDate(dateStr).getTime(); }
  }
  global.Date = FixedDate;
  try { return fn(); } finally { global.Date = RealDate; }
}

test('markBillPaid() — belum pernah dibayar periode ini: TIDAK ada konfirmasi guard tambahan, langsung ke konfirmasi tanggal pembayaran biasa', async () => {
  await withFixedToday('2026-07-31T10:00:00', async () => {
    const D = {
      bills: [{ id: 'b1', name: 'Listrik', amount: 200000, nextDue: '2026-08-05', freq: 'bulanan', category: 'Tagihan' }],
      transactions: [],
      billsArchive: [],
      accounts: [{ id: 'acc1' }],
    };
    const ctx = loadSandbox(D);
    await ctx.markBillPaid('b1');
    assert.equal(D.transactions.length, 1, 'pembayaran pertama harus tetap tercatat');
    // Bayar biasa (bukan advance) pakai showPromptModal utk tanggal, BUKAN askConfirm --
    // jadi kalau guard tidak terpicu, askConfirm() harusnya sama sekali tidak dipanggil.
    assert.equal(ctx.__confirmCalls.length, 0, 'tidak ada guard tambahan kalau belum pernah dibayar periode ini');
  });
});

test('markBillPaid() — SUDAH dibayar periode ini & user BATAL di guard: TIDAK ada transaksi baru, sisaTenor/nextDue TIDAK berubah', async () => {
  await withFixedToday('2026-07-31T10:00:00', async () => {
    const D = {
      bills: [{ id: 'b2', name: 'Kulkas', amount: 150000, nextDue: '2026-08-10', freq: 'bulanan', kind: 'cicilan', sisaTenor: 5, tenor: 12, category: 'Cicilan' }],
      // Histori: sudah ada pembayaran BULAN INI (Juli 2026) utk bill ini.
      transactions: [{ id: 'tOld', billLinkId: 'b2', date: '2026-07-15', amount: 150000 }],
      billsArchive: [],
      accounts: [{ id: 'acc1' }],
    };
    // Jawaban askConfirm PERTAMA (guard dobel-bayar) = false (batal).
    const ctx = loadSandbox(D, { confirmQueue: [false] });
    await ctx.markBillPaid('b2');
    assert.equal(D.transactions.length, 1, 'tidak boleh nambah transaksi baru kalau user batal di guard');
    assert.equal(D.bills[0].sisaTenor, 5, 'sisaTenor tidak boleh berubah kalau dibatalkan');
    assert.equal(D.bills[0].nextDue, '2026-08-10', 'nextDue tidak boleh maju kalau dibatalkan');
    assert.equal(ctx.__confirmCalls.length, 1, 'harus berhenti di guard, tidak lanjut ke konfirmasi lain');
    assert.match(ctx.__confirmCalls[0].msg, /sudah dibayar/i);
  });
});

test('markBillPaid() — SUDAH dibayar periode ini tapi user pilih TETAP LANJUT di guard: pembayaran ke-2 tetap diproses (by design, ini cuma warning bukan hard block)', async () => {
  await withFixedToday('2026-07-31T10:00:00', async () => {
    const D = {
      bills: [{ id: 'b3', name: 'Kulkas', amount: 150000, nextDue: '2026-08-10', freq: 'bulanan', kind: 'cicilan', sisaTenor: 5, tenor: 12, category: 'Cicilan' }],
      transactions: [{ id: 'tOld', billLinkId: 'b3', date: '2026-07-15', amount: 150000 }],
      billsArchive: [],
      accounts: [{ id: 'acc1' }],
    };
    // Jawaban ke-1 (guard) = true (lanjut), showPromptModal (tanggal) pakai default.
    const ctx = loadSandbox(D, { confirmQueue: [true] });
    await ctx.markBillPaid('b3');
    assert.equal(D.transactions.length, 2, 'user sadar & tetap mau bayar lagi -> tetap diproses');
    assert.equal(D.bills[0].sisaTenor, 4, 'sisaTenor tetap terpotong sesuai alur normal setelah user konfirmasi ulang');
  });
});

test('markBillPaid() — "Bayar Bulan Depan" (advance) juga kena guard kalau periode ini sudah dibayar', async () => {
  await withFixedToday('2026-07-31T10:00:00', async () => {
    const D = {
      bills: [{ id: 'b4', name: 'Internet', amount: 300000, nextDue: '2026-08-20', freq: 'bulanan', category: 'Tagihan' }],
      transactions: [{ id: 'tOld', billLinkId: 'b4', date: '2026-07-20', amount: 300000 }],
      billsArchive: [],
      accounts: [{ id: 'acc1' }],
    };
    const ctx = loadSandbox(D, { confirmQueue: [false] });
    await ctx.markBillPaid('b4', true);
    assert.equal(D.transactions.length, 1, 'advance=true tetap harus berhenti di guard kalau sudah dibayar periode ini');
    assert.match(ctx.__confirmCalls[0].msg, /sudah dibayar/i);
  });
});
