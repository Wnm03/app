'use strict';
/**
 * s710-tx-servis-edit-checkbox-restore.test.js — laporan user (screenshot):
 * transaksi yang sudah tersinkron ke Catatan Servis (t.servisLinkId ada &
 * baris D.servisLogs-nya masih ada) dibuka lagi lewat Edit, lalu user
 * re-centang manual "🔧 Sinkron ke Catatan Servis juga?" -- dropdown
 * Kendaraan cuma default ke kendaraan aktif (kebetulan cocok), TAPI field
 * "Jenis Servis/Item" & "Odometer/KM" tampil KOSONG, padahal datanya aman
 * di D.servisLogs. Kelihatan seperti "data hilang".
 *
 * ROOT CAUSE: editTx() (transaksi.js) SELALU memaksa
 * `document.getElementById('txSyncServis').checked=false` tanpa syarat &
 * TIDAK PERNAH mengisi ulang txServisVehicle/txServisItem/txServisKm --
 * beda dgn panel Renov (txAddRenov, fix s452) tepat di atasnya, yang
 * memang mengecek dulu apakah transaksi itu punya link sebelum menentukan
 * status checkbox + isi ulang datanya.
 *
 * FIX: editTx() sekarang cari baris D.servisLogs yang match
 * t.servisLinkId SEBELUM menentukan status checkbox txSyncServis -- sama
 * pola dengan txAddRenov/hasShopStock -- lalu isi ulang
 * txServisVehicle/txServisItem/txServisKm dari data tersimpan.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(overrides = {}) {
  return Object.assign({
    value: '', checked: false, textContent: '', innerHTML: '', disabled: false,
    style: {}, classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    options: [],
    insertAdjacentHTML(pos, html) {
      const m = /value="([^"]*)"/.exec(html);
      if (m) this.options.push({ value: m[1] });
    },
  }, overrides);
}

function makeFakeDoc() {
  const els = {};
  const doc = { getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; } };
  return { doc, els };
}

function makeCtx({ document, D }) {
  return loadSource(
    ['modules/finance/tx-servis.js', 'modules/finance/transaksi.js', 'modules/finance/transaksi-b.js'],
    {
      document, D,
      curTxType: 'expense', curPayMethod: 'tunai', txEditId: null,
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => s,
      WorthIt: { pendingBuyId: null, applyBuyLink() {}, onLinkedTxEdited() {} },
      populateAccFilters() {}, setTxType() {}, updateTxAssetWrapVisibility() {},
      // Panel lain (Stok Sparepart/BBM/Shop Stock/Shop Sale/Renov) sengaja
      // di-stub no-op -- tidak relevan utk kasus Servis ini.
      toggleTxStockFields() {}, populateTxStockSelect() {},
      toggleTxBbmFields() {}, populateTxBbmVehicleSelect() {},
      toggleTxShopStockFields() {}, populateTxShopStockSelect() {}, resetShopStockCart() {}, renderShopStockCartList() {},
      toggleTxShopSaleFields() {}, populateTxShopSaleSelect() {}, resetTxShopSaleCart() {}, renderTxShopSaleCartList() {},
      setTxRenovStatus() {}, toggleTxRenovFields() {},
      isShopStockCatName: () => false,
      updateCicilanTenorUI() {}, syncCicilanPreview() {}, openModal() {},
      populateTxServisVehicleSelect() {},
    },
  );
}

function baseTx(overrides = {}) {
  return Object.assign({
    id: 200, type: 'expense', amount: 50000, category: 'Kendaraan', subcategory: 'Servis',
    accountId: 'a1', payMethod: 'tunai', note: 'Ganti oli', date: '2026-08-05',
  }, overrides);
}

test('BUGFIX s710: editTx() transaksi yang SUDAH ter-link ke baris Servis -> checkbox "Sinkron ke Catatan Servis" tercentang & Kendaraan/Jenis Servis/KM terisi ulang (bukan kosong lagi)', () => {
  const D = {
    transactions: [baseTx({ servisLinkId: 's1' })],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    servisLogs: [{ id: 's1', vehicleId: 'v1', item: 'Ganti oli mesin', km: 12500, cost: 50000, date: '2026-08-05' }],
  };
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({ document: doc, D });

  ctx.editTx(200);

  assert.equal(els.txSyncServis.checked, true, 'checkbox txSyncServis harus TERCENTANG krn transaksi ini sudah ter-link ke baris Servis');
  assert.equal(els.txServisVehicle.value, 'v1', 'dropdown Kendaraan harus terisi ulang ke kendaraan yang tersimpan di D.servisLogs');
  assert.equal(els.txServisItem.value, 'Ganti oli mesin', 'field Jenis Servis/Item harus terisi ulang, bukan kosong');
  assert.equal(els.txServisKm.value, 12500, 'field Odometer/KM harus terisi ulang, bukan kosong');
});

test('regresi: editTx() transaksi yang BELUM ter-link ke Servis manapun -> checkbox tetap KOSONG (perilaku lama tidak berubah)', () => {
  const D = {
    transactions: [baseTx()],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    servisLogs: [],
  };
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({ document: doc, D });

  ctx.editTx(200);

  assert.equal(els.txSyncServis.checked, false, 'checkbox txSyncServis harus tetap KOSONG krn transaksi ini belum pernah ter-link ke Servis manapun');
  assert.equal(doc.getElementById('txServisItem').value, '', 'field Jenis Servis/Item harus tetap kosong');
});

test('regresi: editTx() transaksi ter-link tapi baris Servis-nya sudah TERHAPUS -> checkbox jatuh ke KOSONG (bukan error/undefined)', () => {
  const D = {
    transactions: [baseTx({ servisLinkId: 's-sudah-hapus' })],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    servisLogs: [],
  };
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({ document: doc, D });

  assert.doesNotThrow(() => ctx.editTx(200));
  assert.equal(els.txSyncServis.checked, false, 'baris Servis yang sudah dihapus tidak boleh bikin checkbox tercentang ke data yang tidak ada');
});
