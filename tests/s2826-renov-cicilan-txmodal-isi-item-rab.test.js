'use strict';
// S2826 — cicilan dari form Transaksi boleh mengisi item RAB yang sudah ada (pilihan item hanya muncul untuk Cicilan).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

function el(extra) { return { style: {}, innerHTML: '', value: '', ...extra }; }
function mk(pay, checked, items) {
  const dom = {
    txRenovItemWrap: el(), txRenovItem: el(),
    txAddRenov: el({ checked }), txRenovProject: el({ value: '7' }),
  };
  const ctx = loadSource(['modules/finance/tx-renov.js'], {
    D: { renovProjects: [{ id: 7, name: 'Dapur', items }], accounts: [], categories: { expense: [] } },
    sameId: (a, b) => String(a) === String(b),
    uid: () => 1, escapeHtml: (x) => String(x),
    curPayMethod: pay,
    document: { getElementById: (id) => dom[id] || null },
  });
  return { ctx, dom };
}
const ITEMS = [
  { id: 'i1', name: 'Keramik', harga: 3000, paid: false },
  { id: 'i2', name: 'Lunas', harga: 10, paid: true },
  { id: 'i3', name: 'Bentukan bill', harga: 5, billLinkId: 9 },
];

test('S2826: Cicilan + panel dicentang -> dropdown hanya memuat item belum lunas non-bill', () => {
  const { ctx, dom } = mk('cicilan', true, ITEMS);
  ctx.updateTxRenovItemOptions();
  assert.equal(dom.txRenovItemWrap.style.display, 'block');
  assert.match(dom.txRenovItem.innerHTML, /Keramik/);
  assert.doesNotMatch(dom.txRenovItem.innerHTML, /Lunas|Bentukan/);
});

test('S2826: Cara bayar bukan Cicilan atau panel tak dicentang -> dropdown disembunyikan', () => {
  let r = mk('tunai', true, ITEMS); r.ctx.updateTxRenovItemOptions();
  assert.equal(r.dom.txRenovItemWrap.style.display, 'none');
  r = mk('cicilan', false, ITEMS); r.ctx.updateTxRenovItemOptions();
  assert.equal(r.dom.txRenovItemWrap.style.display, 'none');
});

test('S2826: proyek tanpa item yang memenuhi syarat -> disembunyikan', () => {
  const { ctx, dom } = mk('cicilan', true, [ITEMS[1], ITEMS[2]]);
  ctx.updateTxRenovItemOptions();
  assert.equal(dom.txRenovItemWrap.style.display, 'none');
});

test('S2826: sumber — renovItemLinkId masuk meta bill cicilan, setPayMethod menyegarkan dropdown, modal punya select', () => {
  const b = fs.readFileSync('modules/finance/transaksi-b.js', 'utf8');
  assert.match(b, /\.\.\.\(_txRenovItemPick\?\{renovItemLinkId:_txRenovItemPick\}:\{\}\)/);
  assert.match(fs.readFileSync('modules/finance/transaksi.js', 'utf8'), /updateTxRenovItemOptions\(\)/);
  const m = fs.readFileSync('modules/shared/modals.js', 'utf8');
  assert.match(m, /id=\\"txRenovItem\\"/);
  assert.match(m, /id=\\"txRenovProject\\" data-onchange=\\"updateTxRenovItemOptions\\"/);
});
