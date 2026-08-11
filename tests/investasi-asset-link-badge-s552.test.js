'use strict';
// tests/investasi-asset-link-badge-s552.test.js — cakupan S552 (Aset <-> Investasi
// Link Resmi + Badge di Level List, lanjutan S551 audit duplikat nama/owner beda).
// Fokus test: fungsi MURNI (tidak sentuh DOM) di modules/asset/investasi.js —
// resolveInvestmentAssetLink() / resolveLinkedInvestmentAsset() /
// resolveInvestmentByAssetId() / investmentAssetLinkOptionsHtml() /
// assetInvestmentMismatch() / investmentCrossCheckWarning() / assetCrossCheckWarning()
// — via loadSource.js harness (pola sama persis tests/vehicle-asset-bridge-s507.test.js
// dipakai S506/S507, dan tests/data-health-check-catalog-dup-s268.test.js dipakai
// data-health-check.js).
//
// PENTING: S552 murni link REFERENSI 1 arah (h.assetId -> D.assets[].id), pola SAMA
// PERSIS S506 Vehicle<->Asset Identity Link. TIDAK ada snapshot nilai/owners, TIDAK
// ada SSOT baru, TIDAK ada auto-repair/cascade delete. Beda dari S506: assetId
// investasi TIDAK dibatasi jenis==='Kendaraan' (bisa link ke aset jenis apa pun).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(assets, investments) {
  const D = { assets: assets || [], investments: investments || [] };
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js'],
    { D, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s) },
    [
      'resolveInvestmentAssetLink',
      'resolveLinkedInvestmentAsset',
      'resolveInvestmentByAssetId',
      'investmentAssetLinkOptionsHtml',
      'assetInvestmentMismatch',
      'investmentCrossCheckWarning',
      'assetCrossCheckWarning',
    ]
  );
}

// ---------------------------------------------------------------------------
// resolveInvestmentAssetLink() / resolveLinkedInvestmentAsset() — B.2 pointer
// satu arah, murni validasi (assetId harus benar-benar ada di D.assets).
// ---------------------------------------------------------------------------

test('resolveInvestmentAssetLink: null kalau assetId kosong/falsy', () => {
  const ctx = makeCtx([{ id: 'asset_1', jenis: 'Saham', name: 'Schorder' }]);
  assert.equal(ctx.resolveInvestmentAssetLink(null), null);
  assert.equal(ctx.resolveInvestmentAssetLink(''), null);
  assert.equal(ctx.resolveInvestmentAssetLink(undefined), null);
});

test('resolveInvestmentAssetLink: null kalau assetId tidak ditemukan di D.assets (orphan)', () => {
  const ctx = makeCtx([]);
  assert.equal(ctx.resolveInvestmentAssetLink('asset-yang-sudah-dihapus'), null);
});

test('resolveInvestmentAssetLink: balikin asset kalau assetId valid, TANPA dibatasi jenis (beda S506)', () => {
  const asset = { id: 'asset_1', jenis: 'Saham', name: 'Schorder' };
  const ctx = makeCtx([asset]);
  assert.deepEqual(ctx.resolveInvestmentAssetLink('asset_1'), asset);
});

test('resolveInvestmentAssetLink: tetap resolve utk jenis aset apa pun (Tanah, Emas, dll)', () => {
  const tanah = { id: 'asset_2', jenis: 'Tanah', name: 'Kavling' };
  const ctx = makeCtx([tanah]);
  assert.deepEqual(ctx.resolveInvestmentAssetLink('asset_2'), tanah);
});

test('resolveLinkedInvestmentAsset: null kalau holding tidak punya assetId', () => {
  const ctx = makeCtx([{ id: 'asset_1', jenis: 'Saham', name: 'Schorder' }]);
  assert.equal(ctx.resolveLinkedInvestmentAsset({ id: 'h1', name: 'BBCA' }), null);
});

test('resolveLinkedInvestmentAsset: delegasi tipis ke resolveInvestmentAssetLink()', () => {
  const asset = { id: 'asset_1', jenis: 'Saham', name: 'Schorder' };
  const ctx = makeCtx([asset]);
  assert.deepEqual(ctx.resolveLinkedInvestmentAsset({ id: 'h1', assetId: 'asset_1' }), asset);
});

// ---------------------------------------------------------------------------
// resolveInvestmentByAssetId() — arah BALIK (Aset -> Investasi).
// ---------------------------------------------------------------------------

test('resolveInvestmentByAssetId: null kalau tidak ada holding yang menautkan assetId ini', () => {
  const ctx = makeCtx([], [{ id: 'h1', name: 'BBCA', assetId: null }]);
  assert.equal(ctx.resolveInvestmentByAssetId('asset_1'), null);
});

test('resolveInvestmentByAssetId: balikin holding yang assetId-nya cocok', () => {
  const holding = { id: 'h1', name: 'Schorder', assetId: 'asset_1' };
  const ctx = makeCtx([{ id: 'asset_1', jenis: 'Saham', name: 'Schorder' }], [holding]);
  assert.deepEqual(ctx.resolveInvestmentByAssetId('asset_1'), holding);
});

// ---------------------------------------------------------------------------
// investmentAssetLinkOptionsHtml() — dropdown "Hubungkan ke Buku Aset".
// ---------------------------------------------------------------------------

test('investmentAssetLinkOptionsHtml: selalu ada opsi "Tidak terhubung" duluan', () => {
  const ctx = makeCtx([]);
  const html = ctx.investmentAssetLinkOptionsHtml(null);
  assert.match(html, /^<option value="">/);
  assert.match(html, /Tidak terhubung/);
});

test('investmentAssetLinkOptionsHtml: aset yang sudah ditautkan ke holding LAIN disembunyikan', () => {
  const assets = [
    { id: 'asset_1', jenis: 'Saham', name: 'Schorder' },
    { id: 'asset_2', jenis: 'Tanah', name: 'Kavling' },
  ];
  const investments = [{ id: 'h1', name: 'Schorder', assetId: 'asset_1' }];
  const ctx = makeCtx(assets, investments);
  // Bangun options utk holding LAIN (h2, currentAssetId null) -- asset_1 sudah
  // dipakai h1, jadi harus disembunyikan; asset_2 masih bebas, harus muncul.
  const html = ctx.investmentAssetLinkOptionsHtml(null);
  assert.doesNotMatch(html, /Schorder/);
  assert.match(html, /Kavling/);
});

test('investmentAssetLinkOptionsHtml: currentAssetId sendiri TETAP muncul & ke-selected walau sudah ditautkan ke holding ini sendiri', () => {
  const assets = [{ id: 'asset_1', jenis: 'Saham', name: 'Schorder' }];
  const investments = [{ id: 'h1', name: 'Schorder', assetId: 'asset_1' }];
  const ctx = makeCtx(assets, investments);
  // Edit holding h1 sendiri -- currentAssetId = 'asset_1' -- harus tetap tampil & selected
  const html = ctx.investmentAssetLinkOptionsHtml('asset_1');
  assert.match(html, /value="asset_1" selected/);
  assert.match(html, /Schorder/);
});

test('investmentAssetLinkOptionsHtml: tidak dibatasi jenis, semua jenis aset yang belum tertaut muncul', () => {
  const assets = [
    { id: 'asset_1', jenis: 'Saham', name: 'BBCA' },
    { id: 'asset_2', jenis: 'Tanah', name: 'Kavling' },
    { id: 'asset_3', jenis: 'Emas/Logam Mulia', name: 'Emas 10gr' },
  ];
  const ctx = makeCtx(assets, []);
  const html = ctx.investmentAssetLinkOptionsHtml(null);
  assert.match(html, /BBCA/);
  assert.match(html, /Kavling/);
  assert.match(html, /Emas 10gr/);
});

// ---------------------------------------------------------------------------
// assetInvestmentMismatch() — signature pemilik efektif via
// MultiOwnerEngine.getOwners() (0 rumus baru, reuse persis pola S551).
// ---------------------------------------------------------------------------

test('assetInvestmentMismatch: false kalau a atau h null', () => {
  const ctx = makeCtx([]);
  assert.equal(ctx.assetInvestmentMismatch(null, { id: 'h1' }), false);
  assert.equal(ctx.assetInvestmentMismatch({ id: 'a1' }, null), false);
});

test('assetInvestmentMismatch: false kalau kedua sisi default SELF 100% (tidak ada field owners/ownership)', () => {
  const ctx = makeCtx([]);
  const a = { id: 'asset_1', name: 'Schorder' };
  const h = { id: 'h1', name: 'Schorder' };
  assert.equal(ctx.assetInvestmentMismatch(a, h), false);
});

test('assetInvestmentMismatch: true kalau owner efektif beda (kasus "Schorder" — Aset=investor 100%, Investasi=self 100%)', () => {
  const ctx = makeCtx([]);
  const a = {
    id: 'asset_1', name: 'Schorder',
    owners: [{ ownerId: 'renov', ownerName: 'Investor Renov', porsi: 100, isSelf: false }],
  };
  const h = {
    id: 'h1', name: 'Schorder',
    owners: [{ ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 100, isSelf: true }],
  };
  assert.equal(ctx.assetInvestmentMismatch(a, h), true);
});

test('assetInvestmentMismatch: false kalau owner efektif SAMA persis (multi-owner)', () => {
  const owners = [
    { ownerId: 'SELF', ownerName: 'Budi', porsi: 60, isSelf: true },
    { ownerId: 'ayah', ownerName: 'Ayah', porsi: 40, isSelf: false },
  ];
  const ctx = makeCtx([]);
  const a = { id: 'asset_1', name: 'Sama Persis', owners };
  const h = { id: 'h1', name: 'Sama Persis', owners: owners.map((o) => ({ ...o })) };
  assert.equal(ctx.assetInvestmentMismatch(a, h), false);
});

// ---------------------------------------------------------------------------
// investmentCrossCheckWarning() / assetCrossCheckWarning() — 1 titik baca
// dipakai badge list (B.3) & bridge di modal, prioritas link resmi (assetId)
// baru fallback name-match (pola S551).
// ---------------------------------------------------------------------------

test('investmentCrossCheckWarning: null kalau h null', () => {
  const ctx = makeCtx([]);
  assert.equal(ctx.investmentCrossCheckWarning(null), null);
});

test('investmentCrossCheckWarning: null kalau tidak ada link & tidak ada nama sama di Buku Aset', () => {
  const ctx = makeCtx([], []);
  const h = { id: 'h1', name: 'BBCA' };
  assert.equal(ctx.investmentCrossCheckWarning(h), null);
});

test('investmentCrossCheckWarning: link resmi valid & owner SAMA -> tidak ada warning', () => {
  const asset = { id: 'asset_1', name: 'Schorder', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] };
  const h = { id: 'h1', name: 'Schorder', assetId: 'asset_1', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] };
  const ctx = makeCtx([asset], [h]);
  assert.equal(ctx.investmentCrossCheckWarning(h), null);
});

test('investmentCrossCheckWarning: link resmi valid & owner BEDA -> warning "Kepemilikan beda dgn Buku Aset yang ditautkan"', () => {
  const asset = { id: 'asset_1', name: 'Schorder', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] };
  const h = { id: 'h1', name: 'Schorder', assetId: 'asset_1', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] };
  const ctx = makeCtx([asset], [h]);
  assert.match(ctx.investmentCrossCheckWarning(h), /Kepemilikan beda dgn Buku Aset yang ditautkan/);
});

test('investmentCrossCheckWarning: link orphan (assetId ada tapi aset sudah dihapus) -> null, BUKAN tanggung jawab badge kepemilikan', () => {
  const h = { id: 'h1', name: 'Schorder', assetId: 'asset-yang-sudah-dihapus' };
  const ctx = makeCtx([], [h]);
  assert.equal(ctx.investmentCrossCheckWarning(h), null);
});

test('investmentCrossCheckWarning: fallback name-match — belum ditautkan resmi, nama sama & owner beda -> warning name-match', () => {
  const asset = { id: 'asset_1', name: 'Schorder', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] };
  const h = { id: 'h1', name: 'Schorder', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }; // TANPA assetId
  const ctx = makeCtx([asset], [h]);
  assert.match(ctx.investmentCrossCheckWarning(h), /Nama sama dgn 1 entri Buku Aset, kepemilikan beda/);
});

test('investmentCrossCheckWarning: fallback name-match tidak dipakai kalau assetId sudah diisi (prioritas link resmi)', () => {
  // holding sudah ditautkan resmi ke asset_2 (owner sama) -- walau ada asset lain
  // "Schorder" bernama sama dgn owner beda, itu TIDAK relevan lagi krn sudah ada link resmi.
  const linkedAsset = { id: 'asset_2', name: 'Lainnya', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] };
  const namesakeAsset = { id: 'asset_1', name: 'Schorder', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] };
  const h = { id: 'h1', name: 'Schorder', assetId: 'asset_2', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] };
  const ctx = makeCtx([linkedAsset, namesakeAsset], [h]);
  assert.equal(ctx.investmentCrossCheckWarning(h), null);
});

test('assetCrossCheckWarning: null kalau a null', () => {
  const ctx = makeCtx([]);
  assert.equal(ctx.assetCrossCheckWarning(null), null);
});

test('assetCrossCheckWarning: arah balik — link resmi valid & owner beda -> warning "Kepemilikan beda dgn holding Investasi yang ditautkan"', () => {
  const asset = { id: 'asset_1', name: 'Schorder', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] };
  const h = { id: 'h1', name: 'Schorder', assetId: 'asset_1', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] };
  const ctx = makeCtx([asset], [h]);
  assert.match(ctx.assetCrossCheckWarning(asset), /Kepemilikan beda dgn holding Investasi yang ditautkan/);
});

test('assetCrossCheckWarning: fallback name-match arah balik — nama sama, owner beda, belum ditautkan resmi', () => {
  const asset = { id: 'asset_1', name: 'Schorder', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] };
  const h = { id: 'h1', name: 'Schorder', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] };
  const ctx = makeCtx([asset], [h]);
  assert.match(ctx.assetCrossCheckWarning(asset), /Nama sama dgn 1 holding Investasi, kepemilikan beda/);
});

test('assetCrossCheckWarning: owner sama (link resmi maupun name-match) -> null', () => {
  const asset = { id: 'asset_1', name: 'Schorder', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] };
  const h = { id: 'h1', name: 'Schorder', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] };
  const ctx = makeCtx([asset], [h]);
  assert.equal(ctx.assetCrossCheckWarning(asset), null);
});

// live read (bukan snapshot) — S552 murni referensi, TIDAK ada auto-repair/cascade
// delete: field h.assetId / a.owners TIDAK dimutasi oleh fungsi baca ini sendiri.
test('investmentCrossCheckWarning & assetCrossCheckWarning: TIDAK menulis field apa pun ke object holding/asset (read-only murni)', () => {
  const asset = { id: 'asset_1', name: 'Schorder', owners: [{ ownerId: 'renov', porsi: 100, isSelf: false }] };
  const h = { id: 'h1', name: 'Schorder', assetId: 'asset_1', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] };
  const ctx = makeCtx([asset], [h]);
  const beforeAsset = JSON.stringify(asset);
  const beforeH = JSON.stringify(h);
  ctx.investmentCrossCheckWarning(h);
  ctx.assetCrossCheckWarning(asset);
  ctx.resolveLinkedInvestmentAsset(h);
  ctx.resolveInvestmentByAssetId(asset.id);
  assert.equal(JSON.stringify(asset), beforeAsset);
  assert.equal(JSON.stringify(h), beforeH);
});
