'use strict';
// tests/s303-utang-custom-pay-amount.test.js — item #3 lanjutan laporan user (setelah s302):
// markBillPaid() utk kind==='utang' dulu SELALU pakai b.amount (cicilan bulanan tetap) sbg
// jumlah bayar -- user yang mau lunasin lebih besar (bayar sekaligus/di muka) tidak punya
// jalur dari sisi Tagihan, harus lewat Buku Utang edit `nilai` manual.
//
// FIX: jalur bayar BIASA (bukan advance) utk kind==='utang' sekarang menampilkan prompt
// tambahan "Jumlah Pembayaran" (default b.amount, boleh diisi lebih besar). Jumlah yang
// dientri dipakai KONSISTEN utk: (a) nominal transaksi pengeluaran yang dicatat, (b) jumlah
// yang dikurangkan dari D.debts[].nilai. Kind lain (tagihan/langganan/cicilan) TIDAK berubah,
// tetap terkunci ke b.amount seperti sebelumnya.
//
// Test ini load fungsi ASLI lewat brace-counting manual (pola sama tests/s285-bill-lunas-
// tanggal-bayar.test.js / tests/s292-markbillpaid-doublepay-guard.test.js), dgn
// getBillPaidThisPeriodInfo & advanceBillNextDue ikut di-extract (dependency markBillPaid()).

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

// promptAmount: jawaban utk prompt "Jumlah Pembayaran" (khusus utang). promptDate: jawaban
// utk prompt "Tanggal Pembayaran" (semua kind, bukan advance) -- dibedakan lewat opts.title,
// pola paling sederhana krn showPromptModal dipanggil >1x per markBillPaid() sekarang.
function loadSandbox(D, { promptAmount, promptDate = '2026-07-31' } = {}) {
  let uidCounter = 7000;
  const context = {
    console,
    Math,
    Date,
    D,
    uid: () => 'tx' + (++uidCounter),
    escapeHtml: (s) => s,
    fmtFull: (n) => String(n),
    sameId: (a, b) => a === b,
    askConfirm: async () => true,
    showPromptModal: async (opts) => {
      if (opts && opts.title === 'Jumlah Pembayaran') return promptAmount != null ? promptAmount : opts.defaultValue;
      return promptDate;
    },
    parsePzNum: (v) => Number(v) || 0,
    toast: () => {},
    save: () => {},
    refreshBillEverywhere: () => {},
    renderDebtList: () => {},
    renderKekayaanBersih: () => {},
    hitungZakatMaal: () => {},
  };
  vm.createContext(context);
  const snippet = `${extractFnSource('_amc015')}
${extractFnSource('getBillPaidThisPeriodInfo')}
${extractFnSource('advanceBillNextDue')}
${extractFnSource('markBillPaid')}
this.markBillPaid = markBillPaid;`;
  vm.runInContext(snippet, context, { filename: 'utang-custom-pay-extract.js' });
  return context;
}

function makeD(debtNilai, billOverrides = {}) {
  return {
    bills: [Object.assign({
      id: 'b1', name: 'Cicilan Motor', amount: 500000, nextDue: '2026-07-05',
      freq: 'bulanan', kind: 'utang', debtId: 'd1', category: 'Cicilan',
    }, billOverrides)],
    debts: [{ id: 'd1', name: 'KTA Motor', nilai: debtNilai, lunas: false, billId: 'b1' }],
    transactions: [],
    billsArchive: [],
    accounts: [],
  };
}

test('markBillPaid() utang — tanpa isi custom (default) -> tetap pakai b.amount, perilaku lama tidak berubah', async () => {
  const D = makeD(2000000);
  const ctx = loadSandbox(D, {}); // promptAmount undefined -> stub balikin opts.defaultValue (=b.amount)
  await ctx.markBillPaid('b1');
  assert.equal(D.transactions[0].amount, 500000);
  assert.equal(D.debts[0].nilai, 1500000);
});

test('markBillPaid() utang — isi jumlah LEBIH BESAR dari cicilan tapi < sisa -> dikurangkan sesuai jumlah custom, bill TETAP aktif', async () => {
  const D = makeD(5000000);
  const ctx = loadSandbox(D, { promptAmount: 1200000 });
  await ctx.markBillPaid('b1');
  assert.equal(D.transactions[0].amount, 1200000, 'nominal transaksi harus ikut jumlah custom, bukan b.amount');
  assert.equal(D.debts[0].nilai, 3800000, 'sisa utang harus dikurangi sesuai jumlah custom');
  assert.equal(D.bills.length, 1, 'bill masih aktif (belum lunas)');
  assert.equal(D.debts[0].lunas, false);
});

test('markBillPaid() utang — isi jumlah = SISA persis -> utang LUNAS, bill diarsipkan', async () => {
  const D = makeD(1200000);
  const ctx = loadSandbox(D, { promptAmount: 1200000 });
  await ctx.markBillPaid('b1');
  assert.equal(D.debts[0].nilai, 0);
  assert.equal(D.debts[0].lunas, true);
  assert.equal(D.bills.length, 0, 'bill dipindah dari D.bills');
  assert.equal(D.billsArchive.length, 1);
});

test('markBillPaid() utang — isi jumlah LEBIH BESAR dari sisa (overpay) -> sisa diclamp ke 0, tetap LUNAS (tidak minus)', async () => {
  const D = makeD(1000000);
  const ctx = loadSandbox(D, { promptAmount: 1500000 });
  await ctx.markBillPaid('b1');
  assert.equal(D.debts[0].nilai, 0, 'tidak boleh minus');
  assert.equal(D.debts[0].lunas, true);
});

test('markBillPaid() kind lain (tagihan biasa) — TIDAK menampilkan prompt Jumlah Pembayaran, tetap pakai b.amount', async () => {
  const D = {
    bills: [{ id: 'b2', name: 'Listrik', amount: 300000, nextDue: '2026-07-05', freq: 'bulanan', kind: 'tagihan', category: 'Tagihan' }],
    transactions: [],
    billsArchive: [],
    accounts: [],
  };
  let amountPromptCalled = false;
  const context = {
    console, Math, Date, D,
    uid: () => 'tx' + Date.now(),
    escapeHtml: (s) => s,
    fmtFull: (n) => String(n),
    sameId: (a, b) => a === b,
    askConfirm: async () => true,
    showPromptModal: async (opts) => {
      if (opts && opts.title === 'Jumlah Pembayaran') { amountPromptCalled = true; return 999999; }
      return '2026-07-31';
    },
    parsePzNum: (v) => Number(v) || 0,
    toast: () => {}, save: () => {}, refreshBillEverywhere: () => {},
    renderDebtList: () => {}, renderKekayaanBersih: () => {}, hitungZakatMaal: () => {},
  };
  vm.createContext(context);
  const snippet = `${extractFnSource('_amc015')}
${extractFnSource('getBillPaidThisPeriodInfo')}
${extractFnSource('advanceBillNextDue')}
${extractFnSource('markBillPaid')}
this.markBillPaid = markBillPaid;`;
  vm.runInContext(snippet, context, { filename: 'utang-custom-pay-extract-2.js' });
  await context.markBillPaid('b2');
  assert.equal(amountPromptCalled, false, 'kind selain utang tidak boleh kena prompt jumlah custom');
  assert.equal(D.transactions[0].amount, 300000);
});
