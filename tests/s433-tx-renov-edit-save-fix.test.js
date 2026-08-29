'use strict';
/**
 * s433-tx-renov-edit-save-fix.test.js — audit fitur panel "🔨 Catat juga ke
 * Proyek Renovasi?" pada txModal (Tambah/Edit Transaksi Keuangan).
 *
 * BUG (dilaporkan user): panel bisa dicentang & diisi (pilih proyek + status)
 * saat EDIT transaksi yang sudah ada, tapi centangnya TIDAK PERNAH tersimpan
 * -- tidak ada item Renovasi baru yang dibuat, tidak ada error/toast, seolah
 * tidak terjadi apa-apa.
 *
 * ROOT CAUSE: _saveTxInner() (transaksi.js) memanggil applyTxRenovFromTx()
 * dengan guard `if(!existingTx&&...)` -- HANYA berlaku utk transaksi BARU.
 * Beda dgn applyTxStockFromTx/applyTxBbmFromTx/applyTxShopStockFromTx/
 * applyTxShopSaleFromTx yang SEMUANYA dipanggil tanpa syarat existingTx
 * (masing-masing menangani sendiri kasus new vs edit lewat parameter
 * existingTx yang diteruskan ke dalamnya).
 *
 * FIX: guard diubah jadi `if((!existingTx||!existingTx.renovItemLinkId)&&...)`
 * -- tetap dipanggil utk transaksi baru (existingTx null) MAUPUN transaksi
 * yang diedit SELAMA belum pernah ter-link ke item Renovasi manapun. Kalau
 * transaksi yang diedit SUDAH ter-link (existingTx.renovItemLinkId ada),
 * applyTxRenovFromTx() di-skip supaya tidak dobel -- re-sync utk kasus itu
 * sudah ditangani terpisah oleh Renov.onLinkedTxEdited() (baris lain di
 * _saveTxInner, tidak berubah/tidak disentuh sesi ini).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(values) {
  const els = {};
  Object.keys(values).forEach((id) => {
    const v = values[id];
    els[id] = (typeof v === 'boolean') ? { checked: v } : { value: v };
  });
  return { doc: { getElementById: (id) => els[id] || null }, els };
}

function makeCtx({ document, D, calls, renovCalls, onLinkedTxEditedCalls, txEditId = 100 }) {
  return loadSource(['modules/finance/transaksi.js', 'modules/finance/transaksi-b.js'], {
    document,
    D,
    curPayMethod: 'tunai',
    curTxType: 'expense',
    txEditId,
    _txPayMethodTouchedByUser: false,
    _txCatLearnSource: null,
    evalAmtExpr: () => {},
    toast: (m) => calls.push('toast:' + m),
    save: () => calls.push('save'),
    closeModal: (id) => calls.push('closeModal:' + id),
    renderDashboard: () => calls.push('renderDashboard'),
    renderKeuangan: () => calls.push('renderKeuangan'),
    renderCnTab: () => calls.push('renderCnTab'),
    rememberLastAccForCat: () => {},
    AIBus: { emit: () => {} },
    applyTxStockFromTx: () => {},
    applyTxBbmFromTx: () => {},
    applyTxShopStockFromTx: () => {},
    applyTxShopSaleFromTx: () => {},
    applyTxRenovFromTx: (note, txId, date, amt, cat, accId) => {
      renovCalls.push({ note, txId, date, amt, cat, accId });
    },
    WorthIt: { applyBuyLink: () => {}, onLinkedTxEdited: () => {} },
    Renov: { onLinkedTxEdited: (t) => onLinkedTxEditedCalls.push(t.id) },
    findPossibleDuplicateTx: () => null,
    SewaKios: { applyPaymentLink: () => {} },
    Tukang: { applyPendingPayment: () => {} },
    uid: (() => { let n = 2000; return () => String(n += 1); })(),
  });
}

function baseTx(overrides = {}) {
  return Object.assign({
    id: 100, type: 'expense', amount: 200000, category: 'Renov', subcategory: '',
    accountId: 'a1', payMethod: 'tunai', note: 'Semen', date: '2026-01-01',
  }, overrides);
}

function baseFields(overrides = {}) {
  return Object.assign({
    txAmt: '250000', txSubCat: '', txDate: '2026-01-05', txNote: 'Semen', txCat: 'Renov', txAcc: 'a1',
  }, overrides);
}

test('BUGFIX: edit transaksi (belum ter-link) + panel Renov dicentang -> applyTxRenovFromTx TETAP dipanggil, bukan diabaikan', async () => {
  const D = {
    transactions: [baseTx()],
    accounts: [{ id: 'a1', name: 'Cash' }],
    renovProjects: [{ id: 'p1', name: 'Renovasi Kamar Mandi', items: [] }],
  };
  const calls = []; const renovCalls = []; const onLinkedTxEditedCalls = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, calls, renovCalls, onLinkedTxEditedCalls });

  await ctx._saveTxInner();

  assert.equal(renovCalls.length, 1, 'applyTxRenovFromTx harus terpanggil sekali saat edit transaksi yang belum ter-link Renov');
  assert.equal(renovCalls[0].txId, 100);
  assert.equal(renovCalls[0].amt, 250000);
  assert.equal(onLinkedTxEditedCalls.length, 0, 'Renov.onLinkedTxEdited tidak boleh terpanggil krn transaksi ini belum ter-link sebelumnya');
});

test('regresi: edit transaksi yang SUDAH ter-link ke item Renov -> applyTxRenovFromTx TIDAK dipanggil lagi (cegah dobel), re-sync tetap lewat onLinkedTxEdited', async () => {
  const D = {
    transactions: [baseTx({ renovProjectLinkId: 'p1', renovItemLinkId: 'it1' })],
    accounts: [{ id: 'a1', name: 'Cash' }],
    renovProjects: [{ id: 'p1', name: 'Renovasi Kamar Mandi', items: [{ id: 'it1', name: 'Semen', harga: 200000, paid: true, txId: 100 }] }],
  };
  const calls = []; const renovCalls = []; const onLinkedTxEditedCalls = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, calls, renovCalls, onLinkedTxEditedCalls });

  await ctx._saveTxInner();

  assert.equal(renovCalls.length, 0, 'applyTxRenovFromTx TIDAK boleh terpanggil lagi utk transaksi yang sudah ter-link (cegah item dobel)');
  assert.equal(onLinkedTxEditedCalls.length, 1, 'Renov.onLinkedTxEdited tetap terpanggil utk re-sync harga/tanggal item yang sudah ter-link');
  assert.equal(onLinkedTxEditedCalls[0], 100);
});

test('regresi: transaksi BARU (bukan edit) -> applyTxRenovFromTx tetap terpanggil seperti sebelumnya (perilaku lama tidak berubah)', async () => {
  const D = {
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    renovProjects: [{ id: 'p1', name: 'Renovasi Kamar Mandi', items: [] }],
  };
  const calls = []; const renovCalls = []; const onLinkedTxEditedCalls = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, calls, renovCalls, onLinkedTxEditedCalls, txEditId: null });

  await ctx._saveTxInner();

  assert.equal(renovCalls.length, 1, 'applyTxRenovFromTx harus tetap terpanggil utk transaksi baru');
  assert.equal(onLinkedTxEditedCalls.length, 0);
});
