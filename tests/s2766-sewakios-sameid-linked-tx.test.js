'use strict';
// S2766 — SewaKios.applyPaymentLink / onLinkedTxEdited / onLinkedTxDeleted harus
// membandingkan id lewat sameId() (String(a)===String(b)), bukan ===. id dari
// uid() bisa NUMBER sementara id yang melewati DOM/JSON bisa STRING (pola bug s447).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(['modules/finance/finance-tx-sot.js', 'modules/business/sewakios.js'], {
    D,
    sameId: (a, b) => String(a) === String(b),
    uid: () => 'r' + Math.random().toString(36).slice(2),
    renderDashboardSewaKiosReminder: () => {},
  });
}

test('applyPaymentLink: txId bertipe string tetap menemukan transaksi ber-id number', () => {
  const unit = { id: 7, riwayat: [] };
  const tx = { id: 123, date: '2026-11-01', amount: 250000 };
  const D = { sewaKios: { units: [unit] }, transactions: [tx] };
  const ctx = makeCtx(D);
  ctx.SewaKios.render = () => {};
  ctx.SewaKios.pendingUnitId = '7';
  ctx.SewaKios.applyPaymentLink('123');
  assert.equal(unit.riwayat.length, 1);
  assert.equal(unit.riwayat[0].jumlah, 250000);
  assert.equal(tx.sewaKiosLinkId, 7);
});

test('onLinkedTxEdited / onLinkedTxDeleted: id campur string/number tetap tersinkron', () => {
  const unit = { id: '7', riwayat: [{ id: 'x', tanggal: '2026-11-01', jumlah: 100, txId: '123' }] };
  const tx = { id: 123, date: '2026-11-05', amount: 300000, sewaKiosLinkId: 7 };
  const D = { sewaKios: { units: [unit] }, transactions: [tx] };
  const ctx = makeCtx(D);
  ctx.SewaKios.render = () => {};
  ctx.SewaKios.onLinkedTxEdited(tx);
  assert.equal(unit.riwayat[0].jumlah, 300000);
  assert.equal(unit.riwayat[0].tanggal, '2026-11-05');
  ctx.SewaKios.onLinkedTxDeleted(tx);
  assert.equal(unit.riwayat.length, 0);
});
