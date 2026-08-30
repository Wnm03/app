'use strict';
// tests/s669-investmentlistui-multiselect-owner-filter.test.js — Sesi 669
// (lanjutan eksplisit dari SESSION-NOTE-S668.md § "Belum dikerjakan": "S669:
// multi-select owner di daftar Investasi (InvestmentListUI) — saat ini filter
// Pemilik cuma single-select (filterOwnerId 1 nilai), rencana lanjutan izinkan
// pilih beberapa owner sekaligus"). Keputusan user: checkbox list (tap tiap
// nama, ada centang) -- bukan native <select multiple> (tidak nyaman di HP)
// ataupun chip toggle.
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/asset/investasi-list-view.js. modules/asset/investasi.js (S660)
// TIDAK disentuh -- reuse penuh Investment.getOwners()/getOwnerSettlement()
// yang sudah ada, 0 rumus baru.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
}

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
      },
      insertAdjacentElement(_position, node) {
        if (node && node.id) registry.set(node.id, node);
      },
      insertAdjacentHTML() {},
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    createElement(_tag) { return makeElement(undefined); },
    _registry: registry,
  };
}

function makeCtx(D, dom) {
  let _n = 0;
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/asset/investasi-list-view.js',
    ],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      uid: () => 'inv_' + (_n += 1),
      save: () => {},
      toast: () => {},
    },
    ['Investment', 'InvestmentListUI', 'MultiOwnerEngine'],
  );
}

function seedTiga(ctx) {
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  const emasAnak = ctx.Investment.addHolding({ name: 'Emas Anak', type: 'Emas', unit: 5, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasAnak.id, [{ ownerId: 'anak1', porsi: 100, ownerName: 'Anak', isSelf: false }]);
  ctx.Investment.addHolding({ name: 'Reksadana Sendiri', type: 'Reksa Dana', unit: 10, avgPrice: 10000 });
  return { emasIstri, emasAnak };
}

test('state awal: filterOwnerIds array kosong', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  assert.equal(Array.isArray(ctx.InvestmentListUI.filterOwnerIds), true);
  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 0);
});

test('onFilterOwnerToggle(id) pertama kali -> id masuk filterOwnerIds', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 1);
  assert.equal(ctx.InvestmentListUI.filterOwnerIds[0], 'istri1');
});

test('onFilterOwnerToggle(id) yang sama 2x -> toggle off (dilepas dari array)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 0);
});

test('centang 2 owner sekaligus (istri1 + anak1) -> holding SALAH SATU dari keduanya tampil (semantik OR), holding SELF tersembunyi', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  seedTiga(ctx);

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterOwnerToggle('anak1');

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /Emas Istri/);
  assert.match(html, /Emas Anak/);
  assert.doesNotMatch(html, /Reksadana Sendiri/);
});

test('lepas centang salah satu dari 2 owner terpilih -> hanya owner yang masih dicentang yang tetap tampil', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  seedTiga(ctx);

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterOwnerToggle('anak1');
  ctx.InvestmentListUI.onFilterOwnerToggle('anak1'); // lepas anak1, istri1 tetap tercentang

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /Emas Istri/);
  assert.doesNotMatch(html, /Emas Anak/);
  assert.doesNotMatch(html, /Reksadana Sendiri/);
});

test('checkbox owner yang sedang tercentang dirender dengan atribut checked', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  seedTiga(ctx);

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  const html = dom.getElementById('investmentHoldingList').innerHTML;
  // Checkbox istri1 checked, checkbox anak1 TIDAK checked.
  assert.match(html, /onFilterOwnerToggle\('istri1'\)" checked>/);
  assert.doesNotMatch(html, /onFilterOwnerToggle\('anak1'\)" checked>/);
});

test('filterOwnerIds 2 owner + filterSettlement="milik" -> hanya holding owner terpilih yang berstatus milik sendiri', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const { emasIstri, emasAnak } = seedTiga(ctx);
  ctx.Investment.setOwnerSettlement(emasIstri.id, 'istri1', 'milik');
  // emasAnak tetap default 'titipan'.

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterOwnerToggle('anak1');
  ctx.InvestmentListUI.onFilterSettlementChange('milik');

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /Emas Istri/);
  assert.doesNotMatch(html, /Emas Anak/);
  assert.doesNotMatch(html, /Reksadana Sendiri/);
});

test('dropdown Status disabled kalau 0 owner tercentang, enabled begitu ada 1 owner tercentang', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  seedTiga(ctx);

  ctx.InvestmentListUI._renderList();
  let html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /onchange="InvestmentListUI\.onFilterSettlementChange\(this\.value\)">[\s\S]*?<\/select>/);
  assert.match(html, /disabled onchange="InvestmentListUI\.onFilterSettlementChange/);

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.doesNotMatch(html, /disabled onchange="InvestmentListUI\.onFilterSettlementChange/);
});

test('semua owner dilepas centang -> filterSettlement otomatis reset & semua holding tampil lagi (termasuk SELF)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  seedTiga(ctx);

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterSettlementChange('titipan');
  ctx.InvestmentListUI.onFilterOwnerToggle('istri1'); // lepas centang terakhir

  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 0);
  assert.equal(ctx.InvestmentListUI.filterSettlement, '');
  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /Emas Istri/);
  assert.match(html, /Emas Anak/);
  assert.match(html, /Reksadana Sendiri/);
});

test('_holdingMatchesFilter() 1 holding korup (getOwners() throw) tidak menjatuhkan hasil filter multi-owner', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const { emasIstri } = seedTiga(ctx);
  const rusak = ctx.Investment.addHolding({ name: 'Holding Rusak', type: 'Saham', unit: 1, avgPrice: 1 });
  rusak.owners = 'bukan-array-valid';

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterOwnerToggle('anak1');

  let html;
  assert.doesNotThrow(() => { html = dom.getElementById('investmentHoldingList').innerHTML; });
  assert.match(html, /Emas Istri/);
  assert.doesNotMatch(html, /Holding Rusak/);
});

test('onFilterOwnerToggle("") / (undefined) tidak melempar & tidak mengubah state (guard id kosong)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  assert.doesNotThrow(() => ctx.InvestmentListUI.onFilterOwnerToggle(''));
  assert.doesNotThrow(() => ctx.InvestmentListUI.onFilterOwnerToggle(undefined));
  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 1);
  assert.equal(ctx.InvestmentListUI.filterOwnerIds[0], 'istri1');
});
