'use strict';
// S2827 — edit cicilan lewat form Transaksi bisa mengganti item RAB tertaut (paritas dengan form Tagihan, S2825).
// Berlaku untuk pembayaran BERIKUTNYA; pembayaran yang sudah tercatat tetap di item lamanya.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

function el(extra) { return { style: {}, innerHTML: '', value: '', ...extra }; }
function mk(items, { pay = 'cicilan', checked = true, proj = '7', wrapShown = true } = {}) {
  const dom = {
    txRenovItemWrap: el(), txRenovItem: el(),
    txAddRenov: el({ checked }), txRenovProject: el({ value: proj }),
  };
  const ctx = loadSource(['modules/finance/tx-renov.js'], {
    D: { renovProjects: [{ id: 7, name: 'Dapur', items }, { id: 8, name: 'Kamar', items: [] }], accounts: [], categories: { expense: [] } },
    sameId: (a, b) => String(a) === String(b),
    uid: () => 1, escapeHtml: (x) => String(x),
    curPayMethod: pay,
    document: { getElementById: (id) => dom[id] || null },
  });
  if (wrapShown) dom.txRenovItemWrap.style.display = 'block';
  return { ctx, dom };
}
const ITEMS = [
  { id: 'i1', name: 'Keramik', harga: 3000, paid: false },
  { id: 'i2', name: 'Lunas', harga: 10, paid: true },
  { id: 'i3', name: 'Bentukan bill', harga: 5, billLinkId: 9 },
];

test('S2827: preset item tertaut ikut dimuat (walau lunas / bentukan bill) dan terpilih', () => {
  const { ctx, dom } = mk(ITEMS);
  ctx.updateTxRenovItemOptions('i2');
  assert.equal(dom.txRenovItemWrap.style.display, 'block');
  assert.match(dom.txRenovItem.innerHTML, /Lunas/);
  assert.equal(dom.txRenovItem.value, 'i2');
  assert.match(dom.txRenovItem.innerHTML, /Keramik/);
  assert.doesNotMatch(dom.txRenovItem.innerHTML, /Bentukan/);
  ctx.updateTxRenovItemOptions('i3');
  assert.match(dom.txRenovItem.innerHTML, /Bentukan/);
  assert.equal(dom.txRenovItem.value, 'i3');
});

test('S2827: preset ke item yang sudah dihapus diabaikan (jatuh ke "item baru otomatis")', () => {
  const { ctx, dom } = mk(ITEMS);
  ctx.updateTxRenovItemOptions('hilang');
  assert.equal(dom.txRenovItem.value, '');
});

test('S2827: tanpa preset perilaku S2826 tidak berubah (item lunas/bill tidak dimuat)', () => {
  const { ctx, dom } = mk(ITEMS);
  ctx.updateTxRenovItemOptions();
  assert.doesNotMatch(dom.txRenovItem.innerHTML, /Lunas|Bentukan/);
});

test('S2827: applyTxRenovBillItemChange mengganti renovItemLinkId bill', () => {
  const { ctx, dom } = mk(ITEMS);
  ctx.updateTxRenovItemOptions('i3');
  dom.txRenovItem.value = 'i1';
  const bill = { id: 5, renovProjectLinkId: 7, renovItemLinkId: 'i3' };
  assert.equal(ctx.applyTxRenovBillItemChange(bill), true);
  assert.equal(bill.renovItemLinkId, 'i1');
});

test('S2827: memilih "Buat item baru otomatis" melepas tautan item pada bill', () => {
  const { ctx, dom } = mk(ITEMS);
  ctx.updateTxRenovItemOptions('i1');
  dom.txRenovItem.value = '';
  const bill = { id: 5, renovProjectLinkId: 7, renovItemLinkId: 'i1' };
  assert.equal(ctx.applyTxRenovBillItemChange(bill), true);
  assert.equal('renovItemLinkId' in bill, false);
});

test('S2827: tidak berubah bila pilihan sama, dropdown tersembunyi, panel tak dicentang, atau proyek beda', () => {
  let r = mk(ITEMS); r.ctx.updateTxRenovItemOptions('i1');
  let bill = { id: 5, renovProjectLinkId: 7, renovItemLinkId: 'i1' };
  assert.equal(r.ctx.applyTxRenovBillItemChange(bill), false);
  assert.equal(bill.renovItemLinkId, 'i1');

  r = mk(ITEMS, { wrapShown: false }); r.dom.txRenovItem.value = '';
  bill = { id: 5, renovProjectLinkId: 7, renovItemLinkId: 'i1' };
  r.dom.txRenovItemWrap.style.display = 'none';
  assert.equal(r.ctx.applyTxRenovBillItemChange(bill), false);
  assert.equal(bill.renovItemLinkId, 'i1');

  r = mk(ITEMS, { checked: false }); r.dom.txRenovItem.value = 'i1';
  bill = { id: 5, renovProjectLinkId: 7, renovItemLinkId: 'i3' };
  assert.equal(r.ctx.applyTxRenovBillItemChange(bill), false);

  r = mk(ITEMS, { proj: '8' }); r.dom.txRenovItem.value = 'i1';
  bill = { id: 5, renovProjectLinkId: 7, renovItemLinkId: 'i3' };
  assert.equal(r.ctx.applyTxRenovBillItemChange(bill), false);
  assert.equal(bill.renovItemLinkId, 'i3');

  r = mk(ITEMS); r.dom.txRenovItem.value = 'i1';
  assert.equal(r.ctx.applyTxRenovBillItemChange({ id: 6 }), false); // bill tak tertaut proyek
  assert.equal(r.ctx.applyTxRenovBillItemChange(null), false);
});

test('S2827: pilihan ke item yang tak ada di proyek tidak dipakai', () => {
  const { ctx, dom } = mk(ITEMS);
  ctx.updateTxRenovItemOptions('i1');
  dom.txRenovItem.value = 'asing';
  const bill = { id: 5, renovProjectLinkId: 7, renovItemLinkId: 'i1' };
  assert.equal(ctx.applyTxRenovBillItemChange(bill), true);
  assert.equal('renovItemLinkId' in bill, false); // diperlakukan sebagai kosong, bukan id asing
});

test('S2827: sumber — editTx mengisi preset dari bill, cabang edit cicilan memanggil applyTxRenovBillItemChange', () => {
  const t = fs.readFileSync('modules/finance/transaksi.js', 'utf8');
  assert.match(t, /updateTxRenovItemOptions\(linkedBill\.renovItemLinkId\)/);
  const b = fs.readFileSync('modules/finance/transaksi-b.js', 'utf8');
  assert.match(b, /applyTxRenovBillItemChange\(existingBill\)/);
  assert.match(fs.readFileSync('modules/shared/modals.js', 'utf8'), /id=\\"txRenovItemHint\\"/);
});
