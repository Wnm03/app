'use strict';
/**
 * s574-d2-deduction-owner-persist-validation.test.js — Sesi S574-D2,
 * validasi behavioral atas persistensi `deductionOwnerId` yang diselesaikan
 * di S574-D1 (lihat AUDIT-S574-PEMILIK-SUMBER-POTONGAN.md Tahap 4). Test
 * ini TIDAK mengaudit ulang & TIDAK menambah fitur baru -- murni memvalidasi
 * 8 skenario wajib dari sesi S574-D2 lewat pemanggilan _saveTxInner()/
 * editTx() source ASLI (bukan mock), dengan getAccOwners() di-stub ringan
 * (kontraknya sudah diverifikasi terpisah di S574-A) mengikuti pola makeCtx
 * pada s436-tx-renov-e2e-real.test.js (mock fungsi efek-samping, load
 * source asli untuk fungsi yang divalidasi).
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
      uid: (() => { let n = 9000; return () => String(n += 1); })(),
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
      // getAccOwners() -- stub tipis merefleksikan kontrak MultiOwnerEngine.
      // getOwners() (sudah diverifikasi terpisah di S574-A/akun.js): akun
      // dgn owners[].length>1 -> isMultiOwner:true, selainnya false. TIDAK
      // ada logic porsi/split ditulis di sini (murni data lookup).
      getAccOwners: (accId) => {
        const acc = (D.accounts || []).find((a) => String(a.id) === String(accId));
        if (!acc) return { ok: true, owners: [], isSynthesized: true, isMultiOwner: false };
        const owners = acc.owners || [];
        return { ok: true, owners, isMultiOwner: owners.length > 1 };
      },
      // getAccOwnersRaw() -- stub S575, merefleksikan kontrak akun.js
      // getAccOwnersRaw(): owners[] APA ADANYA (tanpa syarat total 100%),
      // dipakai KHUSUS oleh updateTxDeductionOwnerVisibility() (S575).
      getAccOwnersRaw: (accId) => {
        const acc = (D.accounts || []).find((a) => String(a.id) === String(accId));
        if (!acc || !Array.isArray(acc.owners)) return { ok: true, owners: [] };
        return { ok: true, owners: acc.owners };
      },
      // MultiOwnerEngine -- stub minimal Sesi Res-C: test ini tidak
      // pernah punya D.assets yang cocok, jadi resolveOwnerDefaultForAccount()
      // (Res-B, transaksi.js) TIDAK PERNAH memanggil MultiOwnerEngine.getOwners()
      // (guard `if(asset)` di resolveOwnerDefaultForAccount selalu false di sini)
      // -- stub ini murni supaya guard `typeof MultiOwnerEngine==='undefined'`
      // lolos, biar resolver lanjut ke getAccOwnersEffective()/account.ownership
      // (langkah 2/3 §2.1), bukan berhenti di source:'none' sebelum sempat
      // baca account.owners[].
      MultiOwnerEngine: {},
      // getAccOwnersEffective() -- stub Sesi Res-B (akun.js): raw owners[]
      // MENANG selalu (needsConfirm:false), sama kontrak seperti akun.js
      // asli -- dipakai resolveOwnerDefaultForAccount() langkah 2 (§2.1).
      getAccOwnersEffective: (accId) => {
        const acc = (D.accounts || []).find((a) => String(a.id) === String(accId));
        if (!acc) return { ok: true, owners: [], needsConfirm: false };
        const owners = acc.owners || [];
        if (owners.length > 0) return { ok: true, owners, needsConfirm: false };
        return { ok: true, owners: [], needsConfirm: false };
      },
    },
  );
}

function baseFields(overrides = {}) {
  return Object.assign({
    txAmt: '100000', txSubCat: '', txDate: '2026-08-01', txNote: 'Test S574-D2',
    txCat: 'Belanja', txAcc: 'acc-multi', txAssetId: '',
  }, overrides);
}

function makeD(overrides = {}) {
  return Object.assign({
    transactions: [],
    bills: [],
    cobek: [],
    products: [],
    accounts: [
      { id: 'acc-multi', name: 'Rekening Bersama', balance: 1000000, owners: [{ ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Ani' }] },
      { id: 'acc-single', name: 'Cash', balance: 1000000, owners: [{ ownerId: 'SELF', ownerName: 'Milik Sendiri' }] },
    ],
  }, overrides);
}

// 1. CREATE - multi-owner + pilih owner -> deductionOwnerId tersimpan sesuai pilihan
test('S574-D2 [1/8]: CREATE multi-owner + pilih owner -> deductionOwnerId tersimpan sesuai pilihan', async () => {
  const D = makeD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txDeductionOwner: 'o2' }));
  const ctx = makeCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].deductionOwnerId, 'o2');
});

// 2. CREATE - multi-owner + tidak pilih owner -> SAVE DITOLAK
test('S574-D2 [2/8]: CREATE multi-owner + tidak pilih owner -> save ditolak (transaksi TIDAK dibuat)', async () => {
  const D = makeD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txDeductionOwner: '' }));
  const ctx = makeCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.equal(D.transactions.length, 0, 'transaksi tidak boleh tersimpan tanpa pilih owner');
  const toastCalls = calls.filter((c) => 'msg' in c);
  assert.equal(toastCalls.length, 1);
  assert.match(toastCalls[0].msg, /Pemilik Sumber Potongan/);
});

// 3. EDIT - owner lama sudah ada, save tanpa mengganti -> deductionOwnerId tetap
test('S574-D2 [3/8]: EDIT owner lama sudah ada -> editTx() prefill dropdown & save tanpa ganti -> deductionOwnerId tetap', async () => {
  const D = makeD();
  D.transactions.push({ id: 'tx1', type: 'expense', amount: 100000, category: 'Belanja', subcategory: '', accountId: 'acc-multi', payMethod: 'tunai', note: 'Lama', date: '2026-07-01', deductionOwnerId: 'o1' });
  const calls = [];
  const { doc, els } = makeFakeDoc(baseFields({ txDeductionOwner: '' }));
  // elemen tambahan yang disentuh editTx() tapi tidak relevan bagi test ini
  ['txModalTitle', 'txDelBtn', 'txCicilanNama', 'txCicilanTotal', 'txCicilanPerBulan', 'txCicilanBunga', 'txLanggananNama', 'txCicilanTenor', 'txCicilanShared', 'txCicilanIsKpr', 'txCicilanSharedPct', 'txCicilanSharedNominal', 'txCicilanSharedOtherName', 'txCicilanSharedAutoPiutang', 'txCicilanSharedWrap', 'prevMineRow', 'txCicilanPreview', 'txScanInsight', 'txAddStock', 'txAddShopStock', 'txShopStockPanel', 'txAddShopSale', 'txSyncBbm', 'txSyncServis', 'txAddRenov', 'btnI', 'btnE', 'txEditServisBtn', 'txCicilanDue', 'txCicilanDueLabel', 'txCicilanDueHint', 'txCicilanHistoryBtn', 'pmTunai', 'pmCicilan', 'pmLangganan', 'txCicilanPanel', 'txLanggananPanel'].forEach((id) => { if (!els[id]) els[id] = { value: '', checked: false, style: {}, textContent: '', innerHTML: '', classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } } }; });
  const ctx = makeCtx({ document: doc, D, calls });
  ctx.populateAccFilters = () => {};
  ctx.updateTxVehiclePanels = () => {};
  ctx.toggleTxStockFields = () => {};
  ctx.AutoKat = { hideSuggest() {}, _lastNoteQueried: '' };
  ctx.editTx('tx1');
  assert.equal(els.txDeductionOwner.value, 'o1', 'editTx() harus prefill dropdown sesuai deductionOwnerId tersimpan');
  await ctx._saveTxInner();
  assert.equal(D.transactions[0].deductionOwnerId, 'o1', 'save tanpa mengganti owner harus mempertahankan deductionOwnerId lama');
});

// 4. EDIT - ganti owner -> deductionOwnerId berubah ke owner baru
test('S574-D2 [4/8]: EDIT ganti owner -> deductionOwnerId berubah ke owner baru', async () => {
  const D = makeD();
  D.transactions.push({ id: 'tx1', type: 'expense', amount: 100000, category: 'Belanja', subcategory: '', accountId: 'acc-multi', payMethod: 'tunai', note: 'Lama', date: '2026-07-01', deductionOwnerId: 'o1' });
  const calls = [];
  const { doc, els } = makeFakeDoc(baseFields({ txDeductionOwner: 'o2', txEditId: 'tx1' }));
  const ctx = makeCtx({ document: doc, D, calls, txEditId: 'tx1' });
  await ctx._saveTxInner();
  assert.equal(D.transactions[0].deductionOwnerId, 'o2');
});

// 5. ACCOUNT SWITCH - owner akun sebelumnya tidak terbawa ke akun baru
test('S574-D2 [5/8]: account switch -> updateTxDeductionOwnerVisibility() reset pilihan, owner akun lama tidak terbawa ke akun baru', () => {
  const D = makeD();
  D.accounts.push({ id: 'acc-multi-2', name: 'Rekening Bersama 2', owners: [{ ownerId: 'o3', ownerName: 'Citra' }, { ownerId: 'o4', ownerName: 'Dedi' }] });
  const calls = [];
  const { doc, els } = makeFakeDoc({ txAcc: 'acc-multi', txDeductionOwnerWrap: true, txDeductionOwner: '' });
  els.txDeductionOwnerWrap = { style: {} };
  const ctx = makeCtx({ document: doc, D, calls });
  ctx.updateTxDeductionOwnerVisibility();
  els.txDeductionOwner.value = 'o1';
  assert.equal(els.txDeductionOwner.value, 'o1');
  // pindah ke akun multi-owner LAIN
  els.txAcc.value = 'acc-multi-2';
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwner.value, '', 'pilihan owner akun sebelumnya harus di-reset, tidak boleh terbawa ke akun baru');
  assert.doesNotMatch(els.txDeductionOwner.innerHTML, /o1|Budi|Ani/, 'opsi harus murni dari owners akun BARU, bukan sisa akun lama');
  assert.match(els.txDeductionOwner.innerHTML, /o3|Citra/);
});

// 6. TRANSAKSI LAMA - tanpa deductionOwnerId tetap bisa dibuka/edit/save
test('S574-D2 [6/8]: transaksi lama tanpa deductionOwnerId (akun single-owner) tetap bisa dibuka/edit/save', async () => {
  const D = makeD();
  D.transactions.push({ id: 'tx1', type: 'expense', amount: 50000, category: 'Belanja', subcategory: '', accountId: 'acc-single', payMethod: 'tunai', note: 'Lama tanpa owner', date: '2026-06-01' });
  const calls = [];
  const { doc, els } = makeFakeDoc(baseFields({ txAcc: 'acc-single', txDeductionOwner: '' }));
  ['txModalTitle', 'txDelBtn', 'txCicilanNama', 'txCicilanTotal', 'txCicilanPerBulan', 'txCicilanBunga', 'txLanggananNama', 'txCicilanTenor', 'txCicilanShared', 'txCicilanIsKpr', 'txCicilanSharedPct', 'txCicilanSharedNominal', 'txCicilanSharedOtherName', 'txCicilanSharedAutoPiutang', 'txCicilanSharedWrap', 'prevMineRow', 'txCicilanPreview', 'txScanInsight', 'txAddStock', 'txAddShopStock', 'txShopStockPanel', 'txAddShopSale', 'txSyncBbm', 'txSyncServis', 'txAddRenov', 'btnI', 'btnE', 'txEditServisBtn', 'txCicilanDue', 'txCicilanDueLabel', 'txCicilanDueHint', 'txCicilanHistoryBtn', 'pmTunai', 'pmCicilan', 'pmLangganan', 'txCicilanPanel', 'txLanggananPanel'].forEach((id) => { if (!els[id]) els[id] = { value: '', checked: false, style: {}, textContent: '', innerHTML: '', classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } } }; });
  const ctx = makeCtx({ document: doc, D, calls });
  ctx.populateAccFilters = () => {};
  ctx.updateTxVehiclePanels = () => {};
  ctx.toggleTxStockFields = () => {};
  ctx.AutoKat = { hideSuggest() {}, _lastNoteQueried: '' };
  assert.doesNotThrow(() => ctx.editTx('tx1'));
  await ctx._saveTxInner();
  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].amount, 50000, 'transaksi lama harus tetap bisa disimpan ulang (editTx() memuat ulang amount asli ke form)');
  assert.equal('deductionOwnerId' in D.transactions[0], false, 'akun single-owner tidak boleh punya deductionOwnerId');
});

// 7. SALDO - transaksi Rp100.000 tetap memotong Rp100.000, TIDAK ADA split porsi
test('S574-D2 [7/8]: nominal transaksi tetap utuh (Rp100.000) -- tidak ada split berdasarkan porsi owner', async () => {
  const D = makeD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txDeductionOwner: 'o1' }));
  const ctx = makeCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.equal(D.transactions[0].amount, 100000, 'amount tersimpan penuh, tidak dipotong/displit sesuai porsi owner');
  assert.equal('deductionOwnerId' in D.transactions[0], true);
  assert.equal(typeof D.transactions[0].deductionOwnerPorsi, 'undefined', 'tidak boleh ada field porsi baru ditambahkan');
});

// 8. ASSET - deductionOwnerId tidak mengubah txAssetId atau ownership aset
test('S574-D2 [8/8]: deductionOwnerId tidak menyentuh txAssetId / ownership aset', async () => {
  const D = makeD();
  D.assets = [{ id: 'aset-1', name: 'Ruko Patungan', isMultiOwner: true, owners: [{ ownerId: 'o1', porsi: 50 }, { ownerId: 'o2', porsi: 50 }] }];
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txDeductionOwner: 'o2', txAssetId: 'aset-1' }));
  const ctx = makeCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.equal(D.transactions[0].assetId, 'aset-1', 'txAssetId tetap tersimpan independen dari deductionOwnerId');
  assert.equal(D.transactions[0].deductionOwnerId, 'o2');
  // ownership aset tidak disentuh sama sekali
  assert.deepEqual(D.assets[0].owners, [{ ownerId: 'o1', porsi: 50 }, { ownerId: 'o2', porsi: 50 }]);
});
