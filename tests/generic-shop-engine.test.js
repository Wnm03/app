'use strict';
// tests/generic-shop-engine.test.js — cakupan modules/shop/generic/*.js
// (Generic Shop Engine Tahap 1, lanjutan AUDIT-PRA-IMPLEMENTASI-GENERIC-
// SHOP-ENGINE.md + ARSITEKTUR-SHOP-ENGINE-GENERIC.md). Semua 6 file generic
// delegasi ke Etalase/PurchaseEngine/InventoryEngine/ProfitEngine
// (cobek-etalase.js/purchase-engine.js/inventory-engine.js/profit-engine.js)
// — harness perlu memuat semuanya, pola sama tests/inventory-engine.test.js
// / tests/profit-engine.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/shop/purchase-engine.js',
      'modules/shop/inventory-engine.js',
      'modules/shop/profit-engine.js',
      'modules/shop/generic/category-store.js',
      'modules/shop/generic/supplier-store.js',
      'modules/shop/generic/attribute-store.js',
      'modules/shop/generic/product-store.js',
      'modules/shop/generic/pricing-service.js',
      'modules/shop/generic/inventory-service.js',
      'modules/shop/generic/product-repository.js',
    ],
    { D: D || { products: [], cobekKategori: [], produsen: [], bbmLogs: [] } },
    ['CategoryStore', 'SupplierStore', 'AttributeStore', 'ProductStore', 'PricingService', 'InventoryService', 'ProductRepository'],
  );
}

// --- CategoryStore ----------------------------------------------------

test('CategoryStore.list()/find()/label() — baca D.cobekKategori apa adanya', () => {
  const D = { products: [], produsen: [], cobekKategori: [{ id: 'k1', name: 'Kecil' }] };
  const ctx = makeCtx(D);
  assert.deepEqual(ctx.CategoryStore.list(), D.cobekKategori);
  assert.equal(ctx.CategoryStore.find('k1').name, 'Kecil');
  assert.equal(ctx.CategoryStore.find('ghost'), null);
  assert.equal(ctx.CategoryStore.label('k1'), 'Kecil');
  assert.equal(ctx.CategoryStore.label('ghost'), '');
});

test('CategoryStore — D belum ada -> array kosong, tidak throw', () => {
  const ctx = loadSource(['modules/shop/generic/category-store.js'], {}, ['CategoryStore']);
  assert.deepEqual(Array.from(ctx.CategoryStore.list()), []);
});

// --- SupplierStore ------------------------------------------------------

test('SupplierStore.list()/find()/label() — baca D.produsen apa adanya', () => {
  const D = { products: [], cobekKategori: [], produsen: [{ id: 's1', name: 'CV Batu Merapi' }] };
  const ctx = makeCtx(D);
  assert.deepEqual(ctx.SupplierStore.list(), D.produsen);
  assert.equal(ctx.SupplierStore.find('s1').name, 'CV Batu Merapi');
  assert.equal(ctx.SupplierStore.label('s1'), 'CV Batu Merapi');
  assert.equal(ctx.SupplierStore.label('ghost'), '');
});

test('SupplierStore.costFor() — delegasi PERSIS PurchaseEngine.produsenPrice()', () => {
  const D = { products: [], cobekKategori: [], produsen: [{ id: 's1', name: 'A' }] };
  const ctx = makeCtx(D);
  const product = { id: 'p1', hargaByProdusen: { s1: 12000 } };
  assert.equal(ctx.SupplierStore.costFor(product, 's1'), 12000);
  assert.equal(ctx.SupplierStore.costFor(product, 's2'), null);
});

test('SupplierStore.productsFor() — delegasi PERSIS PurchaseEngine.produsenProducts()', () => {
  const p1 = { id: 'p1', hargaByProdusen: { s1: 1000 } };
  const p2 = { id: 'p2', hargaByProdusen: {} };
  const D = { products: [p1, p2], cobekKategori: [], produsen: [{ id: 's1', name: 'A' }] };
  const ctx = makeCtx(D);
  assert.deepEqual(Array.from(ctx.SupplierStore.productsFor('s1')), [p1]);
  assert.deepEqual(Array.from(ctx.SupplierStore.productsFor('ghost')), []);
});

// --- AttributeStore -------------------------------------------------------

test('AttributeStore.get() — baca field fisik asli lewat kode generik', () => {
  const ctx = makeCtx();
  const product = { beratPerUnit: 2.5, panjang: 20, diskonPersen: 10 };
  assert.equal(ctx.AttributeStore.get(product, 'berat_per_unit'), 2.5);
  assert.equal(ctx.AttributeStore.get(product, 'panjang'), 20);
  assert.equal(ctx.AttributeStore.get(product, 'diskon_persen'), 10);
});

test('AttributeStore.get() — kode tidak dikenal / product kosong -> undefined (bukan 0)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.AttributeStore.get({ beratPerUnit: 5 }, 'entah'), undefined);
  assert.equal(ctx.AttributeStore.get(null, 'panjang'), undefined);
});

test('AttributeStore.shippingWeight() — field yg ditandai is_shipping_weight (beratPerUnit)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.AttributeStore.shippingWeight({ beratPerUnit: 3.2 }), 3.2);
});

test('AttributeStore.definitions() — salinan, bukan referensi langsung ke DEFINITIONS', () => {
  const ctx = makeCtx();
  const defs = ctx.AttributeStore.definitions();
  defs[0].label = 'diubah';
  assert.notEqual(ctx.AttributeStore.DEFINITIONS[0].label, 'diubah');
});

// --- ProductStore -----------------------------------------------------

test('ProductStore.list()/find()/byCategory()/bySupplier() — field asli, tanpa perubahan', () => {
  const p1 = { id: 'p1', kategoriId: 'k1', produsenId: 's1' };
  const p2 = { id: 'p2', kategoriId: 'k2', produsenId: 's1' };
  const D = { products: [p1, p2], cobekKategori: [], produsen: [] };
  const ctx = makeCtx(D);
  assert.deepEqual(ctx.ProductStore.list(), [p1, p2]);
  assert.equal(ctx.ProductStore.find('p2'), p2);
  assert.deepEqual(ctx.ProductStore.byCategory('k1'), [p1]);
  assert.deepEqual(ctx.ProductStore.bySupplier('s1'), [p1, p2]);
});

test('ProductStore.listSelf() — filter isProductOwnershipSelf (produk lama tanpa field ownership -> SELF)', () => {
  const p1 = { id: 'p1' };
  const p2 = { id: 'p2', ownership: 'INVESTOR' };
  const D = { products: [p1, p2], cobekKategori: [], produsen: [] };
  const ctx = makeCtx(D);
  assert.deepEqual(Array.from(ctx.ProductStore.listSelf()), [p1]);
});

// --- PricingService -----------------------------------------------------

test('PricingService.getPrice() — pemetaan tipe generik ke field harga asli', () => {
  const ctx = makeCtx();
  const product = { hargaBeli: 10000, hargaJual: 15000, hargaReseller: 13000 };
  assert.equal(ctx.PricingService.getPrice(product, 'cost'), 10000);
  assert.equal(ctx.PricingService.getPrice(product, 'retail'), 15000);
  assert.equal(ctx.PricingService.getPrice(product, 'reseller'), 13000);
  assert.equal(ctx.PricingService.getPrice(product, 'entah'), undefined);
});

test('PricingService.margin() — delegasi PERSIS ProfitEngine.margin()', () => {
  const ctx = makeCtx();
  const product = { hargaBeli: 10000, hargaJual: 15000 };
  const r = ctx.PricingService.margin(product);
  assert.equal(r.marginRp, 5000);
  assert.equal(r.marginPct, (5000 / 15000) * 100);
});

test('PricingService.recommend() — delegasi PERSIS ProfitEngine.recommendPrice()', () => {
  const ctx = makeCtx();
  const r = ctx.PricingService.recommend({ modal: 10000, transport: 1000, marginPct: 20 });
  // (10000+1000)*1.2 = 13200, dibulatkan Math.round(x/100)*100 (fallback tanpa PriceReko) = 13200
  assert.equal(r.base, 11000);
  assert.equal(r.result, 13000);
});

// --- PricingService — Tahap 2 (getCost/getRetail/getReseller/getMargin) ---
// Alias bernama eksplisit di atas getPrice()/margin() — harus 100% sama
// hasilnya dgn versi generik (0 rumus baru, murni nama lain).

test('PricingService.getCost()/getRetail()/getReseller() — sama persis dgn getPrice() tipe terkait', () => {
  const ctx = makeCtx();
  const product = { hargaBeli: 10000, hargaJual: 15000, hargaReseller: 13000 };
  assert.equal(ctx.PricingService.getCost(product), ctx.PricingService.getPrice(product, 'cost'));
  assert.equal(ctx.PricingService.getRetail(product), ctx.PricingService.getPrice(product, 'retail'));
  assert.equal(ctx.PricingService.getReseller(product), ctx.PricingService.getPrice(product, 'reseller'));
  assert.equal(ctx.PricingService.getCost(product), 10000);
  assert.equal(ctx.PricingService.getRetail(product), 15000);
  assert.equal(ctx.PricingService.getReseller(product), 13000);
});

test('PricingService.getCost()/getRetail()/getReseller() — product kosong -> undefined (bukan 0)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.PricingService.getCost(null), undefined);
  assert.equal(ctx.PricingService.getRetail(undefined), undefined);
  assert.equal(ctx.PricingService.getReseller(null), undefined);
});

test('PricingService.getMargin() — sama persis dgn margin()', () => {
  const ctx = makeCtx();
  const product = { hargaBeli: 10000, hargaJual: 15000 };
  assert.deepEqual(ctx.PricingService.getMargin(product), ctx.PricingService.margin(product));
});

// --- InventoryService -----------------------------------------------------

test('InventoryService.stockStatus() — delegasi PERSIS InventoryEngine.stockStatus()', () => {
  const ctx = makeCtx();
  assert.equal(ctx.InventoryService.stockStatus({ stock: 1 }).label, 'Menipis');
  assert.equal(ctx.InventoryService.stockStatus({ stock: 10 }).label, 'Aman');
});

test('InventoryService.valueAt()/totalValue() — stock x harga via PricingService, tipe generik', () => {
  const p1 = { stock: 3, hargaBeli: 1000, hargaJual: 2000 };
  const p2 = { stock: 2, hargaBeli: 500, hargaJual: 1500 };
  const ctx = makeCtx();
  assert.equal(ctx.InventoryService.valueAt(p1, 'cost'), 3000);
  assert.equal(ctx.InventoryService.valueAt(p1, 'retail'), 6000);
  assert.equal(ctx.InventoryService.totalValue([p1, p2], 'cost'), 4000);
});

test('InventoryService.restockScan() — delegasi PERSIS InventoryEngine.restockScan()', () => {
  const ctx = makeCtx();
  const r = ctx.InventoryService.restockScan();
  assert.equal(r.ok, true);
  assert.ok(Array.isArray(r.items));
});

// --- AttributeStore — Tahap 3 (getAttribute/hasAttribute/setAttribute) ---

test('AttributeStore.getAttribute() — alias PERSIS get()', () => {
  const ctx = makeCtx();
  const product = { beratPerUnit: 2.5, panjang: 20 };
  assert.equal(ctx.AttributeStore.getAttribute(product, 'berat_per_unit'), ctx.AttributeStore.get(product, 'berat_per_unit'));
  assert.equal(ctx.AttributeStore.getAttribute(product, 'panjang'), 20);
});

test('AttributeStore.hasAttribute() — kaidah kosong != 0: nilai 0 tetap dianggap ADA', () => {
  const ctx = makeCtx();
  assert.equal(ctx.AttributeStore.hasAttribute({ diskonPersen: 0 }, 'diskon_persen'), true);
  assert.equal(ctx.AttributeStore.hasAttribute({}, 'panjang'), false);
  assert.equal(ctx.AttributeStore.hasAttribute({ panjang: 20 }, 'entah'), false);
});

test('AttributeStore.setAttribute() — PURE: balikin salinan baru, product asli TIDAK dimutasi', () => {
  const ctx = makeCtx();
  const product = { id: 'p1', beratPerUnit: 1 };
  const r = ctx.AttributeStore.setAttribute(product, 'berat_per_unit', 5);
  assert.equal(r.ok, true);
  assert.equal(r.product.beratPerUnit, 5);
  assert.equal(product.beratPerUnit, 1); // asli tidak berubah
  assert.notEqual(r.product, product); // objek baru, bukan referensi sama
});

test('AttributeStore.setAttribute() — kode tidak dikenal / product invalid -> {ok:false}', () => {
  const ctx = makeCtx();
  assert.equal(ctx.AttributeStore.setAttribute({ id: 'p1' }, 'entah', 1).ok, false);
  assert.equal(ctx.AttributeStore.setAttribute(null, 'panjang', 1).ok, false);
  assert.equal(ctx.AttributeStore.setAttribute('bukan-object', 'panjang', 1).ok, false);
});

// --- ProductStore — Tahap 3 (getCategory/getSupplier/getWeight/getDimensions/getOwnership) ---

test('ProductStore.getCategory()/getSupplier() — delegasi PERSIS CategoryStore.find()/SupplierStore.find()', () => {
  const kat = { id: 'k1', name: 'Kecil' };
  const sup = { id: 's1', name: 'CV Batu Merapi' };
  const product = { id: 'p1', kategoriId: 'k1', produsenId: 's1' };
  const D = { products: [product], cobekKategori: [kat], produsen: [sup] };
  const ctx = makeCtx(D);
  assert.deepEqual(ctx.ProductStore.getCategory(product), kat);
  assert.deepEqual(ctx.ProductStore.getSupplier(product), sup);
  assert.equal(ctx.ProductStore.getCategory({ kategoriId: 'ghost' }), null);
  assert.equal(ctx.ProductStore.getSupplier({}), null);
  assert.equal(ctx.ProductStore.getCategory(null), null);
});

test('ProductStore.getWeight()/getDimensions() — delegasi AttributeStore, field fisik asli', () => {
  const ctx = makeCtx();
  const product = { beratPerUnit: 4.5, panjang: 10, lebar: 20, tinggi: 30 };
  assert.equal(ctx.ProductStore.getWeight(product), 4.5);
  const dims = ctx.ProductStore.getDimensions(product);
  assert.equal(dims.panjang, 10);
  assert.equal(dims.lebar, 20);
  assert.equal(dims.tinggi, 30);
  assert.equal(ctx.ProductStore.getWeight(null), undefined);
  const dimsEmpty = ctx.ProductStore.getDimensions(null);
  assert.equal(dimsEmpty.panjang, undefined);
  assert.equal(dimsEmpty.lebar, undefined);
  assert.equal(dimsEmpty.tinggi, undefined);
});

test('ProductStore.getOwnership() — delegasi PERSIS OwnershipEngine.resolve()', () => {
  const ctx = makeCtx();
  const self = ctx.ProductStore.getOwnership({ id: 'p1' }); // tanpa field ownership
  assert.equal(self.type, 'SELF');
  assert.equal(self.isDefault, true);
  const investor = ctx.ProductStore.getOwnership({ id: 'p2', ownership: 'INVESTOR' });
  assert.equal(investor.type, 'INVESTOR');
  assert.equal(investor.isDefault, false);
});

// --- ProductRepository — Tahap 4 (createProduct/updateProduct/cloneProduct/saveProduct) ---
// Semua PURE: tidak pernah memutasi input, tidak pernah panggil save(),
// tidak pernah menyentuh D langsung (murni operasi objek/array di parameter).

test('ProductRepository.createProduct() — hasil punya id baru & default field lengkap', () => {
  const ctx = makeCtx();
  const r = ctx.ProductRepository.createProduct({ name: 'Cobek Batu 20cm', hargaJual: 15000 });
  assert.equal(r.ok, true);
  assert.ok(r.product.id.startsWith('prod_'));
  assert.equal(r.product.name, 'Cobek Batu 20cm');
  assert.equal(r.product.hargaJual, 15000);
  assert.equal(r.product.stock, 0);
  assert.equal(r.product.ownership, 'SELF');
  // objek dibentuk di dalam sandbox vm (realm beda dari test file) — bandingkan
  // via JSON (struktur), bukan assert.deepEqual (deepStrictEqual menolak lintas
  // realm walau struktur identik krn prototype Object beda instance).
  assert.equal(JSON.stringify(r.product.hargaByProdusen), '{}');
});

test('ProductRepository.createProduct() — tanpa fields -> tetap sukses dgn default', () => {
  const ctx = makeCtx();
  const r = ctx.ProductRepository.createProduct();
  assert.equal(r.ok, true);
  assert.equal(r.product.name, '');
  assert.equal(r.product.stock, 0);
});

test('ProductRepository.createProduct() — fields invalid (array/primitif) -> {ok:false}', () => {
  const ctx = makeCtx();
  assert.equal(ctx.ProductRepository.createProduct([1, 2]).ok, false);
  assert.equal(ctx.ProductRepository.createProduct('bukan-object').ok, false);
});

test('ProductRepository.createProduct() — id TIDAK bisa dioverride via fields (jaga keunikan)', () => {
  const ctx = makeCtx();
  const r = ctx.ProductRepository.createProduct({ id: 'prod_paksa', name: 'X' });
  assert.notEqual(r.product.id, 'prod_paksa');
  assert.ok(r.product.id.startsWith('prod_'));
});

test('ProductRepository.updateProduct() — auto-route field atribut (berat/dimensi/diskon) lewat AttributeStore, PURE', () => {
  const ctx = makeCtx();
  const product = { id: 'p1', name: 'Cobek', beratPerUnit: 1, panjang: 10 };
  const r = ctx.ProductRepository.updateProduct(product, { beratPerUnit: 5, panjang: 20 });
  assert.equal(r.ok, true);
  assert.equal(r.product.beratPerUnit, 5);
  assert.equal(r.product.panjang, 20);
  // produk asli TIDAK berubah (immutable)
  assert.equal(product.beratPerUnit, 1);
  assert.equal(product.panjang, 10);
  assert.notEqual(r.product, product);
});

test('ProductRepository.updateProduct() — field non-atribut (name/harga/stock/kategoriId/ownership) lewat merge biasa', () => {
  const ctx = makeCtx();
  const product = { id: 'p1', name: 'Lama', hargaJual: 10000, stock: 2, kategoriId: 'k1', ownership: 'SELF' };
  const r = ctx.ProductRepository.updateProduct(product, { name: 'Baru', hargaJual: 12000, stock: 5, kategoriId: 'k2', ownership: 'INVESTOR' });
  assert.equal(r.ok, true);
  assert.equal(r.product.name, 'Baru');
  assert.equal(r.product.hargaJual, 12000);
  assert.equal(r.product.stock, 5);
  assert.equal(r.product.kategoriId, 'k2');
  assert.equal(r.product.ownership, 'INVESTOR');
  // produk asli TIDAK berubah
  assert.equal(product.name, 'Lama');
  assert.equal(product.stock, 2);
});

test('ProductRepository.updateProduct() — campuran atribut + non-atribut dalam satu panggilan', () => {
  const ctx = makeCtx();
  const product = { id: 'p1', name: 'Lama', beratPerUnit: 1, diskonPersen: 0 };
  const r = ctx.ProductRepository.updateProduct(product, { name: 'Baru', beratPerUnit: 3, diskonPersen: 10 });
  assert.equal(r.ok, true);
  assert.equal(r.product.name, 'Baru');
  assert.equal(r.product.beratPerUnit, 3);
  assert.equal(r.product.diskonPersen, 10);
});

test('ProductRepository.updateProduct() — product/changes invalid -> {ok:false}', () => {
  const ctx = makeCtx();
  assert.equal(ctx.ProductRepository.updateProduct(null, { name: 'X' }).ok, false);
  assert.equal(ctx.ProductRepository.updateProduct({ id: 'p1' }, null).ok, false);
  assert.equal(ctx.ProductRepository.updateProduct({ id: 'p1' }, 'bukan-object').ok, false);
});

test('ProductRepository.cloneProduct() — id baru, stock=0, field lain tetap sama, produk asal tidak berubah', () => {
  const ctx = makeCtx();
  const original = { id: 'p1', name: 'Cobek', stock: 7, hargaJual: 15000, hargaByProdusen: { s1: 1000 } };
  const r = ctx.ProductRepository.cloneProduct(original);
  assert.equal(r.ok, true);
  assert.notEqual(r.product.id, original.id);
  assert.ok(r.product.id.startsWith('prod_'));
  assert.equal(r.product.stock, 0);
  assert.equal(r.product.name, 'Cobek');
  assert.equal(r.product.hargaJual, 15000);
  assert.equal(JSON.stringify(r.product.hargaByProdusen), JSON.stringify({ s1: 1000 }));
  // deep clone: mutasi nested object di hasil clone TIDAK ikut mengubah produk asal
  r.product.hargaByProdusen.s1 = 9999;
  assert.equal(original.hargaByProdusen.s1, 1000);
  assert.equal(original.stock, 7); // produk asal tidak dimutasi
});

test('ProductRepository.cloneProduct() — product invalid -> {ok:false}', () => {
  const ctx = makeCtx();
  assert.equal(ctx.ProductRepository.cloneProduct(null).ok, false);
  assert.equal(ctx.ProductRepository.cloneProduct('bukan-object').ok, false);
  assert.equal(ctx.ProductRepository.cloneProduct([1, 2]).ok, false);
});

test('ProductRepository.saveProduct() — PURE upsert: tambah produk baru, array input tidak dimutasi', () => {
  const ctx = makeCtx();
  const products = [{ id: 'p1', name: 'A' }];
  const newProduct = { id: 'p2', name: 'B' };
  const r = ctx.ProductRepository.saveProduct(products, newProduct);
  assert.equal(r.ok, true);
  assert.equal(r.products.length, 2);
  assert.deepEqual(r.products[1], newProduct);
  assert.equal(products.length, 1); // array asli TIDAK dimutasi
});

test('ProductRepository.saveProduct() — PURE upsert: ganti produk existing by id, urutan lain tidak berubah', () => {
  const ctx = makeCtx();
  const p1 = { id: 'p1', name: 'A' };
  const p2 = { id: 'p2', name: 'B' };
  const products = [p1, p2];
  const updated = { id: 'p1', name: 'A-baru' };
  const r = ctx.ProductRepository.saveProduct(products, updated);
  assert.equal(r.ok, true);
  assert.equal(r.products.length, 2);
  assert.deepEqual(r.products[0], updated);
  assert.deepEqual(r.products[1], p2);
  assert.equal(products[0], p1); // array asli TIDAK dimutasi/diganti
});

test('ProductRepository.saveProduct() — TIDAK memanggil save() (pure, tidak ada side effect global)', () => {
  const ctx = makeCtx();
  let saveCalled = false;
  ctx.save = () => { saveCalled = true; };
  const r = ctx.ProductRepository.saveProduct([], { id: 'p1', name: 'X' });
  assert.equal(r.ok, true);
  assert.equal(saveCalled, false);
});

test('ProductRepository.saveProduct() — products/product invalid -> {ok:false}', () => {
  const ctx = makeCtx();
  assert.equal(ctx.ProductRepository.saveProduct('bukan-array', { id: 'p1' }).ok, false);
  assert.equal(ctx.ProductRepository.saveProduct([], null).ok, false);
  assert.equal(ctx.ProductRepository.saveProduct([], { name: 'tanpa-id' }).ok, false);
});

// --- ProductRepository — standalone load (guard typeof, tanpa AttributeStore/OwnershipEngine) ---
// product-repository.js TIDAK BOLEH throw kalau dimuat sendirian (pola guard
// typeof konsisten seluruh codebase) — updateProduct() fallback ke merge
// biasa utk SEMUA key (tidak ada auto-route) kalau AttributeStore belum
// dimuat, createProduct() fallback ownership 'SELF' kalau OwnershipEngine
// belum dimuat.

test('ProductRepository — dimuat sendirian (tanpa AttributeStore/OwnershipEngine) tidak throw', () => {
  const ctx = loadSource(['modules/shop/generic/product-repository.js'], {}, ['ProductRepository']);
  const created = ctx.ProductRepository.createProduct({ name: 'X' });
  assert.equal(created.ok, true);
  assert.equal(created.product.ownership, 'SELF');

  const updated = ctx.ProductRepository.updateProduct({ id: 'p1', beratPerUnit: 1 }, { beratPerUnit: 9 });
  assert.equal(updated.ok, true);
  // tanpa AttributeStore, field beratPerUnit TETAP diupdate lewat merge biasa
  assert.equal(updated.product.beratPerUnit, 9);

  const cloned = ctx.ProductRepository.cloneProduct({ id: 'p1', name: 'Y', stock: 3 });
  assert.equal(cloned.ok, true);
  assert.equal(cloned.product.stock, 0);

  const saved = ctx.ProductRepository.saveProduct([], { id: 'p1', name: 'Z' });
  assert.equal(saved.ok, true);
  assert.equal(saved.products.length, 1);
});
