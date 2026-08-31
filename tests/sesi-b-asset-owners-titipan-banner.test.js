'use strict';
// tests/sesi-b-asset-owners-titipan-banner.test.js — Sesi B (lihat
// docs/AUDIT-RENCANA-titipan-unallocated-ownersmodal-exposure.md § Sesi B):
// banner proaktif (toast) saat `openOwnersModal()` dibuka, kalau ada owner
// non-SELF yang py sisa titipan global (`estimatedUnallocated>0`, reuse
// helper `_ownerHasUnallocatedElsewhere` dari Sesi A) DAN nilai holding
// owner tsb DI ASET YANG SEDANG DIBUKA (`assetNilai*porsi/100`) masih lebih
// kecil dari sisa titipan globalnya (1 perbandingan baru Sesi B).
//
// 1 file source disentuh sesi ini: modules/asset/aset-owners.js.
// modules/asset/aset.js, modules/finance/*.js TIDAK diubah.
//
// Kontrak yang diuji:
//   1. Toast MUNCUL saat owner non-SELF py estimatedUnallocated>0 DAN
//      nilai holding porsinya di aset ini < estimatedUnallocated.
//   2. Toast TIDAK muncul kalau aset tertaut Holding Investasi (cabang
//      read-only -- modal dialihkan ke InvestmentUI, assetOwnersModal
//      TIDAK dibuka sama sekali).
//   3. Toast TIDAK muncul kalau owner sudah "full-invested" di holding ini
//      (nilai holding >= estimatedUnallocated).
//   4. Toast TIDAK muncul utk baris SELF walau owner lain py sisa titipan.
//   5. Toast TIDAK muncul kalau tidak ada aset (`Aset.editId` kosong).
//   6. Dipanggil PERSIS 1x per buka modal (bukan spam) -- guard alami krn
//      openOwnersModal() sendiri hanya jalan 1x per buka.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: '', textContent: '', innerHTML: '', className: '',
      placeholder: '', disabled: false, style: {},
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

function makeCtx(D, dom, toastSpy) {
  const ctx = loadSource(
    ['modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/asset/investasi-view.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      openModal: () => {},
      closeModal: () => {},
      uid: () => 'owner_x',
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: toastSpy || (() => {}),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-31',
    },
    ['Aset', 'MultiOwnerEngine', 'Investment', 'InvestmentUI', 'DanaTitipanPortfolioAPI'],
  );
  ctx.Aset.renderList = () => {};
  return ctx;
}

function baseD({ assets, investments, titipanCommitments }) {
  return {
    assets: assets || [], investments: investments || [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: titipanCommitments || [], titipanReturns: [],
  };
}

// ---- Test 1: toast MUNCUL -- owner py sisa titipan global & belum full di holding ini ----
test('S-B-1: toast muncul saat owner non-SELF py estimatedUnallocated>0 & holding ini belum menyerap semuanya', () => {
  const dom = makeStatefulDom();
  const calls = [];
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 20000000, owners: [
      { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'ow1', porsi: 50, ownerName: 'Pak Budi' },
    ] }],
    // principal 100jt, holding ini cuma menyerap 50%*20jt=10jt -> estimatedUnallocated
    // global (build()) jadi 90jt -- jauh lebih besar dari 10jt nilai holding ini.
    titipanCommitments: [{ ownerId: 'ow1', principalAmount: 100000000 }],
  });
  const { Aset } = makeCtx(D, dom, (msg) => calls.push(msg));
  Aset.openOwnersModalById('as1');
  assert.equal(calls.length, 1);
  assert.match(calls[0], /Pak Budi/);
  assert.match(calls[0], /titipan/);
});

// ---- Test 2: toast TIDAK muncul -- aset tertaut Holding Investasi (read-only) ----
test('S-B-2: toast TIDAK muncul kalau aset tertaut Holding Investasi (cabang read-only)', () => {
  const dom = makeStatefulDom();
  const calls = [];
  const D = baseD({
    assets: [{ id: 'as1', name: 'Emas Antam', nilai: 20000000, investmentId: 'inv1', owners: [
      { ownerId: 'ow1', porsi: 50, ownerName: 'Pak Budi' },
    ] }],
    investments: [{ id: 'inv1', name: 'Holding Emas', owners: [
      { ownerId: 'ow1', porsi: 50, ownerName: 'Pak Budi' },
    ] }],
    titipanCommitments: [{ ownerId: 'ow1', principalAmount: 100000000 }],
  });
  const { Aset } = makeCtx(D, dom, (msg) => calls.push(msg));
  Aset.openOwnersModalById('as1');
  assert.equal(calls.length, 0);
});

// ---- Test 3: toast TIDAK muncul -- owner sudah full-invested di holding ini ----
test('S-B-3: toast TIDAK muncul kalau nilai holding ini sudah >= estimatedUnallocated owner', () => {
  const dom = makeStatefulDom();
  const calls = [];
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 0, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'ow1', porsi: 100, ownerName: 'Pak Budi' },
    ] }],
    // principal 100jt, holding ini menyerap 100% -> estimatedUnallocated global 0.
    titipanCommitments: [{ ownerId: 'ow1', principalAmount: 100000000 }],
  });
  const { Aset } = makeCtx(D, dom, (msg) => calls.push(msg));
  Aset.openOwnersModalById('as1');
  assert.equal(calls.length, 0);
});

// ---- Test 4: toast TIDAK muncul untuk baris SELF ----
test('S-B-4: toast TIDAK muncul utk baris SELF walau ada owner lain', () => {
  const dom = makeStatefulDom();
  const calls = [];
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 20000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
  });
  const { Aset } = makeCtx(D, dom, (msg) => calls.push(msg));
  Aset.openOwnersModalById('as1');
  assert.equal(calls.length, 0);
});

// ---- Test 5: toast TIDAK muncul kalau tidak ada aset ----
test('S-B-5: toast TIDAK muncul kalau Aset.editId kosong / aset tidak ditemukan', () => {
  const dom = makeStatefulDom();
  const calls = [];
  const D = baseD({});
  const { Aset } = makeCtx(D, dom, (msg) => calls.push(msg));
  Aset.editId = null;
  Aset.openOwnersModal();
  assert.equal(calls.length, 0);
});

// ---- Test 6: toast dipanggil PERSIS 1x, bukan per baris owner ----
test('S-B-6: toast dipanggil tepat 1x per buka modal walau ada beberapa owner memenuhi syarat', () => {
  const dom = makeStatefulDom();
  const calls = [];
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 10000000, owners: [
      { ownerId: 'ow1', porsi: 50, ownerName: 'Pak Budi' },
      { ownerId: 'ow2', porsi: 50, ownerName: 'Bu Sari' },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 100000000 },
      { ownerId: 'ow2', principalAmount: 100000000 },
    ],
  });
  const { Aset } = makeCtx(D, dom, (msg) => calls.push(msg));
  Aset.openOwnersModalById('as1');
  assert.equal(calls.length, 1);
  assert.match(calls[0], /Pak Budi/);
  assert.match(calls[0], /Bu Sari/);
});
