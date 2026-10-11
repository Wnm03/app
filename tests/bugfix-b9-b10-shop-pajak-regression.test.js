'use strict';
// B9: total/profit kasir Shop (cobek-tx-cart & cobek-order) tidak boleh dipengaruhi ongkir/diskon negatif atau > subtotal.
// B10: Zakat/PPh21/UMKM membandingkan bulan/tahun sebagai tanggal kalender (stabil lintas TZ).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('B9 sumber: ongkir dijepit >=0 & finite di kedua jalur kasir', () => {
  for (const f of ['modules/shop/cobek-order.js', 'modules/shop/cobek-tx-cart.js']) {
    const s = rd(f);
    assert.match(s, /Number\.isFinite\(_ongkirN\)\?Math\.max\(0,_ongkirN\):0/, f);
    assert.doesNotMatch(s, /const ongkir=parseFloat\([^)]*\)\|\|0;/, f);
  }
  assert.match(rd('modules/shop/cobek-tx-cart.js'), /Math\.min\(Math\.max\(0,_diskonN\),Math\.max\(0,subtotal\)\)/);
});

test('B9 perilaku: computeTxShopSaleTotals — diskon>subtotal, diskon negatif, ongkir negatif', () => {
  const src = rd('modules/shop/cobek-tx-cart.js') +
    ';return {compute:computeTxShopSaleTotals,setCart:(v)=>{curTxShopSaleCart=v;}}';
  const run = (diskon, ongkir) => {
    const els = { txShopSaleDiskon: { value: diskon }, txShopSaleOngkir: { value: ongkir } };
    const D = { products: [{ id: 'p1', hargaBeli: 6000, name: 'X' }], cobek: [] };
    const api = new Function('document', 'D', src)({ getElementById: (id) => els[id] || null }, D);
    api.setCart([{ productId: 'p1', qty: 2, harga: 10000 }]); // subtotal 20.000, modal 12.000
    return api.compute();
  };
  let r = run('50000', '0');     // diskon > subtotal -> dijepit 20.000
  assert.equal(r.diskon, 20000); assert.equal(r.total, 0); assert.equal(r.profit, -12000);
  r = run('-5000', '0');         // diskon negatif -> 0
  assert.equal(r.diskon, 0); assert.equal(r.total, 20000); assert.equal(r.profit, 8000);
  r = run('0', '-7000');         // ongkir negatif -> 0
  assert.equal(r.ongkir, 0); assert.equal(r.total, 20000);
  r = run('1000', '3000');       // normal tidak berubah
  assert.equal(r.total, 22000); assert.equal(r.profit, 7000);
});

test('B10 sumber: tanpa new Date(t.date) untuk bulan/tahun di pajak-pbb-zakat', () => {
  const s = rd('modules/finance/pajak-pbb-zakat.js');
  assert.doesNotMatch(s, /new Date\(t\.date\)/);
  assert.equal((s.match(/slice\(0,7\)===_ym/g) || []).length, 2);
});
