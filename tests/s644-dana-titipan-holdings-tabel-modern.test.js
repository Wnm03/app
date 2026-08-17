'use strict';
// tests/s644-dana-titipan-holdings-tabel-modern.test.js — cakupan Sesi s644
// (lanjutan s642, RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md): daftar
// holding per instrumen di dalam kartu owner Dana Titipan SEKARANG JUGA
// render sbg tabel padat (reuse class .tx-tbl* dari s637/s642, 0 CSS baru)
// KHUSUS D.profile.theme==='modern'. Grup kustodian (_groupHoldingsByCustodian,
// S540-D/S541) tetap dipakai, direpresentasikan sbg baris header colspan
// (.titipan-tbl-group-row) di dalam tabel yang sama (bukan <details> lagi
// khusus tema modern). 10 tema lama TIDAK disentuh sama sekali — tetap
// _holdingRowHtml()/<details> grup kustodian apa adanya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  let _n = 0;
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    {
      D,
      uid: () => 'r' + (_n += 1),
      save: () => {},
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    },
    ['DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
  return ctx;
}

function baseD(theme) {
  return {
    investments: [{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    investmentTx: [],
    investmentWatchlist: [],
    debts: [],
    assets: [],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 100000000 }],
    profile: theme ? { theme } : {},
  };
}

test('_holdingsListHtml() — tema "modern": render <table class="tx-tbl"> (bukan <details>/flex lama)', () => {
  const D = baseD('modern');
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._holdingsListHtml(projection.owners[0].holdings);
  assert.match(html, /class="tx-tbl-wrap"><table class="tx-tbl">/);
  assert.match(html, /<th>Instrumen<\/th><th class="num">Nilai<\/th><th class="num">Porsi<\/th>/);
  assert.match(html, /<tr class="tx-tbl-row" data-linked-asset-id="h:h1">/);
  assert.match(html, /100%/);
  assert.doesNotMatch(html, /<details class="titipan-holding-row/);
});

test('_holdingsListHtml() — 10 tema lama (theme selain "modern"): tetap jalur div/flex + <details> grup kustodian lama, 0 <table>', () => {
  const D = baseD('dark');
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._holdingsListHtml(projection.owners[0].holdings);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /titipan-holding-row/);
});

test('_holdingsListHtml() — profile.theme kosong/undefined: tetap jalur lama (bukan default baru ke modern)', () => {
  const D = baseD(null);
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._holdingsListHtml(projection.owners[0].holdings);
  assert.doesNotMatch(html, /<table/);
});
