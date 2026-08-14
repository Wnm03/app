'use strict';
// tests/dana-titipan-asset-picker-holding-option-s608.test.js — Sesi 608
// (laporan user, screenshot dropdown "Pilih Aset" di kartu owner Dana
// Titipan: hanya berisi entri Buku Aset seperti "vario 125 kzr"/"Vario
// 110" -- Holding Investasi seperti "Majoris"/"bibit" di kartu "Total
// Teralokasi" TIDAK PERNAH muncul jadi opsi picker, sehingga tombol
// "⚖️ Atur Porsi Aset" tidak bisa dipakai utk Holding, cuma Buku Aset).
//
// FIX: `_assetOptionsHtml()` (dana-titipan-portfolio-render.js) sekarang
// menambahkan opsi Holding (`D.investments[]`) SETELAH opsi Buku Aset,
// value berprefix `h:` supaya `DanaTitipanCommitmentUI.openAssetPorsi()`
// bisa route ke `InvestmentUI.openOwnersModal()` (bukan
// `Aset.openOwnersModalById()` yang khusus id Buku Aset).

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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function makeCtx(D, dom, extra) {
  const openModalCalls = [];
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    Object.assign({
      D, document: dom, escapeHtml,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      openModal: (id) => { openModalCalls.push(id); },
      toast: (msg) => { toastMessages.push(msg); },
      fmt: (n) => String(n), fmtFull: (n) => String(n),
    }, extra || {}),
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'DanaTitipanCommitmentUI'],
  );
  ctx.openModalCalls = openModalCalls;
  ctx.toastMessages = toastMessages;
  return ctx;
}

test('_assetOptionsHtml(): Holding Investasi (D.investments) ikut muncul sbg opsi, prefix "h:", ikon 📈', () => {
  const D = {
    investments: [{ id: 'h1', name: 'Majoris', custodian: '', unit: 1, avgPrice: 100, currentPrice: 100, owners: [] }],
    assets: [{ id: 'a1', name: 'Vario 110', nilai: 15000000 }],
    investmentTx: [], investmentWatchlist: [], debts: [],
  };
  const ctx = makeCtx(D, makeStatefulDom());
  const html = ctx.DanaTitipanPortfolioPresenter._assetOptionsHtml();
  assert.ok(html.includes('Vario 110'));
  assert.ok(html.includes('value="h:h1"'));
  assert.ok(html.includes('📈'));
});

test('openAssetPorsi(): opsi Holding (value "h:<id>") route ke InvestmentUI.openOwnersModal(), BUKAN Aset.openOwnersModalById()', () => {
  const D = { investments: [{ id: 'h1', name: 'Majoris', unit: 1, avgPrice: 100, currentPrice: 100, owners: [] }], assets: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const dom = makeStatefulDom();
  let assetCalledWith = null;
  let investCalledWith = null;
  const ctx = makeCtx(D, dom, {
    Aset: { openOwnersModalById: (id) => { assetCalledWith = id; } },
    InvestmentUI: { openOwnersModal: (id) => { investCalledWith = id; } },
  });
  dom.getElementById('titipanAssetPick_0').value = 'h:h1';
  ctx.DanaTitipanCommitmentUI.openAssetPorsi(0);
  assert.equal(investCalledWith, 'h1', 'InvestmentUI.openOwnersModal harus dipanggil dgn id holding (prefix "h:" dilepas)');
  assert.equal(assetCalledWith, null, 'Aset.openOwnersModalById TIDAK BOLEH ikut dipanggil utk opsi Holding');
});

test('openAssetPorsi(): opsi Buku Aset biasa (0 prefix) tetap route ke Aset.openOwnersModalById() seperti semula -- 0 regresi', () => {
  const D = { investments: [], assets: [{ id: 'a1', name: 'Tanah', nilai: 100 }], investmentTx: [], investmentWatchlist: [], debts: [] };
  const dom = makeStatefulDom();
  let assetCalledWith = null;
  let investCalledWith = null;
  const ctx = makeCtx(D, dom, {
    Aset: { openOwnersModalById: (id) => { assetCalledWith = id; } },
    InvestmentUI: { openOwnersModal: (id) => { investCalledWith = id; } },
  });
  dom.getElementById('titipanAssetPick_0').value = 'a1';
  ctx.DanaTitipanCommitmentUI.openAssetPorsi(0);
  assert.equal(assetCalledWith, 'a1');
  assert.equal(investCalledWith, null);
});
