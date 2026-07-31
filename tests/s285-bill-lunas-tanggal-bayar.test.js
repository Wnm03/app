'use strict';
/**
 * s285-bill-lunas-tanggal-bayar.test.js — Sesi 285: fix konsistensi tanggal
 * antara transaksi pembayaran & label "✅ Lunas <tanggal>" di arsip tagihan
 * (renderBillArchive, pakai b.completedAt).
 *
 * Bug sebelumnya: markBillPaid() mencatat transaksi dgn date=b.nextDue kalau
 * advance=true ("Bayar Duluan/Bulan Depan"), TAPI completedAt yang dipakai
 * saat bill langsung diarsipkan LUNAS (utang lunas / cicilan tenor habis /
 * tagihan sekali selesai) SELALU pakai tanggal hari ini -- jadi utk
 * pembayaran advance, label "Lunas <tanggal>" di arsip beda sendiri dari
 * tanggal transaksi beneran di Daftar Transaksi utk pembayaran YANG SAMA.
 *
 * Fix: satu variabel payDate (advance?b.nextDue:hari ini) dipakai konsisten
 * utk date transaksi MAUPUN completedAt.
 *
 * Test ini load fungsi ASLI lewat brace-counting manual (pola sama
 * tests/shared-bill-auto-piutang.test.js) supaya bisa suntik D tiruan &
 * stub semua dependency DOM/toast/save yang dipanggil markBillPaid().
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

function loadSandbox(D, { confirmResult = true } = {}) {
  let uidCounter = 8000;
  const context = {
    console,
    Math,
    Date,
    D,
    uid: () => 'tx' + (++uidCounter),
    escapeHtml: (s) => s,
    fmtFull: (n) => String(n),
    sameId: (a, b) => a === b,
    askConfirm: async () => confirmResult,
    showPromptModal: async (opts) => (opts && opts.defaultValue) || null,
    parsePzNum: (v) => Number(v) || 0,
    toast: () => {},
    save: () => {},
    refreshBillEverywhere: () => {},
    renderDebtList: () => {},
    renderKekayaanBersih: () => {},
    hitungZakatMaal: () => {},
  };
  vm.createContext(context);
  // getBillPaidThisPeriodInfo() -- markBillPaid() sekarang memanggilnya di awal (guard
  // dobel-bayar, Sesi 292), jadi harus ikut di-extract & tersedia di sandbox yang sama
  // (function declaration, otomatis nempel ke context lewat hoisting biasa).
  // advanceBillNextDue() (s302) -- dependency baru markBillPaid() utk menghitung nextDue,
  // ikut di-extract dgn pola sama. parsePzNum (s302 lanjutan, item #3) -- dependency baru
  // khusus jalur kind==='utang' (jumlah bayar custom), di-stub di context di atas (bukan
  // fungsi murni file ini, cukup Number(v) sederhana utk kebutuhan test).
  const snippet = `${extractFnSource('getBillPaidThisPeriodInfo')}
${extractFnSource('advanceBillNextDue')}
${extractFnSource('markBillPaid')}
this.markBillPaid = markBillPaid;
this.getBillPaidThisPeriodInfo = getBillPaidThisPeriodInfo;`;
  vm.runInContext(snippet, context, { filename: 'mark-bill-paid-extract.js' });
  return context;
}

// Bekukan "hari ini" ke tanggal tetap supaya assert nggak flaky.
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

test('markBillPaid() — bayar biasa (advance falsy), tagihan "sekali" langsung lunas: tx.date & completedAt SAMA-SAMA hari ini', async () => {
  await withFixedToday('2026-07-29T10:00:00', async () => {
    const D = {
      bills: [{ id: 'b1', name: 'Admin', amount: 5000, nextDue: '2026-08-05', freq: 'sekali', category: 'Tagihan' }],
      transactions: [],
      billsArchive: [],
      accounts: [{ id: 'acc1' }],
    };
    const ctx = loadSandbox(D);
    await ctx.markBillPaid('b1');
    assert.equal(D.transactions.length, 1);
    assert.equal(D.transactions[0].date, '2026-07-29');
    assert.equal(D.billsArchive.length, 1);
    assert.equal(D.billsArchive[0].completedAt, '2026-07-29');
    assert.equal(D.billsArchive[0].completedAt, D.transactions[0].date);
  });
});

test('markBillPaid() — "Bayar Duluan/Bulan Depan" (advance=true), tagihan "sekali" langsung lunas: tx.date & completedAt SAMA-SAMA b.nextDue (BUKAN hari ini) — ini bug S285 yang diperbaiki', async () => {
  await withFixedToday('2026-07-29T10:00:00', async () => {
    const D = {
      bills: [{ id: 'b2', name: 'closet ina', amount: 154280, nextDue: '2026-08-05', freq: 'sekali', category: 'Renov' }],
      transactions: [],
      billsArchive: [],
      accounts: [{ id: 'acc1' }],
    };
    const ctx = loadSandbox(D);
    await ctx.markBillPaid('b2', true);
    assert.equal(D.transactions.length, 1);
    assert.equal(D.transactions[0].date, '2026-08-05');
    assert.equal(D.billsArchive.length, 1);
    // Sebelum fix: completedAt ini akan jadi '2026-07-29' (hari ini), beda dari tx.date.
    assert.equal(D.billsArchive[0].completedAt, '2026-08-05');
    assert.equal(D.billsArchive[0].completedAt, D.transactions[0].date);
  });
});

test('markBillPaid() — cicilan tenor 1x dibayar via "Bayar Duluan": completedAt cicilan LUNAS ikut b.nextDue, konsisten dgn tx.date', async () => {
  await withFixedToday('2026-07-29T10:00:00', async () => {
    const D = {
      bills: [{ id: 'b3', name: 'Kulkas', amount: 100000, nextDue: '2026-08-05', freq: 'bulanan', kind: 'cicilan', sisaTenor: 1, tenor: 1, category: 'Cicilan' }],
      transactions: [],
      billsArchive: [],
      accounts: [{ id: 'acc1' }],
    };
    const ctx = loadSandbox(D);
    await ctx.markBillPaid('b3', true);
    assert.equal(D.transactions[0].date, '2026-08-05');
    assert.equal(D.billsArchive[0].completedAt, '2026-08-05');
  });
});

test('markBillPaid() — utang lunas (advance falsy): completedAt tetap konsisten dgn tx.date hari ini', async () => {
  await withFixedToday('2026-07-29T10:00:00', async () => {
    const D = {
      bills: [{ id: 'b4', name: 'Cicilan Motor', amount: 500000, nextDue: '2026-08-05', freq: 'bulanan', kind: 'utang', debtId: 'd1' }],
      transactions: [],
      billsArchive: [],
      accounts: [{ id: 'acc1' }],
      debts: [{ id: 'd1', name: 'Motor', nilai: 500000 }],
    };
    const ctx = loadSandbox(D);
    await ctx.markBillPaid('b4');
    assert.equal(D.transactions[0].date, '2026-07-29');
    assert.equal(D.billsArchive[0].completedAt, '2026-07-29');
    assert.equal(D.billsArchive[0].completedAt, D.transactions[0].date);
  });
});
