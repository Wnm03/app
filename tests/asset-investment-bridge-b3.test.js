'use strict';
// tests/asset-investment-bridge-b3.test.js — Sesi B3 (bridge tampilan Aset -> Investasi,
// lanjutan B1 field investmentId + B2a/B2b readonly-redirect owners). Pola PERSIS
// vehAssetBridgeHtml() (S507, vehicle-core.js): baris read-only "🔗 Terhubung ke
// Investasi" + porsi, ditampilkan di kartu Aset (S306 overflow menu, Aset.openActionsMenu())
// -- BUKAN di baris chip utama (jenis/lokasi, tetap ringkas sesuai S306), pola sama
// extraMeta/linkMeta/ownMeta/titipanMeta yang sudah ada di sana.
//
// Dijalankan lewat SOURCE ASLI (loadSource), DOM tiruan STATEFUL -- pola sama persis
// tests/asset-investment-owners-redirect-b2b.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      className: '',
      style: {},
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
        add(cls) { this._set.add(cls); },
        remove(cls) { this._set.delete(cls); },
      },
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeD() {
  return {
    assets: [
      { id: 'a1', name: 'Reksa Dana Pasar Uang X (dobel-catat)', jenis: 'Deposito/Investasi', nilai: 10000000, investmentId: 'inv1' },
      { id: 'a2', name: 'Tanah Kavling Biasa', jenis: 'Tanah', nilai: 500000000 },
      { id: 'a3', name: 'Aset Tautan Orphan', jenis: 'Saham', nilai: 1000000, investmentId: 'inv_ghost' },
      { id: 'a4', name: 'Emas Tertaut Belum Diatur Porsi', jenis: 'Emas/Logam Mulia', nilai: 5000000, investmentId: 'inv2' },
    ],
    investments: [
      { id: 'inv1', name: 'RDPU X', jenis: 'Reksadana', owners: [
        { ownerId: 'SELF', ownerName: 'Budi', porsi: 60, isSelf: true },
        { ownerId: 'owner_investor1', ownerName: 'Ayah', porsi: 40, isSelf: false },
      ] },
      { id: 'inv2', name: 'BBCA', jenis: 'Saham' }, // belum ada owners sama sekali
    ],
    accounts: [],
    transactions: [],
    debts: [],
  };
}

function makeInvestmentMock() {
  return {
    getOwners(h) {
      if (!h) return [];
      if (Array.isArray(h.owners)) return h.owners;
      return [];
    },
  };
}

function makeCtx(D) {
  const dom = makeStatefulDom();
  const openQSCalls = [];
  const globals = {
    D,
    Investment: makeInvestmentMock(),
    document: dom,
    escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c])),
    openModal: () => {},
    closeModal: () => {},
    openQS: (id) => { openQSCalls.push(id); },
    uid: () => 'owner_x',
    sameId: (a, b) => String(a) === String(b),
    save: () => {},
    toast: () => {},
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    todayStr: () => '2026-08-11',
    recalcAccBalance: () => 0,
    parsePzNum: (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; },
    calcPreviewValue: (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; },
    OwnershipEngine: { TYPES: ['SELF'], label: () => 'Milik Sendiri', resolve: () => ({ type: 'SELF' }) },
  };
  const ctx = loadSource(
    [
      'modules/shared/multi-owner-engine.js',
      'modules/asset/aset.js',
    ],
    globals,
    ['Aset', 'MultiOwnerEngine'],
  );
  ctx.dom = dom;
  ctx.openQSCalls = openQSCalls;
  return ctx;
}

// ============================================================
// _investmentBridgeMeta(a) -- fungsi murni
// ============================================================

test('_investmentBridgeMeta: null kalau aset tidak tertaut (investmentId kosong)', () => {
  const ctx = makeCtx(makeD());
  const a = ctx.D.assets.find((x) => x.id === 'a2');
  assert.equal(ctx.Aset._investmentBridgeMeta(a), null);
});

test('_investmentBridgeMeta: null kalau tautan orphan (holding sudah dihapus)', () => {
  const ctx = makeCtx(makeD());
  const a = ctx.D.assets.find((x) => x.id === 'a3');
  assert.equal(ctx.Aset._investmentBridgeMeta(a), null);
});

test('_investmentBridgeMeta: tampilkan nama holding + porsi kalau tertaut valid', () => {
  const ctx = makeCtx(makeD());
  const a = ctx.D.assets.find((x) => x.id === 'a1');
  const meta = ctx.Aset._investmentBridgeMeta(a);
  assert.match(meta, /🔗 Terhubung ke Investasi/);
  assert.match(meta, /RDPU X/);
  assert.match(meta, /60% Budi/);
  assert.match(meta, /40% Ayah/);
});

test('_investmentBridgeMeta: tertaut tapi holding belum punya owners sama sekali -> nama holding saja, tanpa "Porsi:"', () => {
  const ctx = makeCtx(makeD());
  const a = ctx.D.assets.find((x) => x.id === 'a4');
  const meta = ctx.Aset._investmentBridgeMeta(a);
  assert.match(meta, /BBCA/);
  assert.doesNotMatch(meta, /Porsi:/);
});

test('_investmentBridgeMeta: baca LIVE dari D.investments, bukan snapshot/cache', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const a = D.assets.find((x) => x.id === 'a1');
  const before = ctx.Aset._investmentBridgeMeta(a);
  assert.match(before, /RDPU X/);
  D.investments[0].name = 'RDPU X (rename)';
  const after = ctx.Aset._investmentBridgeMeta(a);
  assert.match(after, /RDPU X \(rename\)/);
});

// ============================================================
// openActionsMenu() integration -- baris muncul di #assetActionsMeta,
// tombol navigasi muncul di #assetActionsList
// ============================================================

test('openActionsMenu: aset tertaut valid -> baris bridge muncul di assetActionsMeta', () => {
  const ctx = makeCtx(makeD());
  ctx.Aset.openActionsMenu('a1');
  const meta = ctx.dom.getElementById('assetActionsMeta').innerHTML;
  assert.match(meta, /🔗 Terhubung ke Investasi/);
  assert.match(meta, /RDPU X/);
});

test('openActionsMenu: aset tidak tertaut -> baris bridge TIDAK muncul', () => {
  const ctx = makeCtx(makeD());
  ctx.Aset.openActionsMenu('a2');
  const meta = ctx.dom.getElementById('assetActionsMeta').innerHTML;
  assert.doesNotMatch(meta, /Terhubung ke Investasi/);
});

test('openActionsMenu: tautan orphan -> baris bridge TIDAK muncul (fallback aman, bukan crash)', () => {
  const ctx = makeCtx(makeD());
  assert.doesNotThrow(() => ctx.Aset.openActionsMenu('a3'));
  const meta = ctx.dom.getElementById('assetActionsMeta').innerHTML;
  assert.doesNotMatch(meta, /Terhubung ke Investasi/);
});

test('openActionsMenu: aset tertaut valid -> tombol "🔍 Lihat di Investasi" muncul dgn data-args id holding', () => {
  const ctx = makeCtx(makeD());
  ctx.Aset.openActionsMenu('a1');
  const list = ctx.dom.getElementById('assetActionsList').innerHTML;
  assert.match(list, /InvestmentListUI\.openModal/);
  assert.match(list, /Lihat di Investasi/);
  assert.match(list, /inv1/);
});

test('openActionsMenu: aset tidak tertaut -> tombol "Lihat di Investasi" TIDAK muncul', () => {
  const ctx = makeCtx(makeD());
  ctx.Aset.openActionsMenu('a2');
  const list = ctx.dom.getElementById('assetActionsList').innerHTML;
  assert.doesNotMatch(list, /Lihat di Investasi/);
});

test('openActionsMenu: baris bridge tidak mengganggu metaRows lama (mis. tetap jalan kalau aset punya profit %)', () => {
  const D = makeD();
  D.assets[0].keuntunganPct = 12.5;
  const ctx = makeCtx(D);
  ctx.Aset.openActionsMenu('a1');
  const meta = ctx.dom.getElementById('assetActionsMeta').innerHTML;
  assert.match(meta, /Terhubung ke Investasi/);
  assert.match(meta, /12\.50%/);
});

// S3-hard rule: fungsi ini PURE/READ-ONLY -- tidak menulis field apa pun ke D.assets/a
test('_investmentBridgeMeta: TIDAK menulis field apa pun ke object aset (read-only murni)', () => {
  const ctx = makeCtx(makeD());
  const a = ctx.D.assets.find((x) => x.id === 'a1');
  const before = JSON.stringify(a);
  ctx.Aset._investmentBridgeMeta(a);
  assert.equal(JSON.stringify(a), before);
});
