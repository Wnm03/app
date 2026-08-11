'use strict';
// tests/investment-asset-reverse-link-b10.test.js — Sesi B10: navigasi simetris
// Investasi -> Aset ("🔗 Lihat di Aset" di investmentModal), pasangan balik dari
// B3 ("🔍 Lihat di Investasi" di kartu Aset), pola PERSIS S509b/S509c (Vehicle <->
// Asset bridge, vehicle-core.js/aset.js).
//
// Cakupan:
//   1. InvestmentListUI._resolveLinkedAsset(h) — PURE/read-only: null kalau tidak
//      ada aset yang investmentId-nya menunjuk ke holding ini, balikin objek aset
//      kalau ada SATU match, baca LIVE dari D.assets (bukan snapshot).
//   2. InvestmentListUI._renderAssetLinkAction(h) via openModal() — kontainer
//      #investmentAssetLinkAction disembunyikan (u-dnone) kalau tidak ada aset
//      tertaut, ditampilkan dgn tombol data-action="Aset.openModal" data-args
//      berisi id aset yang benar kalau ada.
//
// Harness & DOM tiruan SAMA PERSIS tests/investment-list-ui-s466.test.js (loadSource()
// + DOM stateful getElementById auto-vivify, classList.toggle).

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
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
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

function makeD(extra) {
  return Object.assign({ investments: [], investmentTx: [], investmentWatchlist: [], debts: [], assets: [] }, extra);
}

function makeCtx(D, dom) {
  const calls = { openModal: [], closeModal: [], toast: [] };
  let _n = 0;
  const ctx = loadSource(
    [
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
      parseDecStr: (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; },
      uid: () => 'inv_' + (_n += 1),
      save: () => {},
      openModal: (id) => { calls.openModal.push(id); },
      closeModal: (id) => { calls.closeModal.push(id); },
      toast: (msg) => { calls.toast.push(msg); },
      askConfirm: async () => true,
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
      renderDebtList: () => {},
      AIBus: { emit: () => {} },
      InvestmentUI: { openOwnersModal: () => {} },
      // sameId — dipakai _resolveLinkedAsset(), aslinya dari
      // features-helpers-global-security.js; disuntik langsung di sini (bukan
      // load file aslinya) supaya harness tetap ringan, pola sama persis
      // fmt/parseDecStr/uid di atas yang juga stub minimal.
      sameId: (a, b) => String(a) === String(b),
    },
    ['Investment', 'InvestmentListUI', 'INVESTMENT_TYPES'],
  );
  ctx.calls = calls;
  return ctx;
}

// ============================================================
// 1. _resolveLinkedAsset(h)
// ============================================================

test('[_resolveLinkedAsset] holding tanpa aset tertaut -> null', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = ctx.Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 10, avgPrice: 9000, currentPrice: 9500 });

  assert.equal(ctx.InvestmentListUI._resolveLinkedAsset(h), null);
});

test('[_resolveLinkedAsset] SATU aset dgn investmentId menunjuk holding ini -> balikin aset itu', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = ctx.Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 10, avgPrice: 9000, currentPrice: 9500 });
  const a = { id: 'aset_1', name: 'Saham BCA (lama)', nilai: 100000, investmentId: h.id };
  D.assets.push(a);

  const found = ctx.InvestmentListUI._resolveLinkedAsset(h);
  assert.equal(found && found.id, 'aset_1', 'harus ketemu aset yang investmentId-nya cocok');
});

test('[_resolveLinkedAsset] aset lain dgn investmentId ke holding BEDA -> tidak ikut ketemu', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h1 = ctx.Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 10, avgPrice: 9000, currentPrice: 9500 });
  const h2 = ctx.Investment.addHolding({ name: 'BBRI', type: 'Saham', unit: 5, avgPrice: 4000, currentPrice: 4200 });
  D.assets.push({ id: 'aset_1', name: 'Saham BRI (lama)', nilai: 50000, investmentId: h2.id });

  assert.equal(ctx.InvestmentListUI._resolveLinkedAsset(h1), null, 'holding BBCA tidak boleh ketemu aset yang tertaut ke BBRI');
});

test('[_resolveLinkedAsset] baca LIVE dari D.assets, bukan snapshot — link ditambah setelah holding dibuat tetap ketemu', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = ctx.Investment.addHolding({ name: 'Emas Antam', type: 'Emas', unit: 10, avgPrice: 900000, currentPrice: 950000 });

  assert.equal(ctx.InvestmentListUI._resolveLinkedAsset(h), null, 'belum ada tautan -> null dulu');
  D.assets.push({ id: 'aset_2', name: 'Emas Antam 10gr', nilai: 9500000, investmentId: h.id });
  assert.equal(ctx.InvestmentListUI._resolveLinkedAsset(h).id, 'aset_2', 'setelah tautan ditambah, panggilan berikutnya harus langsung ketemu (live read)');
});

// ============================================================
// 2. openModal() -> _renderAssetLinkAction() wiring
// ============================================================

test('[openModal] holding TANPA aset tertaut -> #investmentAssetLinkAction kosong & u-dnone', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = ctx.Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 10, avgPrice: 9000, currentPrice: 9500 });

  ctx.InvestmentListUI.openModal(h.id);

  const box = dom.getElementById('investmentAssetLinkAction');
  assert.equal(box.classList.contains('u-dnone'), true, 'kontainer harus disembunyikan kalau tidak ada aset tertaut');
  assert.equal(box.innerHTML, '', 'kontainer harus kosong kalau tidak ada aset tertaut');
});

test('[openModal] holding DENGAN aset tertaut -> tombol "🔗 Lihat di Aset" tampil dgn data-args id aset yang benar', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h = ctx.Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 10, avgPrice: 9000, currentPrice: 9500 });
  D.assets.push({ id: 'aset_9', name: 'Saham BCA (lama)', nilai: 100000, investmentId: h.id });

  ctx.InvestmentListUI.openModal(h.id);

  const box = dom.getElementById('investmentAssetLinkAction');
  assert.equal(box.classList.contains('u-dnone'), false, 'kontainer harus ditampilkan kalau ada aset tertaut');
  assert.match(box.innerHTML, /Lihat di Aset/, 'label tombol harus muncul');
  assert.match(box.innerHTML, /data-action="Aset\.openModal"/, 'harus reuse Aset.openModal() lewat dispatcher data-action generik');
  assert.match(box.innerHTML, new RegExp('aset_9'), 'data-args harus berisi id aset yang benar');
});

test('[openModal] mode Tambah (tanpa id) -> kontainer tetap disembunyikan (guard h=null)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.InvestmentListUI.openModal();

  const box = dom.getElementById('investmentAssetLinkAction');
  assert.equal(box.classList.contains('u-dnone'), true, 'mode Tambah (holding belum ada) tidak boleh nampilkan tombol apa pun');
});

test('[openModal] holding lain (tidak tertaut) di tengah data yang punya holding lain YANG tertaut -> tidak ikut ketiban tombol', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const h1 = ctx.Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 10, avgPrice: 9000, currentPrice: 9500 });
  const h2 = ctx.Investment.addHolding({ name: 'BBRI', type: 'Saham', unit: 5, avgPrice: 4000, currentPrice: 4200 });
  D.assets.push({ id: 'aset_1', name: 'Saham BRI (lama)', nilai: 50000, investmentId: h2.id });

  ctx.InvestmentListUI.openModal(h1.id);

  const box = dom.getElementById('investmentAssetLinkAction');
  assert.equal(box.classList.contains('u-dnone'), true, 'holding BBCA tidak tertaut aset manapun -> kontainer harus tetap disembunyikan');
});
