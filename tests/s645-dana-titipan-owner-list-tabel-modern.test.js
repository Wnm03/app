'use strict';
// tests/s645-dana-titipan-owner-list-tabel-modern.test.js — cakupan Sesi
// s645 (lanjutan s642/s644, RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md
// — laporan user via screenshot: list ringkasan per-owner "👤 nama
// Pokok→Kini" di ATAS kartu holding masih flat/div, belum ikut jadi tabel
// spt mockup Ledger Pro). KHUSUS D.profile.theme==='modern', list owner
// (`projection.owners.map()` lama di `_renderNow()`) SEKARANG dibungkus
// <table class="tx-tbl">, 1 <tr><td colspan="3"> per owner — kartu
// <details> owner (_ownerCardHtml(), diekstrak apa adanya dari markup
// lama) TETAP UTUH 100% di dalam <td>, 0 wiring diubah (id, data-owner-id,
// data-action, dropdown tautkan aset, holdings bersarang). 10 tema lama
// TIDAK disentuh sama sekali — tetap flat join _ownerCardHtml() apa
// adanya, 0 <table>.

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

test('_ownerListHtml() — tema "modern": render <table class="tx-tbl"> pembungkus, header Pemilik/Pokok \u2192 Kini/\u00b1', () => {
  const D = baseD('modern');
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._ownerListHtml(projection.owners);
  assert.match(html, /class="tx-tbl-wrap"><table class="tx-tbl">/);
  assert.match(html, /<th>Pemilik<\/th><th class="num">Pokok → Kini<\/th><th class="num">±<\/th>/);
  assert.match(html, /<tr class="tx-tbl-row titipan-tbl-owner-row">/);
  assert.match(html, /<td colspan="3" class="titipan-tbl-owner-cell">/);
});

test('_ownerListHtml() — tema "modern": kartu <details> owner (id, tombol, wiring) TETAP utuh di dalam <td>', () => {
  const D = baseD('modern');
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._ownerListHtml(projection.owners);
  assert.match(html, /<details class="u-mb6" id="titipanOwnerCard_0">/);
  assert.match(html, /data-action="DanaTitipanCommitmentUI\.open"/);
  assert.match(html, /id="titipanAssetPick_0"/);
  assert.match(html, /id="titipanHoldingsList_0"/);
});

test('_ownerListHtml() — 10 tema lama (theme selain "modern"): tetap flat join _ownerCardHtml(), 0 <table>', () => {
  const D = baseD('dark');
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._ownerListHtml(projection.owners);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<details class="u-mb6" id="titipanOwnerCard_0">/);
});

test('_ownerListHtml() — profile.theme kosong/undefined: tetap jalur lama (bukan default baru ke modern)', () => {
  const D = baseD(null);
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._ownerListHtml(projection.owners);
  assert.doesNotMatch(html, /<table/);
});

test('_ownerListHtml() — tema "modern", banyak owner: 1 <tr> per owner, urutan terjaga', () => {
  const D = {
    investments: [],
    investmentTx: [],
    investmentWatchlist: [],
    debts: [],
    assets: [],
    titipanCommitments: [
      { id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 1000000 },
      { id: 'c2', ownerId: 'wati', ownerName: 'Wati', principalAmount: 2000000 },
    ],
    profile: { theme: 'modern' },
  };
  const ctx = makeCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const html = ctx.DanaTitipanPortfolioPresenter._ownerListHtml(projection.owners);
  const rowCount = (html.match(/<tr class="tx-tbl-row titipan-tbl-owner-row">/g) || []).length;
  assert.equal(rowCount, 2);
  assert.match(html, /id="titipanOwnerCard_0">[\s\S]*Budi[\s\S]*id="titipanOwnerCard_1">[\s\S]*Wati/);
});

test('[integrasi] _renderNow() via render(): tema "modern" — daftar owner terpanggil lewat _ownerListHtml(), tetap ada tombol Catat/Update Pokok & Catat Pengeluaran di atasnya', () => {
  const D = baseD('modern');
  const ctx = makeCtx(D);
  const el = { innerHTML: '', querySelectorAll: () => [] };
  const origGetElementById = global.document && global.document.getElementById;
  ctx.DanaTitipanPortfolioPresenter._renderNow(el);
  assert.match(el.innerHTML, /Catat\/Update Pokok Dana Titipan/);
  assert.match(el.innerHTML, /Catat Pengeluaran Dana Titipan/);
  assert.match(el.innerHTML, /class="tx-tbl-wrap"><table class="tx-tbl">/);
  void origGetElementById;
});
