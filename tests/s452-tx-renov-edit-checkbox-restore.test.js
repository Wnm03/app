'use strict';
/**
 * s452-tx-renov-edit-checkbox-restore.test.js — laporan user (screenshot):
 * centang "🔨 Catat juga ke Proyek Renovasi?" waktu Tambah Transaksi berhasil
 * tersimpan -- item-nya benar nongol di fitur Proyek Renovasi (paid:true,
 * ter-link via t.renovProjectLinkId/t.renovItemLinkId) -- TAPI begitu
 * transaksi yang SAMA dibuka lagi lewat Edit, checkbox-nya tampil KOSONG
 * (tidak tercentang), padahal datanya sendiri aman/tidak hilang.
 *
 * ROOT CAUSE: editTx() (transaksi.js) SELALU memaksa
 * `document.getElementById('txAddRenov').checked=false` tanpa syarat --
 * beda dgn panel "Tambah ke Stok Shop juga?" (shopChk) tepat di bawahnya,
 * yang memang mengecek dulu apakah transaksi itu punya link sebelum
 * menentukan status checkbox. Panel Renov tidak pernah disinkronkan balik
 * ke `t.renovProjectLinkId`/`t.renovItemLinkId` sama sekali.
 *
 * FIX: editTx() sekarang cari proyek Renov yang match
 * `t.renovProjectLinkId` (kalau `t.renovItemLinkId` juga ada) SEBELUM
 * menentukan status checkbox -- sama pola dengan shopChk/hasShopStock --
 * lalu isi ulang dropdown Proyek Renovasi-nya juga.
 *
 * Catatan: fix ini MURNI restorasi tampilan form Edit. Guard
 * `existingTx.renovItemLinkId` di _saveTxInner (lihat s433) sudah mencegah
 * applyTxRenovFromTx() jalan dobel kalau transaksi ini disimpan ulang --
 * jadi checkbox tercentang saat Edit TIDAK memicu item Renov baru lagi.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(overrides = {}) {
  return Object.assign({
    value: '', checked: false, textContent: '', innerHTML: '', disabled: false,
    style: {}, classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    options: [],
  }, overrides);
}

function makeFakeDoc() {
  const els = {};
  const doc = { getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; } };
  return { doc, els };
}

function makeCtx({ document, D }) {
  return loadSource(
    ['modules/finance/tx-renov.js', 'modules/finance/transaksi.js', 'modules/finance/transaksi-b.js'],
    {
      document, D,
      curTxType: 'expense', curPayMethod: 'tunai', txEditId: null,
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => s,
      WorthIt: { pendingBuyId: null, applyBuyLink() {}, onLinkedTxEdited() {} },
      populateAccFilters() {}, setTxType() {}, updateTxAssetWrapVisibility() {},
      // Panel lain (Stok Sparepart/BBM/Shop Stock/Shop Sale) sengaja di-stub
      // no-op -- tidak relevan utk kasus Renov ini, & file aslinya
      // (tx-stok-sparepart.js dkk) sengaja tidak ikut di-load di test ini.
      toggleTxStockFields() {}, populateTxStockSelect() {},
      toggleTxBbmFields() {}, populateTxBbmVehicleSelect() {},
      toggleTxShopStockFields() {}, populateTxShopStockSelect() {}, resetShopStockCart() {}, renderShopStockCartList() {},
      toggleTxShopSaleFields() {}, populateTxShopSaleSelect() {}, resetTxShopSaleCart() {}, renderTxShopSaleCartList() {},
      isShopStockCatName: () => false,
      updateCicilanTenorUI() {}, syncCicilanPreview() {}, openModal() {},
    },
  );
}

function baseTx(overrides = {}) {
  return Object.assign({
    id: 100, type: 'expense', amount: 200000, category: 'Renov', subcategory: 'kamar mandi',
    accountId: 'a1', payMethod: 'tunai', note: 'Bayar: closet ina', date: '2026-08-05',
  }, overrides);
}

test('BUGFIX s452: editTx() transaksi yang SUDAH ter-link ke item Renov -> checkbox "Catat juga ke Proyek Renovasi?" tampil TERCENTANG & proyeknya terisi (bukan kosong lagi)', () => {
  const D = {
    transactions: [baseTx({ renovProjectLinkId: 'p1', renovItemLinkId: 'it1' })],
    accounts: [{ id: 'a1', name: 'Majoris' }],
    renovProjects: [{ id: 'p1', name: 'Renov Kamar Mandi', items: [{ id: 'it1', name: 'closet ina', harga: 200000, paid: true, txId: 100 }] }],
  };
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({ document: doc, D });

  ctx.editTx(100);

  assert.equal(els.txAddRenov.checked, true, 'checkbox txAddRenov harus TERCENTANG krn transaksi ini sudah ter-link ke item Renov');
  assert.equal(els.txRenovProject.value, 'p1', 'dropdown Proyek Renovasi harus terisi ulang ke proyek yang sudah ter-link');
});

test('regresi: editTx() transaksi yang BELUM ter-link ke Renov manapun -> checkbox tetap KOSONG (perilaku lama tidak berubah)', () => {
  const D = {
    transactions: [baseTx()],
    accounts: [{ id: 'a1', name: 'Majoris' }],
    renovProjects: [{ id: 'p1', name: 'Renov Kamar Mandi', items: [] }],
  };
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({ document: doc, D });

  ctx.editTx(100);

  assert.equal(els.txAddRenov.checked, false, 'checkbox txAddRenov harus tetap KOSONG krn transaksi ini belum pernah ter-link ke Renov manapun');
});

test('regresi: editTx() transaksi ter-link tapi proyek Renov-nya sudah TERHAPUS -> checkbox jatuh ke KOSONG (bukan error/undefined)', () => {
  const D = {
    transactions: [baseTx({ renovProjectLinkId: 'p-sudah-hapus', renovItemLinkId: 'it1' })],
    accounts: [{ id: 'a1', name: 'Majoris' }],
    renovProjects: [],
  };
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({ document: doc, D });

  assert.doesNotThrow(() => ctx.editTx(100));
  assert.equal(els.txAddRenov.checked, false, 'proyek yang sudah dihapus tidak boleh bikin checkbox tercentang ke data yang tidak ada');
});
