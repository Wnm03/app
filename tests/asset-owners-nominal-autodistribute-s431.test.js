'use strict';
// tests/asset-owners-nominal-autodistribute-s431.test.js — Sesi 431: saat
// user isi field "Nominal (Rp)" satu baris pemilik di modal "⚖️ Atur Porsi
// Kepemilikan", sisa nilai aset (nilaiAset - nominal baris itu, dijepit ke
// >=0) otomatis dibagi RATA ke SEMUA baris pemilik lain lewat
// Aset._autoDistributeRemaining() (baru) -- lihat komentar method itu di
// modules/asset/aset.js utk detail rumus.
//
// Pola DOM tiruan STATEFUL & makeCtx/makeD sama persis
// tests/asset-owners-nominal-sync-s429.test.js (dipersempit ke skenario
// auto-bagi saja).

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
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset.js'],
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
      todayStr: () => '2026-08-07',
    },
    ['Aset', 'MultiOwnerEngine', 'OwnerRegistry'],
  );
  ctx.Aset.renderList = () => {};
  return ctx;
}

function makeD(nilai) {
  return {
    assets: [{ id: 'a1', name: 'Tanah Patungan', nilai, keuntungan: 0 }],
    accounts: [], transactions: [], debts: [],
  };
}

test('onOwnerNominalInput(): isi nominal 1 baris (2 pemilik) -> sisa otomatis dibagi ke baris lain', () => {
  const D = makeD(200000000); // Rp200jt
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal(); // 1 baris sintesis SELF 100%
  ctx.Aset.addOwnerRow(); // baris ke-2 kosong (porsi 0)
  ctx.Aset.onOwnerNominalInput(0, '120000000'); // 60% dari 200jt
  assert.equal(ctx.Aset._ownersDraft[0].porsi, 60, 'baris yang diedit harus 60%');
  assert.equal(ctx.Aset._ownersDraft[1].porsi, 40, 'sisa 40% harus otomatis mengalir ke baris lain');
  assert.equal(dom.getElementById('ownerPorsi1').value, 40, 'DOM porsi baris lain harus ikut ter-update');
  assert.equal(dom.getElementById('ownerNominal1').value, 80000000, 'DOM nominal baris lain harus ikut ter-update (40% x 200jt)');
});

test('onOwnerNominalInput(): 3 pemilik -> sisa dibagi RATA ke 2 baris lain, total tetap 100%', () => {
  const D = makeD(300000000); // Rp300jt
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.addOwnerRow();
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerNominalInput(0, '30000000'); // 10% dari 300jt -> sisa 90% dibagi 2 baris = 45%/45%
  assert.equal(ctx.Aset._ownersDraft[0].porsi, 10);
  assert.equal(ctx.Aset._ownersDraft[1].porsi, 45);
  assert.equal(ctx.Aset._ownersDraft[2].porsi, 45);
  const total = ctx.MultiOwnerEngine.totalPorsi(ctx.Aset._ownersDraft);
  assert.equal(total, 100, 'total porsi harus PERSIS 100% setelah auto-bagi (bukan 99.99/100.01)');
});

test('onOwnerNominalInput(): nominal diisi melebihi nilai aset -> sisa dijepit ke 0 (baris lain jadi 0%, bukan minus)', () => {
  const D = makeD(100000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerNominalInput(0, '150000000'); // melebihi nilai aset
  assert.equal(ctx.Aset._ownersDraft[1].porsi, 0, 'sisa tidak boleh negatif, baris lain harus 0%');
});

test('onOwnerNominalInput(): hasil auto-bagi tetap tersimpan benar via saveOwners()', () => {
  const D = makeD(100000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.onOwnerNameInput(0, 'Saya');
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerNameInput(1, 'Investor B');
  // SESI 453: DOM #ownerNominal0 diset LANGSUNG di sini (bukan cuma lewat
  // parameter `val` ke handler) supaya konsisten dgn typing sungguhan di
  // browser nyata -- input yang sedang diketik user SELALU sudah py .value
  // ter-update di DOM sebelum event `oninput` sempat dipanggil (browser
  // yang melakukannya, bukan JS). saveOwners() sekarang membaca ulang DOM
  // ini (lihat Aset._resyncOwnersFromDOM(), SESI 453) sbg sumber kebenaran
  // akhir -- tanpa baris ini, mock DOM statis tidak merefleksikan ketikan
  // yang baru saja "terjadi" lewat pemanggilan method langsung ini.
  dom.getElementById('ownerNominal0').value = '70000000';
  ctx.Aset.onOwnerNominalInput(0, '70000000'); // 70% -> sisa 30% otomatis ke baris 1
  ctx.Aset.saveOwners();
  assert.deepEqual(
    JSON.parse(JSON.stringify(D.assets[0].owners.map((o) => [o.ownerName, o.porsi]))),
    [['Saya', 70], ['Investor B', 30]],
    'porsi hasil auto-bagi harus tersimpan benar ke D.assets, bukan cuma berubah di tampilan',
  );
});

test('onOwnerPorsiInput(): edit Porsi% manual TIDAK memicu auto-bagi (0 regresi, beda sengaja dari isi Nominal)', () => {
  const D = makeD(200000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerPorsiInput(0, '60');
  assert.equal(ctx.Aset._ownersDraft[1].porsi, 0, 'baris lain tidak boleh ikut berubah saat Porsi% diedit manual (bukan lewat Nominal)');
});

test('_autoDistributeRemaining(): no-op kalau cuma 1 pemilik (tidak ada baris lain utk dibagi)', () => {
  const D = makeD(200000000);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.onOwnerNominalInput(0, '200000000');
  assert.equal(ctx.Aset._ownersDraft.length, 1, 'jumlah baris tidak boleh berubah');
  assert.equal(ctx.Aset._ownersDraft[0].porsi, 100);
});
