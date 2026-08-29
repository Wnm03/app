'use strict';
// tests/s497-owner-isself-toggle-rerender-fix.test.js — Sesi 497 (laporan
// user via screenshot: modal "⚖️ Atur Porsi Kepemilikan" holding investasi,
// dropdown pilih pemilik existing TIDAK PERNAH muncul setelah uncheck
// "👤 Ini saya", walau OwnerRegistry sudah ada isi).
//
// ROOT CAUSE: `_ownerNameFieldHtml(o,i)` (investasi-view.js S491 / aset.js
// S490) menentukan free-text vs <select> lewat `o.isSelf` — tapi keputusan
// itu CUMA dievaluasi ulang saat `_renderOwnersList()` jalan (dipanggil dari
// addOwnerRow/removeOwnerRow/onOwnerSelectChange). `onOwnerIsSelfToggle()`
// (dipanggil dari checkbox "Ini saya") SEBELUMNYA cuma nulis
// `draft[i].isSelf` TANPA memanggil `_renderOwnersList()` — jadi baris yang
// awalnya di-render sbg free-text (mis. baris pertama, default
// `isSelf:true` dari `addOwnerRow()`) tetap free-text SELAMANYA meski user
// uncheck "Ini saya" & registry sudah ada isi.
//
// FIX: `onOwnerIsSelfToggle()` di KEDUA file (investasi-view.js & aset.js,
// mirror pattern) sekarang memanggil `_renderOwnersList()` setelah update
// `isSelf` — event checkbox diskrit (bukan tiap keystroke spt
// onOwnerNameInput/onOwnerPorsiInput), jadi aman render ulang penuh; porsi
// tidak ikut ter-reset krn dibaca balik dari `draft[i].porsi` yang tidak
// disentuh oleh toggle ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: '', textContent: '', innerHTML: '', className: '', placeholder: '',
      disabled: false, style: {},
      classList: { _set: new Set(), toggle(cls, force) { const on = force !== undefined ? force : !this._set.has(cls); if (on) this._set.add(cls); else this._set.delete(cls); return on; }, contains(cls) { return this._set.has(cls); }, add(cls) { this._set.add(cls); }, remove(cls) { this._set.delete(cls); } },
    };
  }
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); }, _registry: registry };
}

// ---------- InvestmentUI (investasi-view.js) ----------

function makeInvestD(investments) {
  return { investments: investments || [], investmentTx: [], debts: [], ownerRegistry: [] };
}

function makeInvestCtx(D, dom) {
  let _n = 0;
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js', 'modules/asset/investasi-view.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      openModal: () => {}, closeModal: () => {},
      uid: () => 'gen_' + (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => { D._saved = (D._saved || 0) + 1; },
      toast: () => {},
      fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-08',
    },
    ['Investment', 'InvestmentUI', 'MultiOwnerEngine', 'OwnerRegistry'],
  );
  return ctx;
}

function addHolding(ctx, name) {
  return ctx.Investment.addHolding({ name, type: 'Saham', unit: 100, avgPrice: 10000, currentPrice: 10000 });
}

test('InvestmentUI 1. registry ada isi, baris pertama default isSelf:true (free-text) -> uncheck "Ini saya" -> field jadi <select> (dropdown MUNCUL, bug lama: tidak muncul)', () => {
  const D = makeInvestD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const dom = makeStatefulDom();
  const ctx = makeInvestCtx(D, dom);
  const h = addHolding(ctx, 'Kamera');
  ctx.InvestmentUI._ownersModalHolding = h;
  ctx.InvestmentUI._ownersDraft = [];
  ctx.InvestmentUI.addOwnerRow(); // baris pertama -> isSelf:true otomatis -> free-text

  const beforeHtml = dom.getElementById('investmentOwnersList').innerHTML;
  assert.match(beforeHtml, /<input/);
  assert.doesNotMatch(beforeHtml, /<select/);

  ctx.InvestmentUI.onOwnerIsSelfToggle(0, false); // uncheck "Ini saya"

  const afterHtml = dom.getElementById('investmentOwnersList').innerHTML;
  assert.match(afterHtml, /<select/, 'dropdown pilih pemilik harus muncul setelah uncheck "Ini saya"');
  assert.match(afterHtml, /Budi/);
  assert.equal(ctx.InvestmentUI._ownersDraft[0].isSelf, false);
});

test('InvestmentUI 2. porsi yang sudah diketik TIDAK ikut hilang/reset saat toggle isSelf memicu render ulang', () => {
  const D = makeInvestD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const dom = makeStatefulDom();
  const ctx = makeInvestCtx(D, dom);
  const h = addHolding(ctx, 'Kamera');
  ctx.InvestmentUI._ownersModalHolding = h;
  ctx.InvestmentUI._ownersDraft = [];
  ctx.InvestmentUI.addOwnerRow();
  ctx.InvestmentUI.onOwnerPorsiInput(0, '75');
  ctx.InvestmentUI.onOwnerIsSelfToggle(0, false);
  assert.equal(ctx.InvestmentUI._ownersDraft[0].porsi, 75);
});

test('InvestmentUI 3. re-check "Ini saya" -> field balik jadi free-text lagi (simetris)', () => {
  const D = makeInvestD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const dom = makeStatefulDom();
  const ctx = makeInvestCtx(D, dom);
  const h = addHolding(ctx, 'Kamera');
  ctx.InvestmentUI._ownersModalHolding = h;
  ctx.InvestmentUI._ownersDraft = [];
  ctx.InvestmentUI.addOwnerRow();
  ctx.InvestmentUI.onOwnerIsSelfToggle(0, false);
  assert.match(dom.getElementById('investmentOwnersList').innerHTML, /<select/);
  ctx.InvestmentUI.onOwnerIsSelfToggle(0, true);
  const html = dom.getElementById('investmentOwnersList').innerHTML;
  assert.match(html, /<input/);
  assert.doesNotMatch(html, /<select/);
});

// ---------- Aset (aset.js) ----------

function makeAsetD(assets) {
  return { assets: assets || [], accounts: [], transactions: [], debts: [], ownerRegistry: [] };
}

function makeAsetCtx(D, dom) {
  let _n = 0;
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/asset-ownership-split-presenter.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      openModal: () => {}, closeModal: () => {},
      uid: () => 'gen_' + (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => { D._saved = (D._saved || 0) + 1; },
      toast: () => {},
      fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-08',
      parsePzNum: (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; },
    },
    ['Aset', 'MultiOwnerEngine', 'OwnerRegistry', 'AssetOwnershipSplitPresenter'],
  );
  ctx.Aset.renderList = () => {};
  return ctx;
}

test('Aset 1. registry ada isi, baris pertama default isSelf:true (free-text) -> uncheck "Ini saya" -> field jadi <select> (mirror fix investasi-view.js)', () => {
  const D = makeAsetD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const dom = makeStatefulDom();
  const ctx = makeAsetCtx(D, dom);
  ctx.Aset._ownersModalAsset = { id: 'a1', name: 'Rumah', nilai: 500000000 };
  ctx.Aset._ownersDraft = [];
  ctx.Aset.addOwnerRow();

  const beforeHtml = dom.getElementById('assetOwnersList').innerHTML;
  assert.match(beforeHtml, /<input/);
  assert.doesNotMatch(beforeHtml, /<select/);

  ctx.Aset.onOwnerIsSelfToggle(0, false);

  const afterHtml = dom.getElementById('assetOwnersList').innerHTML;
  assert.match(afterHtml, /<select/, 'dropdown pilih pemilik harus muncul setelah uncheck "Ini saya"');
  assert.match(afterHtml, /Budi/);
  assert.equal(ctx.Aset._ownersDraft[0].isSelf, false);
});

test('Aset 2. porsi yang sudah diketik TIDAK ikut hilang/reset saat toggle isSelf memicu render ulang', () => {
  const D = makeAsetD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const dom = makeStatefulDom();
  const ctx = makeAsetCtx(D, dom);
  ctx.Aset._ownersModalAsset = { id: 'a1', name: 'Rumah', nilai: 500000000 };
  ctx.Aset._ownersDraft = [];
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerPorsiInput(0, '60');
  ctx.Aset.onOwnerIsSelfToggle(0, false);
  assert.equal(ctx.Aset._ownersDraft[0].porsi, 60);
});
