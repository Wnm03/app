'use strict';
// S2845 — keputusan n: apa pun yang bukan porsi SELF bukan pengeluaran pribadi. Transaksi yang dipotong dari porsi pemilik
// non-SELF (deductionOwnerId; mis. tagihan titipan dibayar dari akun SELF) dikeluarkan dari basis pribadi; basis fisik tetap lengkap.
// + goalSourceDebt tidak lagi memuat utang "Dana titipan akun" (linkedAccountId).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const FILES = ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js', 'modules/asset/investasi.js', 'modules/finance/piutang-utang.js', 'modules/finance/akun.js', 'modules/finance/titipan-sync.js'];
const TODAY = '2026-11-10';
function mk(D) {
  Object.assign(D, { assets: [], investments: [], investmentTx: [], investmentWatchlist: [], bills: [], cobek: [], piutang: [], debts: D.debts || [], renovProjects: [] });
  return loadSource(FILES, { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {}, todayStr: () => TODAY, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n), sameId: (a, b) => String(a) === String(b) },
    ['Debt', 'TitipanSync']);
}
const ACC = [{ id: 'a1', name: 'BRI', includeInBalance: true, baseBalance: 0 }];
const OWNERS = [{ ownerId: 'o_self', ownerName: 'Saya', isSelf: true }, { ownerId: 'o_home', ownerName: 'home in', isSelf: false }];
const TX = [
  { id: 1, type: 'expense', amount: 100000, accountId: 'a1', date: TODAY, category: 'Makan' },
  { id: 2, type: 'expense', amount: 212000, accountId: 'a1', date: TODAY, category: 'Tagihan', deductionOwnerId: 'o_home' },
  { id: 3, type: 'expense', amount: 50000, accountId: 'a1', date: TODAY, category: 'Makan', deductionOwnerId: 'o_self' },
  { id: 4, type: 'expense', amount: 70000, accountId: 'a1', date: TODAY, category: 'Makan', deductionOwnerId: 'SELF' },
];
function ctx() {
  const c = mk({ accounts: JSON.parse(JSON.stringify(ACC)), transactions: JSON.parse(JSON.stringify(TX)) });
  c.isAliranKlien = () => false;
  c.renovAccountOwners = () => OWNERS;
  return c;
}
test('isAliranKlienSafe: deductionOwnerId pemilik non-SELF = bukan pribadi; kosong/SELF/pemilik isSelf = pribadi', () => {
  const c = ctx();
  assert.equal(c.isAliranKlienSafe(TX[0]), false);
  assert.equal(c.isAliranKlienSafe(TX[1]), true);
  assert.equal(c.isAliranKlienSafe(TX[2]), false);
  assert.equal(c.isAliranKlienSafe(TX[3]), false);
});
test('badge klien murni TIDAK ikut tercemar penanda pemilik', () => {
  const c = ctx();
  assert.equal(c.isAliranKlienOnlySafe(TX[1]), false);
  assert.equal(c.akunPunyaAliranKlienSafe('a1'), false);
});
test('laporanTotalsSafe: pengeluaran pribadi tanpa porsi pemilik lain; fisik tetap lengkap', () => {
  const c = ctx();
  const F = { tipe: 'semua', kat: 'semua', sub: 'semua', acc: 'semua', method: 'semua', proyek: 'semua', sumber: 'semua', classification: 'semua' };
  const from = new Date(2026, 10, 1), to = new Date(2026, 10, 30, 23, 59, 59);
  const r = c.laporanTotalsSafe(c.D.transactions, F, from, to, 'pribadi');
  assert.equal(r.exp, 220000);
  assert.equal(r.expFisik, 432000);
});
test('goalSourceDebt: utang titipan akun (linkedAccountId) tidak jadi goal; utang biasa tetap', () => {
  const g = loadSource(['lifeos/adapters/goal-adapter.js'], {}, ['goalSourceDebt']);
  const out = g.goalSourceDebt({ debts: [
    { id: 'd1', name: 'KTA', nilai: 3000000 },
    { id: 'd2', name: 'Dana titipan akun BRI', nilai: 304482, linkedAccountId: 'a1' },
  ] });
  assert.deepEqual(out.map((x) => x.sourceId), ['d1']);
});

test('laporanTotalsSafe: titipanKeluar = pengeluaran porsi pemilik lain; klien murni tidak ikut', () => {
  const c = ctx();
  const F = { tipe: 'semua', kat: 'semua', sub: 'semua', acc: 'semua', method: 'semua', proyek: 'semua', sumber: 'semua', classification: 'semua' };
  const r = c.laporanTotalsSafe(c.D.transactions, F, new Date(2026, 10, 1), new Date(2026, 10, 30, 23, 59, 59), 'pribadi');
  assert.equal(r.titipanKeluar, 212000);
  assert.equal(r.klienKeluar, 0);
});
test('adaTxTitipanPemilikSafe & titipanPemilikBulanSafe & cache pemilik (1 pencarian per akun per putaran sinkron)', () => {
  const c = ctx();
  let calls = 0;
  c.renovAccountOwners = () => { calls++; return OWNERS; };
  assert.equal(c.adaTxTitipanPemilikSafe(), true);
  assert.equal(c.titipanPemilikBulanSafe(2026, 10), 212000);
  assert.equal(c.titipanPemilikBulanSafe(2026, 9), 0);
  assert.equal(calls, 1, 'owners akun a1 dicari sekali, bukan per transaksi');
});
test('adaAkunBukanPribadiSafe: true bila ada transaksi titipan pemilik lain walau semua akun SELF', () => {
  const c = ctx();
  assert.equal(c.adaAkunBukanPribadiSafe(), true);
});
