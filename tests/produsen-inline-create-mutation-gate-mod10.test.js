'use strict';
// tests/produsen-inline-create-mutation-gate-mod10.test.js — Modul 10
// (cobek-etalase.js Etalase.onProdusenChange() & cobek-tx-cart.js
// onTxShopStockProdusenChange(), sesi ini): reroute 2 titik TULIS
// `D.produsen.push({...})` mentah (create produsen baru inline lewat
// prompt "Produsen Baru") lewat SupplierStore.mutateCreate() (SSOT yang
// SUDAH ADA sejak Modul 7, dipakai Produsen.save()).
//
// Lanjutan langsung Modul 3-9 — bukan gate BARU (0 method baru di
// SupplierStore), melainkan menutup 2 titik yang masih bypass SSOT
// existing dengan kode yang SAMA PERSIS di 2 file:
//   1. Etalase.onProdusenChange()          (cobek-etalase.js)
//   2. onTxShopStockProdusenChange()       (cobek-tx-cart.js)
//
// Cakupan:
//   A. Integrasi — kedua call site benar-benar lewat SupplierStore.
//      mutateCreate() (di-spy), id/name/contact/note hasil akhir identik
//      perilaku lama (id 'prd_'+Date.now(), contact/note kosong).
//   B. Fallback — caller lama tetap bekerja tanpa SupplierStore (guard
//      typeof), literal object PERSIS sama seperti sebelum Modul 10.
//   C. Guard lama — prompt kosong/batal (nama falsy) TIDAK memanggil
//      SupplierStore sama sekali & TIDAK push ke D.produsen (perilaku
//      lama, bukan business logic gate ini).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadEtalase(D, promptName, extraDoc = {}) {
  const sel = { value: '__new__', innerHTML: '' };
  const doc = {
    getElementById: (id) => (id === 'pProdusen' ? sel : (extraDoc[id] || {})),
  };
  return {
    ctx: loadSource(
      [
        'modules/shop/generic/supplier-store.js',
        'modules/shop/cobek-etalase.js',
      ],
      {
        D,
        document: doc,
        save: () => {},
        escapeHtml: (s) => s,
        showPromptModal: async () => promptName,
        openModal: () => {},
        BusinessFlowPresenter: undefined,
      },
      ['Etalase', 'SupplierStore'],
    ),
    sel,
  };
}

function loadTxCart(D, promptName, extraDoc = {}) {
  const prodSel = { value: '__new__' };
  const doc = {
    getElementById: (id) => (id === 'txShopStockProdusen' ? prodSel : (extraDoc[id] || { value: '', style: {} })),
  };
  if (!D.cobekKategori) D.cobekKategori = [];
  return {
    ctx: loadSource(
      [
        'modules/shop/generic/supplier-store.js',
        'modules/shop/cobek-tx-cart.js',
      ],
      {
        D,
        document: doc,
        save: () => {},
        toast: () => {},
        escapeHtml: (s) => s,
        showPromptModal: async () => promptName,
        renderShopStockCartList: () => {},
        shopKategoriName: () => '',
        Pelanggan: { _acList: () => {} },
      },
      ['onTxShopStockProdusenChange', 'SupplierStore'],
    ),
    prodSel,
  };
}

// === A. Integrasi ===========================================================

test('integrasi: Etalase.onProdusenChange() — lewat SupplierStore.mutateCreate()', async () => {
  const D = { produsen: [] };
  const { ctx, sel } = loadEtalase(D, 'Toko Kain Jaya');
  let calls = 0;
  const orig = ctx.SupplierStore.mutateCreate;
  ctx.SupplierStore.mutateCreate = function (...args) { calls++; return orig.apply(ctx.SupplierStore, args); };
  await ctx.Etalase.onProdusenChange();
  assert.equal(calls, 1);
  assert.equal(D.produsen.length, 1);
  assert.equal(D.produsen[0].name, 'Toko Kain Jaya');
  assert.equal(D.produsen[0].contact, '');
  assert.equal(D.produsen[0].note, '');
  assert.match(D.produsen[0].id, /^prd_\d+$/);
  assert.equal(sel.value, D.produsen[0].id);
});

test('integrasi: onTxShopStockProdusenChange() — lewat SupplierStore.mutateCreate()', async () => {
  const D = { produsen: [], products: [] };
  const { ctx, prodSel } = loadTxCart(D, 'Supplier Baru CV');
  let calls = 0;
  const orig = ctx.SupplierStore.mutateCreate;
  ctx.SupplierStore.mutateCreate = function (...args) { calls++; return orig.apply(ctx.SupplierStore, args); };
  await ctx.onTxShopStockProdusenChange();
  assert.equal(calls, 1);
  assert.equal(D.produsen.length, 1);
  assert.equal(D.produsen[0].name, 'Supplier Baru CV');
  assert.equal(D.produsen[0].contact, '');
  assert.equal(D.produsen[0].note, '');
  assert.match(D.produsen[0].id, /^prd_\d+$/);
  assert.equal(prodSel.value, D.produsen[0].id);
});

test('integrasi: produsen lain di D.produsen tidak ikut berubah (Etalase)', async () => {
  const D = { produsen: [{ id: 'prd_old', name: 'Lama', contact: 'x', note: 'y' }] };
  const { ctx } = loadEtalase(D, 'Baru Sekali');
  await ctx.Etalase.onProdusenChange();
  assert.equal(D.produsen.length, 2);
  assert.deepEqual(D.produsen[0], { id: 'prd_old', name: 'Lama', contact: 'x', note: 'y' });
});

// === B. Fallback (tanpa SupplierStore) =====================================

test('fallback: Etalase.onProdusenChange() tetap bekerja tanpa SupplierStore (guard typeof)', async () => {
  const D = { produsen: [] };
  const sel = { value: '__new__', innerHTML: '' };
  const ctx = loadSource(
    ['modules/shop/cobek-etalase.js'],
    {
      D,
      document: { getElementById: (id) => (id === 'pProdusen' ? sel : {}) },
      save: () => {},
      escapeHtml: (s) => s,
      showPromptModal: async () => 'Fallback Produsen',
      openModal: () => {},
    },
    ['Etalase'],
  );
  await ctx.Etalase.onProdusenChange();
  assert.equal(D.produsen.length, 1);
  assert.equal(D.produsen[0].name, 'Fallback Produsen');
  assert.equal(D.produsen[0].contact, '');
  assert.equal(D.produsen[0].note, '');
  assert.match(D.produsen[0].id, /^prd_\d+$/);
});

test('fallback: onTxShopStockProdusenChange() tetap bekerja tanpa SupplierStore (guard typeof)', async () => {
  const D = { produsen: [], products: [], cobekKategori: [] };
  const prodSel = { value: '__new__' };
  const ctx = loadSource(
    ['modules/shop/cobek-tx-cart.js'],
    {
      D,
      document: { getElementById: (id) => (id === 'txShopStockProdusen' ? prodSel : { value: '', style: {} }) },
      save: () => {},
      toast: () => {},
      escapeHtml: (s) => s,
      showPromptModal: async () => 'Fallback Supplier',
      renderShopStockCartList: () => {},
      shopKategoriName: () => '',
      Pelanggan: { _acList: () => {} },
    },
    ['onTxShopStockProdusenChange'],
  );
  await ctx.onTxShopStockProdusenChange();
  assert.equal(D.produsen.length, 1);
  assert.equal(D.produsen[0].name, 'Fallback Supplier');
});

// === C. Guard lama (nama kosong/batal) ======================================

test('guard lama: prompt kosong/batal (Etalase) — 0 push, SupplierStore tidak dipanggil', async () => {
  const D = { produsen: [] };
  const { ctx, sel } = loadEtalase(D, '   ');
  let calls = 0;
  const orig = ctx.SupplierStore.mutateCreate;
  ctx.SupplierStore.mutateCreate = function (...args) { calls++; return orig.apply(ctx.SupplierStore, args); };
  await ctx.Etalase.onProdusenChange();
  assert.equal(calls, 0);
  assert.equal(D.produsen.length, 0);
  assert.equal(sel.value, '');
});

test('guard lama: prompt kosong/batal (tx-cart) — 0 push, SupplierStore tidak dipanggil', async () => {
  const D = { produsen: [], products: [] };
  const { ctx, prodSel } = loadTxCart(D, null);
  let calls = 0;
  const orig = ctx.SupplierStore.mutateCreate;
  ctx.SupplierStore.mutateCreate = function (...args) { calls++; return orig.apply(ctx.SupplierStore, args); };
  await ctx.onTxShopStockProdusenChange();
  assert.equal(calls, 0);
  assert.equal(D.produsen.length, 0);
  assert.equal(prodSel.value, '');
});
