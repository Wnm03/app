'use strict';
// tests/asset-owners-nominal-autodistribute-proportional-s449.test.js —
// SESI 449 (BUG-OWN-002, audit s448): _autoDistributeRemaining() (aset.js)
// sebelumnya membagi sisa porsi RATA ke semua baris lain, terlepas dari
// porsi LAMA baris-baris itu. Untuk 2 pemilik ini tidak kelihatan (sisa
// cuma jatuh ke 1 baris = otomatis "benar"), tapi utk 3+ pemilik ini salah
// -- laporan user: "harus tengah-tengah [rata], seharusnya bisa diatur
// flexible [proporsional]".
//
// Test di sini SENGAJA pakai 3+ pemilik dgn porsi LAMA yang TIDAK sama besar
// (beda dari tests/asset-owners-nominal-autodistribute-s431.test.js yang
// semua baris "lain"-nya start dari 0%, jadi fallback rata & tidak
// membedakan lama perilaku vs baru).

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
    ['modules/shared/multi-owner-engine.js', 'modules/asset/aset.js'],
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
    ['Aset', 'MultiOwnerEngine'],
  );
  ctx.Aset.renderList = () => {};
  return ctx;
}

test('_autoDistributeRemaining(): 3 pemilik porsi LAMA tidak sama (70/20/10) -- sisa dibagi PROPORSIONAL ke rasio lama, bukan rata', () => {
  const D = {
    assets: [{ id: 'a1', name: 'Ruko 3 Pemilik', nilai: 100000000, keuntungan: 0 }],
    accounts: [], transactions: [], debts: [],
  };
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: 'a', ownerName: 'A', porsi: 70, isSelf: true },
    { ownerId: 'b', ownerName: 'B', porsi: 20, isSelf: false },
    { ownerId: 'c', ownerName: 'C', porsi: 10, isSelf: false },
  ];
  // A isi Nominal jadi 40jt (40%) -- sisa 60% HARUS dibagi proporsional ke
  // rasio lama B:C (20:10 = 2:1) -> B dapat 40%, C dapat 20% (BUKAN 30%/30%
  // hasil bagi rata yang lama).
  ctx.Aset.onOwnerNominalInput(0, '40000000');
  assert.equal(ctx.Aset._ownersDraft[0].porsi, 40);
  assert.equal(ctx.Aset._ownersDraft[1].porsi, 40, 'B (porsi lama 20, rasio 2/3 dari sisa) harus 40%, bukan dibagi rata 30%');
  assert.equal(ctx.Aset._ownersDraft[2].porsi, 20, 'C (porsi lama 10, rasio 1/3 dari sisa) harus 20%, bukan dibagi rata 30%');
  const total = ctx.MultiOwnerEngine.totalPorsi(ctx.Aset._ownersDraft);
  assert.equal(total, 100, 'total porsi harus PERSIS 100% setelah auto-bagi proporsional');
});

test('_autoDistributeRemaining(): fallback ke rata kalau semua baris lain porsi lamanya 0 (0 regresi dari perilaku S431)', () => {
  const D = {
    assets: [{ id: 'a1', name: 'Tanah Baru', nilai: 300000000, keuntungan: 0 }],
    accounts: [], transactions: [], debts: [],
  };
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.addOwnerRow();
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerNominalInput(0, '30000000'); // 10% -> sisa 90% dibagi 2 baris (porsi lama 0/0) = rata 45%/45%
  assert.equal(ctx.Aset._ownersDraft[1].porsi, 45);
  assert.equal(ctx.Aset._ownersDraft[2].porsi, 45);
});
