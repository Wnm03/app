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
