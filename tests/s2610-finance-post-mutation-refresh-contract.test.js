'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function between(source, startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start + startText.length);
  assert.ok(start >= 0 && end > start, `expected source range ${startText} -> ${endText}`);
  return source.slice(start, end);
}

test('S2610: transaction create/edit persists before post-commit finance.updated publication', () => {
  const tx = read('modules/finance/transaksi-b.js');
  const fn = between(tx, 'function _saveTxInner(', '\nfunction ');
  const save = fn.indexOf('save();');
  const refresh = fn.indexOf("refreshAfterMutation({domain:'finance',carNotes:true})");
  const event = fn.indexOf('AIBus.emit("finance.updated",_financePostCommitPayload)');
  assert.ok(save >= 0 && refresh > save && event > refresh, 'persist -> refresh -> event order must remain explicit');
});

test('S2610: transaction deletion removes through FinanceTxSOT, commits, saves, refreshes, then emits', () => {
  const tx = read('modules/finance/tx-list-cashflow.js');
  const fn = between(tx, 'async function delTx(id)', '\nfunction changeMonth(');
  const remove = fn.indexOf('FinanceTxSOT.removeById(id)');
  const commit = fn.indexOf('_deleteAtomic.commit()');
  const save = fn.indexOf('save();');
  const refresh = fn.indexOf('refreshAfterMutation({dashboard:true,finance:true})');
  const event = fn.indexOf("FinanceCrossEntityAtomic.emit('finance.updated'");
  assert.ok(remove >= 0 && commit > remove && save > commit && refresh > save && event > refresh);
});

test('S2610: finance-scoped refresh renders only the visible finance/dashboard surface', () => {
  const helpers = read('modules/shared/features-helpers-global-security.js');
  const fn = between(helpers, 'function refreshAfterMutation(opts)', 'function save(opts)');
  assert.match(fn, /if\(opts\.domain==='finance'\)/);
  assert.match(fn, /if\(isVisible\('page-keuangan'\)\)/);
  assert.match(fn, /else if\(isVisible\('page-dashboard'\)\)/);
  assert.match(fn, /renderKeuangan/);
  assert.match(fn, /renderDashboard/);
});

test('S2610: save invalidates FinanceIntelligence cache for finance mutations', () => {
  const helpers = read('modules/shared/features-helpers-global-security.js');
  assert.match(helpers, /_saveFinanceMutation[\s\S]{0,180}FinanceIntelligence\.invalidateCache\(\)/);
});

test('S2610: month navigation invalidates default-month cache before rerender', () => {
  const tx = read('modules/finance/tx-list-cashflow.js');
  const fn = between(tx, 'function changeMonth(dir)', '\nfunction ');
  const invalidate = fn.indexOf('FinanceIntelligence.invalidateCache()');
  const render = fn.indexOf('\nrenderKeuangan();');
  assert.ok(invalidate >= 0 && render > invalidate);
});

test('S2610: allocation stays read-only and locked; refresh/event contracts do not add a parallel finance engine', () => {
  const allocation = read('modules/finance/finance-allocation-api.js');
  assert.match(allocation, /actualFreeCashVerified:\s*false/);
  assert.match(allocation, /safeInvestableAmount:\s*null/);
  assert.match(allocation, /investmentAllowed:\s*false/);
  assert.doesNotMatch(allocation, /AIBus|FinanceEventOutbox|refreshAfterMutation|save\(/);
});
