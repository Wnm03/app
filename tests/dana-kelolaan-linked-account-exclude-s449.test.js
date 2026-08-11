'use strict';
// tests/dana-kelolaan-linked-account-exclude-s449.test.js — SESI 449
// (BUG-OWN-002 lanjutan, audit s448): sejak akun tertaut ke Buku Aset
// disinkron ke NILAI PENUH instrumen (bukan porsi SELF saja lagi, lihat
// aset.js), kalau ASET-nya dan AKUN tertautnya sama-sama ber-ownership
// non-SELF (mis. INVESTOR -- skenario nyata dilaporkan user: aset "Majoris"
// ownership Investor, ditautkan ke akun), DanaKelolaan.sumAccounts() bisa
// dobel-hitung: sekali dari sumAssets() (a.nilai), sekali lagi dari
// sumAccounts() (recalcAccBalance(akun tertaut) = a.nilai juga).
//
// Fix: sumAccounts() exclude akun yang ada di linkedAssetAccountIds() (pola
// sama persis totalSaldoAkun(), akun.js). Akun itu TETAP tampil normal di
// kartunya sendiri (Buku Akun) utk info saldo -- cuma dikecualikan dari
// AGREGAT Dana Kelolaan di sini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/finance/akun.js', 'modules/finance/dana-kelolaan.js'],
    { D },
    ['OwnershipEngine', 'DanaKelolaan', 'recalcAccBalance', 'linkedAssetAccountIds'],
  );
}

test('DanaKelolaan.sumAccounts() — akun tertaut ke Buku Aset (ownership INVESTOR) dikecualikan, tidak dobel-hitung dgn sumAssets()', () => {
  const D = {
    accounts: [
      { id: 'acc-majoris', name: 'Majoris (via Aset)', balance: 11100000, ownership: 'INVESTOR' },
      { id: 'acc-lain', name: 'Rek Investor Lain', balance: 2000000, ownership: 'INVESTOR' },
    ],
    assets: [
      { id: 'as-majoris', name: 'Majoris', nilai: 11100000, ownership: 'INVESTOR', accountId: 'acc-majoris' },
    ],
    transactions: [],
  };
  const ctx = makeCtx(D);
  // Akun 'acc-lain' TIDAK tertaut ke aset apa pun -> tetap ikut kehitung.
  // Akun 'acc-majoris' tertaut ke as-majoris -> dikecualikan (sudah kehitung
  // via sumAssets('INVESTOR') = 11100000 di modul lain).
  assert.equal(ctx.DanaKelolaan.sumAccounts('INVESTOR'), 2000000, 'akun tertaut ke Buku Aset harus dikecualikan dari agregat Dana Kelolaan');
});

test('DanaKelolaan.sumAccounts() — akun TIDAK tertaut aset apa pun tetap kehitung normal (0 regresi)', () => {
  const D = {
    accounts: [{ id: 'a1', name: 'Kas Investor', balance: 500000, ownership: 'INVESTOR' }],
    assets: [],
    transactions: [],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaKelolaan.sumAccounts('INVESTOR'), 500000);
});
