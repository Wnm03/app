'use strict';
// tests/s668-dana-titipan-owner-status-filter.test.js — Sesi 668 (fondasi
// dropdown single-select, sesi lanjutan eksplisit dari catatan "Belum
// dikerjakan" SESSION-NOTE-S667.md: "filter Owner+Status nyambung ke tab
// Dana Titipan"), ditulis ulang PENUH S674 (item backlog dari catatan "Belum
// dikerjakan" SESSION-NOTE-S673.md: "Sesi 2 (S674, Dana Titipan)") mengikuti
// bentuk final checkbox multi-select, pola SAMA PERSIS
// tests/s667-aset-owner-status-filter.test.js (S673, aset.js), cuma domain
// Dana Titipan (DanaTitipanPortfolioPresenter, dana-titipan-portfolio-
// render.js). Fondasi query (_holdingSettlement()/Aset.getOwnerSettlement()/
// Investment.getOwnerSettlement()) dari S660/S665/S668, TIDAK berubah sesi
// ini — sesi ini mengganti dropdown owner jadi checkbox-list multi-select +
// tombol Pilih Semua/Bersihkan (kalau owner >5), semantik OR, murni state UI
// (DanaTitipanPortfolioPresenter.filterOwnerIds/filterSettlement, 0 tulis ke D).
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/finance/dana-titipan-portfolio-render.js. dana-titipan-
// aggregation-api.js TIDAK disentuh — reuse penuh projection.owners[] apa
// adanya, 0 rumus/agregasi baru.
//
// Cakupan test ini:
//   1. _holdingSettlement(hh) — TIDAK berubah sesi ini, dipertahankan apa
//      adanya (resolve via Aset.getOwnerSettlement()/Investment.
//      getOwnerSettlement(), default 'titipan' kalau entity asal tidak ketemu).
//   2. _ownerMatchesFilter(o) — predicate murni, semantik OR: filterOwnerIds
//      kosong -> lolos semua; owner lolos kalau ownerId-nya ADA di
//      filterOwnerIds; filterSettlement (kalau diisi) butuh minimal 1
//      holding owner ini yang cocok.
//   3. _renderFilterBar(owners) — '' kalau 0 owner; render checkbox-list
//      Pemilik (badge "(N holding)", atribut checked sesuai filterOwnerIds)
//      + dropdown Status (disabled kalau filterOwnerIds kosong); tombol
//      Pilih Semua/Bersihkan HANYA muncul kalau owner > 5.
//   4. onFilterOwnerToggle()/onFilterSettlementChange()/
//      onFilterOwnerSelectAll()/onFilterOwnerClearAll() — state UI murni +
//      delegasi ke renderInto() KEDUA container.
//   5. renderInto()/_renderNow() end-to-end: filter bar muncul di
//      'danaTitipanTabList'; hasil filter (multi-select) memfilter kartu
//      owner yang dirender; pesan kosong "🔍 Tidak ada pemilik..." saat
//      filter tidak match apa pun (beda dari pesan "Belum ada porsi..." saat
//      0 data).

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

// seedBanyakOwner(n) — n aset, tiap aset 1 owner non-SELF unik (owner1..ownerN),
// porsi non-zero (wajib lolos validateOwners()), supaya build().owners punya
// persis n baris.
function seedBanyakOwner(n) {
  const assets = [];
  for (let i = 1; i <= n; i += 1) {
    assets.push({
      id: 'aB' + i,
      name: 'Aset ' + i,
      nilai: 1000000,
      owners: [
        { ownerId: 'SELF', porsi: 1, ownerName: 'Milik Sendiri', isSelf: true },
        { ownerId: 'owner' + i, porsi: 99, ownerName: 'Owner ' + i },
      ],
    });
  }
  return {
    investments: [], investmentTx: [], investmentWatchlist: [], assets, debts: [], titipanCommitments: [], titipanReturns: [], transactions: [],
  };
}

function makeEl(id) {
  return { id, innerHTML: '', querySelectorAll: () => [] };
}

// --- _holdingSettlement() (tidak berubah, dipertahankan apa adanya) --------

test('_holdingSettlement(): holding domain Investasi -> default "titipan" kalau belum diatur', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi1');
  const hh = budi.holdings.find((h) => h.linkedInvestmentId === 'h1');
  assert.equal(ctx.DanaTitipanPortfolioPresenter._holdingSettlement(hh), 'titipan');
});

test('_holdingSettlement(): entity asal sudah tidak ada -> fallback "titipan" (bukan throw)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioPresenter._holdingSettlement({ linkedAssetId: 'ghost', linkedOwnerId: 'adik1' }), 'titipan');
  assert.equal(ctx.DanaTitipanPortfolioPresenter._holdingSettlement(null), 'titipan');
});

// --- state awal -------------------------------------------------------------

test('state awal: filterOwnerIds array kosong (bukan string)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(Array.isArray(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds), true);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 0);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, '');
});

// --- _ownerMatchesFilter() --------------------------------------------------

test('_ownerMatchesFilter(): filterOwnerIds kosong -> lolos semua owner', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = [];
  const p = ctx.DanaTitipanPortfolioAPI.build();
  p.owners.forEach((o) => assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(o), true));
});

test('_ownerMatchesFilter(): 1 owner terpilih -> hanya owner yang cocok lolos', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['budi1'];
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi1');
  const adik = p.owners.find((o) => o.ownerId === 'adik1');
  assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(budi), true);
  assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(adik), false);
});

test('_ownerMatchesFilter(): 2 owner dipilih sekaligus (semantik OR) -> owner dgn SALAH SATU id lolos', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['budi1', 'adik1'];
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi1');
  const adik = p.owners.find((o) => o.ownerId === 'adik1');
  assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(budi), true);
  assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(adik), true);
});

test('_ownerMatchesFilter(): filterSettlement diisi -> butuh minimal 1 holding owner ini yang cocok', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.Investment.setOwnerSettlement('h1', 'budi1', 'milik');
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi1');
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['budi1'];
  ctx.DanaTitipanPortfolioPresenter.filterSettlement = 'milik';
  assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(budi), true);
  ctx.DanaTitipanPortfolioPresenter.filterSettlement = 'titipan';
  assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(budi), false);
});

test('_ownerMatchesFilter(): owner null/undefined -> false, tidak melempar', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['budi1'];
  assert.doesNotThrow(() => assert.equal(ctx.DanaTitipanPortfolioPresenter._ownerMatchesFilter(null), false));
});

// --- _renderFilterBar() ------------------------------------------------

test('_renderFilterBar(): balik "" kalau 0 owner', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPortfolioPresenter._renderFilterBar([]), '');
});

test('_renderFilterBar(): render checkbox Pemilik dgn badge "(N holding)" per owner', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  assert.match(html, /Budi.*\(1 holding\)/);
  assert.match(html, /Adik.*\(1 holding\)/);
  assert.match(html, /Filter Pemilik \(bisa pilih lebih dari satu\)/);
  assert.match(html, /onFilterOwnerToggle\('budi1'\)/);
  assert.match(html, /onFilterOwnerToggle\('adik1'\)/);
});

test('_renderFilterBar(): checkbox owner yg sedang terpilih (filterOwnerIds) dirender checked', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['budi1'];
  const html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  assert.match(html, /onFilterOwnerToggle\('budi1'\)" checked>/);
  assert.doesNotMatch(html, /onFilterOwnerToggle\('adik1'\)" checked>/);
});

test('_renderFilterBar(): dropdown Status disabled kalau filterOwnerIds kosong, aktif kalau terisi', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = [];
  let html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  let statusSelect = html.match(/<select[^>]*onchange="DanaTitipanPortfolioPresenter\.onFilterSettlementChange[^>]*>/);
  assert.ok(statusSelect);
  assert.match(statusSelect[0], / disabled/);

  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['budi1'];
  html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  statusSelect = html.match(/<select[^>]*onchange="DanaTitipanPortfolioPresenter\.onFilterSettlementChange[^>]*>/);
  assert.ok(statusSelect);
  assert.doesNotMatch(statusSelect[0], / disabled/);
});

test('_renderFilterBar(): <=5 owner -> tombol Pilih Semua/Bersihkan TIDAK dirender', () => {
  const D = seedBanyakOwner(5);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  assert.doesNotMatch(html, /onFilterOwnerSelectAll/);
  assert.doesNotMatch(html, /onFilterOwnerClearAll/);
});

test('_renderFilterBar(): >5 owner -> tombol Pilih Semua/Bersihkan DIRENDER', () => {
  const D = seedBanyakOwner(6);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._renderFilterBar(p.owners);
  assert.match(html, /DanaTitipanPortfolioPresenter\.onFilterOwnerSelectAll\(\)/);
  assert.match(html, /DanaTitipanPortfolioPresenter\.onFilterOwnerClearAll\(\)/);
  assert.match(html, />Pilih Semua</);
  assert.match(html, />Bersihkan</);
});

// --- onFilterOwnerToggle() / onFilterSettlementChange() -----------------

test('onFilterOwnerToggle(id) pertama kali -> id masuk filterOwnerIds & renderInto() KEDUA container', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const calls = [];
  ctx.DanaTitipanPortfolioPresenter.renderInto = (id) => { calls.push(id); };
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1');
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 1);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds[0], 'budi1');
  assert.equal(calls.length, 2);
  assert.equal(calls[0], 'danaTitipanTabList');
  assert.equal(calls[1], 'danaTitipanPortfolioList');
});

test('onFilterOwnerToggle(id) yang sama 2x -> toggle off (dilepas dari array)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1');
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1');
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 0);
});

test('onFilterOwnerToggle(): centang 2 owner -> filterOwnerIds berisi keduanya', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1');
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('adik1');
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 2);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.indexOf('budi1') !== -1, true);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.indexOf('adik1') !== -1, true);
});

test('onFilterOwnerToggle(): semua owner dilepas centang -> filterSettlement otomatis reset', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1');
  ctx.DanaTitipanPortfolioPresenter.onFilterSettlementChange('milik');
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1'); // lepas centang terakhir
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 0);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, '');
});

test('onFilterOwnerToggle("") / (undefined) tidak melempar & tidak mengubah state (guard id kosong)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1');
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle(''));
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle(undefined));
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 1);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds[0], 'budi1');
});

test('onFilterSettlementChange(): normalisasi nilai tidak valid ke "", delegasi ke renderInto() KEDUA container', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  let calls = [];
  ctx.DanaTitipanPortfolioPresenter.renderInto = (id) => { calls.push(id); };
  ctx.DanaTitipanPortfolioPresenter.onFilterSettlementChange('milik');
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, 'milik');
  assert.equal(calls.length, 2);
  calls = [];
  ctx.DanaTitipanPortfolioPresenter.onFilterSettlementChange('ngasal');
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, '');
  assert.equal(calls.length, 2);
});

// --- onFilterOwnerSelectAll() / onFilterOwnerClearAll() -----------------

test('onFilterOwnerSelectAll() -> filterOwnerIds terisi SEMUA ownerId hasil build() & renderInto() KEDUA container', () => {
  const D = seedBanyakOwner(6);
  const ctx = makeCtx(D);
  const calls = [];
  ctx.DanaTitipanPortfolioPresenter.renderInto = (id) => { calls.push(id); };
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerSelectAll();
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 6);
  for (let i = 1; i <= 6; i += 1) assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.indexOf('owner' + i) !== -1, true);
  assert.equal(calls.length, 2);
});

test('onFilterOwnerClearAll() setelah Select All -> filterOwnerIds & filterSettlement kosong lagi', () => {
  const D = seedBanyakOwner(6);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.renderInto = () => {};
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerSelectAll();
  ctx.DanaTitipanPortfolioPresenter.onFilterSettlementChange('milik');
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerClearAll();
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterOwnerIds.length, 0);
  assert.equal(ctx.DanaTitipanPortfolioPresenter.filterSettlement, '');
});

// --- renderInto()/_renderNow() end-to-end (DOM ringan) -------------------

test('renderInto("danaTitipanTabList"): filter bar muncul & memfilter kartu owner (multi-select)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['budi1'];
  const elTab = makeEl('danaTitipanTabList');
  ctx.document = { getElementById: () => elTab };
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
  assert.match(elTab.innerHTML, /onchange="DanaTitipanPortfolioPresenter\.onFilterOwnerToggle/);
  assert.match(elTab.innerHTML, /👤 Budi/);
  assert.doesNotMatch(elTab.innerHTML, /👤 Adik/);
});

test('renderInto(): filter tidak match apa pun -> pesan "🔍 Tidak ada pemilik..." (beda dari "Belum ada porsi...")', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['owner_tidak_ada'];
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
