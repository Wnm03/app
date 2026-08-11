'use strict';
// tests/ownership-sync-akun.test.js — cakupan Sesi 192 (Ownership Sync — Akun
// & Keuangan) khusus bagian Akun Uang (modules/finance/akun.js).
//
// Target: isAccOwnershipSelf() (helper baru, reuse OwnershipEngine) &
// totalSaldoAkun() (SATU baris filter tambahan, 0 logic lama diubah — lihat
// tests/akun-balance-cache.test.js utk regresi logic lama includeInBalance/
// linked-to-asset yang WAJIB tetap PASS apa adanya).
//
// RULE yang dites di sini:
//   - SELF (eksplisit atau default/tanpa field ownership) -> dihitung normal.
//   - INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY -> DIKECUALIKAN dari totalSaldoAkun()
//     (Saldo Kas), TAPI recalcAccBalance() per-akun TETAP jalan normal (saldo
//     individual akun tsb tidak "dihapus", cuma tidak ikut ke total).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    accounts: [
      { id: 'a1', name: 'Kas Pribadi', baseBalance: 100000, includeInBalance: true }, // tanpa ownership -> default SELF
      { id: 'a2', name: 'Tabungan', baseBalance: 500000, includeInBalance: true, ownership: 'SELF' },
      { id: 'a3', name: 'Modal Investor', baseBalance: 1000000, includeInBalance: true, ownership: 'INVESTOR' },
      { id: 'a4', name: 'Dana Customer', baseBalance: 250000, includeInBalance: true, ownership: 'customer' }, // lowercase, harus dinormalisasi
      { id: 'a5', name: 'Titipan Keluarga', baseBalance: 300000, includeInBalance: true, ownership: 'FAMILY' },
      { id: 'a6', name: 'Titipan Pihak Ketiga', baseBalance: 400000, includeInBalance: true, ownership: 'THIRD_PARTY' },
    ],
    transactions: [],
    assets: [],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/finance/akun.js'],
    { D },
    ['OwnershipEngine', '_accBalCache', '_totalSaldoCache']
  );
}

test('isAccOwnershipSelf() — akun tanpa field ownership -> true (default SELF)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isAccOwnershipSelf(D.accounts[0]), true);
});

test('isAccOwnershipSelf() — akun ownership eksplisit SELF -> true', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isAccOwnershipSelf(D.accounts[1]), true);
});

test('isAccOwnershipSelf() — INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY -> false', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isAccOwnershipSelf(D.accounts[2]), false); // INVESTOR
  assert.equal(ctx.isAccOwnershipSelf(D.accounts[3]), false); // customer (lowercase)
  assert.equal(ctx.isAccOwnershipSelf(D.accounts[4]), false); // FAMILY
  assert.equal(ctx.isAccOwnershipSelf(D.accounts[5]), false); // THIRD_PARTY
});

test('totalSaldoAkun() — HANYA akun SELF (eksplisit/default) yang masuk total', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // 100000 (a1, default SELF) + 500000 (a2, SELF) = 600000
  // a3 (INVESTOR) + a4 (CUSTOMER) + a5 (FAMILY) + a6 (THIRD_PARTY) dikecualikan.
  assert.equal(ctx.totalSaldoAkun(), 600000);
});

test('recalcAccBalance() per-akun TETAP normal utk akun non-SELF (histori/transaksi tidak hilang)', () => {
  const D = makeD();
  D.transactions.push({ accountId: 'a3', type: 'income', amount: 50000 });
  const ctx = makeCtx(D);
  // Saldo individual akun INVESTOR tetap kehitung normal (1000000+50000).
  assert.equal(ctx.recalcAccBalance('a3'), 1050000);
  // Tapi TIDAK ikut ke total (masih 600000, sesuai test sebelumnya).
  assert.equal(ctx.totalSaldoAkun(), 600000);
});

test('totalSaldoAkun() — akun non-SELF yg includeInBalance:false tetap dikecualikan (double-exclude, tidak crash/dobel kurang)', () => {
  const D = makeD();
  D.accounts[2].includeInBalance = false; // a3 INVESTOR, sekaligus includeInBalance false
  const ctx = makeCtx(D);
  assert.equal(ctx.totalSaldoAkun(), 600000);
});

test('totalSaldoAkun() — kalau OwnershipEngine tidak dimuat, fallback true (tidak exclude apa pun, regresi lama tetap jalan)', () => {
  const D = makeD();
  // Load HANYA akun.js (tanpa ownership-engine.js) — simulasi urutan load lama/belum ada engine.
  const ctx = loadSource(['modules/finance/akun.js'], { D }, ['_accBalCache', '_totalSaldoCache']);
  // Semua 6 akun ikut dihitung krn OwnershipEngine undefined -> isAccOwnershipSelf() selalu true.
  assert.equal(ctx.totalSaldoAkun(), 100000 + 500000 + 1000000 + 250000 + 300000 + 400000);
});

test('invalidateAccBalCache() — totalSaldoAkun() dgn filter ownership tetap ikut ter-invalidate normal', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.totalSaldoAkun(), 600000);
  D.accounts.push({ id: 'a7', name: 'Kas Baru', baseBalance: 10000, includeInBalance: true }); // SELF default
  assert.equal(ctx.totalSaldoAkun(), 600000, 'masih cache lama sebelum invalidate');
  ctx.invalidateAccBalCache();
  assert.equal(ctx.totalSaldoAkun(), 610000);
});
