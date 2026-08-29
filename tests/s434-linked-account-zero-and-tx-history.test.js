'use strict';
/**
 * s434-linked-account-zero-and-tx-history.test.js — audit 2 laporan user:
 *
 * (1) "Riwayat transaksi tidak muncul saat akun diklik" — showFilteredTx()
 *     (modules/finance/filter-laporan.js) scope 'account' mencocokkan
 *     t.accountId===accId pakai strict equality. Kalau salah satu sisi
 *     angka & sisi lain string (mis. id dari data lama/import), match
 *     selalu gagal walau transaksinya benar-benar ada -> riwayat kosong.
 *     FIX: ganti ke sameId() (helper global, String(a)===String(b)).
 *
 * (2) "Nominal akun tertaut selalu 0" — waktu itu dianggap SUDAH BENAR
 *     secara hitungan (MultiOwnerEngine.selfOwnedValue() SENGAJA cuma kasih
 *     porsi Milik Sendiri, supaya tidak dobel hitung sama Buku Aset), FIX
 *     awalnya cuma nambah catatan penjelas di openActionsMenu().
 *     SESI 449 (BUG-OWN-002 lanjutan, audit s448): keputusan itu DIREVISI --
 *     akun tertaut sekarang disinkron ke NILAI PENUH instrumen (bukan porsi
 *     SELF saja), exclude dobel-hitung tetap terjamin oleh totalSaldoAkun()
 *     (linkedAssetAccountIds(), independen dari nilai field ini). openActionsMenu()
 *     sekarang tampilkan recalcAccBalance(linkedAcc.id) apa adanya (nilai
 *     penuh), tidak lagi selfOwnedValue()/catatan "porsi Milik Sendiri".
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(initial = {}) {
  return { innerHTML: '', textContent: '', style: {}, ...initial };
}

test('showFilteredTx(scope=account) — accId number vs t.accountId string tetap match (pakai sameId)', () => {
  const els = {
    filterTxTitle: makeEl(),
    filterTxSummary: makeEl(),
    filterTxList: makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {} }),
  };
  const fakeDoc = {
    getElementById: (id) => els[id] || null,
    createElement: () => makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {}, dataset: {}, querySelector: () => makeEl() }),
  };
  const D = {
    transactions: [
      { id: 't1', accountId: '501', type: 'income', amount: 50000, date: '2026-08-01' },
      { id: 't2', accountId: 501, type: 'expense', amount: 20000, date: '2026-08-02' },
      { id: 't3', accountId: '999', type: 'income', amount: 10000, date: '2026-08-03' },
    ],
  };
  const ctx = loadSource(['modules/finance/filter-laporan.js'], {
    document: fakeDoc,
    D,
    sameId: (a, b) => String(a) === String(b),
    fmt: (n) => 'Rp' + n,
    txHTML: (t) => `<div data-id="${t.id}"></div>`,
    curMonth: 7,
    curYear: 2026,
    openModal: () => {},
  });
  // accId dipanggil sbg angka (501), t.accountId di data ada yg string '501'
  // & ada yg angka 501 -- keduanya HARUS match dgn sameId().
  ctx.showFilteredTx('account', 'all', 'Akun Test', 501);
  assert.equal(els.filterTxList.innerHTML.includes('data-id="t1"'), true, 't1 (accountId string "501") harus ikut match');
  assert.equal(els.filterTxList.innerHTML.includes('data-id="t2"'), true, 't2 (accountId number 501) harus ikut match');
  assert.equal(els.filterTxList.innerHTML.includes('data-id="t3"'), false, 't3 (accountId beda, "999") tidak boleh ikut');
  assert.equal(els.filterTxSummary.textContent.includes('2 transaksi'), true, 'summary harus hitung 2 transaksi yg match');
});

test('showFilteredTx(scope=account) — regresi: accId & accountId sama-sama string tetap match', () => {
  const els = {
    filterTxTitle: makeEl(),
    filterTxSummary: makeEl(),
    filterTxList: makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {} }),
  };
  const fakeDoc = {
    getElementById: (id) => els[id] || null,
    createElement: () => makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {}, dataset: {}, querySelector: () => makeEl() }),
  };
  const D = {
    transactions: [
      { id: 't1', accountId: 'acc_abc', type: 'expense', amount: 5000, date: '2026-08-01' },
    ],
  };
  const ctx = loadSource(['modules/finance/filter-laporan.js'], {
    document: fakeDoc,
    D,
    sameId: (a, b) => String(a) === String(b),
    fmt: (n) => 'Rp' + n,
    txHTML: (t) => `<div data-id="${t.id}"></div>`,
    curMonth: 7,
    curYear: 2026,
    openModal: () => {},
  });
  ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc_abc');
  assert.equal(els.filterTxList.innerHTML.includes('data-id="t1"'), true);
});

test('openActionsMenu() — SESI 449: akun tertaut menampilkan saldo PENUH (recalcAccBalance apa adanya), bukan porsi Milik Sendiri saja', () => {
  const els = {
    assetActionsTitle: makeEl(),
    assetActionsMeta: makeEl(),
    assetActionsList: makeEl(),
  };
  const fakeDoc = {
    getElementById: (id) => els[id] || null,
  };
  const asset = { id: 'a1', name: 'Rumah Kontrakan', jenis: 'Rumah/Bangunan', nilai: 1000000, accountId: 'acc1', owners: [{ ownerId: 'SELF', porsi: 30, ownerName: 'Milik Sendiri', isSelf: true }, { ownerId: 'inv1', porsi: 70, ownerName: 'Investor A', isSelf: false }] };
  const D = { assets: [asset], accounts: [{ id: 'acc1', name: 'BCA Sewa', balance: 1000000 }] };
  // akun tertaut (S449) disinkron ke nilai PENUH instrumen -- mock ini mewakili
  // recalcAccBalance() nyata (akun.js) yg baca dari balance/transaksi.
  const recalcAccBalance = (accId) => {
    const acc = D.accounts.find((a) => a.id === accId);
    return acc ? (acc.balance || 0) : 0;
  };
  const ctx = loadSource(['modules/asset/aset-owners.js', 'modules/asset/aset.js'], {
    document: fakeDoc,
    D,
    sameId: (a, b) => String(a) === String(b),
    fmt: (n) => 'Rp' + n,
    escapeHtml: (s) => s,
    recalcAccBalance,
    openQS: () => {},
  }, ['Aset']);
  ctx.Aset.openActionsMenu('a1');
  const meta = els.assetActionsMeta.innerHTML;
  assert.equal(meta.includes('BCA Sewa'), true, 'nama akun tertaut harus tetap tampil');
  assert.equal(meta.includes('Rp1000000'), true, 'saldo penuh akun tertaut (bukan porsi Milik Sendiri) harus tampil');
});
