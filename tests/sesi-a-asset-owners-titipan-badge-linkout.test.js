'use strict';
// tests/sBARU-a-asset-owners-titipan-badge.test.js — Sesi A (lihat
// docs/AUDIT-RENCANA-titipan-unallocated-ownersmodal-exposure.md § Sesi A):
// badge link-out "👉 masih ada sisa titipan, cek holding lain" per baris
// owner non-SELF di assetOwnersModal, muncul kalau
// `DanaTitipanPortfolioAPI.build()` melaporkan `estimatedUnallocated>0`
// utk owner tsb (GLOBAL, bukan per-holding -- beda dari "💰 Kuota sisa"
// yang sudah ada di `_ownerQuotaText()`). Klik badge memanggil
// `dashHubQaDanaTitipan()` (data-action, fungsi navigasi yang SUDAH ADA di
// modules/shared/action-wrappers.js -- 0 logic navigasi baru).
//
// 1 file source disentuh sesi ini: modules/asset/aset-owners.js.
// modules/asset/aset.js, modules/finance/*.js TIDAK diubah.
//
// Kontrak yang diuji:
//   1. Aset._ownerHasUnallocatedElsewhere(ownerId,projection) -- helper murni,
//      true hanya kalau bucket owner ada & estimatedUnallocated>0.
//   2. Badge TIDAK muncul utk baris SELF, TIDAK muncul kalau ownerId kosong.
//   3. Badge TIDAK muncul kalau estimatedUnallocated 0/null/negatif.
//   4. Badge MUNCUL kalau estimatedUnallocated>0, dgn data-action yang benar.
//   5. build() di-cache 1x per _renderOwnersList() (bukan dipanggil ulang
//      tiap baris) -- diverifikasi lewat counter panggilan.

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

function makeCtx(D, dom) {
  const ctx = loadSource(
    ['modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      openModal: () => {},
      closeModal: () => {},
      uid: () => 'owner_x',
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: () => {},
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-31',
    },
    ['Aset', 'MultiOwnerEngine', 'Investment', 'DanaTitipanPortfolioAPI'],
  );
  ctx.Aset.renderList = () => {};
  return ctx;
}

function baseD({ assets, titipanCommitments }) {
  return {
    assets: assets || [], investments: [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: titipanCommitments || [], titipanReturns: [],
  };
}

// ---- Test 1: helper murni -- true kalau estimatedUnallocated>0 ----
test('S-A-1: _ownerHasUnallocatedElsewhere true kalau bucket owner estimatedUnallocated>0', () => {
  const dom = makeStatefulDom();
  const D = baseD({});
  const { Aset } = makeCtx(D, dom);
  const projection = { owners: [{ ownerId: 'ow1', estimatedUnallocated: 500000 }] };
  assert.equal(Aset._ownerHasUnallocatedElsewhere('ow1', projection), true);
});

// ---- Test 2: helper murni -- false kalau 0/negatif/null ----
test('S-A-2: _ownerHasUnallocatedElsewhere false kalau estimatedUnallocated<=0 atau null', () => {
  const dom = makeStatefulDom();
  const D = baseD({});
  const { Aset } = makeCtx(D, dom);
  assert.equal(Aset._ownerHasUnallocatedElsewhere('ow1', { owners: [{ ownerId: 'ow1', estimatedUnallocated: 0 }] }), false);
  assert.equal(Aset._ownerHasUnallocatedElsewhere('ow1', { owners: [{ ownerId: 'ow1', estimatedUnallocated: -100 }] }), false);
  assert.equal(Aset._ownerHasUnallocatedElsewhere('ow1', { owners: [{ ownerId: 'ow1', estimatedUnallocated: null }] }), false);
});

// ---- Test 3: helper murni -- false kalau ownerId tidak ketemu di bucket / ownerId kosong ----
test('S-A-3: _ownerHasUnallocatedElsewhere false kalau ownerId tidak ada di projection.owners atau kosong', () => {
  const dom = makeStatefulDom();
  const D = baseD({});
  const { Aset } = makeCtx(D, dom);
  assert.equal(Aset._ownerHasUnallocatedElsewhere('ow-lain', { owners: [{ ownerId: 'ow1', estimatedUnallocated: 500000 }] }), false);
  assert.equal(Aset._ownerHasUnallocatedElsewhere('', { owners: [{ ownerId: 'ow1', estimatedUnallocated: 500000 }] }), false);
  assert.equal(Aset._ownerHasUnallocatedElsewhere(null, { owners: [{ ownerId: 'ow1', estimatedUnallocated: 500000 }] }), false);
});

// ---- Test 4: render list -- badge MUNCUL utk owner non-SELF dgn sisa titipan global>0 ----
test('S-A-4: _renderOwnersList() merender badge link-out utk owner non-SELF dgn estimatedUnallocated>0', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'ow1', porsi: 50, ownerName: 'Pak Budi' },
    ] }],
    titipanCommitments: [{ ownerId: 'ow1', principalAmount: 100000000 }],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  const html = dom.getElementById('assetOwnersList').innerHTML;
  assert.match(html, /masih ada sisa titipan, cek holding lain/);
  assert.match(html, /data-action="dashHubQaDanaTitipan"/);
});

// ---- Test 5: render list -- badge TIDAK muncul utk baris SELF ----
test('S-A-5: badge TIDAK muncul utk baris SELF walau ada sisa titipan owner lain', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  const html = dom.getElementById('assetOwnersList').innerHTML;
  assert.doesNotMatch(html, /masih ada sisa titipan/);
});

// ---- Test 6: render list -- badge TIDAK muncul kalau owner sudah full-invested (estimatedUnallocated=0) ----
test('S-A-6: badge TIDAK muncul kalau titipan owner sudah habis teralokasi (estimatedUnallocated 0)', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 0, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'ow1', porsi: 100, ownerName: 'Pak Budi' },
    ] }],
    // principal 100jt, porsi draft baris ini 100% dari nilai 100jt -> draftNominal 100jt,
    // usedTotal/linkedExpenseTotal 0 -> estimatedUnallocated global (build()) jadi 0.
    titipanCommitments: [{ ownerId: 'ow1', principalAmount: 100000000 }],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  const html = dom.getElementById('assetOwnersList').innerHTML;
  assert.doesNotMatch(html, /masih ada sisa titipan/);
});

// ---- Test 7: build() di-cache 1x per render, bukan N+1 per baris ----
test('S-A-7: DanaTitipanPortfolioAPI.build() dipanggil sekali per _renderOwnersList(), bukan per baris owner', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 34, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'ow1', porsi: 33, ownerName: 'Pak Budi' },
      { ownerId: 'ow2', porsi: 33, ownerName: 'Bu Sari' },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 50000000 },
      { ownerId: 'ow2', principalAmount: 50000000 },
    ],
  });
  const ctx = makeCtx(D, dom);
  const { Aset } = ctx;
  let buildCalls = 0;
  const origBuild = ctx.DanaTitipanPortfolioAPI.build;
  ctx.DanaTitipanPortfolioAPI.build = function patched(...args) { buildCalls += 1; return origBuild.apply(ctx.DanaTitipanPortfolioAPI, args); };
  Aset.openOwnersModalById('as1');
  // _ownerQuotaText() per baris (2 baris non-SELF) juga masing2 memanggil build()
  // sendiri (baris ~199, existing S505 -- TIDAK diubah sesi ini), jadi total
  // panggilan sebelum Sesi B = 1 (cache badge) + 2 (quota per baris non-SELF) = 3.
  // SESI B (banner proaktif, _checkUnallocatedBannerOnOpen) menambah TEPAT 1
  // panggilan build() lagi (dipanggil 1x per buka modal, SEBELUM _renderOwnersList(),
  // bukan di-cache bareng badge krn beda titik panggil di openOwnersModal() -- lihat
  // komentar _checkUnallocatedBannerOnOpen) -> total jadi 3+1=4. Assert utamanya
  // TETAP: TIDAK proporsional dgn jumlah baris x 2 (yang berarti badge/banner ikut
  // memanggil build() sendiri2 per baris, bukan pakai cache/1x).
  //
  // SESI C (baris ringkasan agregat "Total sisa belum terinvest") menambah
  // TEPAT 1 panggilan build() lagi -- _renderOwnersUnallocatedBox() meng-cache
  // 1x build() sendiri (titik panggil beda dari cache badge di atas, & beda
  // dari banner Sesi B) lalu mengopernya ke _ownerSisaTitipan() per baris
  // (BUKAN masing2 baris panggil build() sendiri) -> total jadi 4+1=5.
  assert.equal(buildCalls, 5);
  ctx.DanaTitipanPortfolioAPI.build = origBuild;
});
