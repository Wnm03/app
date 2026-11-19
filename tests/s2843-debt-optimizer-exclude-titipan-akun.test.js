'use strict';
// S2843 — Debt Optimizer: entri "Dana titipan akun" (linkedAccountId, TitipanSync) bukan kewajiban yg perlu strategi pelunasan
// (bunga/cicilan 0, tanpa jatuh tempo) -> exclude dari DebtStrategy.activeDebts(), sama seperti linkedAssetId (S455) & linkedInvestmentId (S460).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const FILES = ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js', 'modules/asset/investasi.js', 'modules/finance/piutang-utang.js', 'modules/finance/akun.js', 'modules/finance/titipan-sync.js'];
function mk(debts, accounts) {
  const D = { accounts: accounts || [], transactions: [], assets: [], investments: [], investmentTx: [], investmentWatchlist: [], bills: [], cobek: [], piutang: [], debts, renovProjects: [] };
  return loadSource(FILES, { D, uid: () => 'u', save: () => {}, todayStr: () => '2026-11-10', escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n), sameId: (a, b) => String(a) === String(b) }, ['Debt', 'DebtStrategy']);
}
const DEBTS = () => [
  { id: 'd0', name: 'KTA', nilai: 3000000, bunga: 10, cicilanBulanan: 250000, lunas: false },
  { id: 'dA', name: 'Investor', nilai: 4700000, bunga: 0, cicilanBulanan: 0, lunas: false, linkedAccountId: 'a3', linkedOwnerId: 'INVESTOR' },
  { id: 'dB', name: 'Bu Ani', nilai: 300000, bunga: 0, cicilanBulanan: 0, lunas: false, linkedAccountId: 'a6', linkedOwnerId: 'ani' },
  { id: 'dC', name: 'Aset', nilai: 100, lunas: false, linkedAssetId: 'x' },
];
test('activeDebts: hanya utang riil; semua entri titipan (aset/investasi/akun) dikecualikan', () => {
  const c = mk(DEBTS());
  assert.deepEqual(c.DebtStrategy.activeDebts().map((d) => d.id), ['d0']);
});
test('computeOrder/strategi tidak memuat entri titipan akun', () => {
  const c = mk(DEBTS());
  const ord = c.DebtStrategy.computeOrder(c.DebtStrategy.activeDebts(), 'avalanche');
  assert.ok(Array.isArray(ord) && ord.length === 1 && ord[0].id === 'd0');
});
test('entri titipan akun TETAP ada di D.debts (histori/daftar Buku Utang tidak berubah)', () => {
  const D = DEBTS();
  const c = mk(D);
  c.DebtStrategy.activeDebts();
  assert.equal(c.D.debts.length, 4);
});
test('Debt.totalValue tidak terpengaruh perubahan ini (akun SELF berporsi tetap dihitung)', () => {
  const c = mk(DEBTS(), [{ id: 'a6', includeInBalance: true, owners: [{ ownerId: 'SELF', porsi: 70 }, { ownerId: 'ani', porsi: 30 }] }, { id: 'a3', includeInBalance: true, ownership: 'INVESTOR' }]);
  assert.equal(c.Debt.totalValue(), 3000000 + 300000);
});
