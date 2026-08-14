'use strict';
// tests/asset-owners-nominal-autodistribute-proportional-s449.test.js —
// Sesi 449 asli (BUG-OWN-002): _autoDistributeRemaining() (aset.js) dulu
// membagi sisa porsi ke SEMUA baris lain secara PROPORSIONAL terhadap
// porsi lama mereka (bukan rata), utk kasus 3+ pemilik dgn porsi awal
// tidak sama besar.
//
// DITULIS ULANG di sesi AF1 lanjutan (lihat SESI-AF1-SESSION-NOTE.md &
// DESIGN-LOCK-autofill-sisa-porsi.md keputusan #2): _autoDistributeRemaining()
// (broadcast proporsional ke SEMUA baris lain) DIHAPUS dari aset.js -- sudah
// dead code (0 caller UI) sejak diganti Aset._applyRemainingShare() ->
// calculateRemainingShare() (SSOT modules-calc.js), yang SENGAJA HANYA
// mengisi 1 baris target (baris kosong/0 berikutnya yang belum `_touched`),
// TIDAK broadcast proporsional ke baris yang porsinya sudah terisi (>0).
// Test di file ini sekarang memverifikasi perilaku BARU itu utk skenario
// yang sama (3 pemilik, porsi awal tidak sama besar): baris dgn porsi lama
// >0 (bukan "kosong") TIDAK ikut disentuh — sesuai definisi "baris kosong"
// di Design Lock (porsi kosong/0 & belum pernah diketik manual), bukan lagi
// soal proporsi rasio lama.

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
    ['modules/shared/modules-calc.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset.js'],
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
    ['Aset', 'MultiOwnerEngine', 'calculateRemainingShare'],
  );
  ctx.Aset.renderList = () => {};
  return ctx;
}

test('onOwnerNominalInput(): 3 pemilik porsi LAMA semua >0 (70/20/10) -- TIDAK ADA baris "kosong", jadi auto-fill AF1 no-op (beda dari perilaku proporsional S449 yang dihapus)', () => {
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
  // A isi Nominal jadi 40jt (40%) -- B & C porsi lamanya (20/10) sudah >0
  // ("bukan baris kosong" per Design Lock), jadi TIDAK ada baris target dan
  // keduanya dibiarkan apa adanya -- user yang mengatur ulang B/C secara
  // manual kalau perlu. Total sengaja BUKAN 100% di sini (40+20+10=70),
  // sesuai Design Lock: "kalau tidak ada baris kosong -> tidak auto-fill,
  // biarkan user atur manual".
  ctx.Aset.onOwnerNominalInput(0, '40000000');
  assert.equal(ctx.Aset._ownersDraft[0].porsi, 40);
  assert.equal(ctx.Aset._ownersDraft[1].porsi, 20, 'B tidak disentuh -- porsi lamanya sudah >0, bukan baris kosong');
  assert.equal(ctx.Aset._ownersDraft[2].porsi, 10, 'C tidak disentuh -- porsi lamanya sudah >0, bukan baris kosong');
});

test('onOwnerNominalInput(): 3 pemilik, 2 baris kosong (porsi lama 0/0) -- HANYA baris kosong pertama yang dapat seluruh sisa (bukan lagi fallback rata 45/45 dari S449)', () => {
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
  ctx.Aset.onOwnerNominalInput(0, '30000000'); // 10% -> sisa 90% mengalir SELURUHNYA ke baris kosong pertama (index 1)
  assert.equal(ctx.Aset._ownersDraft[1].porsi, 90);
  assert.equal(ctx.Aset._ownersDraft[2].porsi, 0, 'baris kosong kedua TIDAK ikut diisi (bukan lagi rata 45/45)');
});
