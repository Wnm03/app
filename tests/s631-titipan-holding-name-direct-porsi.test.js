'use strict';
// tests/s631-titipan-holding-name-direct-porsi.test.js — Sesi 631
// (permintaan user: tampilan Dana Titipan "atur porsi aset" masih 2
// langkah -- pilih di dropdown "Pilih Aset" lalu tap tombol terpisah
// "⚖️ Atur Porsi Aset" -- padahal nama instrumennya SUDAH kelihatan di
// baris holding, mis. "🏦 Majoris (85.043%)").
//
// FIX: nama holding di tiap baris SEKARANG jadi tombol klik-langsung
// (`openAssetPorsiDirect()`, baru) yang 100% reuse routing lama
// (`_routeAssetPorsi()`, diekstrak dari `openAssetPorsi()` — 0 logic
// baru). Dropdown "Pilih Aset" + tombol "⚖️ Atur Porsi Aset" di kartu
// owner TIDAK dihapus (masih dipakai utk tautkan aset BARU yang belum
// punya baris holding) -- test ini murni menambah jalur baru, 0
// regresi jalur lama (dibuktikan test #4, reuse test s608 pattern).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeElement(id) {
  let _innerHTML = '';
  const el = { id, className: '', style: {}, textContent: '', value: '' };
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function baseD(investments, assets) {
  return {
    investments: investments || [], investmentTx: [], investmentWatchlist: [],
    assets: assets || [], debts: [], accounts: [], transactions: [],
    titipanCommitments: [], titipanReturns: [], investmentCustodians: [],
  };
}

function makeCtx(D, dom, extra) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    Object.assign({
      D, document: dom, escapeHtml,
      uid: (() => { let n = 0; return () => 'u' + (n += 1); })(),
      save: () => {},
      openModal: () => {},
      toast: () => {},
      fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    }, extra || {}),
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'DanaTitipanCommitmentUI'],
  );
}

test('1. _holdingRowHtml (via render): nama holding jadi tombol data-action openAssetPorsiDirect dgn assetId Holding (prefix h:)', () => {
  const D = baseD([
    { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /data-action="DanaTitipanCommitmentUI\.openAssetPorsiDirect"/);
  assert.match(html, /data-args="\[&quot;h:h1&quot;\]"/);
  assert.match(html, /Majoris/);
});

test('2. _holdingRowHtml (via render): baris Aset (bukan Holding) pakai assetId biasa (0 prefix h:)', () => {
  const D = baseD([], [{ id: 'a1', name: 'Vario 110', nilai: 15000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /data-args="\[&quot;a1&quot;\]"/);
});

test('3. openAssetPorsiDirect(assetId): prefix "h:" -> InvestmentUI.openOwnersModal(), BUKAN Aset.openOwnersModalById()', () => {
  const D = baseD([{ id: 'h1', name: 'Majoris', unit: 1, avgPrice: 100, currentPrice: 100, owners: [] }]);
  const dom = makeStatefulDom();
  let assetCalledWith = null;
  let investCalledWith = null;
  const ctx = makeCtx(D, dom, {
    Aset: { openOwnersModalById: (id) => { assetCalledWith = id; } },
    InvestmentUI: { openOwnersModal: (id) => { investCalledWith = id; } },
  });
  ctx.DanaTitipanCommitmentUI.openAssetPorsiDirect('h:h1');
  assert.equal(investCalledWith, 'h1');
  assert.equal(assetCalledWith, null);
});

test('4. openAssetPorsiDirect(assetId): 0 prefix -> Aset.openOwnersModalById(), sama seperti openAssetPorsi() dropdown lama', () => {
  const D = baseD([], [{ id: 'a1', name: 'Vario 110', nilai: 1, owners: [] }]);
  const dom = makeStatefulDom();
  let assetCalledWith = null;
  const ctx = makeCtx(D, dom, {
    Aset: { openOwnersModalById: (id) => { assetCalledWith = id; } },
  });
  ctx.DanaTitipanCommitmentUI.openAssetPorsiDirect('a1');
  assert.equal(assetCalledWith, 'a1');
});

test('5. openAssetPorsiDirect(""): assetId kosong -> toast peringatan, 0 crash, 0 panggilan routing', () => {
  const D = baseD([], []);
  const dom = makeStatefulDom();
  const toasts = [];
  const ctx = makeCtx(D, dom, { toast: (m) => toasts.push(m) });
  ctx.DanaTitipanCommitmentUI.openAssetPorsiDirect('');
  assert.equal(toasts.length, 1);
});

test('6. openAssetPorsi(): jalur dropdown lama TIDAK regresi (reuse _routeAssetPorsi yang sama)', () => {
  const D = baseD([{ id: 'h1', name: 'Majoris', unit: 1, avgPrice: 100, currentPrice: 100, owners: [] }]);
  const dom = makeStatefulDom();
  let investCalledWith = null;
  const ctx = makeCtx(D, dom, {
    InvestmentUI: { openOwnersModal: (id) => { investCalledWith = id; } },
  });
  dom.getElementById('titipanAssetPick_0').value = 'h:h1';
  ctx.DanaTitipanCommitmentUI.openAssetPorsi(0);
  assert.equal(investCalledWith, 'h1');
});
