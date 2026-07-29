'use strict';
// tests/vehicle-catalog-tx-link.test.js — cakupan
// modules/finance/vehicle-catalog-tx-link.js (Vehicle Catalog Tahap 7A:
// "Smart Transaction Foundation", jembatan murni logic D.transactions <->
// VehicleCatalog). D & VehicleCatalog di-mock langsung via extraGlobals,
// pola SAMA PERSIS tests/vehicle-catalog-servis-link.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Lihat catatan lengkap alasan `deq()` (JSON compare, aman lintas-realm vm)
// di tests/vehicle-catalog-servis-link.test.js.
function deq(actual, expected, message) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
}

function makeCtx({ transactions, catalogItems } = {}) {
  const D = { transactions: transactions || [] };
  const items = catalogItems || {};
  const VehicleCatalog = {
    calls: { getById: 0 },
    async getById(id) {
      this.calls.getById++;
      return items[id] || null;
    },
  };
  const ctx = loadSource(
    ['modules/finance/vehicle-catalog-tx-link.js'],
    { D, VehicleCatalog },
    ['VehicleCatalogTxLink']
  );
  return { ctx, D, VehicleCatalog };
}

// ------------------------------------------------------------------------
// Mekanisme 1: catalogPartRefs (array, multi-part)
// ------------------------------------------------------------------------

test('normalizeRefs — buang entri tanpa catalogId, default qty=1', () => {
  const { ctx } = makeCtx();
  const out = ctx.VehicleCatalogTxLink.normalizeRefs([
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
  deq(ctx.VehicleCatalogTxLink.normalizeRefs(null), []);
  deq(ctx.VehicleCatalogTxLink.normalizeRefs(undefined), []);
  deq(ctx.VehicleCatalogTxLink.normalizeRefs('x'), []);
});

test('normalizeRefs — catalogId angka diterima, dikonversi ke string', () => {
  const { ctx } = makeCtx();
  const out = ctx.VehicleCatalogTxLink.normalizeRefs([{ catalogId: 42, qty: 2 }]);
  deq(out, [{ catalogId: '42', qty: 2 }]);
});

test('getTxRefs — transaksi lama tanpa catalogPartRefs -> array kosong (backward compatible)', () => {
  const { ctx } = makeCtx({ transactions: [{ id: 't1', amount: 50000 }] });
  deq(ctx.VehicleCatalogTxLink.getTxRefs('t1'), []);
});

test('getTxRefs — txId tidak ditemukan -> array kosong', () => {
  const { ctx } = makeCtx({ transactions: [{ id: 't1' }] });
  deq(ctx.VehicleCatalogTxLink.getTxRefs('t-tidak-ada'), []);
});

test('getTxRefs — kembalikan salinan (bukan referensi asli array)', () => {
  const { ctx, D } = makeCtx({ transactions: [{ id: 't1', catalogPartRefs: [{ catalogId: 'p1', qty: 1 }] }] });
  const out = ctx.VehicleCatalogTxLink.getTxRefs('t1');
  out.push({ catalogId: 'injected', qty: 99 });
  assert.equal(D.transactions[0].catalogPartRefs.length, 1);
});

test('attachToTx — sukses, menulis catalogPartRefs ternormalisasi ke D.transactions', () => {
  const { ctx, D } = makeCtx({ transactions: [{ id: 't1', amount: 50000 }] });
  const res = ctx.VehicleCatalogTxLink.attachToTx('t1', [{ catalogId: 'p1', qty: 2 }]);
  assert.equal(res.success, true);
  deq(res.catalogPartRefs, [{ catalogId: 'p1', qty: 2 }]);
  deq(D.transactions[0].catalogPartRefs, [{ catalogId: 'p1', qty: 2 }]);
});

test('attachToTx — replace total (bukan merge) kalau dipanggil ulang', () => {
  const { ctx, D } = makeCtx({ transactions: [{ id: 't1', catalogPartRefs: [{ catalogId: 'old', qty: 1 }] }] });
  ctx.VehicleCatalogTxLink.attachToTx('t1', [{ catalogId: 'new', qty: 5 }]);
  deq(D.transactions[0].catalogPartRefs, [{ catalogId: 'new', qty: 5 }]);
});

test('attachToTx — txId tidak ditemukan -> gagal, tidak membuat entri baru', () => {
  const { ctx, D } = makeCtx({ transactions: [] });
  const res = ctx.VehicleCatalogTxLink.attachToTx('t-ghost', [{ catalogId: 'p1', qty: 1 }]);
  assert.equal(res.success, false);
  assert.ok(res.errors.length > 0);
  assert.equal(D.transactions.length, 0);
});

test('attachToTx — refs kosong/invalid semua -> catalogPartRefs jadi array kosong (bukan error)', () => {
  const { ctx, D } = makeCtx({ transactions: [{ id: 't1' }] });
  const res = ctx.VehicleCatalogTxLink.attachToTx('t1', []);
  assert.equal(res.success, true);
  deq(D.transactions[0].catalogPartRefs, []);
});

test('detachFromTx — lepas 1 catalogId, sisanya tetap ada', () => {
  const { ctx, D } = makeCtx({
    transactions: [{ id: 't1', catalogPartRefs: [{ catalogId: 'p1', qty: 1 }, { catalogId: 'p2', qty: 3 }] }],
  });
  const res = ctx.VehicleCatalogTxLink.detachFromTx('t1', 'p1');
  assert.equal(res.success, true);
  deq(D.transactions[0].catalogPartRefs, [{ catalogId: 'p2', qty: 3 }]);
});

test('detachFromTx — catalogId tidak ada di daftar -> tetap success (idempotent)', () => {
  const { ctx, D } = makeCtx({ transactions: [{ id: 't1', catalogPartRefs: [{ catalogId: 'p1', qty: 1 }] }] });
  const res = ctx.VehicleCatalogTxLink.detachFromTx('t1', 'p-tidak-ada');
  assert.equal(res.success, true);
  deq(D.transactions[0].catalogPartRefs, [{ catalogId: 'p1', qty: 1 }]);
});

test('detachFromTx — txId tidak ditemukan -> gagal', () => {
  const { ctx } = makeCtx({ transactions: [] });
  const res = ctx.VehicleCatalogTxLink.detachFromTx('t-ghost', 'p1');
  assert.equal(res.success, false);
});

test('resolveTxParts — resolve live ke VehicleCatalog.getById(), qty ikut ref', async () => {
  const { ctx } = makeCtx({
    transactions: [{ id: 't1', catalogPartRefs: [{ catalogId: 'p1', qty: 2 }] }],
    catalogItems: { p1: { id: 'p1', partName: 'Kampas Rem', oemCode: 'AHM-123' } },
  });
  const rows = await ctx.VehicleCatalogTxLink.resolveTxParts('t1');
  deq(rows, [{ catalogId: 'p1', qty: 2, item: { id: 'p1', partName: 'Kampas Rem', oemCode: 'AHM-123' } }]);
});

test('resolveTxParts — part sudah dihapus dari katalog -> item:null, TIDAK error, ref tetap dilaporkan', async () => {
  const { ctx } = makeCtx({
    transactions: [{ id: 't1', catalogPartRefs: [{ catalogId: 'p-deleted', qty: 1 }] }],
    catalogItems: {},
  });
  const rows = await ctx.VehicleCatalogTxLink.resolveTxParts('t1');
  deq(rows, [{ catalogId: 'p-deleted', qty: 1, item: null }]);
});

test('resolveTxParts — tidak ada ref -> array kosong, VehicleCatalog.getById tidak dipanggil', async () => {
  const { ctx, VehicleCatalog } = makeCtx({ transactions: [{ id: 't1' }] });
  const rows = await ctx.VehicleCatalogTxLink.resolveTxParts('t1');
  deq(rows, []);
  assert.equal(VehicleCatalog.calls.getById, 0);
});

test('resolveTxParts — VehicleCatalog belum dimuat (guard typeof) -> item:null, tidak melempar error', async () => {
  const D = { transactions: [{ id: 't1', catalogPartRefs: [{ catalogId: 'p1', qty: 1 }] }] };
  const ctx = loadSource(
    ['modules/finance/vehicle-catalog-tx-link.js'],
    { D },
    ['VehicleCatalogTxLink']
  );
  const rows = await ctx.VehicleCatalogTxLink.resolveTxParts('t1');
  deq(rows, [{ catalogId: 'p1', qty: 1, item: null }]);
});

// ------------------------------------------------------------------------
// Mekanisme 2: snapshot flat (catalogPartId/catalogPartName/
// catalogPartOemCode/catalogPartQty)
// ------------------------------------------------------------------------

test('buildSnapshot — item valid + qty -> 4 field terisi', () => {
  const { ctx } = makeCtx();
  const snap = ctx.VehicleCatalogTxLink.buildSnapshot({ id: 'p1', partName: 'Kampas Rem', oemCode: 'AHM-123' }, 3);
  deq(snap, { catalogPartId: 'p1', catalogPartName: 'Kampas Rem', catalogPartOemCode: 'AHM-123', catalogPartQty: 3 });
});

test('buildSnapshot — qty tidak valid/kosong -> default 1', () => {
  const { ctx } = makeCtx();
  deq(
    ctx.VehicleCatalogTxLink.buildSnapshot({ id: 'p1', partName: 'X', oemCode: '' }, 'bukan angka'),
    { catalogPartId: 'p1', catalogPartName: 'X', catalogPartOemCode: '', catalogPartQty: 1 }
  );
  deq(
    ctx.VehicleCatalogTxLink.buildSnapshot({ id: 'p1', partName: 'X', oemCode: '' }, -5),
    { catalogPartId: 'p1', catalogPartName: 'X', catalogPartOemCode: '', catalogPartQty: 1 }
  );
});

test('buildSnapshot — item null/tanpa id -> snapshot kosong (bukan error)', () => {
  const { ctx } = makeCtx();
  const empty = { catalogPartId: null, catalogPartName: '', catalogPartOemCode: '', catalogPartQty: 0 };
  deq(ctx.VehicleCatalogTxLink.buildSnapshot(null, 5), empty);
  deq(ctx.VehicleCatalogTxLink.buildSnapshot({}, 5), empty);
});

test('getSnapshot — transaksi lama tanpa field snapshot -> kosong (backward compatible)', () => {
  const { ctx } = makeCtx({ transactions: [{ id: 't1', amount: 10000 }] });
  deq(ctx.VehicleCatalogTxLink.getSnapshot('t1'), {
    catalogPartId: null, catalogPartName: '', catalogPartOemCode: '', catalogPartQty: 0,
  });
});

test('getSnapshot — txId tidak ditemukan -> kosong', () => {
  const { ctx } = makeCtx({ transactions: [] });
  deq(ctx.VehicleCatalogTxLink.getSnapshot('t-ghost'), {
    catalogPartId: null, catalogPartName: '', catalogPartOemCode: '', catalogPartQty: 0,
  });
});

test('getSnapshot — baca field flat apa adanya dari D.transactions', () => {
  const { ctx } = makeCtx({
    transactions: [{ id: 't1', catalogPartId: 'p1', catalogPartName: 'Kampas Rem', catalogPartOemCode: 'AHM-123', catalogPartQty: 2 }],
  });
  deq(ctx.VehicleCatalogTxLink.getSnapshot('t1'), {
    catalogPartId: 'p1', catalogPartName: 'Kampas Rem', catalogPartOemCode: 'AHM-123', catalogPartQty: 2,
  });
});

test('attachSnapshotToTx — sukses, resolve VehicleCatalog.getById() lalu tulis 4 field flat', async () => {
  const { ctx, D, VehicleCatalog } = makeCtx({
    transactions: [{ id: 't1', amount: 50000 }],
    catalogItems: { p1: { id: 'p1', partName: 'Kampas Rem', oemCode: 'AHM-123' } },
  });
  const res = await ctx.VehicleCatalogTxLink.attachSnapshotToTx('t1', 'p1', 2);
  assert.equal(res.success, true);
  deq(res.snapshot, { catalogPartId: 'p1', catalogPartName: 'Kampas Rem', catalogPartOemCode: 'AHM-123', catalogPartQty: 2 });
  assert.equal(D.transactions[0].catalogPartId, 'p1');
  assert.equal(D.transactions[0].catalogPartName, 'Kampas Rem');
  assert.equal(D.transactions[0].catalogPartOemCode, 'AHM-123');
  assert.equal(D.transactions[0].catalogPartQty, 2);
  assert.equal(D.transactions[0].amount, 50000, 'field lain transaksi tidak ikut berubah');
  assert.equal(VehicleCatalog.calls.getById, 1);
});

test('attachSnapshotToTx — catalogId kosong/falsy -> snapshot dikosongkan, tidak memanggil VehicleCatalog', async () => {
  const { ctx, D, VehicleCatalog } = makeCtx({
    transactions: [{ id: 't1', catalogPartId: 'old', catalogPartName: 'Old', catalogPartOemCode: 'X', catalogPartQty: 1 }],
  });
  const res = await ctx.VehicleCatalogTxLink.attachSnapshotToTx('t1', '', 5);
  assert.equal(res.success, true);
  deq(res.snapshot, { catalogPartId: null, catalogPartName: '', catalogPartOemCode: '', catalogPartQty: 0 });
  assert.equal(D.transactions[0].catalogPartId, null);
  assert.equal(VehicleCatalog.calls.getById, 0);
});

test('attachSnapshotToTx — catalogId diisi tapi part tidak ada di katalog -> gagal, tidak menulis snapshot palsu', async () => {
  const { ctx, D } = makeCtx({ transactions: [{ id: 't1', amount: 1000 }], catalogItems: {} });
  const res = await ctx.VehicleCatalogTxLink.attachSnapshotToTx('t1', 'p-tidak-ada', 1);
  assert.equal(res.success, false);
  assert.ok(res.errors.length > 0);
  assert.equal(D.transactions[0].catalogPartId, undefined);
});

test('attachSnapshotToTx — txId tidak ditemukan -> gagal', async () => {
  const { ctx } = makeCtx({ transactions: [] });
  const res = await ctx.VehicleCatalogTxLink.attachSnapshotToTx('t-ghost', 'p1', 1);
  assert.equal(res.success, false);
});

test('clearSnapshot — mengosongkan 4 field flat, field lain tidak disentuh', () => {
  const { ctx, D } = makeCtx({
    transactions: [{ id: 't1', amount: 20000, catalogPartId: 'p1', catalogPartName: 'X', catalogPartOemCode: 'Y', catalogPartQty: 3 }],
  });
  const res = ctx.VehicleCatalogTxLink.clearSnapshot('t1');
  assert.equal(res.success, true);
  deq(D.transactions[0].catalogPartId, null);
  assert.equal(D.transactions[0].catalogPartName, '');
  assert.equal(D.transactions[0].catalogPartOemCode, '');
  assert.equal(D.transactions[0].catalogPartQty, 0);
  assert.equal(D.transactions[0].amount, 20000);
});

test('clearSnapshot — txId tidak ditemukan -> gagal', () => {
  const { ctx } = makeCtx({ transactions: [] });
  const res = ctx.VehicleCatalogTxLink.clearSnapshot('t-ghost');
  assert.equal(res.success, false);
});

// ------------------------------------------------------------------------
// D.transactions tidak tersedia (guard)
// ------------------------------------------------------------------------
test('D.transactions tidak tersedia -> semua fungsi baca/tulis gagal aman, tidak melempar error', async () => {
  const ctx = loadSource(
    ['modules/finance/vehicle-catalog-tx-link.js'],
    { D: {} },
    ['VehicleCatalogTxLink']
  );
  deq(ctx.VehicleCatalogTxLink.getTxRefs('t1'), []);
  assert.equal(ctx.VehicleCatalogTxLink.attachToTx('t1', []).success, false);
  assert.equal(ctx.VehicleCatalogTxLink.detachFromTx('t1', 'p1').success, false);
  deq(ctx.VehicleCatalogTxLink.getSnapshot('t1'), { catalogPartId: null, catalogPartName: '', catalogPartOemCode: '', catalogPartQty: 0 });
  assert.equal((await ctx.VehicleCatalogTxLink.attachSnapshotToTx('t1', 'p1', 1)).success, false);
  assert.equal(ctx.VehicleCatalogTxLink.clearSnapshot('t1').success, false);
});
