'use strict';
/**
 * s-audit-backup-partsstock-vehicleid-backfill-migration.test.js —
 * DATA_MIGRATIONS toVersion:9 (features-helpers-global-security.js): backfill
 * D.partsStock[].vehicleId yang kosong (part hasil scan Katalog Suku Cadang
 * dari SEBELUM audit SOT vehicleId), berdasarkan
 * d._vehicleCatalogStore.items[catalogId].compatibleVehicleIds -- HANYA
 * kalau persis 1 vehicle cocok. Data _vehicleCatalogStore cuma tersedia di
 * jalur restore JSON (lihat backup-restore.js applyRestoredData()).
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

test('DATA_MIGRATIONS toVersion:9 — backfill vehicleId kalau catalogId cocok ke 1 vehicle', () => {
  const ctx = makeCtx();
  ctx.D.schemaVersion = 8;
  ctx.D.partsStock = [
    { id: 'st_1', catalogId: 'cat_1' },
    { id: 'st_2', catalogId: 'cat_2', vehicleId: 'veh_sudah_ada' },
    { id: 'st_3', catalogId: 'cat_ambigu' },
    { id: 'st_4', catalogId: 'cat_tidak_dikenal' },
    { id: 'st_5' },
  ];
  ctx.D._vehicleCatalogStore = {
    items: [
      { id: 'cat_1', compatibleVehicleIds: ['veh_1'] },
      { id: 'cat_2', compatibleVehicleIds: ['veh_2'] },
      { id: 'cat_ambigu', compatibleVehicleIds: ['veh_1', 'veh_2'] },
    ],
  };
  ctx.runDataMigrations(8);
  assert.equal(ctx.D.schemaVersion, ctx.SCHEMA_VERSION);
  assert.equal(ctx.D.partsStock[0].vehicleId, 'veh_1', 'catalogId cocok ke 1 vehicle -> terisi');
  assert.equal(ctx.D.partsStock[1].vehicleId, 'veh_sudah_ada', 'vehicleId yang sudah ada TIDAK ditimpa');
  assert.equal(ctx.D.partsStock[2].vehicleId, undefined, 'ambigu (>1 compatibleVehicleIds) -> dilewati, tidak ditebak');
  assert.equal(ctx.D.partsStock[3].vehicleId, undefined, 'catalogId tidak ketemu di catalog store -> dilewati');
  assert.equal(ctx.D.partsStock[4].vehicleId, undefined, 'tanpa catalogId -> dilewati');
});

test('DATA_MIGRATIONS toVersion:9 — d._vehicleCatalogStore tidak ada (jalur startup normal) -> no-op, tidak error', () => {
  const ctx = makeCtx();
  ctx.D.schemaVersion = 8;
  ctx.D.partsStock = [{ id: 'st_1', catalogId: 'cat_1' }];
  assert.doesNotThrow(() => ctx.runDataMigrations(8));
  assert.equal(ctx.D.partsStock[0].vehicleId, undefined);
  assert.equal(ctx.D.schemaVersion, ctx.SCHEMA_VERSION);
});

test('DATA_MIGRATIONS toVersion:9 — D.partsStock kosong -> tidak error', () => {
  const ctx = makeCtx();
  ctx.D.schemaVersion = 8;
  ctx.D.partsStock = [];
  ctx.D._vehicleCatalogStore = { items: [{ id: 'cat_1', compatibleVehicleIds: ['veh_1'] }] };
  assert.doesNotThrow(() => ctx.runDataMigrations(8));
});
