'use strict';
// tests/shop-engine-tahap5-wiring.test.js — regresi Tahap 5 (Generic Shop
// Engine: UI "Duplikat Produk" di modul Product, memakai
// ProductRepository.cloneProduct()/saveProduct() Tahap 4).
//
// Titik yang di-wire sesi ini:
// 1. Etalase.duplicateProduct(i) (BARU, modules/shop/cobek-etalase.js) —
//    cloneProduct() -> saveProduct() -> D.products diganti -> save() ->
//    renderList(). TIDAK memanggil/menyentuh Etalase.save() (CRUD form
//    produk) sama sekali.
// 2. Etalase.renderList() — tombol baru "📋 Duplikat" muncul di kartu
//    katalog HANYA kalau ProductRepository dimuat (guard `typeof
//    ProductRepository!=='undefined'`) — kalau tidak, tombol disembunyikan
//    total (backward compatible, tidak ada tombol mati), sisa markup kartu
//    (kategori/produsen/badge berat/tombol edit&hapus) TIDAK berubah.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    {
      products: [], cobekKategori: [], cobek: [], produsen: [],
      accounts: [], transactions: [], profile: {},
      inventoryTransfers: [], deliveryPlans: [],
    },
    extra,
  );
}

function makeDomStub() {
  const store = {};
  return {
    getElementById(id) {
      if (!store[id]) store[id] = { innerHTML: '', value: '', classList: { toggle() {}, add() {}, remove() {} }, style: {} };
      return store[id];
    },
    querySelectorAll() { return []; },
    _store: store,
  };
}

const FILES_WITH_PRODUCT_REPOSITORY = [
  'modules/shared/ownership-engine.js',
  'modules/shop/generic/category-store.js',
  'modules/shop/generic/supplier-store.js',
  'modules/shop/generic/attribute-store.js',
  'modules/shop/generic/product-store.js',
  'modules/shop/generic/product-repository.js',
  'modules/shop/cobek-etalase.js',
];
const FILES_WITHOUT_PRODUCT_REPOSITORY = FILES_WITH_PRODUCT_REPOSITORY.filter(
  (f) => !f.startsWith('modules/shop/generic/'),
);

// makeEtalaseCtx() — pola sama tests/shop-engine-tahap3-wiring.test.js:
// `save`/`toast`/`askConfirm` di-stub (bukan dimuat dari format-tema.js/
// modal-navigasi.js) supaya test fokus murni ke wiring duplicateProduct(),
// bukan implementasi toast/modal konfirmasi itu sendiri.
function makeEtalaseCtx(D, withProductRepository, { confirmResult = true } = {}) {
  const doc = makeDomStub();
  const calls = { save: 0, toast: [], askConfirm: [] };
  const ctx = loadSource(
    withProductRepository ? FILES_WITH_PRODUCT_REPOSITORY : FILES_WITHOUT_PRODUCT_REPOSITORY,
    {
      D,
      document: doc,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      shopKategoriName: (id) => { const k = (D.cobekKategori || []).find((x) => x.id === id); return k ? k.name : ''; },
      save: () => { calls.save += 1; },
      toast: (msg) => { calls.toast.push(msg); },
      askConfirm: async (msg) => { calls.askConfirm.push(msg); return confirmResult; },
    },
    ['Etalase'],
  );
  return { ctx, doc, calls };
}

// --- Etalase.duplicateProduct(i) ------------------------------------------

test('Etalase.duplicateProduct() — clone ditambahkan ke D.products via ProductRepository, produk asal tidak berubah', async () => {
  const D = baseD({
    products: [{
      id: 'p1', name: 'Cobek Batu 20cm', stock: 7, hargaBeli: 10000, hargaJual: 20000,
      hargaReseller: 15000, diskonPersen: 5, kategoriId: 'k1', produsenId: 's1',
      beratPerUnit: 2.5, panjang: 20, lebar: 20, tinggi: 8, ownership: 'SELF',
      hargaByProdusen: { s1: 10000 },
    }],
    cobekKategori: [{ id: 'k1', name: 'Kecil' }],
    produsen: [{ id: 's1', name: 'CV Batu Merapi' }],
  });
  const { ctx, calls } = makeEtalaseCtx(D, true);
  await ctx.Etalase.duplicateProduct(0);

  assert.equal(D.products.length, 2, 'produk hasil duplikat harus ditambahkan ke D.products');
  const original = D.products[0];
  const clone = D.products[1];
  assert.equal(original.id, 'p1');
  assert.equal(original.stock, 7, 'produk asal tidak boleh berubah');
  assert.notEqual(clone.id, 'p1', 'clone harus punya id baru');
  assert.equal(clone.stock, 0, 'clone harus stock=0');
  assert.equal(clone.name, original.name);
  assert.equal(clone.hargaJual, original.hargaJual);
  assert.equal(clone.hargaByProdusen.s1, 10000, 'field nested harus ikut ter-clone');
  assert.equal(calls.save, 1, 'save() global (bukan Etalase.save()) harus dipanggil tepat 1x');
  assert.equal(calls.toast.length, 1);
  assert.match(calls.toast[0], /diduplikat/);
});

test('Etalase.duplicateProduct() — nested object (hargaByProdusen) pada clone tidak berbagi referensi dgn produk asal', async () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'X', stock: 3, hargaBeli: 1000, hargaJual: 2000, hargaByProdusen: { s1: 1000 } }],
  });
  const { ctx } = makeEtalaseCtx(D, true);
  await ctx.Etalase.duplicateProduct(0);
  const clone = D.products[1];
  clone.hargaByProdusen.s1 = 99999;
  assert.equal(D.products[0].hargaByProdusen.s1, 1000, 'mutasi di clone tidak boleh bocor ke produk asal');
});

test('Etalase.duplicateProduct() — user batal konfirmasi -> tidak ada perubahan', async () => {
  const D = baseD({ products: [{ id: 'p1', name: 'X', stock: 3, hargaBeli: 1000, hargaJual: 2000 }] });
  const { ctx, calls } = makeEtalaseCtx(D, true, { confirmResult: false });
  await ctx.Etalase.duplicateProduct(0);
  assert.equal(D.products.length, 1, 'batal -> tidak ada produk baru');
  assert.equal(calls.save, 0);
});

test('Etalase.duplicateProduct() — index tidak valid -> no-op, tidak throw', async () => {
  const D = baseD({ products: [{ id: 'p1', name: 'X', stock: 3, hargaBeli: 1000, hargaJual: 2000 }] });
  const { ctx, calls } = makeEtalaseCtx(D, true);
  await ctx.Etalase.duplicateProduct(99);
  assert.equal(D.products.length, 1);
  assert.equal(calls.save, 0);
});

test('Etalase.duplicateProduct() — ProductRepository belum dimuat -> no-op aman (guard typeof), tidak throw', async () => {
  const D = baseD({ products: [{ id: 'p1', name: 'X', stock: 3, hargaBeli: 1000, hargaJual: 2000 }] });
  const { ctx, calls } = makeEtalaseCtx(D, false);
  await ctx.Etalase.duplicateProduct(0);
  assert.equal(D.products.length, 1, 'tanpa ProductRepository, tidak ada duplikasi yang terjadi');
  assert.equal(calls.save, 0);
});

// --- Etalase.renderList() — tombol Duplikat guarded by ProductRepository --

test('Etalase.renderList() — tombol "Duplikat produk" muncul kalau ProductRepository dimuat', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 20cm', hargaBeli: 1000, hargaJual: 2000, stock: 5, diskonPersen: 0 }] });
  const { ctx, doc } = makeEtalaseCtx(D, true);
  ctx.Etalase.renderList();
  assert.match(doc._store.productList.innerHTML, /Etalase\.duplicateProduct/);
  assert.match(doc._store.productList.innerHTML, /Duplikat produk/);
});

test('Etalase.renderList() — tanpa ProductRepository, tombol Duplikat TIDAK muncul, sisa kartu tetap identik', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Cobek 20cm', hargaBeli: 1000, hargaJual: 2000, stock: 5, kategoriId: 'k1', produsenId: 's1', diskonPersen: 0 }],
    cobekKategori: [{ id: 'k1', name: 'Kecil' }],
    produsen: [{ id: 's1', name: 'CV Batu Merapi' }],
  });
  const { ctx: ctxWith, doc: docWith } = makeEtalaseCtx(D, true);
  ctxWith.Etalase.renderList();
  const { ctx: ctxWithout, doc: docWithout } = makeEtalaseCtx(D, false);
  ctxWithout.Etalase.renderList();

  assert.doesNotMatch(docWithout._store.productList.innerHTML, /Etalase\.duplicateProduct/);
  // Buang tombol Duplikat dari versi "with" lalu bandingkan sisanya — harus
  // identik dgn versi "without" (edit/hapus/kategori/produsen/badge tidak berubah).
  const withoutDuplicateButton = docWith._store.productList.innerHTML.replace(
    /<button data-action="Etalase\.duplicateProduct"[^>]*>📋<\/button>/, '',
  );
  assert.equal(withoutDuplicateButton, docWithout._store.productList.innerHTML);
});

test('Etalase.renderList() — tidak throw sama sekali kalau ProductRepository tidak dimuat (backward compatible)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'X', hargaBeli: 1000, hargaJual: 2000, stock: 1, diskonPersen: 0 }] });
  const { ctx } = makeEtalaseCtx(D, false);
  assert.doesNotThrow(() => ctx.Etalase.renderList());
});
