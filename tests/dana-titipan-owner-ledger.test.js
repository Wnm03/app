'use strict';
// Read-only owner ledger: derive from existing transactions and returns.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function ctxFor(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D, uid: () => 'u1', save: () => {}, resolveTxOwnerSplitForAccount: () => ({ owners: [{ ownerId: 'o1' }] }), resolveTxOwnerAssignment: () => 'o1', escapeHtml: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

test('owner ledger combines direct titipan expenses, explicit owner-assigned account expenses, and returns', () => {
  const D = {
    assets: [], investments: [], investmentTx: [], debts: [], accounts: [{ id: 'acc1', name: 'Akun Renov' }],
    transactions: [
      { id: 't1', type: 'expense', amount: 100, date: '2026-01-02', titipanLinkId: 'o1', titipanPinjamUtang: true, category: 'Dana Titipan' },
      { id: 't2', type: 'expense', amount: 50, date: '2026-01-03', accountId: 'acc1', deductionOwnerId: 'o1', category: 'Renov', note: '<nota>' },
      { id: 't3', type: 'expense', amount: 999, date: '2026-01-04', titipanLinkId: 'o2' },
      { id: 't4', type: 'income', amount: 500, date: '2026-01-05', titipanLinkId: 'o1' },
    ],
    titipanReturns: [{ id: 'r1', ownerId: 'o1', amount: 25, returnDate: '2026-01-01', notes: 'kembali' }],
  };
  const ctx = ctxFor(D);
  const rows = ctx.DanaTitipanPortfolioAPI.getOwnerLedger('o1');
  assert.deepEqual(Array.from(rows, (r) => r.id), ['r1', 't1', 't2']);
  assert.equal(rows[1].kind, 'Pinjam (Utang)');
  assert.equal(rows[2].kind, 'Pengeluaran Akun Tertaut');
  assert.equal(rows[0].direction, 'in');
  assert.equal(rows[1].direction, 'out');
});

test('owner ledger does not duplicate transaction or add linked auto-debt as second cash event', () => {
  const D = {
    assets: [], investments: [], investmentTx: [],
    transactions: [{ id: 't1', type: 'expense', amount: 100, date: '2026-02-01', titipanLinkId: 'o1', titipanPinjamUtang: true }],
    debts: [{ id: 'd1', nilai: 100, autoTxId: 't1', autoTitipanOwnerId: 'o1' }],
    titipanReturns: [],
  };
  const ctx = ctxFor(D);
  const rows = ctx.DanaTitipanPortfolioAPI.getOwnerLedger('o1');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 't1');
});

test('owner ledger escapes user-controlled labels and keeps delete action for return history', () => {
  const D = {
    assets: [], investments: [], investmentTx: [], debts: [],
    transactions: [{ id: 't1', type: 'expense', amount: 10, date: '2026-03-01', titipanLinkId: 'o1', category: '<script>' }],
    titipanReturns: [{ id: 'r1', ownerId: 'o1', amount: 5, returnDate: '2026-03-02' }],
  };
  const ctx = ctxFor(D);
  const html = ctx.DanaTitipanPortfolioPresenter._ownerLedgerHtml('o1');
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /DanaTitipanReturnUI\.deleteEntry/);
});
