'use strict';
// AUDIT-BROWSER B6: simpan produk dari Etalase (koreksi stok / tambah stok / edit) tidak menulis ShopInventoryLedger
// -> rekonsiliasi MISMATCH vs stok. Kini 1 entri ledger dicatat dgn selisih stok yang benar-benar tersimpan.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = R('modules/shop/cobek-etalase.js');
const i = src.indexOf('{const _after=Number(product.stock)||0');
const j = src.indexOf('\n', src.indexOf('refId:product.id});}', i));
const block = src.slice(i, j + 1);

function run({ prevStock, newStock, isKoreksi, hargaBeli = 0, existingLedger = true }) {
  const product = { id: 'p1', name: 'Lumpang', stock: newStock };
  const ctx = { D: { products: [product] }, console };
  vm.createContext(ctx);
  vm.runInContext(R('modules/shop/shop-inventory-ledger.js') + ';this.L=ShopInventoryLedger;', ctx);
  if (existingLedger) ctx.L.record({ productId: 'p1', before: 0, after: prevStock, delta: prevStock, source: 'seed' });
  ctx.product = product; ctx.prevStock = prevStock; ctx.isKoreksi = isKoreksi; ctx.delta = newStock - prevStock; ctx.hargaBeli = hargaBeli;
  vm.runInContext(block, ctx);
  return ctx;
}

test('B6: blok ledger ada di Etalase.save sebelum cabang koreksi', () => {
  assert.ok(i > 0 && j > i);
  assert.ok(i < src.indexOf('if(isKoreksi&&delta!==0){'));
});

test('B6: koreksi stok 1 -> 0 menulis entri stock-correction & rekonsiliasi PASS', () => {
  const c = run({ prevStock: 1, newStock: 0, isKoreksi: true });
  const last = c.L.auditTrail('p1').slice(-1)[0];
  assert.strictEqual(last.source, 'stock-correction');
  assert.strictEqual(last.delta, -1);
  assert.strictEqual(c.L.reconcileProduct('p1', c.product).status, 'PASS');
});

test('B6: tambah stok dgn harga beli -> etalase-restock; tanpa harga beli -> etalase-edit', () => {
  assert.strictEqual(run({ prevStock: 2, newStock: 5, isKoreksi: false, hargaBeli: 100 }).L.auditTrail('p1').slice(-1)[0].source, 'etalase-restock');
  assert.strictEqual(run({ prevStock: 2, newStock: 5, isKoreksi: false }).L.auditTrail('p1').slice(-1)[0].source, 'etalase-edit');
});

test('B6: stok tidak berubah -> tidak ada entri baru', () => {
  const c = run({ prevStock: 3, newStock: 3, isKoreksi: false });
  assert.strictEqual(c.L.auditTrail('p1').length, 1);
});

test('B6: produk belum punya ledger -> entri pertama membawa openingStock = stok sebelum, rekonsiliasi PASS', () => {
  const c = run({ prevStock: 4, newStock: 1, isKoreksi: true, existingLedger: false });
  assert.strictEqual(c.L.auditTrail('p1')[0].openingStock, 4);
  assert.strictEqual(c.L.reconcileProduct('p1', c.product).status, 'PASS');
});
