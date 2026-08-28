'use strict';
// tests/tx-hitungkas-toggle-s-t1.test.js — Sesi T1 (AUDIT-hitung-kas-toggle-dan-
// ringkasan-tagihan.md, RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-kas.md).
// Cakupan: guard baru di recalcAccBalance() (akun.js) yang skip transaksi
// bertanda hitungKas:false. Cabang UI/form (transaksi.js, baca DOM) di luar
// scope harness pure-logic ini (lihat catatan loadSource.js) -- diverifikasi
// manual/E2E terpisah.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    accounts: [
      { id: 'a1', name: 'Kas', baseBalance: 100000, includeInBalance: true },
    ],
    transactions: [],
    assets: [],
  };
}

function makeCtx(D) {
  return loadSource(['modules/finance/akun.js'], { D }, ['_accBalCache', '_totalSaldoCache']);
}

test('recalcAccBalance() — transaksi hitungKas:false SKIP dari saldo akun', () => {
  const D = makeD();
  D.transactions.push({ accountId: 'a1', type: 'income', amount: 50000 }); // dihitung
  D.transactions.push({ accountId: 'a1', type: 'expense', amount: 20000, hitungKas: false }); // catatan saja
  const ctx = makeCtx(D);
  assert.equal(ctx.recalcAccBalance('a1'), 150000, '100000+50000, pengeluaran hitungKas:false diabaikan');
});

test('recalcAccBalance() — transaksi TANPA field hitungKas (absen) tetap dihitung normal (backward-compat)', () => {
  const D = makeD();
  D.transactions.push({ accountId: 'a1', type: 'income', amount: 50000 });
  D.transactions.push({ accountId: 'a1', type: 'expense', amount: 20000 });
  const ctx = makeCtx(D);
  assert.equal(ctx.recalcAccBalance('a1'), 130000, '0 regresi ke transaksi lama tanpa field ini');
});

test('recalcAccBalance() — hitungKas:true eksplisit tetap dihitung normal', () => {
  const D = makeD();
  D.transactions.push({ accountId: 'a1', type: 'income', amount: 50000, hitungKas: true });
  const ctx = makeCtx(D);
  assert.equal(ctx.recalcAccBalance('a1'), 150000);
});

test('recalcAccBalance() — semua transaksi hitungKas:false -> saldo = baseBalance apa adanya', () => {
  const D = makeD();
  D.transactions.push({ accountId: 'a1', type: 'income', amount: 999999, hitungKas: false });
  D.transactions.push({ accountId: 'a1', type: 'expense', amount: 5000, hitungKas: false });
  const ctx = makeCtx(D);
  assert.equal(ctx.recalcAccBalance('a1'), 100000);
});
