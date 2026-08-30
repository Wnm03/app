'use strict';
// tests/s666-aset-owners-settlement-toggle-ui.test.js — Sesi 666, lanjutan
// fondasi S665 (Aset.getOwnerSettlement()/setOwnerSettlement()/
// assetsByOwnerSettlement()). Sesi ini WIRING UI: toggle "🔒 Dana Titipan" /
// "✅ Milik Sendiri" per baris owner non-SELF di assetOwnersModal (Aset,
// modules/asset/aset-owners.js) — pola SAMA PERSIS
// InvestmentUI (S661, investasi-view.js). 1 file source disentuh sesi ini
// (sesuai aturan "1 sesi 1 file", docs/ZIP_RULES.md § Mode PATCH ZIP):
// modules/asset/aset-owners.js. modules/asset/aset.js TIDAK disentuh.
//
// Kontrak yang diuji:
//   1. openOwnersModal() (via openOwnersModalById) memuat draft[i].settlement
//      dari data TERSIMPAN (Aset.getOwnerSettlement()), bukan selalu 'titipan'.
//   2. _renderOwnersList() merender <select> status HANYA utk baris non-SELF.
//   3. onOwnerSettlementChange() mengubah draft murni (state, 0 tulis ke D).
//   4. saveOwners() memanggil Aset.setOwnerSettlement() per owner non-SELF
//      sesuai draft -> Buku Utang ikut disinkron (0 rumus baru, reuse penuh
//      _syncOwnerDebts()/TitipanSync.reconcile() dari S665).
//   5. resetOwners() memuat ulang draft.settlement dari data tersimpan juga
//      (bukan cuma openOwnersModal()).
//   6. addOwnerRow() baris baru default settlement:'titipan'.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return { id, value: '', textContent: '', innerHTML: '', className: '', placeholder: '', disabled: false, style: {}, checked: false, classList: { toggle() {}, add() {}, remove() {} } };
  }
  return {
    getElementById(id) {
      // renderList() (dipanggil di dalam saveOwners()) tidak jadi concern S666 --
      // biarkan #assetList tetap null supaya renderList() early-return (baris
      // "if(!el)return;"), tidak perlu stub seluruh dependensi Buku Aset
      // (migrateAssetInvestmentsToHoldings/OwnershipEngine/Penyusutan/dst).
      if (id === 'assetList') return null;
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeCtx(D, dom) {
  let _n = 9000;
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      uid: () => (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => { D._saved = (D._saved || 0) + 1; },
      toast: () => {},
      openModal: () => {},
      closeModal: () => {},
      todayStr: () => '2026-08-30',
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry', 'Aset'],
  );
}

function baseD() {
  return {
    assets: [{
      id: 'as1',
      name: 'Rumah Warisan Istri',
      nilai: 500000000,
      owners: [
        { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true },
        { ownerId: 'istri1', porsi: 50, ownerName: 'Istri' },
      ],
    }],
    debts: [],
  };
}

test('openOwnersModal(): draft.settlement dimuat dari Aset.getOwnerSettlement() (kasus "milik")', () => {
  const D = baseD();
  D.assets[0].ownerSettlement = { istri1: 'milik' };
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  const row = ctx.Aset._ownersDraft.find((o) => o.ownerId === 'istri1');
  assert.equal(row.settlement, 'milik');
});

test('openOwnersModal(): draft.settlement default "titipan" kalau belum pernah diset (0 regresi)', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  const row = ctx.Aset._ownersDraft.find((o) => o.ownerId === 'istri1');
  assert.equal(row.settlement, 'titipan');
});

test('_renderOwnersList(): select status dirender utk baris non-SELF, TIDAK dirender utk baris isSelf', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  const html = dom.getElementById('assetOwnersList').innerHTML;
  assert.match(html, /assetOwnerSettlement1/); // baris ke-2 (index 1, non-SELF, "istri1")
  assert.doesNotMatch(html, /assetOwnerSettlement0/); // baris ke-1 (index 0, SELF) tidak punya select ini
});

test('onOwnerSettlementChange(): mengubah draft[i].settlement, 0 tulis ke D', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  ctx.Aset.onOwnerSettlementChange(1, 'milik');
  assert.equal(ctx.Aset._ownersDraft[1].settlement, 'milik');
  assert.equal(D.assets[0].ownerSettlement, undefined); // belum saveOwners()
});

test('saveOwners(): settlement "milik" di draft -> 0 entry Buku Utang tersimpan utk owner itu', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  ctx.Aset.onOwnerSettlementChange(1, 'milik');
  ctx.Aset.saveOwners();
  assert.equal(D.debts.filter((d) => d.linkedAssetId === 'as1' && d.linkedOwnerId === 'istri1').length, 0);
  assert.equal(ctx.Aset.getOwnerSettlement(D.assets[0], 'istri1'), 'milik');
});

test('saveOwners(): settlement default "titipan" -> perilaku SAMA seperti sebelum S665/S666 (1 entry Buku Utang)', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  ctx.Aset.saveOwners();
  assert.equal(D.debts.filter((d) => d.linkedAssetId === 'as1' && d.linkedOwnerId === 'istri1').length, 1);
});

test('resetOwners(): draft.settlement dimuat ulang dari data tersimpan (bukan cuma openOwnersModal())', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  ctx.Aset.onOwnerSettlementChange(1, 'milik'); // ubah draft, BELUM disimpan
  ctx.Aset.resetOwners();
  const row = ctx.Aset._ownersDraft.find((o) => o.ownerId === 'istri1');
  assert.equal(row.settlement, 'titipan'); // balik ke data tersimpan (belum pernah di-saveOwners())
});

test('addOwnerRow(): baris baru default settlement:"titipan"', () => {
  const D = baseD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.openOwnersModalById('as1');
  ctx.Aset.addOwnerRow();
  const last = ctx.Aset._ownersDraft[ctx.Aset._ownersDraft.length - 1];
  assert.equal(last.settlement, 'titipan');
});
