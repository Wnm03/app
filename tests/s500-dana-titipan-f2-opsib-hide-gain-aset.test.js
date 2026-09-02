'use strict';
// tests/s500-dana-titipan-f2-opsib-hide-gain-aset.test.js — Sesi B2 (F2
// Opsi B, lanjutan Sesi 499/B1 — AUDIT-SESI-B-PERLUASAN-ASET.md §3.1):
// baris `holdings[]` Aset (`gain` selalu 0 sejak B1, TIDAK punya
// cost-basis terpisah) sekarang ditandai `hasGainTracking:false` &
// `renderInto()` menyembunyikan panah P&L khusus baris itu, ganti
// "Nilai: Rp X" polos -- supaya `gain=0` tidak disalahartikan sbg
// "untung-rugi 0 beneran" oleh user.
//
// 0 modifikasi test existing (S484/S498/S499 semua harus tetap lolos
// tanpa disentuh) -- file ini murni tambahan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeElement(id) {
  let _innerHTML = '';
  const el = { id, className: '', style: {}, textContent: '' };
  Object.defineProperty(el, 'innerHTML', {
    get() { return _innerHTML; },
    set(html) { _innerHTML = String(html); },
  });
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); } };
}

function makeCtx(D, dom) {
  return loadSource(
    ['modules/shared/filter-prefs-store.js',
'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',],
    {
      D, document: dom,
      uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {},
      escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

function baseD(assets, investments) {
  return {
    assets: assets || [], investments: investments || [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: [], titipanReturns: [],
  };
}

test('1. build(): baris Investasi hasGainTracking:true, baris Aset hasGainTracking:false', () => {
  const D = baseD(
    [{ id: 'a1', name: 'Tanah', nilai: 100000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' }],
  );
  D.investments[0].owners = [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }];
  const ctx = makeCtx(D, makeStatefulDom());
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  const assetLine = budi.holdings.find((h) => h.type === 'aset');
  const investLine = budi.holdings.find((h) => h.type !== 'aset');
  assert.equal(assetLine.hasGainTracking, false);
  assert.equal(investLine.hasGainTracking, true);
});

test('2. renderInto(): baris Aset TIDAK menampilkan panah P&L (Pokok -> Kini ±gain), tampil "Nilai:" polos', () => {
  const D = baseD([
    { id: 'a1', name: 'Ruko Investasi', nilai: 50000000, owners: [{ ownerId: 'ayah', porsi: 100, ownerName: 'Ayah', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  dom.getElementById('danaTitipanPortfolioList');
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Ruko Investasi/);
  assert.match(html, /Nilai: Rp/, 'baris Aset harus tampil "Nilai: Rp X" polos');
  assert.doesNotMatch(html, /Ruko Investasi[\s\S]{0,200}→/, 'baris Aset tidak boleh punya panah Pokok->Kini');
});

test('3. renderInto(): baris Investasi TETAP menampilkan panah P&L seperti sebelumnya (0 regresi)', () => {
  const D = baseD([], [
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  dom.getElementById('danaTitipanPortfolioList');
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /BBCA/);
  assert.match(html, /→/, 'baris Investasi harus tetap punya panah Pokok->Kini');
});
