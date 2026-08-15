'use strict';
// tests/dl-next-9-owner-quota-sisa-spent-sync.test.js — DESIGN-LOCK-DL-NEXT-9
// (OWNER-QUOTA-SISA-SPENT-SYNC, REVISI 3): mengunci definisi final
// `estimatedUnallocated`/`allocationStatus` di `build()`
// (dana-titipan-aggregation-api.js) DAN sinkronisasi "💰 Kuota sisa" live
// modal (InvestmentUI._ownerQuotaText() / Aset._ownerQuotaText()) dgn 2
// jalur pengeluaran (`usedTotal`, `linkedExpenseTotal`) yang SUDAH jadi
// bagian formula `spent` di build() sejak Sesi 519 & Sesi PATCH-2026-08-14,
// tapi SEBELUM sesi ini belum ikut dikurangkan di live modal (root cause
// DL-Next-9, lihat DESIGN-LOCK-DL-NEXT-9-OWNER-QUOTA-SISA-SPENT-SYNC-2.md).
//
// Sinyal "teralokasi" = NOMINAL (allocatedPrincipal/costSplit), BUKAN biner
// "ada porsi di 1 instrumen = seluruh principal habis" (Revisi 2, dibatalkan
// -- tidak ada jejaknya lagi di source, jadi tidak ada revert yang perlu
// dites di sini).
//
// §"Test plan" dokumen Design Lock -- Case A-G di-cover Bagian 1 (build()).
// Bagian 2 (live modal) mengunci fix poin 4: sisa = principal -
// allocatedExcluding() - usedTotal - linkedExpenseTotal - draftNominal.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(overrides) {
  return Object.assign({
    investments: [], assets: [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: [], titipanReturns: [],
    ownerRegistry: [],
  }, overrides || {});
}

function makePortfolioCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {}, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI'],
  );
}

// ================= Bagian 1: build() -- Case A-G (Test plan Design Lock) =================

test('Case A — partial allocation: principal 10jt, A=5jt, B belum ada -> estimatedUnallocated=5jt, status OK', () => {
  const D = baseD({
    investments: [{ id: 'hA', name: 'A', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
  });
  const ctx = makePortfolioCtx(D);
  const owner = ctx.DanaTitipanPortfolioAPI.build().owners.find((o) => o.ownerId === 'budi');
  assert.equal(owner.allocatedPrincipal, 5000000);
  assert.equal(owner.estimatedUnallocated, 5000000);
  assert.equal(owner.allocationStatus, 'OK');
  assert.equal(owner.overAllocatedAmount, 0);
});

test('Case B — full allocation: principal 10jt, A=5jt, B=5jt -> estimatedUnallocated=0, status OK', () => {
  const D = baseD({
    investments: [
      { id: 'hA', name: 'A', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'hB', name: 'B', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
  });
  const ctx = makePortfolioCtx(D);
  const owner = ctx.DanaTitipanPortfolioAPI.build().owners.find((o) => o.ownerId === 'budi');
  assert.equal(owner.allocatedPrincipal, 10000000);
  assert.equal(owner.estimatedUnallocated, 0);
  assert.equal(owner.allocationStatus, 'OK');
});

test('Case C — over allocation: principal 10jt, A=5jt, B=6jt -> OVER_ALLOCATED, overAllocatedAmount=1jt', () => {
  const D = baseD({
    investments: [
      { id: 'hA', name: 'A', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'hB', name: 'B', unit: 1, avgPrice: 6000000, currentPrice: 6000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
  });
  const ctx = makePortfolioCtx(D);
  const owner = ctx.DanaTitipanPortfolioAPI.build().owners.find((o) => o.ownerId === 'budi');
  assert.equal(owner.allocatedPrincipal, 11000000);
  assert.equal(owner.estimatedUnallocated, 0);
  assert.equal(owner.allocationStatus, 'OVER_ALLOCATED');
  assert.equal(owner.overAllocatedAmount, 1000000);
});

test('Case D — gain tidak mempengaruhi kuota: pokok A=5jt(+2jt gain) B=5jt(-1jt gain) -> estimatedUnallocated=0 (bukan 8jt/12jt)', () => {
  const D = baseD({
    investments: [
      { id: 'hA', name: 'A', unit: 1, avgPrice: 5000000, currentPrice: 7000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'hB', name: 'B', unit: 1, avgPrice: 5000000, currentPrice: 4000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
  });
  const ctx = makePortfolioCtx(D);
  const owner = ctx.DanaTitipanPortfolioAPI.build().owners.find((o) => o.ownerId === 'budi');
  assert.equal(owner.allocatedPrincipal, 10000000); // pokok, bukan currentValue
  assert.equal(owner.gain, 1000000); // +2jt - 1jt, TIDAK dipakai formula kuota
  assert.equal(owner.estimatedUnallocated, 0);
  assert.equal(owner.allocationStatus, 'OK');
});

test('Case E — owner baru tanpa allocation: principal 10jt, 0 holding -> estimatedUnallocated=10jt', () => {
  const D = baseD({
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
  });
  const ctx = makePortfolioCtx(D);
  // owner tanpa holding sama sekali tidak muncul di ownersMap build() (0 porsi>0 manapun) --
  // konsisten kontrak lama: build() HANYA mengagregasi owner yang punya holding/aset. Verifikasi
  // via allocatedExcluding() (0) + formula manual, bukan owner bucket build() (tidak ada).
  const excluding = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', null);
  assert.equal(excluding, 0);
  assert.equal(10000000 - excluding, 10000000);
});

test('Case F — edit holding existing: allocatedExcluding() exclude holding yang sedang dibuka dari "elsewhere"', () => {
  const D = baseD({
    investments: [
      { id: 'hA', name: 'A', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'hB', name: 'B', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
  });
  const ctx = makePortfolioCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', 'hA'), 5000000); // hanya hB
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', 'hB'), 5000000); // hanya hA
});

test('Case G — cross-domain: Investment & Aset owner yang sama terhitung sbg 1 allocation gabungan', () => {
  const D = baseD({
    investments: [{ id: 'hA', name: 'A', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    assets: [{ id: 'aB', name: 'B', nilai: 5000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
  });
  const ctx = makePortfolioCtx(D);
  const owner = ctx.DanaTitipanPortfolioAPI.build().owners.find((o) => o.ownerId === 'budi');
  assert.equal(owner.allocatedPrincipal, 10000000); // 5jt Investment + 5jt Aset, 1 kartu owner
  assert.equal(owner.estimatedUnallocated, 0);
  assert.equal(owner.allocationStatus, 'OK');
});

test('spent = allocatedPrincipal + usedTotal + linkedExpenseTotal: usedTotal (tx.titipanLinkId) ikut mengurangi estimatedUnallocated', () => {
  const D = baseD({
    investments: [{ id: 'hA', name: 'A', unit: 1, avgPrice: 4000000, currentPrice: 4000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
    transactions: [{ id: 't1', type: 'expense', amount: 3000000, titipanLinkId: 'budi' }],
  });
  const ctx = makePortfolioCtx(D);
  const owner = ctx.DanaTitipanPortfolioAPI.build().owners.find((o) => o.ownerId === 'budi');
  assert.equal(owner.allocatedPrincipal, 4000000);
  assert.equal(owner.usedTotal, 3000000);
  // spent = 4jt + 3jt + 0 = 7jt -> estimatedUnallocated = 3jt
  assert.equal(owner.estimatedUnallocated, 3000000);
  assert.equal(owner.allocationStatus, 'OK');
});

// ================= Bagian 2: Live modal "Kuota sisa" -- fix poin 4 (usedTotal + linkedExpenseTotal) =================

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return { id, value: '', textContent: '', innerHTML: '', className: '', placeholder: '', disabled: false, style: {} };
  }
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); }, _registry: registry };
}

function makeInvestViewCtx(D, dom) {
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js', 'modules/asset/investasi-view.js'],
    {
      D, document: dom, escapeHtml: (s) => String(s),
      openModal: () => {}, closeModal: () => {},
      uid: () => 'gen_' + (D._n = (D._n || 0) + 1),
      save: () => { D._saved = (D._saved || 0) + 1; },
      toast: () => {},
      fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['Investment', 'InvestmentUI', 'MultiOwnerEngine', 'OwnerRegistry', 'DanaTitipanPortfolioAPI'],
  );
}

function makeAsetCtx(D, dom) {
  const ctx = loadSource(
    ['modules/asset/aset.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    {
      D, document: dom, escapeHtml: (s) => String(s),
      openModal: () => {}, closeModal: () => {},
      uid: () => 'owner_x', sameId: (a, b) => String(a) === String(b),
      save: () => {}, toast: () => {},
      fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-15',
    },
    ['Aset', 'MultiOwnerEngine', 'Investment', 'DanaTitipanPortfolioAPI'],
  );
  ctx.Aset.renderList = () => {};
  return ctx;
}

test('InvestmentUI._ownerQuotaText(): usedTotal (Catat Pengeluaran Dana Titipan) ikut mengurangi Kuota sisa', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [] }],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
    transactions: [{ id: 't1', type: 'expense', amount: 3000000, titipanLinkId: 'budi' }],
  });
  const ctx = makeInvestViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  // draft porsi 0% -> draftNominal 0. excluding = 0 (holding lain kosong). usedTotal = 3jt.
  // sisa = 10jt - 0 - 3jt - 0 - 0 = 7jt (SEBELUM fix: 10jt, tidak sinkron dgn dashboard).
  const html = ctx.InvestmentUI._ownerQuotaText({ ownerId: 'budi', ownerName: 'Budi', isSelf: false, porsi: 0 });
  assert.match(html, /Kuota sisa/);
  assert.match(html, /7000000/);
  assert.doesNotMatch(html, /10000000/);
});

test('InvestmentUI._ownerQuotaText(): usedTotal + allocatedExcluding + draftNominal bisa mendorong ke "melebihi pokok dikomit"', () => {
  const D = baseD({
    investments: [
      { id: 'h1', name: 'BBCA', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [] },
      { id: 'h2', name: 'BBRI', unit: 1, avgPrice: 6000000, currentPrice: 6000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 8000000 }],
    transactions: [{ id: 't1', type: 'expense', amount: 1000000, titipanLinkId: 'budi' }],
  });
  const ctx = makeInvestViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  // excluding (h2) = 6jt, usedTotal = 1jt, draft porsi 50% dari holdingCost h1 10jt = 5jt.
  // sisa = 8jt - 6jt - 1jt - 0 - 5jt = -4jt -> melebihi.
  const html = ctx.InvestmentUI._ownerQuotaText({ ownerId: 'budi', ownerName: 'Budi', isSelf: false, porsi: 50 });
  assert.match(html, /melebihi pokok dikomit/);
});

test('Aset._ownerQuotaText(): usedTotal (Catat Pengeluaran Dana Titipan) ikut mengurangi Kuota sisa (mirror InvestmentUI)', () => {
  const D = baseD({
    assets: [{ id: 'aBaru', name: 'Aset Baru', nilai: 0, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 0, isSelf: false }] }],
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
    transactions: [{ id: 't1', type: 'expense', amount: 4000000, titipanLinkId: 'budi' }],
  });
  const dom = makeStatefulDom();
  const ctx = makeAsetCtx(D, dom);
  ctx.Aset.editId = 'aBaru';
  ctx.Aset._ownersModalAsset = D.assets[0];
  // excluding = 0, draftNominal = 0 (porsi 0, nilai 0), usedTotal = 4jt.
  // sisa = 10jt - 0 - 4jt - 0 - 0 = 6jt (SEBELUM fix: 10jt).
  const html = ctx.Aset._ownerQuotaText({ ownerId: 'budi', ownerName: 'Budi', isSelf: false, porsi: 0 });
  assert.match(html, /Kuota sisa/);
  assert.match(html, /6000000/);
  assert.doesNotMatch(html, />10000000/);
});

test('Hard Invariant: gain/currentValue TIDAK PERNAH masuk formula Kuota Sisa live modal (hanya principal/allocatedExcluding/usedTotal/linkedExpenseTotal/draftNominal)', () => {
  const D = baseD({
    investments: [
      { id: 'h1', name: 'BBCA', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [] },
      { id: 'h2', name: 'BBRI', unit: 1, avgPrice: 5000000, currentPrice: 50000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }, // gain besar +45jt
    ],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000000 }],
  });
  const ctx = makeInvestViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  // excluding (h2, cost-basis BUKAN currentValue) = 5jt (pokok, bukan 50jt nilai kini). draft 0%.
  // sisa = 10jt - 5jt - 0 - 0 - 0 = 5jt (BUKAN 10jt-50jt yang akan jadi negatif kalau gain ikut terhitung).
  const html = ctx.InvestmentUI._ownerQuotaText({ ownerId: 'budi', ownerName: 'Budi', isSelf: false, porsi: 0 });
  assert.match(html, /5000000/);
  assert.doesNotMatch(html, /melebihi/);
});
