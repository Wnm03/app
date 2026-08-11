'use strict';
// tests/asset-ownership-split-presenter.test.js — cakupan Sesi 391:
// modules/asset/asset-ownership-split-presenter.js. PRESENTER ONLY — 100%
// reuse MultiOwnerEngine (S390) + field `keuntungan` existing dari
// aset.js, TIDAK ada rumus untung baru. Dites lewat sandbox loadSource +
// D mock (pola sama tests/ownership-settings-presenter.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign({ assets: [] }, extra);
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/asset/asset-ownership-split-presenter.js'],
    { D },
    ['AssetOwnershipSplitPresenter', 'MultiOwnerEngine']
  );
}

function makeCtxNoEngine(D) {
  return loadSource(['modules/asset/asset-ownership-split-presenter.js'], { D }, ['AssetOwnershipSplitPresenter']);
}

// --- splitFor() --------------------------------------------------------

test('splitFor() — aset single-owner (default), keuntungan utuh ke 1 pemilik', () => {
  const ctx = makeCtx(baseD());
  const r = ctx.AssetOwnershipSplitPresenter.splitFor({ id: 'a1', name: 'Rumah', keuntungan: 1000 });
  assert.equal(r.ok, true);
  assert.equal(r.isMultiOwner, false);
  assert.equal(r.splits.length, 1);
  assert.equal(r.splits[0].bagian, 1000);
});

test('splitFor() — aset multi-owner, split proporsional sesuai porsi', () => {
  const ctx = makeCtx(baseD());
  const asset = { id: 'a1', name: 'Ruko', keuntungan: 10000000, owners: [{ ownerId: 'ayah', porsi: 60 }, { ownerId: 'budi', porsi: 40 }] };
  const r = ctx.AssetOwnershipSplitPresenter.splitFor(asset);
  assert.equal(r.ok, true);
  assert.equal(r.isMultiOwner, true);
  assert.equal(r.splits[0].bagian, 6000000);
  assert.equal(r.splits[1].bagian, 4000000);
});

test('splitFor() — keuntungan null (mis. aset non-investasi) -> bagian null per pemilik, bukan error', () => {
  const ctx = makeCtx(baseD());
  const r = ctx.AssetOwnershipSplitPresenter.splitFor({ id: 'a1', name: 'Motor', keuntungan: null, owners: [{ ownerId: 'a', porsi: 50 }, { ownerId: 'b', porsi: 50 }] });
  assert.equal(r.ok, true);
  assert.equal(r.splits[0].bagian, null);
  assert.equal(r.splits[1].bagian, null);
});

test('splitFor() — asset bukan object -> reject', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.AssetOwnershipSplitPresenter.splitFor(null).ok, false);
});

test('splitFor() — MultiOwnerEngine belum dimuat -> reject aman (guard typeof)', () => {
  const ctx = makeCtxNoEngine(baseD());
  const r = ctx.AssetOwnershipSplitPresenter.splitFor({ id: 'a1', keuntungan: 100 });
  assert.equal(r.ok, false);
});

// --- summary() -----------------------------------------------------------

test('summary() — aset single-owner TIDAK ikut (bukan info baru)', () => {
  const ctx = makeCtx(baseD({ assets: [{ id: 'a1', name: 'Tanah', keuntungan: 500 }] }));
  const s = ctx.AssetOwnershipSplitPresenter.summary();
  assert.equal(s.ok, true);
  assert.equal(s.items.length, 0);
});

test('summary() — aset multi-owner dgn keuntungan ikut, split terlampir', () => {
  const asset = { id: 'a1', name: 'Ruko', keuntungan: 1000, owners: [{ ownerId: 'a', porsi: 70 }, { ownerId: 'b', porsi: 30 }] };
  const ctx = makeCtx(baseD({ assets: [asset] }));
  const s = ctx.AssetOwnershipSplitPresenter.summary();
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0].assetId, 'a1');
  assert.equal(s.items[0].splits[0].bagian, 700);
});

test('summary() — aset multi-owner TANPA keuntungan (null) tidak ikut', () => {
  const asset = { id: 'a1', name: 'Motor', keuntungan: null, owners: [{ ownerId: 'a', porsi: 50 }, { ownerId: 'b', porsi: 50 }] };
  const ctx = makeCtx(baseD({ assets: [asset] }));
  assert.equal(ctx.AssetOwnershipSplitPresenter.summary().items.length, 0);
});

test('summary() — D belum ada / assets bukan array -> items kosong, tidak throw', () => {
  const ctx = makeCtx({});
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.AssetOwnershipSplitPresenter.summary())), { ok: true, items: [] });
});

// --- incompletePortions() -------------------------------------------------

test('incompletePortions() — aset tanpa field owners sama sekali -> tidak dianggap belum lengkap', () => {
  const ctx = makeCtx(baseD({ assets: [{ id: 'a1', name: 'Rumah' }] }));
  assert.equal(ctx.AssetOwnershipSplitPresenter.incompletePortions().items.length, 0);
});

test('incompletePortions() — owners diisi tapi total != 100 -> masuk daftar', () => {
  const ctx = makeCtx(baseD({ assets: [{ id: 'a1', name: 'Ruko', owners: [{ ownerId: 'a', porsi: 40 }] }] }));
  const r = ctx.AssetOwnershipSplitPresenter.incompletePortions();
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].assetId, 'a1');
  assert.equal(r.items[0].total, 40);
});

test('incompletePortions() — owners valid (total 100) -> tidak masuk daftar', () => {
  const ctx = makeCtx(baseD({ assets: [{ id: 'a1', owners: [{ ownerId: 'a', porsi: 100 }] }] }));
  assert.equal(ctx.AssetOwnershipSplitPresenter.incompletePortions().items.length, 0);
});
