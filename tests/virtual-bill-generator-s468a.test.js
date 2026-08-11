'use strict';
// tests/virtual-bill-generator-s468a.test.js — cakupan generateVirtualBillItemsForMonth()
// (modules/finance/tagihan-kalender.js), eksekusi sesi s468a dari
// s468-PLAN-virtual-bill-item-tx-list.md. Fungsi PURE (tidak sentuh DOM/D.transactions),
// jadi dites langsung lewat loadSource tanpa fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(['modules/finance/tagihan-kalender.js'], {
    D,
    BILLCAL_MAX_ITER: 1000,
  });
}

function baseD(bills, transactions) {
  return { bills: bills || [], billsArchive: [], transactions: transactions || [], accounts: [] };
}

test('generateVirtualBillItemsForMonth() — bill bulanan belum dibayar muncul sbg item virtual', () => {
  const D = baseD([
    { id: 'b1', name: 'Listrik', category: 'Tagihan', amount: 150000, nextDue: '2026-08-05', freq: 'bulanan', kind: 'tagihan' },
  ]);
  const ctx = makeCtx(D);
  const out = ctx.generateVirtualBillItemsForMonth(2026, 7); // Agustus = index 7
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'vbill_b1_202607');
  assert.equal(out[0].billId, 'b1');
  assert.equal(out[0].virtual, true);
  assert.equal(out[0].amount, 150000);
});

test('generateVirtualBillItemsForMonth() — bill yang sudah dibayar periode ini di-exclude', () => {
  const D = baseD(
    [{ id: 'b1', name: 'Listrik', category: 'Tagihan', amount: 150000, nextDue: '2026-08-05', freq: 'bulanan', kind: 'tagihan' }],
    [{ id: 't1', billLinkId: 'b1', date: '2026-08-01', amount: 150000 }],
  );
  const ctx = makeCtx(D);
  const out = ctx.generateVirtualBillItemsForMonth(2026, 7);
  assert.equal(out.length, 0, 'bill yg sudah ada histori pembayaran periode ini tidak boleh jadi item virtual');
});

test('generateVirtualBillItemsForMonth() — bill di D.billsArchive tidak pernah ikut (tidak ada di D.bills)', () => {
  const D = baseD([]);
  D.billsArchive = [{ id: 'b2', name: 'Cicilan Lunas', amount: 500000, nextDue: '2026-08-05', freq: 'bulanan' }];
  const ctx = makeCtx(D);
  const out = ctx.generateVirtualBillItemsForMonth(2026, 7);
  assert.equal(out.length, 0, 'bill arsip (sudah lunas) tidak boleh ikut ter-generate');
});

test('generateVirtualBillItemsForMonth() — nominal shared pakai b.amount (porsi), bukan b.totalAmount', () => {
  const D = baseD([
    {
      id: 'b3', name: 'Internet Bareng', category: 'Tagihan', amount: 75000, totalAmount: 150000,
      shared: true, sharedPct: 50, nextDue: '2026-08-10', freq: 'bulanan', kind: 'tagihan',
    },
  ]);
  const ctx = makeCtx(D);
  const out = ctx.generateVirtualBillItemsForMonth(2026, 7);
  assert.equal(out.length, 1);
  assert.equal(out[0].amount, 75000, 'nominal virtual item harus porsi user (b.amount), bukan b.totalAmount');
  assert.equal(out[0].shared, true);
});

test('generateVirtualBillItemsForMonth() — freq mingguan tetap dapat occurrence yang benar', () => {
  const D = baseD([
    { id: 'b4', name: 'Langganan Mingguan', category: 'Tagihan', amount: 20000, nextDue: '2026-08-03', freq: 'mingguan', kind: 'tagihan' },
  ]);
  const ctx = makeCtx(D);
  const out = ctx.generateVirtualBillItemsForMonth(2026, 7);
  assert.ok(out.length >= 1, 'bill mingguan dgn occurrence di bulan Agustus harus tergenerate');
  assert.equal(out[0].id, 'vbill_b4_202607');
});

test('generateVirtualBillItemsForMonth() — freq tahunan tetap dapat occurrence yang benar', () => {
  const D = baseD([
    { id: 'b5', name: 'Asuransi Tahunan', category: 'Tagihan', amount: 1200000, nextDue: '2026-08-15', freq: 'tahunan', kind: 'tagihan' },
  ]);
  const ctx = makeCtx(D);
  const out = ctx.generateVirtualBillItemsForMonth(2026, 7);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'vbill_b5_202607');
});

test('generateVirtualBillItemsForMonth() — bill tanpa occurrence di bulan target tidak muncul', () => {
  const D = baseD([
    { id: 'b6', name: 'Listrik', category: 'Tagihan', amount: 150000, nextDue: '2026-09-05', freq: 'bulanan', kind: 'tagihan' },
  ]);
  const ctx = makeCtx(D);
  const out = ctx.generateVirtualBillItemsForMonth(2026, 7); // Agustus, bill mulai September
  assert.equal(out.length, 0);
});

test('generateVirtualBillItemsForMonth() — tidak menyentuh D.transactions/D.bills sama sekali (pure)', () => {
  const D = baseD([
    { id: 'b1', name: 'Listrik', category: 'Tagihan', amount: 150000, nextDue: '2026-08-05', freq: 'bulanan', kind: 'tagihan' },
  ]);
  const before = JSON.stringify(D);
  const ctx = makeCtx(D);
  ctx.generateVirtualBillItemsForMonth(2026, 7);
  assert.equal(JSON.stringify(D), before, 'fungsi harus PURE, tidak mutasi D sama sekali');
});
