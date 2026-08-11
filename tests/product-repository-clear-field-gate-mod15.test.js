'use strict';
// tests/product-repository-clear-field-gate-mod15.test.js — Modul 15 (sesi
// ini): Clear Field Mutation Gate.
//
// Audit sesi ini (modules/shop/ + modules/business/ + modules/shared/ yang
// dipakai Shop) menemukan HANYA 3 titik mutasi mentah tersisa yang menulis
// langsung ke `D.products` di luar ProductRepository, dan SEMUANYA sama
// akar masalahnya (didokumentasikan eksplisit sbg known issue sejak
// CHANGELOG-MODUL5/6/7/8.md): menulis kategoriId/produsenId ke string
// kosong `''` ("dikosongkan"), yang DITOLAK oleh
// `ProductRepository.mutateSetField()` (Modul 5) karena gate itu
// mewajibkan teks non-kosong:
//   1. `cobek-etalase.js` `Etalase.delKategori()` — sisi-efek clear
//      `p.kategoriId=''` di semua produk yang pakai kategori yang dihapus.
//   2. `cobek-order.js` `Produsen.delete()` — sisi-efek clear
//      `p.produsenId=''` di semua produk yang pakai produsen yang dihapus.
//   3. `cobek-tx-cart.js` `applyTxShopStockFromTx()` — edge-case
//      `kategoriInput` whitespace-only (`resolveShopKategori()` balikin
//      `''`) pada cabang produk existing (non-`isNew`).
//
// TIDAK ADA titik mutasi lain yang bypass ProductRepository/SupplierStore/
// CategoryStore/AttributeStore di modules/shop atau modules/business
// (verified: create/update/delete/import/inline-create/bulk-update/nested
// semua sudah lewat gate sejak Modul 3-14). Backfill schema default di
// modules/shared/backup-restore.js & features-helpers-global-security.js
// (`if(p.kategoriId===undefined)p.kategoriId=''`) BUKAN mutasi Shop —
// pola boot-time default-fill yang sama dipakai puluhan field non-Shop
// lain di file yang sama (`if(!D.workDays)D.workDays=[]` dst.), di luar
// cakupan ProductRepository per konvensi codebase, TIDAK disentuh sesi ini.
//
// Modul 15 menutup 3 titik itu dengan MEMPERLUAS gate yang sudah ada
// (mutateSetField(), Modul 5) — bukan gate baru, bukan bulk mutation baru,
// pola SAMA PERSIS mutateSetPrice() Modul 5 yang mengecualikan `null` utk
// hargaReseller. Reuse 100%.
//
// Cakupan:
//   A. Unit — mutateSetField() perluasan: kategoriId/produsenId menerima
//      `''` (clear), field lain tetap tolak `''`/whitespace/null/dst.,
//      `satuan` TETAP TIDAK boleh `''` (di luar pengecualian).
//   B. Integrasi — 3 titik yang di-wire sesi ini benar2 lewat gate & hasil
//      akhir (kategoriId/produsenId jadi '') identik business logic lama.
//   C. Fallback — tanpa ProductRepository, assignment mentah PERSIS
//      perilaku sebelum Modul 15 di ke-3 titik.

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadSource } = require('./helpers/loadSource');

function setLetGlobal(ctx, name, value) {
  new vm.Script(`${name} = ${JSON.stringify(value)};`, { filename: 'inject-let-global' }).runInContext(ctx);
}

function loadRepo() {
  return loadSource(['modules/shop/generic/product-repository.js'], {}, ['ProductRepository']);
}

// === A. Unit: mutateSetField() perluasan =====================================

test('ProductRepository.mutateSetField() — kategoriId: "" (clear) VALID, ditulis in-place', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', kategoriId: 'kat1' };
  const r = ProductRepository.mutateSetField(p, 'kategoriId', '');
  assert.equal(r.ok, true);
  assert.equal(r.field, 'kategoriId');
  assert.equal(r.value, '');
  assert.equal(p.kategoriId, '');
});

test('ProductRepository.mutateSetField() — produsenId: "" (clear) VALID, ditulis in-place', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', produsenId: 'prd1' };
  const r = ProductRepository.mutateSetField(p, 'produsenId', '');
  assert.equal(r.ok, true);
  assert.equal(r.value, '');
  assert.equal(p.produsenId, '');
});

test('ProductRepository.mutateSetField() — satuan: "" TETAP DITOLAK (pengecualian HANYA kategoriId/produsenId)', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', satuan: 'pcs' };
  const r = ProductRepository.mutateSetField(p, 'satuan', '');
  assert.equal(r.ok, false);
  assert.equal(p.satuan, 'pcs', 'satuan TIDAK berubah — field tidak disentuh sama sekali');
});

test('ProductRepository.mutateSetField() — whitespace-only ("  ") TETAP DITOLAK utk kategoriId/produsenId (bukan auto-trim jadi clear)', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', kategoriId: 'kat1', produsenId: 'prd1' };
  assert.equal(ProductRepository.mutateSetField(p, 'kategoriId', '   ').ok, false);
  assert.equal(ProductRepository.mutateSetField(p, 'produsenId', '   ').ok, false);
  assert.equal(p.kategoriId, 'kat1');
  assert.equal(p.produsenId, 'prd1');
});

test('ProductRepository.mutateSetField() — null/undefined/angka TETAP DITOLAK utk kategoriId/produsenId (HANYA string kosong literal "" yang dikecualikan)', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', kategoriId: 'kat1' };
  assert.equal(ProductRepository.mutateSetField(p, 'kategoriId', null).ok, false);
  assert.equal(ProductRepository.mutateSetField(p, 'kategoriId', undefined).ok, false);
  assert.equal(ProductRepository.mutateSetField(p, 'kategoriId', 0).ok, false);
  assert.equal(p.kategoriId, 'kat1');
});

test('ProductRepository.mutateSetField() — teks non-kosong valid: perilaku LAMA 0 berubah (regression Modul 5)', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', kategoriId: '', produsenId: '', satuan: '' };
  assert.equal(ProductRepository.mutateSetField(p, 'kategoriId', 'kat2').ok, true);
  assert.equal(p.kategoriId, 'kat2');
  assert.equal(ProductRepository.mutateSetField(p, 'produsenId', 'prd2').ok, true);
  assert.equal(p.produsenId, 'prd2');
  assert.equal(ProductRepository.mutateSetField(p, 'satuan', 'pcs').ok, true);
  assert.equal(p.satuan, 'pcs');
  assert.equal(ProductRepository.mutateSetField(p, 'satuan', '  pcs  ').value, 'pcs', 'trim tetap jalan spt sebelumnya');
});

test('ProductRepository.mutateSetField() — field di luar whitelist TETAP ditolak (0 perluasan whitelist field)', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', name: 'X' };
  assert.equal(ProductRepository.mutateSetField(p, 'name', '').ok, false);
  assert.equal(ProductRepository.mutateSetField(p, 'hargaBeli', '').ok, false);
});

// === B. Integrasi ============================================================

test('integrasi: cobek-etalase.js Etalase.delKategori() — p.kategoriId="" lewat ProductRepository.mutateSetField()', () => {
  const D = {
    products: [
      { id: 'p1', name: 'A', kategoriId: 'kat1' },
      { id: 'p2', name: 'B', kategoriId: 'kat1' },
      { id: 'p3', name: 'C', kategoriId: 'kat2' },
    ],
    cobekKategori: [{ id: 'kat1', name: 'Kategori 1' }, { id: 'kat2', name: 'Kategori 2' }],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-etalase.js'],
    { D, document: { getElementById: () => ({ style: {} }) }, toast: () => {}, save: () => {}, askConfirm: async () => true, escapeHtml: (s) => s },
    ['Etalase', 'ProductRepository'],
  );
  let fieldCalls = 0;
  const orig = ctx.ProductRepository.mutateSetField;
  ctx.ProductRepository.mutateSetField = function (...args) { fieldCalls++; return orig.apply(ctx.ProductRepository, args); };
  ctx.Etalase.renderKategoriList = () => {};
  ctx.Etalase.renderList = () => {};
  return ctx.Etalase.delKategori('kat1').then(() => {
    assert.equal(D.products[0].kategoriId, '');
    assert.equal(D.products[1].kategoriId, '');
    assert.equal(D.products[2].kategoriId, 'kat2', 'produk kategori lain TIDAK ikut kesentuh');
    assert.ok(fieldCalls >= 2, 'clear kategoriId harus lewat ProductRepository.mutateSetField() (2 produk terpengaruh)');
    assert.deepEqual(D.cobekKategori.map((k) => k.id), ['kat2'], 'kategori sendiri tetap terhapus (perilaku lama, gate CategoryStore Modul 8 tidak berubah)');
  });
});

test('integrasi: cobek-order.js Produsen.delete() — p.produsenId="" lewat ProductRepository.mutateSetField()', () => {
  const D = {
    products: [
      { id: 'p1', name: 'A', produsenId: 'prd1' },
      { id: 'p2', name: 'B', produsenId: 'prd2' },
    ],
    produsen: [{ id: 'prd1', name: 'Produsen 1' }, { id: 'prd2', name: 'Produsen 2' }],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-order.js'],
    { D, document: { getElementById: () => ({ style: {} }) }, toast: () => {}, save: () => {}, askConfirm: async () => true, escapeHtml: (s) => s },
    ['Produsen', 'ProductRepository'],
  );
  let fieldCalls = 0;
  const orig = ctx.ProductRepository.mutateSetField;
  ctx.ProductRepository.mutateSetField = function (...args) { fieldCalls++; return orig.apply(ctx.ProductRepository, args); };
  ctx.Produsen.renderList = () => {};
  return ctx.Produsen.delete('prd1').then(() => {
    assert.equal(D.products[0].produsenId, '');
    assert.equal(D.products[1].produsenId, 'prd2', 'produk produsen lain TIDAK ikut kesentuh');
    assert.ok(fieldCalls >= 1, 'clear produsenId harus lewat ProductRepository.mutateSetField()');
    assert.deepEqual(D.produsen.map((x) => x.id), ['prd2']);
  });
});

test('integrasi: cobek-tx-cart.js applyTxShopStockFromTx() — kategoriInput whitespace-only: kategoriId di-clear ("") lewat gate juga', () => {
  const D = {
    products: [{ id: 'p1', name: 'Semen', stock: 3, hargaBeli: 50000, hargaJual: 60000, kategoriId: 'kat-lama', produsenId: '', hargaByProdusen: {} }],
    cobekKategori: [],
    transactions: [{ id: 'tx1' }],
  };
  let uidN = 0;
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-tx-cart.js'],
    { D, uid: () => 'uid_' + (++uidN), toast: () => {}, renderProductList: () => {}, fmtFull: (n) => String(n) },
    ['ProductRepository'],
  );
  let fieldCalls = 0;
  const orig = ctx.ProductRepository.mutateSetField;
  ctx.ProductRepository.mutateSetField = function (...args) { fieldCalls++; return orig.apply(ctx.ProductRepository, args); };

  setLetGlobal(ctx, 'curShopStockCart', [
    { isNew: false, productId: 'p1', kategoriInput: '   ', qty: 2, hargaBeli: 0, hargaJual: 0, produsenId: '' },
  ]);
  ctx.applyTxShopStockFromTx('tx1', '', null);

  const p = D.products[0];
  assert.equal(p.kategoriId, '', 'kategoriId dikosongkan (perilaku lama 0 berubah)');
  assert.ok(fieldCalls >= 1, 'clear kategoriId di edge-case ini sekarang IKUT lewat ProductRepository.mutateSetField()');
});

// === C. Fallback (tanpa ProductRepository) ===================================

test('integrasi: Etalase.delKategori() — tanpa ProductRepository, fallback raw p.kategoriId="" PERSIS lama', () => {
  const D = {
    products: [{ id: 'p1', name: 'A', kategoriId: 'kat1' }],
    cobekKategori: [{ id: 'kat1', name: 'Kategori 1' }],
  };
  const ctx = loadSource(
    ['modules/shop/cobek-etalase.js'],
    { D, document: { getElementById: () => ({ style: {} }) }, toast: () => {}, save: () => {}, askConfirm: async () => true, escapeHtml: (s) => s },
    ['Etalase'],
  );
  ctx.Etalase.renderKategoriList = () => {};
  ctx.Etalase.renderList = () => {};
  return ctx.Etalase.delKategori('kat1').then(() => {
    assert.equal(D.products[0].kategoriId, '');
  });
});

test('integrasi: Produsen.delete() — tanpa ProductRepository, fallback raw p.produsenId="" PERSIS lama', () => {
  const D = {
    products: [{ id: 'p1', name: 'A', produsenId: 'prd1' }],
    produsen: [{ id: 'prd1', name: 'Produsen 1' }],
  };
  const ctx = loadSource(
    ['modules/shop/cobek-order.js'],
    { D, document: { getElementById: () => ({ style: {} }) }, toast: () => {}, save: () => {}, askConfirm: async () => true, escapeHtml: (s) => s },
    ['Produsen'],
  );
  ctx.Produsen.renderList = () => {};
  return ctx.Produsen.delete('prd1').then(() => {
    assert.equal(D.products[0].produsenId, '');
  });
});
