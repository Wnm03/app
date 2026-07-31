'use strict';
/**
 * s311-bill-fallback-scan-massal.test.js — Sesi 311: saran #4 audit
 * (AUDIT-billlinkid-remaining-gaps.md poin 4: "Self-healing reaktif
 * (satu-per-satu), tidak ada scan massal").
 *
 * scanAllBillFallbackCandidates(billsArchive, transactions) -- scan SEMUA
 * entri D.billsArchive yang belum ter-billLinkId sekaligus, pakai fallback
 * yang sama persis dengan openBillPaymentDateEdit() (findFallbackBillPaymentTxId),
 * tapi SKIP entri yang ambigu (>1 kandidat) demi keamanan karena tidak ada
 * kesempatan user cek satu-satu sebelum commit massal (beda dari jalur reaktif
 * yang tetap auto-link ambigu + toast peringatan).
 *
 * Test load fungsi ASLI lewat brace-counting manual (pola sama
 * tests/s304-bill-payment-tx-fallback.test.js).
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

function loadSandbox() {
  const context = { console, Math, Date };
  vm.createContext(context);
  const snippet = `${extractFnSource('getLatestBillPaymentTxId')}
${extractFnSource('fallbackMatchAmount')}
${extractFnSource('findFallbackBillPaymentTxId')}
${extractFnSource('countFallbackBillPaymentCandidates')}
${extractFnSource('scanAllBillFallbackCandidates')}
this.scanAllBillFallbackCandidates = scanAllBillFallbackCandidates;`;
  vm.runInContext(snippet, context, { filename: 'bill-fallback-scan-massal-extract.js' });
  return context;
}

test('scanAllBillFallbackCandidates() — kembalikan kandidat utk arsip yang belum ter-link', () => {
  const context = loadSandbox();
  const billsArchive = [
    { id: 'a1', name: 'Cicilan Motor', amount: 500000, completedAt: '2026-07-20' },
  ];
  const transactions = [
    { id: 1, type: 'expense', amount: 500000, note: 'Bayar: Cicilan Motor', date: '2026-07-20' },
  ];
  const result = context.scanAllBillFallbackCandidates(billsArchive, transactions);
  assert.equal(result.length, 1);
  assert.equal(result[0].billId, 'a1');
  assert.equal(result[0].txId, 1);
  assert.equal(result[0].billName, 'Cicilan Motor');
});

test('scanAllBillFallbackCandidates() — SKIP entri yang sudah ter-billLinkId', () => {
  const context = loadSandbox();
  const billsArchive = [{ id: 'a1', name: 'Listrik', amount: 200000, completedAt: '2026-07-20' }];
  const transactions = [
    { id: 1, type: 'expense', amount: 200000, note: 'Bayar: Listrik', date: '2026-07-20', billLinkId: 'a1' },
  ];
  const result = context.scanAllBillFallbackCandidates(billsArchive, transactions);
  assert.equal(result.length, 0);
});

test('scanAllBillFallbackCandidates() — SKIP entri ambigu (>1 kandidat) demi keamanan scan massal', () => {
  const context = loadSandbox();
  const billsArchive = [{ id: 'a1', name: 'Cicilan Motor', amount: 500000, completedAt: '2026-07-20' }];
  const transactions = [
    { id: 1, type: 'expense', amount: 500000, note: 'Bayar: Cicilan Motor unit A', date: '2026-07-19' },
    { id: 2, type: 'expense', amount: 500000, note: 'Bayar: Cicilan Motor unit B', date: '2026-07-21' },
  ];
  const result = context.scanAllBillFallbackCandidates(billsArchive, transactions);
  assert.equal(result.length, 0);
});

test('scanAllBillFallbackCandidates() — SKIP kalau tidak ada kandidat sama sekali', () => {
  const context = loadSandbox();
  const billsArchive = [{ id: 'a1', name: 'Netflix', amount: 54000, completedAt: '2026-07-20' }];
  const transactions = [{ id: 1, type: 'expense', amount: 999999, note: 'lain-lain', date: '2026-07-20' }];
  const result = context.scanAllBillFallbackCandidates(billsArchive, transactions);
  assert.equal(result.length, 0);
});

test('scanAllBillFallbackCandidates() — scan banyak entri sekaligus, campuran ter-link/belum/ambigu/tidak-ketemu', () => {
  const context = loadSandbox();
  const billsArchive = [
    { id: 'a1', name: 'Cicilan Motor', amount: 500000, completedAt: '2026-07-20' }, // valid
    { id: 'a2', name: 'Listrik', amount: 200000, completedAt: '2026-07-15' }, // sudah link
    { id: 'a3', name: 'Wifi', amount: 300000, completedAt: '2026-07-18' }, // ambigu
    { id: 'a4', name: 'Netflix', amount: 54000, completedAt: '2026-07-10' }, // tidak ketemu
  ];
  const transactions = [
    { id: 1, type: 'expense', amount: 500000, note: 'Bayar: Cicilan Motor', date: '2026-07-20' },
    { id: 2, type: 'expense', amount: 200000, note: 'Bayar: Listrik', date: '2026-07-15', billLinkId: 'a2' },
    { id: 3, type: 'expense', amount: 300000, note: 'Bayar: Wifi rumah', date: '2026-07-17' },
    { id: 4, type: 'expense', amount: 300000, note: 'Bayar: Wifi kantor', date: '2026-07-19' },
  ];
  const result = context.scanAllBillFallbackCandidates(billsArchive, transactions);
  assert.equal(result.length, 1);
  assert.equal(result[0].billId, 'a1');
});

test('scanAllBillFallbackCandidates() — billsArchive/transactions kosong -> array kosong (tidak error)', () => {
  const context = loadSandbox();
  assert.equal(context.scanAllBillFallbackCandidates([], []).length, 0);
  assert.equal(context.scanAllBillFallbackCandidates(null, null).length, 0);
});
