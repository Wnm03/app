'use strict';
// S2766 — FinanceTxSOT.patchMetaById: satu-satunya gateway tulis metadata tautan transaksi
// (renov/sewa kios/wishlist/bill/tukang). Menolak field finansial; undefined = hapus field.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  const D = { transactions: [{ id: 5, type: 'expense', amount: 1000, accountId: 'a', category: 'Zzz-Tak-Dikenal' }] };
  return { D, ctx: loadSource(['modules/finance/finance-tx-sot.js'], { D }) };
}

test('patchMetaById: set & hapus field tautan tanpa memicu kanonikalisasi kategori', () => {
  const { D, ctx } = makeCtx();
  ctx.FinanceTxSOT.patchMetaById('5', { renovProjectLinkId: 9, renovItemLinkId: 3 });
  assert.equal(D.transactions[0].renovProjectLinkId, 9);
  ctx.FinanceTxSOT.patchMetaById(5, { renovProjectLinkId: undefined, renovItemLinkId: undefined });
  assert.equal('renovProjectLinkId' in D.transactions[0], false);
  assert.equal(D.transactions[0].category, 'Zzz-Tak-Dikenal');
});

test('patchMetaById: menolak field finansial/taksonomi', () => {
  const { ctx } = makeCtx();
  for (const k of ['amount', 'accountId', 'category', 'type', 'date', 'id']) {
    assert.throws(() => ctx.FinanceTxSOT.patchMetaById(5, { [k]: 1 }), /FINANCE_TX_META_FIELD_FORBIDDEN/);
  }
});

test('patchMetaById: id tidak ada -> null, tanpa efek', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.FinanceTxSOT.patchMetaById(999, { billLinkId: 1 }), null);
});
