'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

test('presenter render tidak terkena TDZ settings dan tetap read-only', () => {
  const body = { innerHTML: '' };
  const D = { transactions: [{ id: 'tx1', accountId: 'a1', type: 'expense', amount: 10000, date: '2026-09-01', category: 'Makan' }], accounts: [{ id: 'a1', ownership: 'SELF' }] };
  const document = { getElementById(id) { return id === 'financialAudit30Body' ? body : null; } };
  const ctx = loadSource([
    'modules/finance/financial-audit-engine.js',
    'modules/finance/financial-audit-annotations.js',
    'modules/finance/financial-audit-presenter.js',
  ], {
    D,
    document,
    settings: {},
    fmt: n => String(n),
    escapeHtml: s => String(s),
    closeModal() {},
    setTimeout() {},
  }, ['FinancialAuditEngine', 'FinancialAuditAnnotations', 'FinancialAuditPresenter']);
  const before = JSON.stringify(D.transactions);
  assert.doesNotThrow(() => ctx.FinancialAuditPresenter.render());
  assert.match(body.innerHTML, /Audit bersifat informatif/);
  assert.equal(JSON.stringify(D.transactions), before);
});


test('dashboard insight menampilkan ringkasan audit tanpa mengubah transaksi', () => {
  const body = { innerHTML: '' };
  const D = {
    transactions: [
      { id: 'tx1', accountId: 'a1', type: 'expense', amount: 10000, date: '2026-09-01', category: 'Makan' },
      { id: 'tx2', accountId: 'a1', type: 'expense', amount: 20000, date: '2026-09-02', category: 'Makan' },
      { id: 'tx3', accountId: 'a1', type: 'income', amount: 100000, date: '2026-09-03', category: 'Gaji' },
    ],
    accounts: [{ id: 'a1', ownership: 'SELF' }],
  };
  const document = {
    getElementById(id) {
      if (id === 'financialAuditInsightBody') return body;
      return null;
    },
  };
  const ctx = loadSource([
    'modules/finance/financial-audit-engine.js',
    'modules/finance/financial-audit-annotations.js',
    'modules/finance/financial-audit-presenter.js',
  ], {
    D, document, settings: {}, fmt: n => String(n), escapeHtml: s => String(s),
  }, ['FinancialAuditEngine', 'FinancialAuditAnnotations', 'FinancialAuditPresenter']);
  const before = JSON.stringify(D.transactions);
  assert.doesNotThrow(() => ctx.FinancialAuditPresenter.renderDashboardInsight());
  assert.match(body.innerHTML, /Audit Keuangan Cepat/);
  assert.match(body.innerHTML, /30 hari terakhir/);
  assert.match(body.innerHTML, /\d+ ms|\d+,\d+ detik/);
  assert.match(body.innerHTML, /Buka/);
  assert.equal(JSON.stringify(D.transactions), before);
});
