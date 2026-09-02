'use strict';
// tests/s670-dana-titipan-ringkas-filter.test.js — Sesi 670 (sesi lanjutan
// eksplisit dari catatan "Belum dikerjakan" SESSION-NOTE-S669.md: "S670:
// filter Owner+Status di dalam kartu ringkas #danaTitipanPortfolioList (tab
// Ringkasan)"), ditulis ulang S674 (item backlog SESSION-NOTE-S673.md:
// "Sesi 2 (S674, Dana Titipan)") mengikuti bentuk final checkbox
// multi-select (pola SAMA PERSIS S668/S673) -- HANYA bentuk filterOwnerId
// (string) -> filterOwnerIds (array) yang berubah di sini, gate
// `isFilterableView` mencakup KEDUA container (S670, tidak berubah lagi
// sesi ini).
//
// Fondasi (_renderFilterBar()/_ownerMatchesFilter()) diubah jadi
// multi-select S674, TIDAK diubah lagi sesi ini — sesi ini murni memverifikasi
// gate `isFilterableView` (S670) tetap mencakup #danaTitipanPortfolioList
// SETELAH bentuk filter berubah jadi checkbox-list. 1 file source disentuh
// sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/finance/dana-titipan-portfolio-render.js (file sama dgn S668/S674
// — lanjutan langsung, bukan file baru).
//
// Cakupan test ini (di luar yang sudah dicek di
// tests/s668-dana-titipan-owner-status-filter.test.js):
//   1. renderInto('danaTitipanPortfolioList') end-to-end (multi-select):
//      filter bar muncul, filter memfilter kartu owner, pesan kosong "🔍
//      Tidak ada pemilik..." saat filter tidak match apa pun, pesan "Belum
//      ada porsi..." saat 0 data (bukan hasil filter).
//   2. State filter dibagi (shared) lintas kedua container: filterOwnerIds
//      yang diisi lewat 1 container langsung berlaku juga saat container
//      lain di-render (bukan state terpisah per container).
//   3. Container ketiga yang tidak dikenal (bukan danaTitipanTabList/
//      danaTitipanPortfolioList) TETAP TIDAK menampilkan filter bar (gate
//      tidak bocor ke sembarang container).
//   4. onFilterOwnerToggle()/onFilterSettlementChange()/
//      onFilterOwnerSelectAll()/onFilterOwnerClearAll() memanggil
//      renderInto() utk KEDUA id container (urutan: tab dulu, lalu kartu
//      ringkas).

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
      'modules/shared/filter-prefs-store.js',
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

// --- renderInto('danaTitipanPortfolioList') end-to-end (multi-select) ------

test('renderInto("danaTitipanPortfolioList"): filter bar muncul & memfilter kartu owner', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['budi1'];
  const elCard = makeEl('danaTitipanPortfolioList');
  ctx.document = { getElementById: () => elCard };
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList');
  assert.match(elCard.innerHTML, /onchange="DanaTitipanPortfolioPresenter\.onFilterOwnerToggle/);
  assert.match(elCard.innerHTML, /👤 Budi/);
  assert.doesNotMatch(elCard.innerHTML, /👤 Adik/);
});

test('renderInto("danaTitipanPortfolioList"): filter tidak match apa pun -> pesan "🔍 Tidak ada pemilik..."', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['owner_tidak_ada'];
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

test('renderInto("danaTitipanPortfolioList"): filterOwnerIds kosong -> 0 filter aktif, filter bar tetap muncul (checkbox semua owner)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const elCard = makeEl('danaTitipanPortfolioList');
  ctx.document = { getElementById: () => elCard };
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList');
  assert.match(elCard.innerHTML, /Filter Pemilik \(bisa pilih lebih dari satu\)/);
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
  // Simulasikan user mencentang owner lewat checkbox di kartu ringkas.
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('adik1');
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
  ctx.DanaTitipanPortfolioPresenter.filterOwnerIds = ['budi1'];
  const elLain = makeEl('containerLainYangTidakDikenal');
  ctx.document = { getElementById: () => elLain };
  ctx.DanaTitipanPortfolioPresenter.renderInto('containerLainYangTidakDikenal');
  assert.doesNotMatch(elLain.innerHTML, /onchange="DanaTitipanPortfolioPresenter\.onFilterOwnerToggle/);
  // Filter tetap tidak aktif di container ini -- Adik (tidak match filterOwnerIds=['budi1']) tetap tampil apa adanya.
  assert.match(elLain.innerHTML, /👤 Adik/);
  assert.match(elLain.innerHTML, /👤 Budi/);
});

// --- Handler filter memanggil KEDUA container ---

test('onFilterOwnerToggle()/onFilterSettlementChange(): renderInto() dipanggil utk KEDUA id container, urutan tab dulu', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  let calls = [];
  ctx.DanaTitipanPortfolioPresenter.renderInto = (id) => { calls.push(id); };

  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerToggle('budi1');
  assert.equal(calls.length, 2);
  assert.equal(calls[0], 'danaTitipanTabList');
  assert.equal(calls[1], 'danaTitipanPortfolioList');

  calls = [];
  ctx.DanaTitipanPortfolioPresenter.onFilterSettlementChange('milik');
  assert.equal(calls.length, 2);
  assert.equal(calls[0], 'danaTitipanTabList');
  assert.equal(calls[1], 'danaTitipanPortfolioList');
});

test('onFilterOwnerSelectAll()/onFilterOwnerClearAll(): renderInto() dipanggil utk KEDUA id container', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  let calls = [];
  ctx.DanaTitipanPortfolioPresenter.renderInto = (id) => { calls.push(id); };

  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerSelectAll();
  assert.equal(calls.length, 2);
  assert.equal(calls[0], 'danaTitipanTabList');
  assert.equal(calls[1], 'danaTitipanPortfolioList');

  calls = [];
  ctx.DanaTitipanPortfolioPresenter.onFilterOwnerClearAll();
  assert.equal(calls.length, 2);
  assert.equal(calls[0], 'danaTitipanTabList');
  assert.equal(calls[1], 'danaTitipanPortfolioList');
});
