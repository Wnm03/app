'use strict';
/**
 * s316-tagihan-tx-edit-billlink-sync.test.js — Sesi 316: transaksi pembayaran
 * tagihan kind:'tagihan' (mis. PBB -- bukan cicilan/langganan/utang), baik yang
 * masih aktif di D.bills maupun sudah lunas/diarsip di D.billsArchive, yang
 * diedit lewat modal Transaksi biasa (bukan lewat 📋 Riwayat Pembayaran di tab
 * Tagihan) sebelumnya jatuh ke cabang paling generik di _saveTxInner()
 * (transaksi.js): billLinkId DIHAPUS diam-diam & completedAt arsip TIDAK
 * PERNAH disinkron -- tautan ke tagihan putus permanen begitu diedit dari
 * sisi Transaksi.
 *
 * FIX: cabang baru di _saveTxInner() yang mendeteksi existingTx.billLinkId
 * menunjuk ke bill kind:'tagihan' (dicari di D.bills ATAU D.billsArchive) --
 * billLinkId dipertahankan, dan kalau ini pembayaran TERAKHIR
 * (isLatestBillPaymentTx(), reuse dari tagihan-kalender.js/fix s288),
 * completedAt arsip ikut disinkron ke tanggal baru.
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

function makeCtx({ document, D, isLatest, calls, aibusEvents }) {
  return loadSource(['modules/finance/transaksi.js'], {
    document,
    D,
    curPayMethod: 'tunai',
    curTxType: 'expense',
    txEditId: 100,
    txEditLinkedBillId: null,
    _txPayMethodTouchedByUser: false,
    _txCatLearnSource: null,
    evalAmtExpr: () => {},
    toast: (m) => calls.push('toast:' + m),
    save: () => calls.push('save'),
    closeModal: (id) => calls.push('closeModal:' + id),
    renderDashboard: () => calls.push('renderDashboard'),
    renderKeuangan: () => calls.push('renderKeuangan'),
    renderBillList: () => calls.push('renderBillList'),
    checkBills: () => calls.push('checkBills'),
    isLatestBillPaymentTx: () => isLatest,
    rememberLastAccForCat: () => {},
    AIBus: { emit: (evt, payload) => aibusEvents.push({ evt, payload }) },
    renderCnTab: () => calls.push('renderCnTab'),
    applyTxStockFromTx: () => {},
    applyTxBbmFromTx: () => {},
    applyTxShopStockFromTx: () => {},
    applyTxShopSaleFromTx: () => {},
    WorthIt: { applyBuyLink: () => {}, onLinkedTxEdited: () => {} },
  });
}

function baseTx(overrides = {}) {
  return Object.assign({
    id: 100, type: 'expense', amount: 50000, category: 'Tagihan', subcategory: '',
    accountId: 'a1', payMethod: 'tunai', note: 'PBB', date: '2026-01-01', billLinkId: 'bill1',
  }, overrides);
}

function baseFields(overrides = {}) {
  return Object.assign({
    txAmt: '75000', txSubCat: '', txDate: '2026-02-02', txNote: 'PBB', txCat: 'Tagihan', txAcc: 'a1',
  }, overrides);
}

test('tagihan LUNAS/diarsip (D.billsArchive), pembayaran TERBARU — billLinkId dipertahankan & completedAt arsip disinkron', async () => {
  const D = {
    transactions: [baseTx()],
    bills: [],
    billsArchive: [{ id: 'bill1', kind: 'tagihan', name: 'PBB', completedAt: '2026-01-01' }],
    accounts: [{ id: 'a1', name: 'Cash' }],
  };
  const calls = []; const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, isLatest: true, calls, aibusEvents });

  await ctx._saveTxInner();

  assert.equal(D.transactions[0].billLinkId, 'bill1', 'billLinkId TIDAK boleh dihapus');
  assert.equal(D.transactions[0].amount, 75000);
  assert.equal(D.transactions[0].date, '2026-02-02');
  assert.equal(D.billsArchive[0].completedAt, '2026-02-02', 'completedAt arsip ikut disinkron');
  assert.ok(calls.some((c) => c.startsWith('toast:✅') && c.includes('tanggal arsip ikut disinkron')));
});

test('tagihan LUNAS/diarsip, pembayaran LAMA (bukan terbaru) — billLinkId dipertahankan tapi completedAt arsip TIDAK disentuh', async () => {
  const D = {
    transactions: [baseTx()],
    bills: [],
    billsArchive: [{ id: 'bill1', kind: 'tagihan', name: 'PBB', completedAt: '2026-05-05' }],
    accounts: [{ id: 'a1', name: 'Cash' }],
  };
  const calls = []; const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, isLatest: false, calls, aibusEvents });

  await ctx._saveTxInner();

  assert.equal(D.transactions[0].billLinkId, 'bill1', 'billLinkId TIDAK boleh dihapus meski bukan pembayaran terbaru');
  assert.equal(D.billsArchive[0].completedAt, '2026-05-05', 'completedAt arsip tidak berubah utk pembayaran lama');
  assert.ok(calls.some((c) => c.startsWith('toast:ℹ️') && c.includes('pembayaran tagihan lama')));
});

test('tagihan MASIH AKTIF (D.bills, belum diarsipkan) — billLinkId dipertahankan, tidak ada completedAt utk disinkron', async () => {
  const D = {
    transactions: [baseTx()],
    bills: [{ id: 'bill1', kind: 'tagihan', name: 'PBB', nextDue: '2026-03-01' }],
    billsArchive: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
  };
  const calls = []; const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, isLatest: true, calls, aibusEvents });

  await ctx._saveTxInner();

  assert.equal(D.transactions[0].billLinkId, 'bill1', 'billLinkId TIDAK boleh dihapus utk tagihan aktif');
  assert.equal(D.transactions[0].amount, 75000);
  assert.equal(D.bills[0].completedAt, undefined, 'bill aktif belum lunas, tidak punya completedAt');
});

test('regresi: kind lain (cicilan) TIDAK kena cabang baru ini -- tetap lewat cabang cicilan existing', async () => {
  const D = {
    transactions: [baseTx({ payMethod: 'cicilan' })],
    bills: [{ id: 'bill1', kind: 'cicilan', name: 'Motor', amount: 500000, nextDue: '2026-03-01', tenor: 12 }],
    billsArchive: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
  };
  const calls = []; const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields());
  // curPayMethod !== 'tagihan' (chip cicilan tetap 'tunai' di skenario ini) --
  // pastikan tidak nyasar ke cabang tagihan baru krn kind bill-nya bukan 'tagihan'.
  const ctx = makeCtx({ document: doc, D, isLatest: true, calls, aibusEvents });

  await ctx._saveTxInner();

  // Cabang generik (bukan cabang tagihan baru) yang menangani ini -- billLinkId
  // dihapus sesuai perilaku existing utk kind selain utang/tagihan saat
  // curPayMethod !== existingBill.kind (di luar scope fix s316 ini).
  assert.equal(D.transactions[0].billLinkId, undefined);
});
