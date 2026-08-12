'use strict';
// tests/s574-e-history-badge-datahealth-regression.test.js — Sesi S574-E
// (lanjutan S574-A..D2, lihat AUDIT-S574-PEMILIK-SUMBER-POTONGAN.md). Scope
// sesi ini HANYA: (1) badge "👤 Ditanggung: <nama owner>" di riwayat
// (modules/finance/tx-list-cashflow.js, txHTML()), (2) orphan check baru utk
// `deductionOwnerId` di data-health-check.js, (3) regression suite S574
// menyeluruh (15 skenario wajib, gabungan hasil S574-A..D2 + 2 area baru
// sesi ini). TIDAK ada implementasi baru di luar 2 file di atas -- test lain
// (selain #11/#12/#13/#14/#15) murni menegaskan ulang perilaku yang SUDAH
// ada dari sesi sebelumnya lewat pemanggilan source asli (bukan re-mock
// logic), pola sama persis tests/s574-d2-deduction-owner-persist-
// validation.test.js & tests/s487-txhtml-pmicons-tagihan-utang-badge.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// ---------------------------------------------------------------------------
// Harness #1 — txHTML() (tx-list-cashflow.js), utk skenario riwayat (#11/#12)
// ---------------------------------------------------------------------------
function makeTxListCtx(D, extra) {
  return loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    Object.assign(
      {
        D,
        document: { getElementById: () => null },
        escapeHtml: (s) => String(s),
        getAllCats: () => [{ name: 'Belanja', emoji: '🛒' }],
        fmt: (n) => 'Rp ' + Math.round(n || 0),
        toast: () => {},
        askConfirm: async () => true,
        save: () => {},
        renderKeuangan: () => {},
        renderDashboard: () => {},
        renderCnTab: () => {},
        renderProductList: () => {},
        renderStockList: () => {},
        renderShop: () => {},
        renderShopRecent: () => {},
        populateKeuFilters: () => {},
        openBillModal: () => {},
      },
      extra || {},
    ),
    [],
  );
}

// ---------------------------------------------------------------------------
// Harness #2 — runDataHealthCheck() (data-health-check.js), utk #13/#14/#15
// ---------------------------------------------------------------------------
function makeD(overrides = {}) {
  return Object.assign({
    accounts: [], vehicles: [], transactions: [], bills: [], assets: [],
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [], products: [],
    servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [], renovProjects: [], targets: [],
    eduFunds: [], sewaKios: { units: [] },
  }, overrides);
}

function runHealth(dataOverrides) {
  const D = makeD(dataOverrides);
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {}, sameId: (a, b) => String(a) === String(b) },
  );
  return ctx.runDataHealthCheck();
}

// ---------------------------------------------------------------------------
// Harness #3 — transaksi.js _saveTxInner()/editTx(), utk skenario 1-10
// (persis pola tests/s574-d2-deduction-owner-persist-validation.test.js,
// dipakai ulang di sini murni utk menegaskan regresi tetap PASS di sesi ini)
// ---------------------------------------------------------------------------
function makeFakeDoc(values) {
  const els = {};
  Object.keys(values).forEach((id) => {
    const v = values[id];
    els[id] = (typeof v === 'boolean') ? { checked: v } : { value: v };
  });
  return { doc: { getElementById: (id) => els[id] || null }, els };
}

const EXTRA_EL_IDS = ['txModalTitle', 'txDelBtn', 'txCicilanNama', 'txCicilanTotal', 'txCicilanPerBulan',
  'txCicilanBunga', 'txLanggananNama', 'txCicilanTenor', 'txCicilanShared', 'txCicilanIsKpr',
  'txCicilanSharedPct', 'txCicilanSharedNominal', 'txCicilanSharedOtherName', 'txCicilanSharedAutoPiutang',
  'txCicilanSharedWrap', 'prevMineRow', 'txCicilanPreview', 'txScanInsight', 'txAddStock', 'txAddShopStock',
  'txShopStockPanel', 'txAddShopSale', 'txSyncBbm', 'txSyncServis', 'txAddRenov', 'btnI', 'btnE',
  'txEditServisBtn', 'txCicilanDue', 'txCicilanDueLabel', 'txCicilanDueHint', 'txCicilanHistoryBtn',
  'pmTunai', 'pmCicilan', 'pmLangganan', 'txCicilanPanel', 'txLanggananPanel'];

function fillExtraEls(els) {
  EXTRA_EL_IDS.forEach((id) => {
    if (!els[id]) els[id] = { value: '', checked: false, style: {}, textContent: '', innerHTML: '', classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } } };
  });
}

function makeTxCtx({ document, D, calls, txEditId = null }) {
  return loadSource(
    ['modules/finance/transaksi.js'],
    {
      document, D, curPayMethod: 'tunai', curTxType: 'expense', txEditId,
      _txPayMethodTouchedByUser: false, _txCatLearnSource: null,
      evalAmtExpr: () => {}, toast: (m, dur) => calls.push({ msg: m, dur }),
      save: () => calls.push({ save: true }), closeModal: (id) => calls.push({ closeModal: id }),
      renderDashboard: () => {}, renderKeuangan: () => {}, renderCnTab: () => {},
      rememberLastAccForCat: () => {}, AIBus: { emit: () => {} },
      applyTxTitipanLinkageOnSave: () => {}, applyTxStockFromTx: () => {}, applyTxBbmFromTx: () => {},
      applyTxShopStockFromTx: () => {}, applyTxShopSaleFromTx: () => {},
      WorthIt: { applyBuyLink: () => {}, onLinkedTxEdited: () => {} },
      SewaKios: { applyPaymentLink: () => {}, onLinkedTxEdited: () => {} },
      Tukang: { applyPendingPayment: () => {} },
      sameId: (a, b) => String(a) === String(b), findPossibleDuplicateTx: () => null,
      uid: (() => { let n = 9500; return () => String(n += 1); })(),
      escapeHtml: (s) => s, resetShopStockCart: () => {}, toggleTxShopStockFields: () => {},
      resetTxShopSaleCart: () => {}, toggleTxShopSaleFields: () => {}, toggleTxBbmFields: () => {},
      toggleTxServisFields: () => {}, updateCicilanTenorUI: () => {}, syncCicilanPreview: () => {},
      setPayMethod: () => {}, resetPayMethodLock: () => {}, openModal: () => {},
      getAccOwners: (accId) => {
        const acc = (D.accounts || []).find((a) => String(a.id) === String(accId));
        if (!acc) return { ok: true, owners: [], isSynthesized: true, isMultiOwner: false };
        const owners = acc.owners || [];
        return { ok: true, owners, isMultiOwner: owners.length > 1 };
      },
      // getAccOwnersRaw() -- stub S575 (lihat catatan sama di
      // s574-d2-deduction-owner-persist-validation.test.js).
      getAccOwnersRaw: (accId) => {
        const acc = (D.accounts || []).find((a) => String(a.id) === String(accId));
        if (!acc || !Array.isArray(acc.owners)) return { ok: true, owners: [] };
        return { ok: true, owners: acc.owners };
      },
    },
  );
}

function baseFields(overrides = {}) {
  return Object.assign({
    txAmt: '100000', txSubCat: '', txDate: '2026-08-01', txNote: 'Test S574-E',
    txCat: 'Belanja', txAcc: 'acc-multi', txAssetId: '',
  }, overrides);
}

function makeTxD(overrides = {}) {
  return Object.assign({
    transactions: [], bills: [], cobek: [], products: [],
    accounts: [
      { id: 'acc-multi', name: 'Rekening Bersama', balance: 1000000, owners: [{ ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Ani' }] },
      { id: 'acc-single', name: 'Cash', balance: 1000000, owners: [{ ownerId: 'SELF', ownerName: 'Milik Sendiri' }] },
    ],
  }, overrides);
}

// ===========================================================================
// 1. single-owner tidak membutuhkan picker
// ===========================================================================
test('S574-E [1/15]: akun single-owner -> tidak wajib pilih deductionOwnerId, save berhasil tanpa field ini', async () => {
  const D = makeTxD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txAcc: 'acc-single', txDeductionOwner: '' }));
  const ctx = makeTxCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.equal(D.transactions.length, 1);
  assert.equal('deductionOwnerId' in D.transactions[0], false);
});

// ===========================================================================
// 2. multi-owner menampilkan picker (updateTxDeductionOwnerVisibility)
// ===========================================================================
test('S574-E [2/15]: akun multi-owner -> updateTxDeductionOwnerVisibility() menampilkan picker berisi owners akun', () => {
  const D = makeTxD();
  const calls = [];
  const { doc, els } = makeFakeDoc({ txAcc: 'acc-multi', txDeductionOwnerWrap: true, txDeductionOwner: '' });
  els.txDeductionOwnerWrap = { style: {} };
  const ctx = makeTxCtx({ document: doc, D, calls });
  ctx.updateTxDeductionOwnerVisibility();
  assert.notEqual(els.txDeductionOwnerWrap.style.display, 'none');
  assert.match(els.txDeductionOwner.innerHTML, /o1|Budi/);
  assert.match(els.txDeductionOwner.innerHTML, /o2|Ani/);
});

// ===========================================================================
// 3. multi-owner tanpa owner -> save ditolak
// ===========================================================================
test('S574-E [3/15]: akun multi-owner tanpa pilih owner -> save DITOLAK', async () => {
  const D = makeTxD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txDeductionOwner: '' }));
  const ctx = makeTxCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.equal(D.transactions.length, 0);
  assert.equal(calls.filter((c) => 'msg' in c).length, 1);
});

// ===========================================================================
// 4. owner tersimpan pada CREATE
// ===========================================================================
test('S574-E [4/15]: CREATE multi-owner + pilih owner -> deductionOwnerId tersimpan', async () => {
  const D = makeTxD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txDeductionOwner: 'o2' }));
  const ctx = makeTxCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.equal(D.transactions[0].deductionOwnerId, 'o2');
});

// ===========================================================================
// 5. owner tetap saat EDIT (tanpa mengganti)
// ===========================================================================
test('S574-E [5/15]: EDIT tanpa mengganti owner -> deductionOwnerId tetap', async () => {
  const D = makeTxD();
  D.transactions.push({ id: 'tx1', type: 'expense', amount: 100000, category: 'Belanja', subcategory: '', accountId: 'acc-multi', payMethod: 'tunai', note: 'Lama', date: '2026-07-01', deductionOwnerId: 'o1' });
  const calls = [];
  const { doc, els } = makeFakeDoc(baseFields({ txDeductionOwner: '' }));
  fillExtraEls(els);
  const ctx = makeTxCtx({ document: doc, D, calls });
  ctx.populateAccFilters = () => {};
  ctx.updateTxVehiclePanels = () => {};
  ctx.toggleTxStockFields = () => {};
  ctx.AutoKat = { hideSuggest() {}, _lastNoteQueried: '' };
  ctx.editTx('tx1');
  assert.equal(els.txDeductionOwner.value, 'o1');
  await ctx._saveTxInner();
  assert.equal(D.transactions[0].deductionOwnerId, 'o1');
});

// ===========================================================================
// 6. owner dapat diganti
// ===========================================================================
test('S574-E [6/15]: EDIT ganti owner -> deductionOwnerId berubah', async () => {
  const D = makeTxD();
  D.transactions.push({ id: 'tx1', type: 'expense', amount: 100000, category: 'Belanja', subcategory: '', accountId: 'acc-multi', payMethod: 'tunai', note: 'Lama', date: '2026-07-01', deductionOwnerId: 'o1' });
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txDeductionOwner: 'o2', txEditId: 'tx1' }));
  const ctx = makeTxCtx({ document: doc, D, calls, txEditId: 'tx1' });
  await ctx._saveTxInner();
  assert.equal(D.transactions[0].deductionOwnerId, 'o2');
});

// ===========================================================================
// 7. account switching tidak membawa owner lama
// ===========================================================================
test('S574-E [7/15]: ganti akun -> updateTxDeductionOwnerVisibility() reset pilihan, owner akun lama tidak terbawa', () => {
  const D = makeTxD();
  D.accounts.push({ id: 'acc-multi-2', name: 'Rekening Bersama 2', owners: [{ ownerId: 'o3', ownerName: 'Citra' }, { ownerId: 'o4', ownerName: 'Dedi' }] });
  const calls = [];
  const { doc, els } = makeFakeDoc({ txAcc: 'acc-multi', txDeductionOwnerWrap: true, txDeductionOwner: '' });
  els.txDeductionOwnerWrap = { style: {} };
  const ctx = makeTxCtx({ document: doc, D, calls });
  ctx.updateTxDeductionOwnerVisibility();
  els.txDeductionOwner.value = 'o1';
  els.txAcc.value = 'acc-multi-2';
  ctx.updateTxDeductionOwnerVisibility();
  assert.equal(els.txDeductionOwner.value, '');
  assert.doesNotMatch(els.txDeductionOwner.innerHTML, /o1|Budi|Ani/);
  assert.match(els.txDeductionOwner.innerHTML, /o3|Citra/);
});

// ===========================================================================
// 8. transaksi lama tanpa deductionOwnerId tetap valid
// ===========================================================================
test('S574-E [8/15]: transaksi lama tanpa deductionOwnerId (akun single-owner) tetap valid dibuka/disimpan', async () => {
  const D = makeTxD();
  D.transactions.push({ id: 'tx1', type: 'expense', amount: 50000, category: 'Belanja', subcategory: '', accountId: 'acc-single', payMethod: 'tunai', note: 'Lama tanpa owner', date: '2026-06-01' });
  const calls = [];
  const { doc, els } = makeFakeDoc(baseFields({ txAcc: 'acc-single', txDeductionOwner: '' }));
  fillExtraEls(els);
  const ctx = makeTxCtx({ document: doc, D, calls });
  ctx.populateAccFilters = () => {};
  ctx.updateTxVehiclePanels = () => {};
  ctx.toggleTxStockFields = () => {};
  ctx.AutoKat = { hideSuggest() {}, _lastNoteQueried: '' };
  assert.doesNotThrow(() => ctx.editTx('tx1'));
  await ctx._saveTxInner();
  assert.equal(D.transactions.length, 1);
  assert.equal('deductionOwnerId' in D.transactions[0], false);
});

// ===========================================================================
// 9. saldo tidak split
// ===========================================================================
test('S574-E [9/15]: nominal transaksi tetap utuh (Rp100.000), tidak ada split porsi owner', async () => {
  const D = makeTxD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txDeductionOwner: 'o1' }));
  const ctx = makeTxCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.equal(D.transactions[0].amount, 100000);
  assert.equal('porsi' in D.transactions[0], false);
});

// ===========================================================================
// 10. asset ownership independen
// ===========================================================================
test('S574-E [10/15]: deductionOwnerId tidak bocor ke domain Aset (D.assets tidak tersentuh)', async () => {
  const D = makeTxD({ assets: [{ id: 'as1', name: 'Sucorinvest', owners: [{ ownerId: 'A', ownerName: 'A', porsi: 20 }, { ownerId: 'B', ownerName: 'B', porsi: 80 }] }] });
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txDeductionOwner: 'o1' }));
  const ctx = makeTxCtx({ document: doc, D, calls });
  await ctx._saveTxInner();
  assert.deepEqual(D.assets[0].owners, [{ ownerId: 'A', ownerName: 'A', porsi: 20 }, { ownerId: 'B', ownerName: 'B', porsi: 80 }]);
});

// ===========================================================================
// 11. riwayat menampilkan owner (S574-E BARU)
// ===========================================================================
test('S574-E [11/15]: txHTML() menampilkan badge "👤 Ditanggung: <nama owner>" kalau t.deductionOwnerId terisi', () => {
  const D = { accounts: [{ id: 'acc-multi', name: 'Rekening Bersama', emoji: '🏦', owners: [{ ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Ani' }] }], transactions: [], products: [], cobek: [] };
  const ctx = makeTxListCtx(D, { getAccOwners: undefined });
  const t = { id: 't1', type: 'expense', amount: 100000, category: 'Belanja', date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o2' };
  const html = ctx.txHTML(t);
  assert.match(html, /👤 Ditanggung: Ani/);
});

test('S574-E [11b/15]: badge owner tetap resolve lewat getAccOwners() kalau tersedia (akun.js, reuse MultiOwnerEngine)', () => {
  const D = { accounts: [{ id: 'acc-multi', name: 'Rekening Bersama', emoji: '🏦', owners: [{ ownerId: 'o1', ownerName: 'Budi' }] }], transactions: [], products: [], cobek: [] };
  const getAccOwnersCalls = [];
  const ctx = makeTxListCtx(D, {
    getAccOwners: (accId) => { getAccOwnersCalls.push(accId); return { ok: true, owners: [{ ownerId: 'o1', ownerName: 'Budi (via getAccOwners)' }], isMultiOwner: false }; },
  });
  const t = { id: 't1', type: 'expense', amount: 100000, category: 'Belanja', date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o1' };
  const html = ctx.txHTML(t);
  assert.match(html, /👤 Ditanggung: Budi \(via getAccOwners\)/);
  assert.deepEqual(getAccOwnersCalls, ['acc-multi']);
});

// ===========================================================================
// 12. riwayat tanpa owner tidak menampilkan badge (S574-E BARU)
// ===========================================================================
test('S574-E [12/15]: txHTML() TIDAK menampilkan badge owner kalau t.deductionOwnerId kosong/tidak ada (transaksi lama)', () => {
  const D = { accounts: [{ id: 'acc-single', name: 'Cash', emoji: '💵', owners: [{ ownerId: 'SELF', ownerName: 'Milik Sendiri' }] }], transactions: [], products: [], cobek: [] };
  const ctx = makeTxListCtx(D);
  const t1 = { id: 't1', type: 'expense', amount: 30000, category: 'Belanja', date: '2026-08-01', accountId: 'acc-single' };
  const t2 = { id: 't2', type: 'expense', amount: 30000, category: 'Belanja', date: '2026-08-01', accountId: 'acc-single', deductionOwnerId: '' };
  assert.doesNotMatch(ctx.txHTML(t1), /Ditanggung/);
  assert.doesNotMatch(ctx.txHTML(t2), /Ditanggung/);
});

test('S574-E [12b/15]: txHTML() tidak mengubah nominal/tampilan lain saat badge owner tampil (murni presentasi)', () => {
  const D = { accounts: [{ id: 'acc-multi', name: 'Rekening Bersama', emoji: '🏦', owners: [{ ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Ani' }] }], transactions: [], products: [], cobek: [] };
  const ctx = makeTxListCtx(D, { getAccOwners: undefined });
  const withOwner = { id: 't1', type: 'expense', amount: 100000, category: 'Belanja', date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o1' };
  const withoutOwner = { id: 't1', type: 'expense', amount: 100000, category: 'Belanja', date: '2026-08-01', accountId: 'acc-multi' };
  const htmlA = ctx.txHTML(withOwner);
  const htmlB = ctx.txHTML(withoutOwner);
  assert.match(htmlA, /Rp 100000/);
  assert.match(htmlB, /Rp 100000/);
  // Selain baris badge owner, struktur tx-item lain identik (nominal, ikon,
  // nama akun) -- badge murni ADD-ON, tidak mengubah baris lain.
  const stripOwnerLine = (h) => h.replace(/<div class="tx-meta">👤 Ditanggung:[^<]*<\/div>/, '');
  assert.equal(stripOwnerLine(htmlA), htmlB);
});

// ===========================================================================
// 13. orphan deductionOwnerId terdeteksi (S574-E BARU — data-health)
// ===========================================================================
test('S574-E [13/15]: runDataHealthCheck() warn kalau deductionOwnerId menunjuk owner yang tidak ada sama sekali', () => {
  const issues = runHealth({
    accounts: [{ id: 'acc-multi', owners: [{ ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Ani' }] }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o-ghost', note: 'Tx ghost' }],
  });
  const found = issues.filter((i) => i.title === 'Pemilik Sumber Potongan tidak ditemukan');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Tx ghost/);
});

test('S574-E [13b/15]: runDataHealthCheck() TIDAK warn kalau deductionOwnerId valid & milik akun transaksi', () => {
  const issues = runHealth({
    accounts: [{ id: 'acc-multi', owners: [{ ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Ani' }] }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o1' }],
  });
  assert.equal(issues.filter((i) => i.title.startsWith('Pemilik Sumber Potongan')).length, 0);
});

// ===========================================================================
// 14. deductionOwnerId milik akun lain terdeteksi (S574-E BARU — data-health)
// ===========================================================================
test('S574-E [14/15]: runDataHealthCheck() warn kalau deductionOwnerId valid global tapi bukan owner akun transaksi ini', () => {
  const issues = runHealth({
    accounts: [
      { id: 'acc-multi', owners: [{ ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Ani' }] },
      { id: 'acc-other', owners: [{ ownerId: 'o9', ownerName: 'Citra' }] },
    ],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-multi', deductionOwnerId: 'o9', note: 'Tx salah akun' }],
  });
  const found = issues.filter((i) => i.title === 'Pemilik Sumber Potongan bukan pemilik akun transaksi ini');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Tx salah akun/);
  // Dan sebaliknya, judul "tidak ditemukan" (kasus A) tidak ikut muncul utk skenario ini.
  assert.equal(issues.filter((i) => i.title === 'Pemilik Sumber Potongan tidak ditemukan').length, 0);
});

// ===========================================================================
// 15. account invalid terdeteksi (S574-E BARU — data-health)
// ===========================================================================
test('S574-E [15/15]: runDataHealthCheck() warn kalau accountId transaksi (dgn deductionOwnerId) sudah tidak valid', () => {
  const issues = runHealth({
    accounts: [{ id: 'acc-masih-ada', owners: [{ ownerId: 'o1', ownerName: 'Budi' }] }],
    transactions: [{ id: 't1', amount: 100000, date: '2026-08-01', accountId: 'acc-sudah-hapus', deductionOwnerId: 'o1', note: 'Tx akun hilang' }],
  });
  const genericAccErr = issues.filter((i) => i.title === 'Transaksi dengan akun tidak valid');
  assert.equal(genericAccErr.length, 1, 'cek accountId invalid generik tetap jalan (regresi)');
  const found = issues.filter((i) => i.title === 'Pemilik Sumber Potongan tidak bisa diverifikasi (akun tidak valid)');
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Tx akun hilang/);
});

// ===========================================================================
// Regresi tambahan: transaksi lama TANPA deductionOwnerId sama sekali tidak
// pernah memicu isu data-health baru sesi ini (D. transaksi lama = VALID).
// ===========================================================================
test('S574-E [regresi]: D.transactions tanpa deductionOwnerId sama sekali tidak pernah memicu isu Pemilik Sumber Potongan', () => {
  const issues = runHealth({
    accounts: [{ id: 'acc-multi', owners: [{ ownerId: 'o1', ownerName: 'Budi' }, { ownerId: 'o2', ownerName: 'Ani' }] }],
    transactions: [{ id: 't1', amount: 50000, date: '2026-08-01', accountId: 'acc-multi' }],
  });
  assert.equal(issues.filter((i) => i.title.startsWith('Pemilik Sumber Potongan')).length, 0);
});
