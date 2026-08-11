'use strict';
/**
 * s559-tx-asset-selflink-redundant.test.js — Sesi 559 (permintaan user via
 * screenshot): "ketika akun/metode sudah Majoris bisakah tidak usah
 * ditautkan ke akun multi-aset lagi?".
 *
 * ROOT CAUSE: akun/metode yang dipilih di form Transaksi (#txAcc) SUDAH
 * langsung tertaut ke aset multi-owner lewat accountId
 * (findMultiOwnerAssetForAccount() -- SAMA sumber dgn blok "PORSI PEMILIK
 * (AKUN PATUNGAN)", resolveTxOwnerSplitForAccount() di filter-laporan.js).
 * Dropdown "Kaitkan ke Aset Multi-Owner" (#txAssetId) sebelumnya AUTO-
 * mengisi dirinya dgn aset itu juga (via onTxAccChange() lama) -- akun
 * "Majoris" jadi menautkan diri sendiri ke aset "Majoris", murni duplikasi
 * UI/preview yg membingungkan krn owner & split-nya SAMA PERSIS dgn blok
 * "PORSI PEMILIK (AKUN PATUNGAN)" di bawahnya.
 *
 * FIX: updateTxAssetWrapVisibility() (transaksi.js) sekarang mengecualikan
 * aset self-linked itu (excludeId) dari pilihan #txAssetId
 * (populateEntryAssetSelect() dpt parameter ke-3 excludeAssetId baru,
 * piutang-utang.js) & menyembunyikan wrap #txAssetWrap TOTAL kalau aset
 * self-linked itu satu-satunya aset multi-owner yg ada (0 aset LAIN yg
 * relevan utk ditautkan manual). Aset multi-owner LAIN (bukan yg accountId-
 * nya = akun terpilih) tetap tampil spt biasa -- 0 regresi kasus itu.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(overrides = {}) {
  return Object.assign({
    value: '', checked: false, textContent: '', innerHTML: '', disabled: false,
    style: {}, classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    options: [],
  }, overrides);
}

function makeFakeDoc(initial = {}) {
  const els = {};
  Object.keys(initial).forEach(id => { els[id] = makeEl(initial[id]); });
  const doc = { getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; } };
  return { doc, els };
}

function makeCtx({ document, assets, accId }) {
  const populateCalls = [];
  return {
    ctx: loadSource(
      ['modules/finance/piutang-utang.js', 'modules/finance/transaksi.js'],
      {
        document,
        curTxType: 'expense',
        D: { assets },
        sameId: (a, b) => String(a) === String(b),
        escapeHtml: (s) => s,
        MultiOwnerEngine: {
          getOwners(a) {
            return a && a.isMultiOwner ? { ok: true, isMultiOwner: true, owners: a.owners || [] } : { ok: true, isMultiOwner: false };
          },
        },
        getMultiOwnerAssets() { return assets.filter(a => a.isMultiOwner); },
        resolveEntryAssetSelfPorsi() { return 100; },
        updateTxAssetSplitPreview() {},
        updateTxOwnerPorsiOptions() {},
      },
    ),
    populateCalls,
  };
}

test('s559: akun yg accountId-nya tertaut ke aset multi-owner (self-link) -- wrap disembunyikan kalau itu satu-satunya aset', () => {
  const assets = [
    { id: 'aset-majoris', name: 'Majoris', accountId: 'acc-majoris', isMultiOwner: true, owners: [{ ownerId: 'o1', ownerName: 'mas sihab', porsi: 15 }, { ownerId: 'o2', ownerName: 'renov', porsi: 85 }] },
  ];
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-majoris' } });
  const { ctx } = makeCtx({ document: doc, assets });
  ctx.updateTxAssetWrapVisibility();
  assert.equal(els.txAssetWrap.style.display, 'none', 'wrap harus disembunyikan -- self-link adalah satu-satunya aset multi-owner');
});

test('s559: dropdown #txAssetId tidak lagi berisi opsi aset self-linked itu', () => {
  const assets = [
    { id: 'aset-majoris', name: 'Majoris', accountId: 'acc-majoris', isMultiOwner: true, owners: [{ ownerId: 'o1', ownerName: 'mas sihab', porsi: 15 }, { ownerId: 'o2', ownerName: 'renov', porsi: 85 }] },
    { id: 'aset-lain', name: 'Ruko Patungan', accountId: 'acc-lain', isMultiOwner: true, owners: [{ ownerId: 'o3', ownerName: 'budi', porsi: 50 }, { ownerId: 'o4', ownerName: 'ani', porsi: 50 }] },
  ];
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-majoris' } });
  const { ctx } = makeCtx({ document: doc, assets });
  ctx.updateTxAssetWrapVisibility();
  // wrap harus TETAP tampil krn masih ada aset multi-owner LAIN (Ruko Patungan)
  assert.equal(els.txAssetWrap.style.display, 'block');
  assert.doesNotMatch(els.txAssetId.innerHTML, /aset-majoris/, 'aset self-linked (Majoris) tidak boleh jadi opsi di dropdown Kaitkan');
  assert.match(els.txAssetId.innerHTML, /aset-lain/, 'aset multi-owner LAIN tetap jadi opsi seperti biasa');
});

test('s559: akun biasa (bukan multi-owner) -- perilaku lama tetap sama, wrap tampil kalau ada aset multi-owner apa pun', () => {
  const assets = [
    { id: 'aset-lain', name: 'Ruko Patungan', accountId: 'acc-lain', isMultiOwner: true, owners: [{ ownerId: 'o3', ownerName: 'budi', porsi: 50 }, { ownerId: 'o4', ownerName: 'ani', porsi: 50 }] },
  ];
  const { doc, els } = makeFakeDoc({ txAcc: { value: 'acc-biasa' } });
  const { ctx } = makeCtx({ document: doc, assets });
  ctx.updateTxAssetWrapVisibility();
  assert.equal(els.txAssetWrap.style.display, 'block');
  assert.match(els.txAssetId.innerHTML, /aset-lain/);
});

test('s559: populateEntryAssetSelect() dgn excludeAssetId membuang 1 opsi tapi tidak mengubah pemanggilan lama (tanpa parameter ke-3)', () => {
  const assets = [
    { id: 'a1', name: 'Tanah A', isMultiOwner: true },
    { id: 'a2', name: 'Tanah B', isMultiOwner: true },
  ];
  const { doc, els } = makeFakeDoc({ sel1: {}, sel2: {} });
  const { ctx } = makeCtx({ document: doc, assets });
  ctx.populateEntryAssetSelect('sel1', '', 'a1');
  assert.doesNotMatch(els.sel1.innerHTML, />Tanah A</);
  assert.match(els.sel1.innerHTML, />Tanah B</);
  ctx.populateEntryAssetSelect('sel2', '');
  assert.match(els.sel2.innerHTML, />Tanah A</);
  assert.match(els.sel2.innerHTML, />Tanah B</);
});
