'use strict';
/**
 * s-audit-backup-partsstock-id-dedup-migration.test.js — DATA_MIGRATIONS
 * toVersion:8 (features-helpers-global-security.js): temuan audit backup
 * user -- syncPartsStockFromCatalog() dulu bikin id partsStock/sparepartCats
 * lewat 'st_'/'sp_'+Date.now() MENTAH, jadi kalau dipanggil banyak kali dlm
 * loop sinkron (bulk-import katalog), banyak baris ke-generate di milidetik
 * sama & id-nya TABRAKAN. Bug generation-nya sudah diperbaiki di
 * tx-stok-sparepart.js (_genId()); migrasi ini one-time cleanup utk backup
 * LAMA yang sudah kena: baris pertama per id dipertahankan, duplikatnya
 * diberi id baru unik -- 0 baris dihapus.
 *
 * Pola sandbox sama persis tests/s354-billlinkid-dangling-migration.test.js
 * (load file migrasi ASLI, jalankan runDataMigrations() beneran).
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

test('DATA_MIGRATIONS toVersion:8 — id partsStock tabrakan diberi id baru unik, baris pertama per id tidak disentuh', () => {
  const ctx = makeCtx();
  ctx.D.schemaVersion = 7;
  ctx.D.partsStock = [
    { id: 'st_1000', name: 'Oli Mesin' },
    { id: 'st_1000', name: 'Filter Oli' },
    { id: 'st_1000', name: 'Busi' },
    { id: 'st_2000', name: 'Kampas Rem' },
    { id: 'st_3000', name: 'Aki' },
  ];
  ctx.runDataMigrations(7);
  assert.equal(ctx.D.schemaVersion, ctx.SCHEMA_VERSION, 'schemaVersion harus naik ke SCHEMA_VERSION terbaru (8)');
  assert.equal(ctx.D.partsStock.length, 5, 'tidak ada baris yang dihapus');
  const ids = ctx.D.partsStock.map((p) => p.id);
  assert.equal(new Set(ids).size, 5, 'semua id sekarang unik');
  assert.equal(ctx.D.partsStock[0].id, 'st_1000', 'baris pertama per id lama TIDAK disentuh');
  assert.equal(ctx.D.partsStock[0].name, 'Oli Mesin');
  assert.equal(ctx.D.partsStock[1].name, 'Filter Oli', 'baris duplikat ke-2 tetap di posisi & data yang sama, cuma id berubah');
  assert.equal(ctx.D.partsStock[2].name, 'Busi', 'baris duplikat ke-3 tetap di posisi & data yang sama, cuma id berubah');
  assert.equal(ctx.D.partsStock[3].id, 'st_2000', 'id yang sudah unik dari awal tidak disentuh');
  assert.equal(ctx.D.partsStock[4].id, 'st_3000', 'id yang sudah unik dari awal tidak disentuh');
});

test('DATA_MIGRATIONS toVersion:8 — D.partsStock kosong/tidak ada -> tidak error', () => {
  const ctx = makeCtx();
  ctx.D.schemaVersion = 7;
  ctx.D.partsStock = [];
  assert.doesNotThrow(() => ctx.runDataMigrations(7));
  assert.equal(ctx.D.schemaVersion, ctx.SCHEMA_VERSION);
});

test('DATA_MIGRATIONS toVersion:8 — semua id sudah unik -> tidak ada yang diubah', () => {
  const ctx = makeCtx();
  ctx.D.schemaVersion = 7;
  ctx.D.partsStock = [{ id: 'st_a' }, { id: 'st_b' }, { id: 'st_c' }];
  ctx.runDataMigrations(7);
  assert.deepEqual(ctx.D.partsStock.map((p) => p.id), ['st_a', 'st_b', 'st_c']);
});
