'use strict';
// tests/s494-titipan-kuota-nominal-investment-owners.test.js — Sesi 494
// (PLAN-owner-registry-multi-session.md, Gate 2 dikonfirmasi eksplisit
// sebelum sesi ini mulai: basis nominal = holdingCost, owner belum punya
// titipanCommitments -> prompt "catat pokok dulu" (bukan tampil tanpa
// batas), pelanggaran kuota = soft warning (bukan hard block), scope
// HANYA investmentOwnersModal).
//
// Target 1: `DanaTitipanPortfolioAPI.allocatedExcluding(ownerId, holdingId)`
// — API kecil baru, 100% reuse `_holdingSplits()`/basis cost yang sama
// dgn `build()`.
// Target 2: `InvestmentUI._ownerQuotaText()`/`_updateOwnerQuotaDisplay()`
// (investasi-view.js) — render "Kuota sisa: Rp X" live per baris owner
// non-SELF di modal investmentOwnersModal, TERPISAH dari validasi total
// porsi 100% (saveBtn.disabled TIDAK boleh dipengaruhi kuota, sesuai
// Gate 2 #3 = soft warning).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: '', textContent: '', innerHTML: '', className: '', placeholder: '',
      disabled: false, style: {},
    };
  }
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); }, _registry: registry };
}

function makeD(investments, titipanCommitments) {
  return {
    investments: investments || [],
    investmentTx: [],
    investmentWatchlist: [],
    debts: [],
    accounts: [],
    transactions: [],
    titipanCommitments: titipanCommitments || [],
    ownerRegistry: [],
  };
}

function makePortfolioCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {}, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI'],
  );
}

function makeViewCtx(D, dom) {
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js', 'modules/asset/investasi-view.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      openModal: () => {}, closeModal: () => {},
      uid: () => 'gen_' + (D._n = (D._n || 0) + 1),
      save: () => { D._saved = (D._saved || 0) + 1; },
      toast: () => {},
      fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['Investment', 'InvestmentUI', 'MultiOwnerEngine', 'OwnerRegistry', 'DanaTitipanPortfolioAPI'],
  );
}

// ---- Target 1: DanaTitipanPortfolioAPI.allocatedExcluding() ----

test('1. allocatedExcluding(): owner dgn holdingCost di 2 holding, exclude salah satu -> hanya jumlah holding yg TIDAK dikecualikan', () => {
  const D = makeD([
    { id: 'h1', name: 'BBCA', unit: 1, avgPrice: 30000000, currentPrice: 30000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h2', name: 'BBRI', unit: 1, avgPrice: 20000000, currentPrice: 25000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const ctx = makePortfolioCtx(D);
  const excludingH1 = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', 'h1');
  assert.equal(excludingH1, 20000000); // hanya h2 (cost basis, bukan value)
  const excludingH2 = ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', 'h2');
  assert.equal(excludingH2, 30000000); // hanya h1
});

test('2. allocatedExcluding(): tanpa holdingId (null/undefined) -> jumlah SEMUA holding owner itu', () => {
  const D = makeD([
    { id: 'h1', name: 'BBCA', unit: 1, avgPrice: 30000000, currentPrice: 30000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h2', name: 'BBRI', unit: 1, avgPrice: 20000000, currentPrice: 25000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const ctx = makePortfolioCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', null), 50000000);
});

test('3. allocatedExcluding(): owner SELF dikecualikan (tidak pernah dihitung, konsisten build())', () => {
  const D = makeD([
    { id: 'h1', name: 'BBCA', unit: 1, avgPrice: 30000000, currentPrice: 30000000, owners: [{ ownerId: 'aku', porsi: 100, ownerName: 'Aku', isSelf: true }] },
  ]);
  const ctx = makePortfolioCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('aku', null), 0);
});

test('4. allocatedExcluding(): ownerId tidak ditemukan di holding manapun -> 0', () => {
  const D = makeD([
    { id: 'h1', name: 'BBCA', unit: 1, avgPrice: 30000000, currentPrice: 30000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const ctx = makePortfolioCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('cici', null), 0);
});

test('5. allocatedExcluding(): ownerId kosong -> 0 (tidak throw)', () => {
  const D = makeD([]);
  const ctx = makePortfolioCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('', 'h1'), 0);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding(null, 'h1'), 0);
});

test('6. allocatedExcluding(): multi-owner porsi split per holding tetap benar (basis cost, splitByPorsi)', () => {
  const D = makeD([
    { id: 'h1', name: 'BBCA', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [{ ownerId: 'budi', porsi: 40, ownerName: 'Budi', isSelf: false }, { ownerId: 'cici', porsi: 60, ownerName: 'Cici', isSelf: false }] },
  ]);
  const ctx = makePortfolioCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('budi', 'other'), 4000000);
  assert.equal(ctx.DanaTitipanPortfolioAPI.allocatedExcluding('cici', 'other'), 6000000);
});

// ---- Target 2: InvestmentUI._ownerQuotaText()/_updateOwnerQuotaDisplay() ----

test('7. _ownerQuotaText(): owner isSelf -> string kosong (tidak pernah tampil kuota utk baris SELF)', () => {
  const D = makeD();
  const ctx = makeViewCtx(D, makeStatefulDom());
  const html = ctx.InvestmentUI._ownerQuotaText({ ownerId: 'aku', ownerName: 'Aku', isSelf: true, porsi: 100 });
  assert.equal(html, '');
});

test('8. _ownerQuotaText(): owner belum punya titipanCommitments -> prompt "catat pokok dulu" (Gate 2 #2)', () => {
  const D = makeD([], []);
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = { id: 'h1' };
  const html = ctx.InvestmentUI._ownerQuotaText({ ownerId: 'budi', ownerName: 'Budi', isSelf: false, porsi: 50 });
  assert.match(html, /belum dicatat/);
  assert.match(html, /catat pokok dulu/);
});

test('9. _ownerQuotaText(): principal ada, belum teralokasi di holding lain -> Kuota sisa = principal - nominal draft baris ini', () => {
  const D = makeD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 8000000 }],
  );
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  // draft porsi 50% dari holdingCost 10jt = nominal draft 5jt -> sisa = 8jt - 0 (excluding) - 5jt = 3jt
  const html = ctx.InvestmentUI._ownerQuotaText({ ownerId: 'budi', ownerName: 'Budi', isSelf: false, porsi: 50 });
  assert.match(html, /Kuota sisa/);
  assert.match(html, /3000000/);
  assert.doesNotMatch(html, /melebihi/);
});

test('10. _ownerQuotaText(): allocatedExcluding + draft nominal melebihi principal -> soft warning "melebihi pokok dikomit" (bukan hard block)', () => {
  const D = makeD(
    [
      { id: 'h1', name: 'BBCA', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [] },
      { id: 'h2', name: 'BBRI', unit: 1, avgPrice: 6000000, currentPrice: 6000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 8000000 }],
  );
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  // excluding h1 -> h2 6jt sudah teralokasi. draft porsi 50% dari holdingCost h1 10jt = 5jt.
  // sisa = 8jt - 6jt - 5jt = -3jt -> melebihi.
  const html = ctx.InvestmentUI._ownerQuotaText({ ownerId: 'budi', ownerName: 'Budi', isSelf: false, porsi: 50 });
  assert.match(html, /melebihi pokok dikomit/);
  assert.match(html, /⚠️/);
});

test('11. Kuota TERPISAH dari validasi total-porsi 100%: updateOwnersTotal() tidak terpengaruh kuota, saveBtn tetap hidup kalau total pas 100% meski kuota lebih', () => {
  const D = makeD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 1000000 }], // principal kecil, pasti kelebihan
  );
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  ctx.InvestmentUI._ownersDraft = [
    { ownerId: 'aku', ownerName: 'Aku', porsi: 50, isSelf: true },
    { ownerId: 'budi', ownerName: 'Budi', porsi: 50, isSelf: false },
  ];
  ctx.InvestmentUI.updateOwnersTotal(); // total 100% pas
  const saveBtn = dom.getElementById('investmentOwnersSaveBtn');
  assert.equal(saveBtn.disabled, false); // total 100% -> tombol tetap hidup, TIDAK dimatikan kuota
  const quotaHtml = ctx.InvestmentUI._ownerQuotaText(ctx.InvestmentUI._ownersDraft[1]);
  assert.match(quotaHtml, /melebihi pokok dikomit/); // kuota tetap warning, tapi soft (tidak override saveBtn)
});

test('12. _updateOwnerQuotaDisplay(i): update innerHTML elemen #investOwnerKuota{i} sesuai draft terbaru, tidak sentuh elemen lain', () => {
  const D = makeD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 8000000 }],
  );
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  ctx.InvestmentUI._ownersDraft = [{ ownerId: 'budi', ownerName: 'Budi', porsi: 50, isSelf: false }];
  ctx.InvestmentUI._updateOwnerQuotaDisplay(0);
  const el = dom.getElementById('investOwnerKuota0');
  assert.match(el.innerHTML, /Kuota sisa/);
});

test('13. onOwnerPorsiInput(): live-update kuota per baris tanpa render ulang seluruh list (fokus input porsi tidak hilang)', () => {
  const D = makeD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 8000000 }],
  );
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  ctx.InvestmentUI._ownersDraft = [{ ownerId: 'budi', ownerName: 'Budi', porsi: 0, isSelf: false }];
  ctx.InvestmentUI.onOwnerPorsiInput(0, '80');
  assert.equal(ctx.InvestmentUI._ownersDraft[0].porsi, 80);
  const el = dom.getElementById('investOwnerKuota0');
  // porsi 80% dari holdingCost 10jt = 8jt draft nominal -> sisa = 8jt - 0 - 8jt = 0 (masih OK, bukan warning)
  assert.match(el.innerHTML, /Kuota sisa/);
  assert.doesNotMatch(el.innerHTML, /melebihi/);
});

test('14. _renderOwnersList(): container #investOwnerKuota{i} muncul utk baris non-SELF, TIDAK muncul utk baris SELF', () => {
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [] }], []);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  ctx.InvestmentUI._ownersDraft = [
    { ownerId: 'aku', ownerName: 'Aku', porsi: 50, isSelf: true },
    { ownerId: 'budi', ownerName: 'Budi', porsi: 50, isSelf: false },
  ];
  ctx.InvestmentUI._renderOwnersList();
  const listBox = dom.getElementById('investmentOwnersList');
  assert.match(listBox.innerHTML, /investOwnerKuota1/); // baris ke-2 (index 1, non-SELF)
  assert.doesNotMatch(listBox.innerHTML, /investOwnerKuota0/); // baris ke-1 (index 0, isSelf) tidak ada kuota
});
