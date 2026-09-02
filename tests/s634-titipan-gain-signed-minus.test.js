'use strict';
// tests/s634-titipan-gain-signed-minus.test.js — Sesi 634 (lanjutan audit
// UI/UX S631-633, temuan baru dari screenshot user: kartu owner Dana Titipan
// menampilkan nilai RUGI tanpa tanda minus sama sekali, cuma dibedakan lewat
// warna merah -- mis. "Rp 13.070" padahal itu kerugian -13070). Root cause:
// _money()/fmtFull() SELALU pakai Math.abs() di dalamnya (lihat
// modules/shared/format-tema.js), jadi pola lama `${n>=0?'+':''}${_money(n)}`
// kehilangan tanda minus utk nilai negatif. FIX: `_gainMoney()` baru reuse
// `fmtFullSigned()` yang SUDAH ADA (belum pernah dipakai di file ini
// sebelumnya) supaya rugi selalu tampil dgn prefix "-".

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

function baseD(investments, assets) {
  return {
    investments: investments || [], investmentTx: [], investmentWatchlist: [],
    assets: assets || [], debts: [], accounts: [], transactions: [],
    titipanCommitments: [], titipanReturns: [], investmentCustodians: [],
  };
}

function makeCtx(D, dom) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/shared/filter-prefs-store.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D, document: dom,
      uid: (() => { let n = 0; return () => 'u' + (n += 1); })(), save: () => {},
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(Math.abs(n || 0)),
      fmtFullSigned: (n) => (Number(n || 0) < 0 ? '-' : '') + 'Rp ' + Math.round(Math.abs(n || 0)),
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

test('1. holding RUGI (currentPrice < avgPrice) -- baris holding tampilkan "-Rp..." (bukan cuma warna merah tanpa tanda)', () => {
  const D = baseD([
    { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 900, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /-Rp\s*10000/, 'baris holding rugi harus eksplisit pakai tanda minus, bukan cuma class merah');
});

test('2. kartu owner RUGI -- ringkasan summary & baris "Untung-Rugi" di grid detail sama-sama pakai "-Rp..."', () => {
  const D = baseD([
    { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 900, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  const minusCount = (html.match(/-Rp\s*10000/g) || []).length;
  assert.ok(minusCount >= 2, `harus muncul minimal 2x "-Rp 10.000" (summary + grid detail Untung-Rugi), dapat ${minusCount}`);
});

test('3. 0 regresi: gain POSITIF tetap pakai prefix "+" seperti sebelumnya (bukan cuma dipindah ke fmtFullSigned)', () => {
  const D = baseD([
    { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /\+Rp\s*10000/, 'gain positif harus tetap pakai prefix "+" (0 regresi dari perilaku lama)');
  assert.doesNotMatch(html, /\+-Rp/, 'tidak boleh ada double-sign "+-Rp"');
});

test('4. gain NOL tetap "+Rp 0" (0 regresi kasus existing)', () => {
  const D = baseD([
    { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /\+Rp\s*0(?!\d)/, 'gain nol harus tetap "+Rp 0" seperti perilaku lama');
});
