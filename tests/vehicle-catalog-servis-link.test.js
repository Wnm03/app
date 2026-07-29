'use strict';
// tests/vehicle-catalog-servis-link.test.js — cakupan
// modules/vehicle/vehicle-catalog-servis-link.js (Vehicle Catalog Tahap 6,
// Sesi 1/3: jembatan murni logic D.servisLogs <-> VehicleCatalog). D &
// VehicleCatalog di-mock langsung via extraGlobals (pola sama test lain
// yang inject dependency ringan daripada me-load seluruh file aslinya).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Objek/array yang dikembalikan dari kode yang jalan di dalam vm sandbox
// punya Object/Array prototype dari REALM vm itu sendiri (beda identity
// dari Object/Array di realm test ini walau sama-sama diinject sebagai
// property "Array"/"Object" ke sandbox — literal `{}`/`[]` di dalam vm
// tetap memakai intrinsic realm vm). `assert.deepEqual`/`deepStrictEqual`
// Node modern membandingkan sampai ke prototype, jadi gagal walau isinya
// identik. `deq()` membandingkan lewat JSON (aman lintas-realm, cukup utk
// data serializable seperti di sini — pola sama alasan `Array.from()`
// dipakai di tests/vehicle-catalog.test.js utk kasus array primitif).
function deq(actual, expected, message) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
}

function makeCtx({ servisLogs, catalogItems } = {}) {
  const D = { servisLogs: servisLogs || [] };
  const items = catalogItems || {};
  const VehicleCatalog = {
    calls: { getById: 0 },
    async getById(id) {
      this.calls.getById++;
      return items[id] || null;
    },
  };
  const ctx = loadSource(
    ['modules/vehicle/vehicle-catalog-servis-link.js'],
    { D, VehicleCatalog },
    ['VehicleCatalogServisLink']
  );
  return { ctx, D, VehicleCatalog };
}

// ------------------------------------------------------------------------
// normalizeRefs
// ------------------------------------------------------------------------
test('normalizeRefs — buang entri tanpa catalogId, default qty=1', () => {
  const { ctx } = makeCtx();
  const out = ctx.VehicleCatalogServisLink.normalizeRefs([
    { catalogId: 'p1', qty: 3 },
    { catalogId: '', qty: 2 },
    { qty: 5 },
    { catalogId: 'p2' },
    { catalogId: 'p3', qty: -4 },
    { catalogId: 'p4', qty: 'bukan angka' },
  ]);
  deq(out, [
    { catalogId: 'p1', qty: 3 },
    { catalogId: 'p2', qty: 1 },
    { catalogId: 'p3', qty: 1 },
    { catalogId: 'p4', qty: 1 },
  ]);
});

test('normalizeRefs — bukan array -> array kosong', () => {
  const { ctx } = makeCtx();
  deq(ctx.VehicleCatalogServisLink.normalizeRefs(null), []);
  deq(ctx.VehicleCatalogServisLink.normalizeRefs(undefined), []);
  deq(ctx.VehicleCatalogServisLink.normalizeRefs('x'), []);
});

test('normalizeRefs — catalogId angka diterima, dikonversi ke string', () => {
  const { ctx } = makeCtx();
  const out = ctx.VehicleCatalogServisLink.normalizeRefs([{ catalogId: 42, qty: 2 }]);
  deq(out, [{ catalogId: '42', qty: 2 }]);
});

// ------------------------------------------------------------------------
// getServisRefs
// ------------------------------------------------------------------------
test('getServisRefs — entri servis lama tanpa catalogPartRefs -> array kosong (backward compatible)', () => {
  const { ctx } = makeCtx({ servisLogs: [{ id: 's1', item: 'Ganti Oli' }] });
  deq(ctx.VehicleCatalogServisLink.getServisRefs('s1'), []);
});

test('getServisRefs — servisId tidak ditemukan -> array kosong', () => {
  const { ctx } = makeCtx({ servisLogs: [{ id: 's1' }] });
  deq(ctx.VehicleCatalogServisLink.getServisRefs('s-tidak-ada'), []);
});

test('getServisRefs — kembalikan salinan (bukan referensi asli array)', () => {
  const { ctx, D } = makeCtx({ servisLogs: [{ id: 's1', catalogPartRefs: [{ catalogId: 'p1', qty: 1 }] }] });
  const out = ctx.VehicleCatalogServisLink.getServisRefs('s1');
  out.push({ catalogId: 'injected', qty: 99 });
  assert.equal(D.servisLogs[0].catalogPartRefs.length, 1);
});

// ------------------------------------------------------------------------
// attachToServis
// ------------------------------------------------------------------------
test('attachToServis — sukses, menulis catalogPartRefs ternormalisasi ke D.servisLogs', () => {
  const { ctx, D } = makeCtx({ servisLogs: [{ id: 's1', item: 'Ganti Oli' }] });
  const res = ctx.VehicleCatalogServisLink.attachToServis('s1', [{ catalogId: 'p1', qty: 2 }]);
  assert.equal(res.success, true);
  deq(res.catalogPartRefs, [{ catalogId: 'p1', qty: 2 }]);
  deq(D.servisLogs[0].catalogPartRefs, [{ catalogId: 'p1', qty: 2 }]);
});

test('attachToServis — replace total (bukan merge) kalau dipanggil ulang', () => {
  const { ctx, D } = makeCtx({ servisLogs: [{ id: 's1', catalogPartRefs: [{ catalogId: 'old', qty: 1 }] }] });
  ctx.VehicleCatalogServisLink.attachToServis('s1', [{ catalogId: 'new', qty: 5 }]);
  deq(D.servisLogs[0].catalogPartRefs, [{ catalogId: 'new', qty: 5 }]);
});

test('attachToServis — servisId tidak ditemukan -> gagal, tidak membuat entri baru', () => {
  const { ctx, D } = makeCtx({ servisLogs: [] });
  const res = ctx.VehicleCatalogServisLink.attachToServis('s-ghost', [{ catalogId: 'p1', qty: 1 }]);
  assert.equal(res.success, false);
  assert.ok(res.errors.length > 0);
  assert.equal(D.servisLogs.length, 0);
});

test('attachToServis — refs kosong/invalid semua -> catalogPartRefs jadi array kosong (bukan error)', () => {
  const { ctx, D } = makeCtx({ servisLogs: [{ id: 's1' }] });
  const res = ctx.VehicleCatalogServisLink.attachToServis('s1', []);
  assert.equal(res.success, true);
  deq(D.servisLogs[0].catalogPartRefs, []);
});

// ------------------------------------------------------------------------
// detachFromServis
// ------------------------------------------------------------------------
test('detachFromServis — lepas 1 catalogId, sisanya tetap ada', () => {
  const { ctx, D } = makeCtx({
    servisLogs: [{ id: 's1', catalogPartRefs: [{ catalogId: 'p1', qty: 1 }, { catalogId: 'p2', qty: 3 }] }],
  });
  const res = ctx.VehicleCatalogServisLink.detachFromServis('s1', 'p1');
  assert.equal(res.success, true);
  deq(D.servisLogs[0].catalogPartRefs, [{ catalogId: 'p2', qty: 3 }]);
});

test('detachFromServis — catalogId tidak ada di daftar -> tetap success (idempotent)', () => {
  const { ctx, D } = makeCtx({ servisLogs: [{ id: 's1', catalogPartRefs: [{ catalogId: 'p1', qty: 1 }] }] });
  const res = ctx.VehicleCatalogServisLink.detachFromServis('s1', 'p-tidak-ada');
  assert.equal(res.success, true);
  deq(D.servisLogs[0].catalogPartRefs, [{ catalogId: 'p1', qty: 1 }]);
});

test('detachFromServis — servisId tidak ditemukan -> gagal', () => {
  const { ctx } = makeCtx({ servisLogs: [] });
  const res = ctx.VehicleCatalogServisLink.detachFromServis('s-ghost', 'p1');
  assert.equal(res.success, false);
});

// ------------------------------------------------------------------------
// resolveServisParts
// ------------------------------------------------------------------------
test('resolveServisParts — resolve live ke VehicleCatalog.getById(), qty ikut ref', async () => {
  const { ctx } = makeCtx({
    servisLogs: [{ id: 's1', catalogPartRefs: [{ catalogId: 'p1', qty: 2 }] }],
    catalogItems: { p1: { id: 'p1', partName: 'Kampas Rem', oemCode: 'AHM-123' } },
  });
  const rows = await ctx.VehicleCatalogServisLink.resolveServisParts('s1');
  deq(rows, [{ catalogId: 'p1', qty: 2, item: { id: 'p1', partName: 'Kampas Rem', oemCode: 'AHM-123' } }]);
});

test('resolveServisParts — part sudah dihapus dari katalog -> item:null, TIDAK error, ref tetap dilaporkan', async () => {
  const { ctx } = makeCtx({
    servisLogs: [{ id: 's1', catalogPartRefs: [{ catalogId: 'p-deleted', qty: 1 }] }],
    catalogItems: {},
  });
  const rows = await ctx.VehicleCatalogServisLink.resolveServisParts('s1');
  deq(rows, [{ catalogId: 'p-deleted', qty: 1, item: null }]);
});

test('resolveServisParts — tidak ada ref -> array kosong, VehicleCatalog.getById tidak dipanggil', async () => {
  const { ctx, VehicleCatalog } = makeCtx({ servisLogs: [{ id: 's1' }] });
  const rows = await ctx.VehicleCatalogServisLink.resolveServisParts('s1');
  deq(rows, []);
  assert.equal(VehicleCatalog.calls.getById, 0);
});

test('resolveServisParts — VehicleCatalog belum dimuat (guard typeof) -> item:null, tidak melempar error', async () => {
  const D = { servisLogs: [{ id: 's1', catalogPartRefs: [{ catalogId: 'p1', qty: 1 }] }] };
  const ctx = loadSource(
    ['modules/vehicle/vehicle-catalog-servis-link.js'],
    { D },
    ['VehicleCatalogServisLink']
  );
  const rows = await ctx.VehicleCatalogServisLink.resolveServisParts('s1');
  deq(rows, [{ catalogId: 'p1', qty: 1, item: null }]);
});

// ------------------------------------------------------------------------
// D.servisLogs tidak tersedia (guard)
// ------------------------------------------------------------------------
test('D.servisLogs tidak tersedia -> semua fungsi baca/tulis gagal aman, tidak melempar error', () => {
  const ctx = loadSource(
    ['modules/vehicle/vehicle-catalog-servis-link.js'],
    { D: {} },
    ['VehicleCatalogServisLink']
  );
  deq(ctx.VehicleCatalogServisLink.getServisRefs('s1'), []);
  assert.equal(ctx.VehicleCatalogServisLink.attachToServis('s1', []).success, false);
  assert.equal(ctx.VehicleCatalogServisLink.detachFromServis('s1', 'p1').success, false);
});
