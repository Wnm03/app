'use strict';
// tests/s668-dana-titipan-owner-status-filter.test.js — Sesi 668 (sesi
// lanjutan eksplisit dari catatan "Belum dikerjakan" SESSION-NOTE-S667.md:
// "filter Owner+Status nyambung ke tab Dana Titipan
// (DanaTitipanPortfolioPresenter) — supaya konsisten dgn filter yang sudah
// ada di daftar Investasi (S662) & daftar Buku Aset (S667 ini)").
//
// Fondasi query (Aset.getOwnerSettlement()/Investment.getOwnerSettlement())
// dari S660/S665, sesi ini menyambungkan ke UI tab Dana Titipan
// (DanaTitipanPortfolioPresenter, dana-titipan-portfolio-render.js):
// dropdown "Pemilik" + "Status" di atas daftar kartu owner, awalnya (S668)
// HANYA aktif di container #danaTitipanTabList (kartu ringkas
// #danaTitipanPortfolioList di tab Ringkasan sengaja TIDAK diubah dulu).
// SESI S670 (lanjutan): gate diperluas mencakup #danaTitipanPortfolioList
// juga -- lihat assertion yang diupdate di bawah (ditandai "S670"). 1 file
// source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/finance/dana-titipan-portfolio-render.js. dana-titipan-
// aggregation-api.js TIDAK disentuh — reuse penuh projection.owners[].
// holdings[] (linkedAssetId/linkedInvestmentId/linkedOwnerId, SUDAH ADA
// sejak build()), 0 rumus/agregasi baru.
//
// Cakupan test ini:
//   1. _holdingSettlement(hh) — resolve via Aset.getOwnerSettlement() (aset)
//      / Investment.getOwnerSettlement() (investasi), default 'titipan'
//      kalau entity asal tidak ketemu.
//   2. _ownerMatchesFilter(o) — predicate murni: filterOwnerId kosong ->
//      lolos semua; owner harus match id; filterSettlement (kalau diisi)
//      butuh minimal 1 holding owner ini yang cocok.
//   3. _renderFilterBar(owners) — '' kalau 0 owner; render dropdown Pemilik
//      (badge "(N holding)") + dropdown Status (disabled kalau
//      filterOwnerId kosong).
//   4. onFilterOwnerChange()/onFilterSettlementChange() — state UI +
//      delegasi ke renderInto('danaTitipanTabList').
//   5. renderInto()/_renderNow() end-to-end: filter bar HANYA muncul di
//      container 'danaTitipanTabList', TIDAK muncul di
//      'danaTitipanPortfolioList' (kartu ringkas Dana Kelolaan) walau state
//      filter sedang terisi; hasil filter memfilter kartu owner yang
//      dirender; pesan kosong "🔍 Tidak ada pemilik..." saat filter tidak
//      match apa pun (beda dari pesan "Belum ada porsi..." saat 0 data).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/asset/aset-owners.js',
      'modules/asset/aset.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      toast: () => {},
      sameId: (a, b) => String(a) === String(b),
      todayStr: () => '2026-08-30',
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      fmtFullSigned: (n) => (n >= 0 ? String(n) : String(n)),
    },
    ['Investment', 'Aset', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

function baseD() {
  return {
    investments: [
      {
        id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000,
        owners: [
          { ownerId: 'SELF', porsi: 20, ownerName: 'Milik Sendiri', isSelf: true },
          { ownerId: 'budi1', porsi: 80, ownerName: 'Budi' },
        ],
      },
    ],
    investmentTx: [],
    investmentWatchlist: [],
    assets: [
      {
        id: 'as1', name: 'Motor Titipan Adik', nilai: 20000000,
        owners: [
          { ownerId: 'SELF', porsi: 10, ownerName: 'Milik Sendiri', isSelf: true },
          { ownerId: 'adik1', porsi: 90, ownerName: 'Adik' },
        ],
      },
    ],
    debts: [],
    titipanCommitments: [],
    titipanReturns: [],
    transactions: [],
  };
}

// --- _holdingSettlement() ------------------------------------------------

test('_holdingSettlement(): holding domain Investasi -> default "titipan" kalau belum diatur', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi1');
  const hh = budi.holdings.find((h) => h.linkedInvestmentId === 'h1');
  assert.equal(ctx.DanaTitipanPortfolioPresenter._holdingSettlement(hh), 'titipan');
});

test('_holdingSettlement(): holding domain Investasi -> ikut Investment.getOwnerSettlement() = "milik"', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Investment.setOwnerSettlement('h1', 'budi1', 'milik');
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi1');
  const hh = budi.holdings.find((h) => h.linkedInvestmentId === 'h1');
  assert.equal(ctx.DanaTitipanPortfolioPresenter._holdingSettlement(hh), 'milik');
});

test('_holdingSettlement(): holding domain Aset -> ikut Aset.getOwnerSettlement()', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Aset.setOwnerSettlement('as1', 'adik1', 'milik');
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const adik = p.owners.find((o) => o.ownerId === 'adik1');
  const hh = adik.holdings.find((h) => h.linkedAssetId === 'as1');
  assert.equal(ctx.DanaTitipanPortfolioPresenter._holdingSettlement(hh), 'milik');
});

test('_holdingSettlement(): entity asal sudah tidak ada -> fallback "titipan" (bukan throw)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioPresenter._holdingSettlement({ linkedAssetId: 'ghost', linkedOwnerId: 'adik1' }), 'titipan');
  assert.equal(ctx.DanaTitipanPortfolioPresenter._holdingSettlement({ linkedInvestmentId: 'ghost', linkedOwnerId: 'budi1' }), 'titipan');
  assert.equal(ctx.DanaTitipanPortfolioPresenter._holdingSettlement(null), 'titipan');
});

// --- _ownerMatchesFilter() ------------------------------------------------

test('_ownerMatchesFilter(): filterOwnerId kosong -> lolos semua owner', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerId = '';
  const p = ctx.DanaTitipanPortfolioAPI.build();
  p.owners.forEach((o) => assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(o), true));
});

test('_ownerMatchesFilter(): filterOwnerId terisi -> hanya owner yang cocok lolos', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerId = 'budi1';
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi1');
  const adik = p.owners.find((o) => o.ownerId === 'adik1');
  assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(budi), true);
  assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(adik), false);
});

test('_ownerMatchesFilter(): filterSettlement diisi -> butuh minimal 1 holding owner ini yang cocok', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Investment.setOwnerSettlement('h1', 'budi1', 'milik');
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi1');
  ctx.DanaTitipanPortfolioPresenter.filterOwnerId = 'budi1';
  ctx.DanaTitipanPortfolioPresenter.filterSettlement = 'milik';
  assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(budi), true);
  ctx.DanaTitipanPortfolioPresenter.filterSettlement = 'titipan';
  assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(budi), false);
});

// --- _renderFilterBar() ------------------------------------------------

test('_renderFilterBar(): balik "" kalau 0 owner', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioPresenter._renderFilterBar([]), '');
});

test('_renderFilterBar(): render dropdown Pemilik dgn badge "(N holding)" per owner', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  assert.match(html, /Budi \(1 holding\)/);
  assert.match(html, /Adik \(1 holding\)/);
  assert.match(html, /👥 Semua Pemilik/);
});

test('_renderFilterBar(): dropdown Status disabled kalau filterOwnerId kosong, aktif kalau terisi', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  ctx.DanaTitipanPortfolioPresenter.filterOwnerId = '';
  let html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  let statusSelect = html.match(/<select[^>]*onchange="DanaTitipanPortfolioPresenter\.onFilterSettlementChange[^>]*>/);
  assert.ok(statusSelect);
  assert.match(statusSelect[0], / disabled/);

  ctx.DanaTitipanPortfolioPresenter.filterOwnerId = 'budi1';
  html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  statusSelect = html.match(/<select[^>]*onchange="DanaTitipanPortfolioPresenter\.onFilterSettlementChange[^>]*>/);
  assert.ok(statusSelect);
  assert.doesNotMatch(statusSelect[0], / disabled/);
});

// --- onFilterOwnerChange() / onFilterSettlementChange() -----------------

test('onFilterOwnerChange(): set state + delegasi ke renderInto() KEDUA container (S670)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const calledWith = [];
  ctx.DanaTitipanPortfolioPresenter.renderInto = (id) => { calledWith.push(id); };
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerChange('budi1');
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerId, 'budi1');
  assert.deepEqual(calledWith, ['danaTitipanTabList', 'danaTitipanPortfolioList']);
});

test('onFilterOwnerChange(""): mengosongkan filterSettlement juga', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};
  ctx.DanaTitipanPortfolioPresenter.filterOwnerId = 'budi1';
  ctx.DanaTitipanPortfolioPresenter.filterSettlement = 'milik';
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerChange('');
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerId, '');
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, '');
});

test('onFilterSettlementChange(): normalisasi nilai tidak valid ke "", delegasi ke renderInto() KEDUA container (S670)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const calledWith = [];
  ctx.DanaTitipanPortfolioPresenter.renderInto = (id) => { calledWith.push(id); };
  ctx.DanaTitipanPortfolioPresenter.onFilterSettlementChange('milik');
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, 'milik');
  ctx.DanaTitipanPortfolioPresenter.onFilterSettlementChange('ngasal');
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, '');
  assert.deepEqual(calledWith, ['danaTitipanTabList', 'danaTitipanPortfolioList', 'danaTitipanTabList', 'danaTitipanPortfolioList']);
});

// --- renderInto()/_renderNow() end-to-end (DOM ringan) -------------------

function makeEl(id) {
  return { id, innerHTML: '', querySelectorAll: () => [] };
}

test('renderInto(): filter bar muncul di KEDUA container "danaTitipanTabList" & "danaTitipanPortfolioList" (S670)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerId = 'budi1';
  const elTab = makeEl('danaTitipanTabList');
  const elCard = makeEl('danaTitipanPortfolioList');
  const elMap = { danaTitipanTabList: elTab, danaTitipanPortfolioList: elCard };
  ctx.document = { getElementById: (id) => elMap[id] || null };
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList');
  assert.match(elTab.innerHTML, /onchange="DanaTitipanPortfolioPresenter\.onFilterOwnerChange/);
  assert.match(elCard.innerHTML, /onchange="DanaTitipanPortfolioPresenter\.onFilterOwnerChange/);
  // filter aktif di KEDUA container (state dibagi) -- Adik (tidak match filter)
  // disembunyikan di keduanya, Budi (match) tetap tampil di keduanya.
  assert.doesNotMatch(elCard.innerHTML, /👤 Adik/);
  assert.doesNotMatch(elTab.innerHTML, /👤 Adik/);
  assert.match(elCard.innerHTML, /👤 Budi/);
  assert.match(elTab.innerHTML, /👤 Budi/);
});

test('renderInto(): filter tidak match apa pun -> pesan "🔍 Tidak ada pemilik..." (beda dari "Belum ada porsi...")', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerId = 'owner_tidak_ada';
  const elTab = makeEl('danaTitipanTabList');
  ctx.document = { getElementById: () => elTab };
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
  assert.match(elTab.innerHTML, /Tidak ada pemilik dana titipan yang cocok/);
});

test('renderInto(): 0 data sama sekali (bukan hasil filter) -> tetap pesan "Belum ada porsi..." lama', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], assets: [], debts: [], titipanCommitments: [], titipanReturns: [], transactions: [] };
  const ctx = makeCtx(D);
  const elTab = makeEl('danaTitipanTabList');
  ctx.document = { getElementById: () => elTab };
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
  assert.match(elTab.innerHTML, /Belum ada porsi dana titipan/);
});
