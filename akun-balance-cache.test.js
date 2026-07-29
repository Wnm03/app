'use strict';
// tests/akun-balance-cache.test.js — cakupan cache saldo per siklus render
// (recalcAccBalance()/totalSaldoAkun() di modules/finance/akun.js).
// Fokus: (1) hasil cache tetap benar/konsisten dgn hitungan manual, (2) cache
// kepakai lintas panggilan berulang (tidak recompute) selama belum di-
// invalidate, (3) invalidateAccBalCache() bikin hasil ikut data terbaru lagi.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    accounts: [
      { id: 'a1', name: 'Kas', baseBalance: 100000, includeInBalance: true },
      { id: 'a2', name: 'Bank', baseBalance: 500000, includeInBalance: true },
    ],
    transactions: [
      { accountId: 'a1', type: 'income', amount: 50000 },
      { accountId: 'a1', type: 'expense', amount: 20000 },
      { accountId: 'a2', type: 'transfer_in', amount: 10000 },
    ],
    assets: [],
  };
}

function makeCtx(D) {
  return loadSource(['modules/finance/akun.js'], { D }, ['_accBalCache', '_totalSaldoCache']);
}

test('recalcAccBalance() — hasil benar sesuai baseBalance + transaksi', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.recalcAccBalance('a1'), 130000); // 100000+50000-20000
  assert.equal(ctx.recalcAccBalance('a2'), 510000); // 500000+10000
});

test('totalSaldoAkun() — total = jumlah semua akun ter-include', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.totalSaldoAkun(), 640000);
});

test('cache dipakai ulang: ubah data TANPA invalidate -> hasil lama yg dipertahankan (by design)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.recalcAccBalance('a1'), 130000);
  // Mutasi "diam-diam" (simulasi burst render di tengah siklus yg sama)
  D.transactions.push({ accountId: 'a1', type: 'income', amount: 999999 });
  assert.equal(ctx.recalcAccBalance('a1'), 130000, 'masih baca cache lama karena belum di-invalidate (perilaku yang diharapkan dalam 1 siklus render)');
});

test('invalidateAccBalCache() — setelah invalidate, hasil ikut data terbaru', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.recalcAccBalance('a1'), 130000);
  D.transactions.push({ accountId: 'a1', type: 'income', amount: 999999 });
  ctx.invalidateAccBalCache();
  assert.equal(ctx.recalcAccBalance('a1'), 1129999);
});

test('totalSaldoAkun() cache juga ikut ke-invalidate bareng recalcAccBalance()', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.totalSaldoAkun(), 640000);
  D.accounts.push({ id: 'a3', name: 'Ewallet', baseBalance: 25000, includeInBalance: true });
  assert.equal(ctx.totalSaldoAkun(), 640000, 'masih cache lama sebelum invalidate');
  ctx.invalidateAccBalCache();
  assert.equal(ctx.totalSaldoAkun(), 665000);
});

test('akun includeInBalance:false / ditautkan ke aset tetap dikecualikan dari total (regresi logic lama)', () => {
  const D = makeD();
  D.accounts.push({ id: 'a3', name: 'Off', baseBalance: 999999, includeInBalance: false });
  const ctx = makeCtx(D);
  assert.equal(ctx.totalSaldoAkun(), 640000);
});

test('recalcAccBalance() untuk id yang tidak ada -> 0 (bukan lempar error), dan ikut dicache', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.recalcAccBalance('tidak_ada'), 0);
  assert.equal(ctx.recalcAccBalance('tidak_ada'), 0);
});
