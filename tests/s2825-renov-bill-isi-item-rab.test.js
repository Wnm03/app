'use strict';
// S2825 — pembayaran bill tertaut proyek bisa mengisi item RAB yang sudah ada (tanpa item baru / total dobel),
// + kategori bawaan "Renovasi" untuk bill tanpa kategori. Perilaku lama tanpa pilihan item tidak berubah.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

function mkCtx(items, extra) {
  let n = 1000;
  const txs = {};
  const base = {
    D: { renovProjects: [{ id: 7, name: 'Dapur', items }], accounts: [], categories: { expense: [{ id: 'cat_fd', name: 'Makanan' }, { id: 'cat_rv', name: 'Renovasi' }] } },
    sameId: (a, b) => String(a) === String(b),
    uid: () => ++n,
    escapeHtml: (x) => String(x),
    isRenovCatName: (c) => /renov/i.test(c || ''),
    FinanceTxSOT: {
      findById: (id) => txs[id] || null,
      patchMetaById: (id, m) => { Object.assign(txs[id], m); return true; },
    },
    ...extra,
  };
  return { ctx: loadSource(['modules/finance/tx-renov.js'], base), txs };
}

test('S2825: bill dengan renovItemLinkId mengisi item RAB yang ada, tidak membuat item baru', () => {
  const { ctx, txs } = mkCtx([{ id: 'i1', name: 'Keramik', harga: 3000, paid: false, payments: [] }]);
  txs[1] = { id: 1 };
  const bill = { id: 55, name: 'Cicilan keramik', kind: 'cicilan', amount: 1000, tenor: 3, renovProjectLinkId: 7, renovItemLinkId: 'i1' };
  const r = ctx.applyRenovBillPayment(bill, { id: 1, amount: 1000, date: '2026-11-01', accountId: 'a1', label: 'Cicilan ke-1' });
  const items = ctx.D.renovProjects[0].items;
  assert.equal(items.length, 1);
  assert.equal(r.itemId, 'i1');
  assert.equal(items[0].harga, 3000);
  assert.equal(items[0].payments.length, 1);
  assert.equal(items[0].paid, false);
  assert.equal(txs[1].renovItemLinkId, 'i1');
});

test('S2825: item RAB jadi lunas saat total pembayaran mencapai harga rencana; harga tidak berubah', () => {
  const { ctx, txs } = mkCtx([{ id: 'i1', name: 'Keramik', harga: 2000, paid: false, payments: [] }]);
  txs[1] = { id: 1 }; txs[2] = { id: 2 };
  const bill = { id: 55, name: 'Cicilan', kind: 'cicilan', amount: 1000, tenor: 2, renovProjectLinkId: 7, renovItemLinkId: 'i1' };
  ctx.applyRenovBillPayment(bill, { id: 1, amount: 1000, date: '2026-11-01', accountId: 'a1' });
  ctx.applyRenovBillPayment(bill, { id: 2, amount: 1000, date: '2026-12-01', accountId: 'a1' });
  const it = ctx.D.renovProjects[0].items[0];
  assert.equal(it.harga, 2000);
  assert.equal(it.paid, true);
  assert.equal(it.paidDate, '2026-12-01');
});

test('S2825: terbayar melebihi rencana menaikkan harga item (tak ada sisa negatif)', () => {
  const { ctx, txs } = mkCtx([{ id: 'i1', name: 'Cat', harga: 500, paid: false, payments: [] }]);
  txs[1] = { id: 1 };
  ctx.applyRenovBillPayment({ id: 9, name: 'Tagihan', kind: 'tagihan', amount: 800, renovProjectLinkId: 7, renovItemLinkId: 'i1' }, { id: 1, amount: 800, date: '2026-11-01', accountId: 'a1' });
  assert.equal(ctx.D.renovProjects[0].items[0].harga, 800);
});

test('S2825: item RAB lama model 1-transaksi (tanpa payments) tidak kehilangan pembayaran awalnya', () => {
  const { ctx, txs } = mkCtx([{ id: 'i1', name: 'Pintu', harga: 1000, paid: true, txId: 'old', paidDate: '2026-10-01', accountId: 'a1' }]);
  txs[1] = { id: 1 };
  ctx.applyRenovBillPayment({ id: 9, name: 'Tagihan', kind: 'tagihan', amount: 200, renovProjectLinkId: 7, renovItemLinkId: 'i1' }, { id: 1, amount: 200, date: '2026-11-01', accountId: 'a1' });
  const it = ctx.D.renovProjects[0].items[0];
  assert.equal(it.payments.length, 2);
  assert.equal(it.payments[0].txId, 'old');
  assert.equal(it.payments[0].amount, 1000);
});

test('S2825: item yang dipilih sudah dihapus -> kembali ke perilaku lama (1 item baru per bill)', () => {
  const { ctx, txs } = mkCtx([]);
  txs[1] = { id: 1 }; txs[2] = { id: 2 };
  const bill = { id: 55, name: 'Listrik proyek', kind: 'tagihan', amount: 300, renovProjectLinkId: 7, renovItemLinkId: 'hilang' };
  ctx.applyRenovBillPayment(bill, { id: 1, amount: 300, date: '2026-11-01', accountId: 'a1' });
  ctx.applyRenovBillPayment(bill, { id: 2, amount: 300, date: '2026-12-01', accountId: 'a1' });
  const items = ctx.D.renovProjects[0].items;
  assert.equal(items.length, 1);
  assert.equal(items[0].billLinkId, 55);
  assert.equal(items[0].payments.length, 2);
});

test('S2825: bill tanpa renovItemLinkId tetap membuat item bentukan bill (perilaku S2822)', () => {
  const { ctx, txs } = mkCtx([{ id: 'i1', name: 'Keramik', harga: 3000, payments: [] }]);
  txs[1] = { id: 1 };
  ctx.applyRenovBillPayment({ id: 55, name: 'Cicilan', kind: 'cicilan', amount: 500, tenor: 3, renovProjectLinkId: 7 }, { id: 1, amount: 500, date: '2026-11-01', accountId: 'a1' });
  assert.equal(ctx.D.renovProjects[0].items.length, 2);
  assert.equal(ctx.D.renovProjects[0].items[0].payments.length, 0);
});

test('S2825: renovBillDefaultCategory memilih kategori Renovasi; kosong bila tak ada', () => {
  assert.equal(mkCtx([]).ctx.renovBillDefaultCategory(), 'Renovasi');
  const { ctx } = mkCtx([], { D: { renovProjects: [], accounts: [], categories: { expense: [{ id: 'x', name: 'Makanan' }] } } });
  assert.equal(ctx.renovBillDefaultCategory(), '');
});

test('S2825: sumber — form tagihan menyimpan renovItemLinkId, modal punya select item, kategori fallback dipasang', () => {
  const kal = fs.readFileSync('modules/finance/tagihan-kalender.js', 'utf8');
  assert.match(kal, /renovItemLinkId:\(\(document\.getElementById\('billRenovProject'\)/);
  assert.match(kal, /_setBillRenovFields\(b\.renovProjectLinkId,b\.deductionOwnerId,b\.renovItemLinkId\)/);
  assert.match(kal, /renovBillDefaultCategory\(\)\)\|\|'Tagihan'/);
  assert.match(fs.readFileSync('modules/shared/modals.js', 'utf8'), /id=\\"billRenovItem\\"/);
});
