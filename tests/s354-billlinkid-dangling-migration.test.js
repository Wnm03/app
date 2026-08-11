'use strict';
/**
 * s354-billlinkid-dangling-migration.test.js — DATA_MIGRATIONS toVersion:5
 * (features-helpers-global-security.js): sebelum fix s353, delBillArchive()
 * menghapus record arsip TANPA melepas billLinkId transaksi terkait --
 * transaksi lama bisa nyangkut billLinkId yang tidak lagi cocok dgn D.bills
 * maupun D.billsArchive manapun. Migrasi ini one-time cleanup: lepas
 * billLinkId dangling, transaksinya sendiri TIDAK dihapus.
 *
 * Pola sandbox sama persis tests/torsi-vehicle-api-s1.test.js (load file
 * migrasi ASLI, bukan stub, lalu jalankan runDataMigrations() beneran).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(
    ['modules/shared/features-helpers-global-security.js'],
    {
      DEFAULT_COBEK_KATEGORI: [], DEFAULT_CATS: { income: [], expense: [] }, DEFAULT_ACCOUNTS: [], DEFAULT_SPAREPARTS: [],
      uid: (() => { let n = 0; return () => 'uid_' + (n++); })(),
    },
    ['SCHEMA_VERSION', 'D'],
  );
}

test('DATA_MIGRATIONS toVersion:5 — lepas billLinkId dangling (tidak match D.bills maupun D.billsArchive), transaksi TIDAK dihapus', () => {
  const ctx = makeCtx();
  ctx.D.schemaVersion = 4;
  ctx.D.bills = [{ id: 'b_active' }];
  ctx.D.billsArchive = [{ id: 'b_archived' }];
  ctx.D.transactions = [
    { id: 1, billLinkId: 'b_active', amount: 100 },
    { id: 2, billLinkId: 'b_archived', amount: 200 },
    { id: 3, billLinkId: 'b_deleted_long_ago', amount: 300 },
    { id: 4, amount: 400 },
  ];
  ctx.runDataMigrations(4);
  assert.equal(ctx.D.schemaVersion, ctx.SCHEMA_VERSION, 'schemaVersion harus naik ke SCHEMA_VERSION terbaru (5)');
  assert.equal(ctx.D.transactions.length, 4, 'tidak ada transaksi yang dihapus');
  assert.equal(ctx.D.transactions[0].billLinkId, 'b_active', 'billLinkId ke bill aktif tidak disentuh');
  assert.equal(ctx.D.transactions[1].billLinkId, 'b_archived', 'billLinkId ke arsip yang masih ada tidak disentuh');
  assert.equal(ctx.D.transactions[2].billLinkId, undefined, 'billLinkId dangling dilepas');
  assert.equal(ctx.D.transactions[3].billLinkId, undefined, 'transaksi tanpa billLinkId tetap tidak punya billLinkId');
});

test('DATA_MIGRATIONS toVersion:5 — D.transactions kosong/tidak ada -> tidak error', () => {
  const ctx = makeCtx();
  ctx.D.schemaVersion = 4;
  ctx.D.bills = [];
  ctx.D.billsArchive = [];
  ctx.D.transactions = [];
  assert.doesNotThrow(() => ctx.runDataMigrations(4));
  assert.equal(ctx.D.schemaVersion, ctx.SCHEMA_VERSION);
});
