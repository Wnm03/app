'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function setup(values) {
  const els = {};
  const get = (id) => (els[id] = els[id] || { value: values[id] === undefined ? '' : values[id], innerHTML: '', classList: { add() {}, remove() {} } });
  const doc = { getElementById: (id) => get(id) };
  const ctx = loadSource(
    ['modules/shop/cobek-pricing.js', 'modules/shop/profit-engine.js', 'modules/shop/delivery-plan-ui.js'],
    {
      document: doc,
      escapeHtml: (x) => String(x),
      fmt: (n) => 'Rp' + Math.round(n),
      openModal() {},
      TripEngine: { plan: () => ({ ok: false, reason: 'x' }), weight: () => ({ ok: false }), volume: () => ({ ok: false }) },
      D: { products: [{ id: 'p', name: 'P', hargaBeli: 20, hargaJual: 100 }], cobekKategori: [], bbmLogs: [], produsen: [], vehicles: [] },
    },
    ['DeliveryPlanUI'],
  );
  return { ctx, els, get };
}

test('blank qty: net profit box still renders and says "belum diisi" instead of Rp0', () => {
  const { ctx, els } = setup({ dpProduct: 'p', dpQty: '' });
  ctx.DeliveryPlanUI.calc();
  assert.match(els.dpSummaryBox.innerHTML, /Kuantitas belum diisi/);
  assert.match(els.dpNetProfitBox.innerHTML, /belum diisi/);
  // Hanya kalimat penjelasan ("bukan/sebagai/dianggap Rp0") yang boleh menyebut Rp0, bukan nilai tampilan.
  const shown = els.dpNetProfitBox.innerHTML.replace(/(bukan|sebagai|dianggap) Rp0/g, '');
  assert.ok(!/Rp0/.test(shown), shown);
});

test('explicit zero is shown as Rp0 while blank neighbours stay "belum diisi"', () => {
  const { ctx, els } = setup({ dpProduct: 'p', dpQty: '2', dpSellerDiscount: '0', dpUnitCost: '10' });
  ctx.DeliveryPlanUI.calc();
  const html = els.dpNetProfitBox.innerHTML;
  assert.match(html, /Penjualan neto: Rp200/);
  assert.match(html, /Belum diisi:/);
  assert.match(html, /admin marketplace/);
});
