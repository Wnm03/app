'use strict';
/**
 * s436-tx-renov-e2e-real.test.js — audit lanjutan panel "🔨 Catat juga ke
 * Proyek Renovasi?" pada txModal, sesudah fix s433 (guard existingTx.
 * renovItemLinkId, lihat s433-tx-renov-edit-save-fix.test.js).
 *
 * KENAPA TEST INI BEDA DARI s433: test s433 (dan semua test transaksi.js
 * lain) me-MOCK applyTxRenovFromTx() sepenuhnya lewat extraGlobals -- jadi
 * gap di BAWAH ini tidak pernah tersentuh oleh test manapun sebelumnya.
 * Test ini SENGAJA memuat source ASLI tx-renov.js + transaksi.js +
 * helper-teks.js bareng (bukan mock) lewat loadSource(), supaya perilaku
 * end-to-end yang benar-benar dieksekusi user (checkbox dicentang -> proyek
 * dipilih -> simpan) tercakup.
 *
 * BUG (ditemukan sesi s436): applyTxRenovFromTx() (tx-renov.js) dulu
 * toast() sendiri di akhir -- baik jalur sukses ("🔨 Item ... otomatis
 * dicatat...") maupun jalur peringatan ("⚠️ Pilih dulu Proyek Renovasi-nya").
 * Tapi _saveTxInner() (transaksi.js) SELALU toast() lagi TEPAT SESUDAHNYA
 * ("✅ Transaksi diperbarui/tersimpan"). toast() cuma pegang 1 elemen DOM
 * (lihat format-tema.js: `t.textContent=msg`) jadi toast kedua LANGSUNG
 * menimpa toast pertama dlm hitungan milidetik -- user tidak pernah sempat
 * baca pesan Renov, walau datanya (atau ketiadaannya, utk kasus peringatan)
 * sebenarnya valid di balik layar.
 *
 * FIX: applyTxRenovFromTx() sekarang `return` string pesannya alih-alih
 * toast() sendiri; _saveTxInner() menampung ke `txRenovMsg` & menggabungkan
 * ke toast final (pola sama seperti `txAssetSplitMsg` utk info "dibagi ke N
 * pemilik" yang sudah ada dari sesi 394).
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

function makeCtx({ document, D, calls, txEditId = null }) {
  return loadSource(
    ['modules/shared/helper-teks.js', 'modules/finance/tx-renov.js', 'modules/finance/transaksi.js'],
    {
      document,
      D,
      curPayMethod: 'tunai',
      curTxType: 'expense',
      txEditId,
      _txPayMethodTouchedByUser: false,
      _txCatLearnSource: null,
      evalAmtExpr: () => {},
      toast: (m, dur) => calls.push({ msg: m, dur }),
      save: () => calls.push({ save: true }),
      closeModal: (id) => calls.push({ closeModal: id }),
      renderDashboard: () => {},
      renderKeuangan: () => {},
      renderCnTab: () => {},
      rememberLastAccForCat: () => {},
      AIBus: { emit: () => {} },
      applyTxStockFromTx: () => {},
      applyTxBbmFromTx: () => {},
      applyTxShopStockFromTx: () => {},
      applyTxShopSaleFromTx: () => {},
      WorthIt: { applyBuyLink: () => {}, onLinkedTxEdited: () => {} },
      Renov: { render: () => {}, renderDetail: () => {}, curId: null },
      sameId: (a, b) => String(a) === String(b),
      findPossibleDuplicateTx: () => null,
      SewaKios: { applyPaymentLink: () => {} },
      Tukang: { applyPendingPayment: () => {} },
      uid: (() => { let n = 3000; return () => String(n += 1); })(),
    },
  );
}

function baseFields(overrides = {}) {
  return Object.assign({
    txAmt: '250000', txSubCat: '', txDate: '2026-02-01', txNote: 'Beli Semen', txCat: 'Renov', txAcc: 'a1',
    txAddRenov: true, txRenovProject: 'p1',
  }, overrides);
}

test('E2E (source asli, bukan mock): checkbox dicentang + proyek dipilih -> item Renov beneran dibuat & tertaut, toast final gabungan (BUKAN 2 toast terpisah)', async () => {
  const D = {
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    renovProjects: [{ id: 'p1', name: 'Renovasi Kamar Mandi', items: [] }],
  };
  const calls = [];
  const { doc } = makeFakeDoc(baseFields());
  const fakePanel = { style: { display: 'block' } };
  doc.getElementById = ((orig) => (id) => (id === 'txRenovPanel' ? fakePanel : orig(id)))(doc.getElementById);
  const ctx = makeCtx({ document: doc, D, calls });

  await ctx._saveTxInner();

  // Item Renov beneran dibuat oleh source ASLI (bukan asumsi mock)
  assert.equal(D.renovProjects[0].items.length, 1, 'item Renov harus benar-benar tercipta lewat source asli');
  const item = D.renovProjects[0].items[0];
  assert.equal(item.paid, true);
  assert.equal(item.harga, 250000);

  // Transaksi Keuangan tertaut ke item Renov yang baru dibuat
  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].renovItemLinkId, item.id);
  assert.equal(D.transactions[0].renovProjectLinkId, 'p1');

  // HANYA SATU toast final (bukan toast Renov + toast generik terpisah yg saling menimpa)
  const toastCalls = calls.filter((c) => 'msg' in c);
  assert.equal(toastCalls.length, 1, 'harus cuma 1 toast final -- toast Renov digabung, bukan dipanggil terpisah');
  assert.match(toastCalls[0].msg, /✅ Transaksi tersimpan/);
  assert.match(toastCalls[0].msg, /otomatis dicatat & lunas di proyek "Renovasi Kamar Mandi"/);
});

test('E2E (source asli): checkbox dicentang TAPI proyek belum dipilih -> transaksi tetap tersimpan, item Renov TIDAK dibuat, peringatan ikut muncul di toast final (bukan hilang tertimpa)', async () => {
  const D = {
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    renovProjects: [{ id: 'p1', name: 'Renovasi Kamar Mandi', items: [] }],
  };
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txRenovProject: '' }));
  const fakePanel = { style: { display: 'block' } };
  doc.getElementById = ((orig) => (id) => (id === 'txRenovPanel' ? fakePanel : orig(id)))(doc.getElementById);
  const ctx = makeCtx({ document: doc, D, calls });

  await ctx._saveTxInner();

  // Transaksi Keuangan tetap tersimpan normal (bukan silently dibatalkan)
  assert.equal(D.transactions.length, 1);
  // Tapi TIDAK ada item Renov yang dibuat, krn proyek belum dipilih
  assert.equal(D.renovProjects[0].items.length, 0);

  const toastCalls = calls.filter((c) => 'msg' in c);
  assert.equal(toastCalls.length, 1, 'harus cuma 1 toast final gabungan');
  assert.match(toastCalls[0].msg, /✅ Transaksi tersimpan/);
  assert.match(toastCalls[0].msg, /⚠️ Pilih dulu Proyek Renovasi-nya/);
  // Durasi diperpanjang krn pesan gabungan lebih panjang dari toast biasa
  assert.equal(toastCalls[0].dur, 4000);
});
