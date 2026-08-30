'use strict';
// tests/s670-dana-titipan-ringkas-filter.test.js — Sesi 670 (sesi lanjutan
// eksplisit dari catatan "Belum dikerjakan" SESSION-NOTE-S669.md: "S670:
// filter Owner+Status di dalam kartu ringkas #danaTitipanPortfolioList (tab
// Ringkasan) — SENGAJA TIDAK disentuh sesi S668 (kartu ringkas dibiarkan apa
// adanya sesuai permintaan eksplisit user), kalau nanti dibutuhkan bisa reuse
// penuh _renderFilterBar()/_ownerMatchesFilter() yang sudah ada di dana-
// titipan-portfolio-render.js, cuma ubah gate isTabView jadi mencakup kedua
// container").
//
// Fondasi (_renderFilterBar()/_ownerMatchesFilter()/filterOwnerId/
// filterSettlement) dari S668, TIDAK diubah sesi ini — sesi ini murni
// memperluas gate `isTabView` (S668) -> `isFilterableView` (S670) di
// `_renderNow()` supaya mencakup #danaTitipanPortfolioList JUGA, dan
// menambah target renderInto() kedua di onFilterOwnerChange()/
// onFilterSettlementChange() supaya kedua container tetap sinkron (state
// filter dibagi/shared). 1 file source disentuh sesi ini (sesuai Mode PATCH
// ZIP, docs/ZIP_RULES.md): modules/finance/dana-titipan-portfolio-render.js
// (file sama dgn S668 — lanjutan langsung, bukan file baru).
//
// Cakupan test ini (di luar yang sudah diupdate di
// tests/s668-dana-titipan-owner-status-filter.test.js):
//   1. renderInto('danaTitipanPortfolioList') end-to-end: filter bar muncul,
//      filter memfilter kartu owner, pesan kosong "🔍 Tidak ada pemilik..."
//      saat filter tidak match apa pun, pesan "Belum ada porsi..." saat 0
//      data (bukan hasil filter) — 4 skenario yang tadinya cuma dicek utk
//      'danaTitipanTabList' di S668.
//   2. State filter dibagi (shared) lintas kedua container: filter yang
//      diisi lewat 1 container langsung berlaku juga saat container lain
//      di-render (bukan state terpisah per container).
//   3. Container ketiga yang tidak dikenal (bukan danaTitipanTabList/
//      danaTitipanPortfolioList) TETAP TIDAK menampilkan filter bar (gate
//      tidak bocor ke sembarang container).
//   4. onFilterOwnerChange()/onFilterSettlementChange() memanggil
//      renderInto() utk KEDUA id container (urutan: tab dulu, lalu kartu
//      ringkas) — pola sama semua caller lain di codebase yang selalu
//      memanggil render()+renderInto('danaTitipanTabList') berpasangan.

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

function makeEl(id) {
  return { id, innerHTML: '', querySelectorAll: () => [] };
}

// --- renderInto('danaTitipanPortfolioList') end-to-end --------------------

test('renderInto("danaTitipanPortfolioList"): filter bar muncul & memfilter kartu owner', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerId = 'budi1';
  const elCard = makeEl('danaTitipanPortfolioList');
  ctx.document = { getElementById: () => elCard };
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList');
  assert.match(elCard.innerHTML, /onchange="DanaTitipanPortfolioPresenter\.onFilterOwnerChange/);
  assert.match(elCard.innerHTML, /👤 Budi/);
  assert.doesNotMatch(elCard.innerHTML, /👤 Adik/);
});

test('renderInto("danaTitipanPortfolioList"): filter tidak match apa pun -> pesan "🔍 Tidak ada pemilik..."', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerId = 'owner_tidak_ada';
  const elCard = makeEl('danaTitipanPortfolioList');
  ctx.document = { getElementById: () => elCard };
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList');
  assert.match(elCard.innerHTML, /Tidak ada pemilik dana titipan yang cocok/);
});

test('renderInto("danaTitipanPortfolioList"): 0 data sama sekali (bukan hasil filter) -> tetap pesan "Belum ada porsi..." lama', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], assets: [], debts: [], titipanCommitments: [], titipanReturns: [], transactions: [] };
  const ctx = makeCtx(D);
  const elCard = makeEl('danaTitipanPortfolioList');
  ctx.document = { getElementById: () => elCard };
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList');
  assert.match(elCard.innerHTML, /Belum ada porsi dana titipan/);
});

test('renderInto("danaTitipanPortfolioList"): filterOwnerId kosong -> 0 filter aktif, filter bar tetap muncul (dropdown "Semua Pemilik")', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const elCard = makeEl('danaTitipanPortfolioList');
  ctx.document = { getElementById: () => elCard };
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList');
  assert.match(elCard.innerHTML, /👥 Semua Pemilik/);
  assert.match(elCard.innerHTML, /👤 Budi/);
  assert.match(elCard.innerHTML, /👤 Adik/);
});

// --- State filter dibagi (shared) lintas container -------------------------

test('state filter dibagi: diisi lewat 1 container, langsung berlaku saat container lain di-render', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const elTab = makeEl('danaTitipanTabList');
  const elCard = makeEl('danaTitipanPortfolioList');
  const elMap = { danaTitipanTabList: elTab, danaTitipanPortfolioList: elCard };
  ctx.document = { getElementById: (id) => elMap[id] || null };
  // Simulasikan user memilih owner lewat dropdown di kartu ringkas.
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerChange('adik1');
  assert.match(elCard.innerHTML, /👤 Adik/);
  assert.doesNotMatch(elCard.innerHTML, /👤 Budi/);
  // Container tab (kalaupun baru dibuka belakangan) ikut menampilkan hasil filter yang sama.
  assert.match(elTab.innerHTML, /👤 Adik/);
  assert.doesNotMatch(elTab.innerHTML, /👤 Budi/);
});

// --- Gate tidak bocor ke container lain -------------------------------------

test('renderInto(): container id lain (bukan tab/kartu ringkas) TETAP TIDAK menampilkan filter bar', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerId = 'budi1';
  const elLain = makeEl('containerLainYangTidakDikenal');
  ctx.document = { getElementById: () => elLain };
  ctx.DanaTitipanPortfolioPresenter.renderInto('containerLainYangTidakDikenal');
  assert.doesNotMatch(elLain.innerHTML, /onchange="DanaTitipanPortfolioPresenter\.onFilterOwnerChange/);
  // Filter tetap tidak aktif di container ini -- Adik (tidak match filterOwnerId='budi1') tetap tampil apa adanya.
  assert.match(elLain.innerHTML, /👤 Adik/);
  assert.match(elLain.innerHTML, /👤 Budi/);
});

// --- onFilterOwnerChange()/onFilterSettlementChange() memanggil KEDUA container ---

test('onFilterOwnerChange()/onFilterSettlementChange(): renderInto() dipanggil utk KEDUA id container, urutan tab dulu', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  let calls = [];
  ctx.DanaTitipanPortfolioPresenter.renderInto = (id) => { calls.push(id); };

  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerChange('budi1');
  assert.deepEqual(calls, ['danaTitipanTabList', 'danaTitipanPortfolioList']);

  calls = [];
  ctx.DanaTitipanPortfolioPresenter.onFilterSettlementChange('milik');
  assert.deepEqual(calls, ['danaTitipanTabList', 'danaTitipanPortfolioList']);
});
