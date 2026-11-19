'use strict';
// S2842 — (A) transaksi akun non-SELF (investor/titipan penuh) bukan pemasukan/pengeluaran pribadi di laporan;
//         (B) utang "Dana titipan akun" milik akun yang SUDAH dikeluarkan dari totalSaldoAkun() tidak boleh memotong Kekayaan Bersih lagi.
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
const ACC = [
  { id: 'a1', name: 'Dompet', includeInBalance: true, baseBalance: 0 },
  { id: 'a3', name: 'Dana Investor', includeInBalance: true, baseBalance: 0, ownership: 'INVESTOR' },
  { id: 'a5', name: 'Hidden', includeInBalance: false, baseBalance: 0 },
];
const TX = [
  { id: 1, type: 'income', amount: 3000000, accountId: 'a1', date: TODAY, category: 'Gaji' },
  { id: 2, type: 'income', amount: 5000000, accountId: 'a3', date: TODAY, category: 'Pemasukan Lain' },
  { id: 3, type: 'expense', amount: 300000, accountId: 'a3', date: TODAY, category: 'Makan' },
  { id: 4, type: 'expense', amount: 500000, accountId: 'a1', date: TODAY, category: 'Makan' },
];
test('(A) isAliranKlienSafe: transaksi di akun non-SELF dikecualikan dari agregat pribadi; akun SELF & tanpa akun tidak', () => {
  const c = mk({ accounts: JSON.parse(JSON.stringify(ACC)), transactions: JSON.parse(JSON.stringify(TX)) });
  c.isAliranKlien = () => false;
  assert.equal(c.isAliranKlienSafe(TX[0]), false);
  assert.equal(c.isAliranKlienSafe(TX[1]), true);
  assert.equal(c.isAliranKlienSafe({ type: 'income', amount: 1 }), false);
});
test('(A) badge/aliran klien murni TIDAK ikut membesar oleh akun non-SELF', () => {
  const c = mk({ accounts: JSON.parse(JSON.stringify(ACC)), transactions: JSON.parse(JSON.stringify(TX)) });
  c.isAliranKlien = () => false;
  assert.equal(c.isAliranKlienOnlySafe(TX[1]), false);
  assert.equal(c.akunPunyaAliranKlienSafe('a3'), false);
});
test('(A) laporanTotalsSafe: basis pribadi tanpa akun non-SELF; fisik tetap lengkap; klienMasuk tak tercemar', () => {
  const c = mk({ accounts: JSON.parse(JSON.stringify(ACC)), transactions: JSON.parse(JSON.stringify(TX)) });
  c.isAliranKlien = () => false;
  const F = { tipe: 'semua', kat: 'semua', sub: 'semua', acc: 'semua', method: 'semua', proyek: 'semua', sumber: 'semua', classification: 'semua' };
  const from = new Date(2026, 10, 1), to = new Date(2026, 10, 30, 23, 59, 59);
  const r = c.laporanTotalsSafe(c.D.transactions, F, from, to, 'pribadi');
  assert.equal(r.inc, 3000000); assert.equal(r.exp, 500000);
  assert.equal(r.incFisik, 8000000); assert.equal(r.expFisik, 800000);
  assert.equal(r.klienMasuk, 0); assert.equal(r.klienKeluar, 0);
  const f = c.laporanTotalsSafe(c.D.transactions, F, from, to, 'fisik');
  assert.equal(f.inc, 8000000);
});
test('(B) Debt.totalValue: utang titipan akun ber-ownership non-SELF / di luar saldo TIDAK dihitung; akun SELF berporsi pemilik lain tetap dihitung', () => {
  const D = { accounts: [
    { id: 'a3', name: 'Dana Investor', includeInBalance: true, ownership: 'INVESTOR' },
    { id: 'a5', name: 'Hidden', includeInBalance: false },
    { id: 'a6', name: 'Patungan', includeInBalance: true, owners: [{ ownerId: 'SELF', porsi: 70 }, { ownerId: 'ani', porsi: 30, ownerName: 'Bu Ani' }] }],
    transactions: [], debts: [
      { id: 'd1', name: 'Investor', nilai: 4700000, lunas: false, linkedAccountId: 'a3', linkedOwnerId: 'INVESTOR' },
      { id: 'd2', name: 'Hidden titip', nilai: 1000000, lunas: false, linkedAccountId: 'a5', linkedOwnerId: 'ani' },
      { id: 'd3', name: 'Bu Ani', nilai: 300000, lunas: false, linkedAccountId: 'a6', linkedOwnerId: 'ani' },
      { id: 'd0', name: 'KTA', nilai: 2000000, lunas: false }] };
  const c = mk(D);
  assert.equal(c.Debt.totalValue(), 2300000 /* KTA + titipan akun a6 saja */);
});
test('(B) entry utang tetap ada di D.debts (histori tidak dihapus)', () => {
  const D = { accounts: [{ id: 'a3', includeInBalance: true, ownership: 'INVESTOR' }], transactions: [], debts: [{ id: 'd1', nilai: 100, lunas: false, linkedAccountId: 'a3' }] };
  const c = mk(D);
  assert.equal(c.Debt.totalValue(), 0);
  assert.equal(D.debts.length, 1);
});
