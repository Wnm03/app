'use strict';
// tests/sesi-d-asset-owners-bagi-rata.test.js — Sesi D1 (lihat
// docs/AUDIT-RENCANA-titipan-unallocated-ownersmodal-exposure.md § Sesi D,
// Fitur 1b): tombol "🔄 Bagi rata ke owner ini" di #assetOwnersUnallocatedBox
// (Sesi C) + fungsi Aset.bagiRataUnallocated().
//
// 1 file source disentuh sesi ini: modules/asset/aset-owners.js
//   - _renderOwnersUnallocatedBox(): tombol baru disisipkan di cabang hasValid
//     (persis sejalan dgn kapan box itu sendiri tampil).
//   - bagiRataUnallocated(): 100% REUSE applyQuotaToRow(i) per baris owner
//     non-SELF, dipanggil BERURUTAN per index (bukan snapshot cap semua baris
//     dulu) — supaya normalisasi total <=100% otomatis dari _ownerQuotaPorsiCap
//     (remainingPorsi dihitung ulang tiap baris dari draft TERKINI).
//
// Kontrak yang diuji:
//   1. Tombol muncul di box saat ada minimal 1 owner non-SELF dgn commitment
//      tercatat (cabang hasValid).
//   2. Tombol TIDAK muncul saat box kosong (draft kosong/semua SELF/read-only/
//      belum ada commitment tercatat) — sejalan dgn box itu sendiri.
//   3. bagiRataUnallocated() mengisi porsi tiap owner non-SELF sesuai kuota
//      masing-masing saat kuota gabungan MUAT (<=100% ruang porsi).
//   4. Normalisasi: saat kuota gabungan MELEBIHI ruang porsi tersisa, owner
//      belakangan di-cap oleh remainingPorsi yang sudah menyempit — total akhir
//      tetap <=100%, TANPA logic pembatas baru (murni efek pemanggilan
//      berurutan applyQuotaToRow yang recompute cap tiap kali).
//   5. Read-only guard: no-op, draft tidak berubah.
//   6. Owner tanpa commitment tercatat di-skip (porsi baris itu tidak berubah),
//      owner lain yang valid tetap terisi (partial success, sesuai perilaku
//      applyQuotaToRow existing per baris).
//   7. Draft kosong / hanya SELF: no-op aman, tidak throw.

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

// ---- Test 1: tombol muncul saat box hasValid ----
test('S-D-1: tombol "Bagi rata" muncul di box saat ada owner non-SELF dgn commitment tercatat', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 20000000, owners: [
      { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'ow1', porsi: 50, ownerName: 'Pak Budi' },
    ] }],
    titipanCommitments: [{ ownerId: 'ow1', principalAmount: 100000000 }],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  const box = dom.getElementById('assetOwnersUnallocatedBox');
  assert.match(box.innerHTML, /Bagi rata ke owner ini/);
  assert.match(box.innerHTML, /Aset\.bagiRataUnallocated/);
});

// ---- Test 2: tombol tidak muncul saat box kosong ----
test('S-D-2: tombol tidak muncul saat box kosong (draft kosong / semua SELF / belum ada commitment)', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 20000000, owners: [
      { ownerId: 'ow1', porsi: 100, ownerName: 'Pak Budi' },
    ] }],
    titipanCommitments: [],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  const box = dom.getElementById('assetOwnersUnallocatedBox');
  assert.equal(box.innerHTML, '');
  assert.doesNotMatch(box.innerHTML, /Bagi rata/);
});

// ---- Test 3: mengisi porsi sesuai kuota masing-masing saat muat ----
test('S-D-3: bagiRataUnallocated() mengisi porsi tiap owner non-SELF sesuai kuota masing-masing', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 20000000 }, // kuota = 20jt/100jt = 20%
      { ownerId: 'ow2', principalAmount: 30000000 }, // kuota = 30jt/100jt = 30%
    ],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  // Simulasikan user sudah menambah 2 baris owner baru (via addOwnerRow +
  // pilih nama, porsi masih 0/belum diisi) -- pola sama draft state nyata
  // sebelum user tap "Bagi rata", bukan lewat a.owners (yg wajib sum 100%).
  Aset._ownersDraft = [
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 0, isSelf: false },
    { ownerId: 'ow2', ownerName: 'Bu Sari', porsi: 0, isSelf: false },
  ];
  Aset.bagiRataUnallocated();
  const draft = Aset._ownersDraft;
  assert.equal(draft.find((o) => o.ownerId === 'ow1').porsi, 20);
  assert.equal(draft.find((o) => o.ownerId === 'ow2').porsi, 30);
  const total = draft.reduce((s, o) => s + (o.porsi || 0), 0);
  assert.ok(total <= 100);
});

// ---- Test 4: normalisasi saat kuota gabungan melebihi ruang porsi tersisa ----
test('S-D-4: owner belakangan di-cap oleh remainingPorsi yang menyempit, total akhir <=100%', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 70000000 }, // kuota mentah = 70%
      { ownerId: 'ow2', principalAmount: 60000000 }, // kuota mentah = 60% -> ruang tersisa cuma 30%
    ],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  Aset._ownersDraft = [
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 0, isSelf: false },
    { ownerId: 'ow2', ownerName: 'Bu Sari', porsi: 0, isSelf: false },
  ];
  Aset.bagiRataUnallocated();
  const draft = Aset._ownersDraft;
  const ow1 = draft.find((o) => o.ownerId === 'ow1').porsi;
  const ow2 = draft.find((o) => o.ownerId === 'ow2').porsi;
  assert.equal(ow1, 70);
  assert.equal(ow2, 30); // di-cap: 100 - 70 = 30, bukan 60
  assert.ok(ow1 + ow2 <= 100);
});

// ---- Test 5: read-only guard ----
test('S-D-5: bagiRataUnallocated() no-op saat cabang read-only', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 20000000, owners: [
      { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'ow1', porsi: 50, ownerName: 'Pak Budi' },
    ] }],
    titipanCommitments: [{ ownerId: 'ow1', principalAmount: 100000000 }],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  // Cabang read-only Aset sendiri (bukan alih-navigasi ke InvestmentUI) hanya
  // relevan kalau InvestmentUI tidak dimuat (guard fallback lama) -- disimulasikan
  // di sini dgn set flag langsung, konsisten dgn cara _renderOwnersUnallocatedBox()
  // sendiri mengecek Aset._ownersReadOnly (bukan menebak jalur navigasi mana yg
  // menghasilkannya).
  Aset._ownersReadOnly = true;
  assert.doesNotThrow(() => Aset.bagiRataUnallocated());
  assert.equal(Aset._ownersDraft.find((o) => o.ownerId === 'ow1').porsi, 50); // tidak berubah
});


// ---- Test 6: owner tanpa commitment di-skip, owner valid lain tetap terisi ----
test('S-D-6: owner tanpa commitment tercatat di-skip, owner valid lain tetap terisi (partial success)', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 100000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
    titipanCommitments: [
      { ownerId: 'ow1', principalAmount: 20000000 }, // ow2 sengaja tidak punya commitment
    ],
  });
  const toasts = [];
  const { Aset } = makeCtx(D, dom, (msg) => toasts.push(msg));
  Aset.openOwnersModalById('as1');
  Aset._ownersDraft = [
    { ownerId: 'ow1', ownerName: 'Pak Budi', porsi: 0, isSelf: false },
    { ownerId: 'ow2', ownerName: 'Bu Sari', porsi: 0, isSelf: false },
  ];
  Aset.bagiRataUnallocated();
  const draft = Aset._ownersDraft;
  assert.equal(draft.find((o) => o.ownerId === 'ow1').porsi, 20);
  assert.equal(draft.find((o) => o.ownerId === 'ow2').porsi, 0); // tidak berubah, di-skip
  assert.ok(toasts.some((t) => /belum punya pokok titipan/.test(t)));
});

// ---- Test 7: draft kosong / hanya SELF -> no-op aman ----
test('S-D-7: bagiRataUnallocated() no-op aman saat draft kosong / hanya SELF', () => {
  const dom = makeStatefulDom();
  const D = baseD({
    assets: [{ id: 'as1', name: 'Tanah Kavling', nilai: 20000000, owners: [
      { ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true },
    ] }],
  });
  const { Aset } = makeCtx(D, dom);
  Aset.openOwnersModalById('as1');
  assert.doesNotThrow(() => Aset.bagiRataUnallocated());
  assert.equal(Aset._ownersDraft.length, 1);
  assert.equal(Aset._ownersDraft[0].porsi, 100);
});
