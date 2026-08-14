'use strict';
// tests/s603-holding-linked-account-networth-doublecount.test.js — SESI S603
// (lanjutan S601-3/S602, audit lanjutan "skenario Majoris").
//
// S602 (tests/s602-holding-account-porsi-riwayat-hint.test.js) sudah benerin
// TAMPILAN renderAccGrid() supaya akun yang ditautkan LANGSUNG ke Holding
// Investasi (dropdown "🔗 Hubungkan ke Akun", `h.accountId`, S601-3) dapat
// badge/porsi/hint riwayat yang sama seperti akun tertaut ke Buku Aset. TAPI
// fix S602 itu HANYA menyentuh renderAccGrid() (murni presentasi, reuse
// findLinkedHoldingForAccount() terpisah) -- linkedAssetAccountIds() sendiri
// (akun.js) TIDAK ikut diperbaiki, dan fungsi itu HANYA baca D.assets[].accountId.
//
// Dampaknya BUKAN cuma tampilan: linkedAssetAccountIds() dipakai
// totalSaldoAkun() (akun.js), DanaKelolaan.sumAccounts() (dana-kelolaan.js),
// quickToggleInclude()/hint modal accModal -- SEMUA konsumen ini gagal
// mengecualikan akun yang ditautkan langsung ke Holding, sehingga nilai
// Holding kehitung 2x di Kekayaan Bersih/Financial Freedom (yang keduanya
// reuse totalSaldoAkun() via Kekayaan.currentNetWorth()/FI.assetFund()):
// sekali dari totalSaldoAkun() (saldo akun tertaut), sekali lagi dari
// Investment.selfOwnedTotalValue()/FI.investmentAssetValue() (nilai holding-nya
// sendiri).
//
// Fix: linkedAssetAccountIds() sekarang union dengan
// Investment.getHoldings()[].accountId (100% REUSE sumber data S601-3, guard
// typeof Investment sama pola isAccOwnershipSelf()/DanaKelolaan dkk). SATU
// titik fix ini otomatis menutup totalSaldoAkun(), DanaKelolaan.sumAccounts(),
// quickToggleInclude(), dan hint accModal sekaligus (semua reuse fungsi yang
// sama) -- lihat test masing-masing di bawah.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/akun.js', 'modules/finance/dana-kelolaan.js'],
    { D, sameId: (a, b) => String(a) === String(b) },
    ['OwnershipEngine', 'MultiOwnerEngine', 'Investment', 'DanaKelolaan', 'linkedAssetAccountIds', 'isAccLinkedToAsset', '_accBalCache', '_totalSaldoCache'],
  );
}

function baseD(overrides) {
  return Object.assign({ assets: [], investments: [], investmentTx: [], accounts: [], transactions: [], ownerRegistry: [] }, overrides);
}

test('linkedAssetAccountIds() — union akun tertaut Holding (h.accountId) DAN akun tertaut Aset (a.accountId), 0 regresi', () => {
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah', nilai: 500000, accountId: 'acc-aset' }],
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc-holding' }],
    accounts: [
      { id: 'acc-aset', name: 'Rek Tanah', baseBalance: 500000, includeInBalance: true },
      { id: 'acc-holding', name: 'Majoris', baseBalance: 10000000, includeInBalance: true },
      { id: 'acc-biasa', name: 'Dompet Kas', baseBalance: 100000, includeInBalance: true },
    ],
  });
  const ctx = makeCtx(D);
  const linked = ctx.linkedAssetAccountIds();
  assert.equal(linked.has('acc-aset'), true, 'akun tertaut Aset harus tetap masuk (0 regresi)');
  assert.equal(linked.has('acc-holding'), true, 'akun tertaut LANGSUNG ke Holding sekarang harus ikut masuk');
  assert.equal(linked.has('acc-biasa'), false, 'akun biasa tidak boleh ikut masuk');
});

test('totalSaldoAkun() — skenario Majoris: akun tertaut langsung ke Holding TIDAK boleh dobel-hitung dengan nilai Holding-nya', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc-holding' }],
    accounts: [
      { id: 'acc-kas', name: 'Kas', baseBalance: 100000, includeInBalance: true },
      { id: 'acc-holding', name: 'Majoris', baseBalance: 10000000, includeInBalance: true },
    ],
  });
  const ctx = makeCtx(D);
  // SEBELUM fix: totalSaldoAkun() = 100000 + 10000000 = 10100000 (akun holding
  // ikut kehitung, padahal nilai 10jt-nya SUDAH direpresentasikan sendiri lewat
  // Investment.selfOwnedTotalValue() di Kekayaan.currentNetWorth()).
  // SESUDAH fix: akun tertaut Holding dikecualikan penuh, sama seperti akun
  // tertaut Aset (pola S422c) -- hasilnya cuma Kas.
  assert.equal(ctx.totalSaldoAkun(), 100000, 'akun tertaut Holding harus dikecualikan penuh dari Total Saldo Akun, persis akun tertaut Aset');
});

test('DanaKelolaan.sumAccounts() — akun tertaut Holding non-SELF tidak boleh dobel-hitung dengan sumInvestasi()', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Reksa Dana Titipan', accountId: 'acc-holding', ownership: 'INVESTOR' }],
    accounts: [
      { id: 'acc-lain', name: 'Rek Investor Lain', baseBalance: 2000000, ownership: 'INVESTOR', includeInBalance: true },
      { id: 'acc-holding', name: 'Reksa Dana Titipan', baseBalance: 5000000, ownership: 'INVESTOR', includeInBalance: true },
    ],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaKelolaan.sumAccounts('INVESTOR'), 2000000, 'akun tertaut Holding harus dikecualikan dari agregat Dana Kelolaan (sudah kehitung via sumInvestasi())');
});

test('isAccLinkedToAsset() — akun tertaut langsung ke Holding sekarang dikenali (dipakai hint modal & quickToggleInclude)', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc-holding' }],
    accounts: [{ id: 'acc-holding', name: 'Majoris', baseBalance: 10000000, includeInBalance: true }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.isAccLinkedToAsset('acc-holding'), true, 'hint "ditautkan dari Buku Aset" & proteksi quickToggleInclude() harus berlaku juga utk akun tertaut Holding');
});

test('linkedAssetAccountIds() — Investment modul belum dimuat (guard typeof) tetap aman, fallback ke perilaku lama', () => {
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah', nilai: 500000, accountId: 'acc-aset' }],
    accounts: [{ id: 'acc-aset', name: 'Rek Tanah', baseBalance: 500000, includeInBalance: true }],
  });
  // load TANPA investasi.js -- Investment jadi undefined di sandbox.
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/finance/akun.js'],
    { D },
    ['OwnershipEngine', 'linkedAssetAccountIds'],
  );
  const linked = ctx.linkedAssetAccountIds();
  assert.equal(linked.has('acc-aset'), true, 'tanpa modul Investment, exclude akun tertaut Aset tetap jalan normal (0 error)');
});
