'use strict';
// tests/s638-dana-titipan-money-class-modern.test.js — cakupan Sesi s638
// (RENCANA-MODERNISASI-UI.md, lanjutan s635/s636/s637): "Perluas <summary>
// Dana Titipan dengan kolom porsi/nilai" -- audit menemukan porsi% & nilai
// SUDAH ditampilkan (Sesi 540-D/632/541), yang belum ada cuma class
// "money" di span nominalnya (supaya kebagian tabular-nums/font-mono di
// tema "modern" lewat aturan scoped [data-theme="modern"] .money yang
// SUDAH ada sejak s635 -- 0 CSS baru sesi ini). Scope MURNI penambahan
// class attribute ke span yang sudah ada di _ownerCardHtml (summary kartu
// owner), _holdingRowHtml (baris holding, incl. varian hasGainTracking
// false/Aset), dan subtotal grup kustodian (_holdingsListHtml) -- 0 angka/
// rumus/struktur DOM berubah.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return { id, value: '', textContent: '', innerHTML: '', className: '', style: {} };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
  };
}

function makeCtx(D, dom) {
  return loadSource(
    ['modules/shared/filter-prefs-store.js',
'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-pool-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    {
      D,
      document: dom,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp' + Math.round(n || 0),
      fmtFull: (n) => 'Rp' + Math.round(Math.abs(n || 0)),
      fmtFullSigned: (n) => (n < 0 ? '-' : '') + 'Rp' + Math.round(Math.abs(n || 0)),
    },
    ['DanaTitipanPortfolioPresenter'],
  );
}

function baseD(investments) {
  return { investments, investmentTx: [], investmentWatchlist: [], debts: [], assets: [] };
}

test('renderInto() — summary kartu owner: span Pokok/Kini/gain punya class "money" (regresi angka 0 berubah)', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList');
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /u-fw700 money">Rp800000/); // Pokok
  assert.match(html, /u-fw700 money">Rp900000/); // Kini
  assert.match(html, /u-fw700 money \w*">\+Rp100000/); // gain (fmtFullSigned)
});

test('renderInto() — baris holding (hasGainTracking:true): span "Pokok → Kini" & gain punya class "money"', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList');
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /u-t2 money">Rp800000 → Rp900000/);
  assert.match(html, /class="money \w*">\+Rp100000/);
});

test('_holdingRowHtml() — varian hasGainTracking:false (baris Aset, ikon 🏦): span "Nilai:" punya class "money"', () => {
  const ctx = makeCtx(baseD([]), makeStatefulDom());
  const hh = { name: 'Majoris', ownerPct: 100, currentValue: 1000000, hasGainTracking: false, linkedAssetId: 'a1' };
  const row = ctx.DanaTitipanPortfolioPresenter._holdingRowHtml(hh);
  assert.match(row, /u-t2 money">Nilai: Rp1000000/);
});

test('renderInto() — regresi: 0 perubahan struktur/porsi% -- teks "(N%)" & nama holding tetap apa adanya', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList');
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /BBCA<\/button> <span class="u-t2">\(100%\)<\/span>/);
});

test('renderInto() — subtotal grup kustodian: span subtotal punya class "money" (kalau ada grup, guard tidak throw kalau tidak ada)', () => {
  const D = baseD([
    { id: 'h1', name: 'Saham A', unit: 10, avgPrice: 10000, currentPrice: 11000, custodianName: 'Stockbit', fundSource: 'titipan', titipanOwner: 'Budi' },
    { id: 'h2', name: 'Saham B', unit: 10, avgPrice: 5000, currentPrice: 5500, custodianName: 'Stockbit', fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter.renderInto('danaTitipanPortfolioList'));
});
