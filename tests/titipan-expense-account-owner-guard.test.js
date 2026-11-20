'use strict';
// Guard akun-pemilik pada form Pengeluaran Dana Titipan (temuan e2e 2026-11-20).
// _accountOwnerMismatch memakai aturan SAMA dgn TitipanReconcile.checkTransactionOwnerRefs.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function build(resolver) {
  const ctx = loadSource(['modules/finance/titipan-expense-ui.js'], {
    D: { accounts: [], transactions: [] },
    resolveOwnerDefaultForAccount: resolver,
    escapeHtml: (x) => String(x),
  });
  const ui = ctx.TitipanExpenseUI;
  ui._draft = [
    { ownerId: 'o1', ownerName: 'renov', selected: true, porsi: null },
    { ownerId: 'o2', ownerName: 'home in', selected: false, porsi: null },
  ];
  return ui;
}

test('akun SELF + owner renov -> mismatch ["renov"]', () => {
  const ui = build(() => ({ ok: true, owners: [{ ownerId: 'SELF' }] }));
  assert.equal(JSON.stringify(ui._accountOwnerMismatch('acc_cash', [{ ownerId: 'o1' }])), JSON.stringify(['renov']));
});
test('akun milik owner -> tidak mismatch', () => {
  const ui = build(() => ({ ok: true, owners: [{ ownerId: 'o1' }, { ownerId: 'o2' }] }));
  assert.equal(JSON.stringify(ui._accountOwnerMismatch('acc_bri', [{ ownerId: 'o1' }, { ownerId: 'o2' }])), JSON.stringify([]));
});
test('akun tanpa pemilik (source none) / resolver gagal -> aman []', () => {
  assert.equal(JSON.stringify(build(() => ({ ok: true, owners: [] }))._accountOwnerMismatch('a', [{ ownerId: 'o1' }])), JSON.stringify([]));
  assert.equal(JSON.stringify(build(() => { throw new Error('x'); })._accountOwnerMismatch('a', [{ ownerId: 'o1' }])), JSON.stringify([]));
  assert.equal(JSON.stringify(build(() => ({ ok: true, owners: [{ ownerId: 'SELF' }] }))._accountOwnerMismatch('', [{ ownerId: 'o1' }])), JSON.stringify([]));
});
