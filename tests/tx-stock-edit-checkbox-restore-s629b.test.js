'use strict';
/**
 * tx-stock-edit-checkbox-restore-s629b.test.js — laporan user lanjutan:
 * centang "📦 Tambah ke Stok Sparepart juga?" waktu Tambah Transaksi
 * berhasil tersimpan (stok bertambah, tx.partStockId ter-link) -- TAPI
 * begitu transaksi yang SAMA dibuka lagi lewat Edit, checkbox-nya tampil
 * KOSONG & field (dropdown/qty/satuan) ikut kosong, PERSIS pola bug yang
 * sudah pernah diperbaiki utk Renov (lihat
 * s452-tx-renov-edit-checkbox-restore.test.js) & sudah benar dari awal utk
 * Shop Stock (hasShopStock).
 *
 * INI LEBIH PARAH DARI SEKEDAR TAMPILAN: editTx() SELALU memaksa
 * `txAddStock`.checked=false tanpa syarat (beda dgn shopChk/renovChkEdit
 * yang mengecek link dulu). Blok di _saveTxInner()
 * (`if(existingTx&&existingTx.partStockId){ ... if(!stillChecked||
 * !panelVisible){ revertStockPurchase(...); delete existingTx.
 * partStockId; ... } }`) membaca checkbox yang terpaksa unchecked ini
 * sbg "user MEMATIKAN centangnya" -> stok yang sudah ditambah otomatis
 * DI-REVERT (qty dikurangi balik) & link dihapus begitu transaksi dibuka
 * lewat Edit lalu Simpan, APAPUN yang diubah -- walau user tidak pernah
 * menyentuh panel Stok Sparepart sama sekali. Test 1-3 di bawah
 * mendokumentasikan restorasi form Edit (pola sama s452). Test 4
 * mendokumentasikan efek yang lebih penting: end-to-end lewat
 * applyTxStockFromTx() (tx-stok-sparepart.js ASLI) membuktikan stok TIDAK
 * lagi ter-revert/link TIDAK lagi terhapus hanya krn transaksi dibuka
 * lewat Edit lalu disimpan ulang tanpa menyentuh panel stok.
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

function makeCtx({ document, D, extra = {} }) {
  return loadSource(
    ['modules/finance/transaksi.js', 'modules/finance/transaksi-b.js'],
    Object.assign({
      document, D,
      curTxType: 'expense', curPayMethod: 'tunai', txEditId: null,
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => s,
      WorthIt: { pendingBuyId: null, applyBuyLink() {}, onLinkedTxEdited() {} },
      populateAccFilters() {}, setTxType() {}, updateTxAssetWrapVisibility() {},
      updateTxDeductionOwnerVisibility() {},
      // Panel lain (BBM/Shop Stock/Shop Sale/Renov) sengaja di-stub no-op --
      // tidak relevan utk kasus Stok Sparepart ini, filenya sengaja tidak
      // ikut di-load (pola sama s452).
      toggleTxBbmFields() {}, populateTxBbmVehicleSelect() {},
      toggleTxShopStockFields() {}, populateTxShopStockSelect() {}, resetShopStockCart() {}, renderShopStockCartList() {},
      toggleTxShopSaleFields() {}, populateTxShopSaleSelect() {}, resetTxShopSaleCart() {}, renderTxShopSaleCartList() {},
      isShopStockCatName: () => false,
      updateCicilanTenorUI() {}, syncCicilanPreview() {}, openModal() {},
      toggleTxServisFields() {}, populateTxServisVehicleSelect() {},
    }, extra),
  );
}

function baseTx(overrides = {}) {
  return Object.assign({
    id: 100, type: 'expense', amount: 225000, category: 'Kendaraan', subcategory: 'Servis & Oli',
    accountId: 'a1', payMethod: 'tunai', note: 'Ganti ban', date: '2026-08-16',
  }, overrides);
}

test('BUGFIX — editTx() transaksi yang SUDAH ter-link ke stok (t.partStockId) -> checkbox "Tambah ke Stok Sparepart" TERCENTANG & dropdown/qty/satuan terisi ulang (bukan kosong lagi)', () => {
  const D = {
    transactions: [baseTx({ partStockId: 'st1', partStockQty: 2, partStockUnit: 'pcs' })],
    accounts: [{ id: 'a1', name: 'BRI' }],
    partsStock: [{ id: 'st1', name: 'Ban depan 80/90', qty: 4, unit: 'pcs' }],
  };
  const { doc, els } = makeFakeDoc();
  let toggleCalls = 0;
  const ctx = makeCtx({ document: doc, D, extra: { toggleTxStockFields: () => { toggleCalls++; }, populateTxStockSelect: () => {} } });

  ctx.editTx(100);

  assert.equal(els.txAddStock.checked, true, 'checkbox txAddStock harus TERCENTANG krn transaksi ini sudah ter-link ke stok');
  assert.equal(els.txStockItem.value, 'st1', 'dropdown Pilih Sparepart harus terisi ulang ke part yang sudah ter-link');
  assert.equal(els.txStockQty.value, 2, 'Jumlah Ditambah harus terisi ulang dari t.partStockQty');
  assert.equal(els.txStockUnit.value, 'pcs', 'Satuan harus terisi ulang dari t.partStockUnit');
  assert.ok(toggleCalls >= 2, 'toggleTxStockFields() harus dipanggil ulang setelah checked=true (supaya panel field ikut tampil)');
});

test('regresi: editTx() transaksi yang BELUM ter-link ke stok manapun -> checkbox tetap KOSONG (perilaku lama tidak berubah)', () => {
  const D = {
    transactions: [baseTx()],
    accounts: [{ id: 'a1', name: 'BRI' }],
    partsStock: [{ id: 'st1', name: 'Ban depan 80/90', qty: 4, unit: 'pcs' }],
  };
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({ document: doc, D, extra: { toggleTxStockFields() {}, populateTxStockSelect() {} } });

  ctx.editTx(100);

  assert.equal(els.txAddStock.checked, false, 'checkbox txAddStock harus tetap KOSONG krn transaksi ini belum pernah ter-link ke stok manapun');
});

test('regresi: editTx() transaksi ter-link tapi baris stoknya sudah TERHAPUS -> checkbox jatuh ke KOSONG (bukan error/undefined)', () => {
  const D = {
    transactions: [baseTx({ partStockId: 'st-sudah-hapus', partStockQty: 2, partStockUnit: 'pcs' })],
    accounts: [{ id: 'a1', name: 'BRI' }],
    partsStock: [],
  };
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({ document: doc, D, extra: { toggleTxStockFields() {}, populateTxStockSelect() {} } });

  assert.doesNotThrow(() => ctx.editTx(100));
  assert.equal(els.txAddStock.checked, false, 'baris stok yang sudah dihapus tidak boleh bikin checkbox tercentang ke data yang tidak ada');
});

test('END-TO-END (bukti bug data-loss sudah tidak terjadi) — Edit transaksi ter-link stok lalu Simpan TANPA menyentuh panel stok -> stok TIDAK ter-revert & link TIDAK terhapus', () => {
  // Load kedua source ASLI (bukan stub) supaya applyTxStockFromTx()/
  // revertStockPurchase() yang SUNGGUHAN dipakai app ikut teruji.
  const D = {
    transactions: [baseTx({ partStockId: 'st1', partStockQty: 2, partStockUnit: 'pcs' })],
    accounts: [{ id: 'a1', name: 'BRI' }],
    partsStock: [{ id: 'st1', name: 'Ban depan 80/90', catId: 'c1', qty: 4, unit: 'pcs', priceHistory: [{ date: '2026-08-16', qty: 2, price: 0, txId: 100, qtyBefore: 2, avgPriceBefore: null }], txRefs: [100], lastTxId: 100 }],
    sparepartCats: [{ id: 'c1', name: 'ban' }],
    servisLogs: [], vehicles: [],
  };
  const { doc, els } = makeFakeDoc();
  const ctx = loadSource(
    ['modules/finance/tx-stok-sparepart.js', 'modules/finance/transaksi.js', 'modules/finance/transaksi-b.js'],
    {
      document: doc, D,
      curTxType: 'expense', curPayMethod: 'tunai', txEditId: null, curVehicleId: null,
      _txPayMethodTouchedByUser: false, _txCatLearnSource: null,
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => s,
      codeFromName: () => 'SP',
      Sparepart: { isPartForVehicle: () => true, renderStockList: () => {}, renderCatList: () => {} },
      WorthIt: { pendingBuyId: null, applyBuyLink() {}, onLinkedTxEdited() {} },
      populateAccFilters() {}, setTxType() {}, updateTxAssetWrapVisibility() {}, updateTxDeductionOwnerVisibility() {},
      toggleTxBbmFields() {}, populateTxBbmVehicleSelect() {},
      toggleTxShopStockFields() {}, populateTxShopStockSelect() {}, resetShopStockCart() {}, renderShopStockCartList() {},
      toggleTxShopSaleFields() {}, populateTxShopSaleSelect() {}, resetTxShopSaleCart() {}, renderTxShopSaleCartList() {},
      isShopStockCatName: () => false,
      updateCicilanTenorUI() {}, syncCicilanPreview() {}, openModal() {}, closeModal() {},
      toggleTxServisFields() {}, populateTxServisVehicleSelect() {},
      applyTxServisFromTx() {}, applyTxBbmFromTx() {}, applyTxShopStockFromTx() {}, applyTxShopSaleFromTx() {}, applyTxRenovFromTx() {},
      SewaKios: { applyPaymentLink() {} }, Tukang: { applyPendingPayment() {} },
      save() {}, toast() {}, renderDashboard() {}, renderKeuangan() {}, renderCnTab() {},
      renderStockList() {}, renderProductList() {}, renderShop() {}, renderShopRecent() {},
      rememberLastAccForCat() {}, AIBus: { emit() {} }, findPossibleDuplicateTx: () => null,
      uid: (() => { let n = 900; return () => (n += 1); })(),
      evalAmtExpr: () => {},
    },
  );

  // Buka Edit — checkbox sekarang harus auto-tercentang lewat fix di atas.
  ctx.editTx(100);
  assert.equal(els.txAddStock.checked, true, 'prasyarat: checkbox harus auto-tercentang dulu (fix editTx)');

  // Isi field wajib txAmt/txDate/txCat/txAcc spy _saveTxInner() lolos validasi dasar.
  els.txAmt.value = '225000';
  els.txDate.value = '2026-08-16';
  els.txCat.value = 'Kendaraan';
  els.txAcc.value = 'a1';
  els.txNote.value = 'Ganti ban (edit catatan saja)';

  return ctx._saveTxInner().then(() => {
    const part = D.partsStock.find((p) => p.id === 'st1');
    const tx = D.transactions.find((t2) => t2.id === 100);
    assert.equal(part.qty, 4, 'BUGFIX: stok TIDAK boleh ter-revert hanya krn tx dibuka Edit lalu Simpan (qty harus tetap 4, bukan balik ke 2)');
    assert.equal(tx.partStockId, 'st1', 'BUGFIX: link partStockId TIDAK boleh terhapus hanya krn Edit-Simpan tanpa menyentuh panel stok');
    assert.equal(tx.note, 'Ganti ban (edit catatan saja)', 'perubahan field lain (catatan) tetap tersimpan seperti biasa');
  });
});
