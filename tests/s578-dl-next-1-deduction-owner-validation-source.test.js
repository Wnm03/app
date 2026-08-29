'use strict';
/**
 * s578-dl-next-1-deduction-owner-validation-source.test.js — Sesi S578,
 * implementasi DL-Next-1 (DESIGN-LOCK-OWNER-RESOLVER-AUDIT-3-6-FOLLOWUP.md
 * / AUDIT-1-7-OWNER-RESOLVER-LANJUTAN.md Audit-3A).
 *
 * Bug source-mismatch: guard wajib-pilih di _saveTxInner() (S574-D1) pakai
 * getAccOwners(accId).isMultiOwner -- yang HANYA baca acc.owners[]/
 * acc.ownership, TIDAK PERNAH cek aset tertaut. Sementara UI (
 * updateTxDeductionOwnerVisibility(), Sesi Res-C) sudah pakai
 * resolveOwnerDefaultForAccount(accId) yang IKUT baca aset tertaut
 * (findLinkedAssetForAccount() -> MultiOwnerEngine.getOwners()).
 *
 * Skenario reachable dari UI biasa: akun TIDAK punya acc.owners[] sendiri,
 * tapi TERTAUT ke aset multi-owner valid (owners[] total 100%). UI
 * menampilkan dropdown wajib pilih (2 kandidat dari aset), tapi validasi
 * simpan lama TIDAK terpicu (getAccOwners() buta terhadap aset tertaut)
 * -> transaksi tersimpan tanpa deductionOwnerId walau UI bilang wajib.
 *
 * Fix DL-Next-1: ganti basis validasi ke resolveOwnerDefaultForAccount(
 * accId).owners.length>1 -- SUMBER SAMA dengan UI. 0 perubahan aturan
 * pemilihan owner (Design Lock §2.1/§2.2 lama tetap utuh).
 *
 * Pola makeCtx mengikuti tests/s574-d2-deduction-owner-persist-validation.test.js
 * (load source ASLI transaksi.js via loadSource(), stub tipis efek-samping).
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
    ['modules/finance/transaksi.js', 'modules/finance/transaksi-b.js'],
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
      applyTxTitipanLinkageOnSave: () => {},
      applyTxStockFromTx: () => {},
      applyTxBbmFromTx: () => {},
      applyTxShopStockFromTx: () => {},
      applyTxShopSaleFromTx: () => {},
      WorthIt: { applyBuyLink: () => {}, onLinkedTxEdited: () => {} },
      SewaKios: { applyPaymentLink: () => {}, onLinkedTxEdited: () => {} },
      Tukang: { applyPendingPayment: () => {} },
      sameId: (a, b) => String(a) === String(b),
      findPossibleDuplicateTx: () => null,
      uid: (() => { let n = 9500; return () => String(n += 1); })(),
      escapeHtml: (s) => s,
      resetShopStockCart: () => {},
      toggleTxShopStockFields: () => {},
      resetTxShopSaleCart: () => {},
      toggleTxShopSaleFields: () => {},
      toggleTxBbmFields: () => {},
      toggleTxServisFields: () => {},
      updateCicilanTenorUI: () => {},
      syncCicilanPreview: () => {},
      setPayMethod: () => {},
      resetPayMethodLock: () => {},
      openModal: () => {},
      // getAccOwners() -- stub tipis, HANYA baca acc.owners[] (kontrak lama
      // S574-A). Sengaja TIDAK tahu-menahu soal aset tertaut -- ini pusat
      // bug yang diperbaiki DL-Next-1 (validasi lama pakai fungsi ini).
      getAccOwners: (accId) => {
        const acc = (D.accounts || []).find((a) => String(a.id) === String(accId));
        if (!acc) return { ok: true, owners: [], isSynthesized: true, isMultiOwner: false };
        const owners = acc.owners || [];
        return { ok: true, owners, isMultiOwner: owners.length > 1 };
      },
      getAccOwnersRaw: (accId) => {
        const acc = (D.accounts || []).find((a) => String(a.id) === String(accId));
        if (!acc || !Array.isArray(acc.owners)) return { ok: true, owners: [] };
        return { ok: true, owners: acc.owners };
      },
      getAccOwnersEffective: (accId) => {
        const acc = (D.accounts || []).find((a) => String(a.id) === String(accId));
        if (!acc) return { ok: true, owners: [], needsConfirm: false };
        const owners = acc.owners || [];
        if (owners.length > 0) return { ok: true, owners, needsConfirm: false };
        return { ok: true, owners: [], needsConfirm: false };
      },
      // MultiOwnerEngine.getOwners() -- stub kontrak nyata (bukan {} kosong
      // seperti s574-d2): test ini SENGAJA punya D.assets tertaut supaya
      // findLinkedAssetForAccount() (transaksi.js, sudah ada) menemukan
      // aset & resolveOwnerDefaultForAccount() lanjut ke source:'asset'.
      MultiOwnerEngine: {
        getOwners: (asset) => {
          const owners = (asset && asset.owners) || [];
          const total = owners.reduce((s, o) => s + (o.porsi || 0), 0);
          const valid = owners.length > 0 && Math.abs(total - 100) < 0.01;
          return { ok: true, owners, isSynthesized: !valid };
        },
      },
    },
  );
}

function baseFields(overrides = {}) {
  return Object.assign({
    txAmt: '100000', txSubCat: '', txDate: '2026-08-01', txNote: 'Test DL-Next-1',
    txCat: 'Belanja', txAcc: 'acc-linked-no-ownersfield', txAssetId: '',
  }, overrides);
}

function makeD(overrides = {}) {
  return Object.assign({
    transactions: [],
    bills: [],
    cobek: [],
    products: [],
    // Akun TIDAK punya acc.owners[] sendiri (default/kosong) -- persis
    // skenario Audit-3A: getAccOwners().isMultiOwner akan balik FALSE.
    accounts: [
      { id: 'acc-linked-no-ownersfield', name: 'Rekening Tertaut Aset', balance: 1000000 },
    ],
    // Aset multi-owner valid (total 100%) TERTAUT ke akun di atas via
    // accountId -- findLinkedAssetForAccount() akan menemukannya.
    assets: [
      { id: 'aset-1', name: 'Ruko Patungan', accountId: 'acc-linked-no-ownersfield', owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 20 }, { ownerId: 'o2', ownerName: 'Ani', porsi: 80 }] },
    ],
  }, overrides);
}

// 1. RED (sebelum fix) / GREEN (sesudah fix): akun tanpa owners[] sendiri +
// tertaut aset multi-owner valid + user TIDAK pilih -> save WAJIB ditolak,
// bukan lolos diam-diam seperti sebelum DL-Next-1.
test('DL-Next-1 [1/3]: akun tanpa owners[] sendiri + tertaut aset multi-owner + tidak pilih owner -> save ditolak (source-mismatch fixed)', async () => {
  const D = makeD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txDeductionOwner: '' }));
  const ctx = makeCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.equal(D.transactions.length, 0, 'transaksi TIDAK boleh tersimpan tanpa pilih owner walau acc.owners[] sendiri kosong, karena aset tertaut multi-owner');
  const toastCalls = calls.filter((c) => 'msg' in c);
  assert.equal(toastCalls.length, 1);
  assert.match(toastCalls[0].msg, /Pemilik Sumber Potongan/);
});

// 2. Kombinasi sama, TAPI user memilih owner -> save berhasil, deductionOwnerId
// tersimpan sesuai pilihan (memastikan fix tidak overblocking).
test('DL-Next-1 [2/3]: akun tanpa owners[] sendiri + tertaut aset multi-owner + PILIH owner -> save berhasil, deductionOwnerId tersimpan', async () => {
  const D = makeD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txDeductionOwner: 'o2' }));
  const ctx = makeCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].deductionOwnerId, 'o2');
});

// 3. Regresi negatif: akun benar-benar single-owner (0 acc.owners[], 0 aset
// tertaut) -> guard TIDAK boleh terpicu, save tetap lolos tanpa deductionOwnerId
// (perilaku lama utk akun biasa harus tetap sama persis).
test('DL-Next-1 [3/3]: akun single-owner murni (tanpa acc.owners[] & tanpa aset tertaut) -> guard tidak terpicu, save tetap lolos', async () => {
  const D = makeD({
    accounts: [{ id: 'acc-single-murni', name: 'Cash', balance: 500000 }],
    assets: [],
  });
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txAcc: 'acc-single-murni', txDeductionOwner: '' }));
  const ctx = makeCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.equal(D.transactions.length, 1, 'akun tanpa multi-owner sama sekali harus tetap bisa disimpan tanpa friksi baru');
  assert.equal('deductionOwnerId' in D.transactions[0], false);
});
