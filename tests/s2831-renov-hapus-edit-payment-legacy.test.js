'use strict';
// S2831 — hapus/edit transaksi item Renovasi lama (txId) yang sudah dimigrasi ke payments[] tidak boleh meninggalkan payment yatim.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

function mk() {
  const txs = {};
  const D = { renovProjects: [{ id: 7, name: 'Dapur', items: [] }], transactions: [], accounts: [] };
  let n = 100;
  const ctx = loadSource(['modules/finance/tx-renov.js', 'modules/home/renovasi.js'], {
    D, sameId: (a, b) => String(a) === String(b), uid: () => ++n, escapeHtml: (s) => String(s), fmt: (x) => String(x), fmtFull: (x) => String(x),
    toast: () => {}, save: () => true, closeModal: () => {}, openModal: () => {}, todayStr: () => '2026-11-15',
    FinanceTxSOT: { findById: (id) => txs[id] || null, patchMetaById: (id, m) => { Object.assign(txs[id], m); return true; }, removeById: (id) => { delete txs[id]; return true; } },
  }, ['Renov']);
  return { ctx, txs, D };
}
function seed() {
  const m = mk();
  const it = { id: 50, name: 'Keramik', harga: 1000, paid: true, txId: 1, paidDate: '2026-11-01', tglBayar: '2026-11-01', accountId: 'a1' };
  m.D.renovProjects[0].items.push(it);
  m.txs[1] = { id: 1, amount: 1000, renovProjectLinkId: 7, renovItemLinkId: 50 };
  m.txs[2] = { id: 2, amount: 500 };
  m.ctx.applyRenovBillPayment({ id: 9, name: 'Tambahan', kind: 'tagihan', renovProjectLinkId: 7, renovItemLinkId: 50 }, { id: 2, amount: 500, date: '2026-11-10', accountId: 'a1' });
  return { ...m, it };
}

test('S2831: hapus tx asli item legacy setelah migrasi payments[] -> tidak ada payment yatim', () => {
  const { ctx, txs, it } = seed();
  assert.equal(it.payments.length, 2);
  ctx.Renov.onLinkedTxDeleted(txs[1]); delete txs[1];
  assert.equal(it.payments.length, 1);
  assert.equal(it.payments[0].txId, 2);
  assert.equal(ctx._renovItemPaidAmount(it), 500);
  assert.equal(it.paid, false);
  assert.equal(it.txId, null);
});

test('S2831: edit nominal tx asli item legacy memperbarui payment-nya', () => {
  const { ctx, txs, it } = seed();
  txs[1].amount = 800; txs[1].date = '2026-11-02'; txs[1].accountId = 'a1';
  ctx.Renov.onLinkedTxEdited(txs[1]);
  assert.equal(it.payments.find((x) => x.txId === 1).amount, 800);
  assert.equal(ctx._renovItemPaidAmount(it), 1300);
});

test('S2831: jalur lama tetap — hapus payment ber-renovPaymentId & item tanpa payments[]', () => {
  const { ctx, txs, it } = seed();
  const pid = it.payments.find((x) => x.txId === 2).id;
  txs[2].renovProjectLinkId = 7; txs[2].renovItemLinkId = 50; txs[2].renovPaymentId = pid;
  ctx.Renov.onLinkedTxDeleted(txs[2]);
  assert.equal(it.payments.length, 1);
  assert.equal(it.payments[0].txId, 1);
  const m = mk();
  const plain = { id: 60, harga: 300, paid: true, txId: 9 };
  m.D.renovProjects[0].items.push(plain);
  m.ctx.Renov.onLinkedTxDeleted({ id: 9, renovProjectLinkId: 7, renovItemLinkId: 60 });
  assert.equal(plain.paid, false); assert.equal(plain.txId, null);
});

test('S2831: _renovSetStat hanya satu definisi', () => {
  const src = fs.readFileSync('modules/home/renovasi.js', 'utf8');
  assert.equal((src.match(/function _renovSetStat\(/g) || []).length, 1);
});
