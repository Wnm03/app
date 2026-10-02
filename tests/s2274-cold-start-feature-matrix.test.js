'use strict';
// S2274 — cold-start feature matrix.
// This test deliberately starts each lazy loader with a fresh VM context where
// no feature script has been loaded. It verifies demand-load order, promise
// deduplication, and retry-after-failure for every current lazy feature.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const LOADER_FILE = 'modules/shared/feature-lazy-loader.js';

function freshLoader(loadImpl) {
  return loadSource([LOADER_FILE], { _loadScriptOnce: loadImpl }, [
    'VEHICLE_CATALOG_FEATURE_SCRIPTS',
    'HONDA_PDF_FEATURE_SCRIPTS',
    'DATA_HEALTH_FEATURE_SCRIPTS',
    'LAPORAN_EXPORT_FEATURE_SCRIPTS',
    'SHOP_PDF_IMPORT_FEATURE_SCRIPTS',
    'ensureVehicleCatalogFeatureScripts',
    'ensureHondaPdfImportScripts',
    'ensureDataHealthScripts',
    'ensureLaporanExportScripts',
    'ensureShopPdfImportScripts',
  ]);
}

const MATRIX = [
  ['Vehicle Catalog / Scanner', 'ensureVehicleCatalogFeatureScripts', 'VEHICLE_CATALOG_FEATURE_SCRIPTS'],
  ['Honda PDF', 'ensureHondaPdfImportScripts', 'HONDA_PDF_FEATURE_SCRIPTS'],
  ['Data Health', 'ensureDataHealthScripts', 'DATA_HEALTH_FEATURE_SCRIPTS'],
  ['Laporan Export', 'ensureLaporanExportScripts', 'LAPORAN_EXPORT_FEATURE_SCRIPTS'],
  ['Shop PDF', 'ensureShopPdfImportScripts', 'SHOP_PDF_IMPORT_FEATURE_SCRIPTS'],
];

for (const [name, loaderName, listName] of MATRIX) {
  test(`S2274 cold-start: ${name} loads its complete dependency list`, async () => {
    const calls = [];
    const ctx = freshLoader(async (src) => { calls.push(src); });
    await ctx[loaderName]();
    const expected = ['ensureHondaPdfImportScripts', 'ensureShopPdfImportScripts'].includes(loaderName)
      ? [...Array.from(ctx.VEHICLE_CATALOG_FEATURE_SCRIPTS), ...Array.from(ctx[listName])]
      : Array.from(ctx[listName]);
    assert.deepEqual(calls, expected, `${name}: load order harus sama dengan manifest/dependency`);
    assert.ok(calls.length > 0, `${name}: cold-start harus benar-benar memuat script`);
  });

  test(`S2274 cold-start: ${name} deduplicates concurrent demand loads`, async () => {
    const calls = [];
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const ctx = freshLoader(async (src) => {
      calls.push(src);
      await gate;
    });
    const p1 = ctx[loaderName]();
    const p2 = ctx[loaderName]();
    assert.strictEqual(p1, p2, `${name}: concurrent calls harus berbagi promise yang sama`);
    release();
    await Promise.all([p1, p2]);
    const expected = ['ensureHondaPdfImportScripts', 'ensureShopPdfImportScripts'].includes(loaderName)
      ? [...Array.from(ctx.VEHICLE_CATALOG_FEATURE_SCRIPTS), ...Array.from(ctx[listName])]
      : Array.from(ctx[listName]);
    assert.deepEqual(calls, expected);
  });

  test(`S2274 cold-start: ${name} permits retry after loader failure`, async () => {
    const calls = [];
    let attempt = 0;
    const ctx = freshLoader(async (src) => {
      calls.push(src);
      attempt += 1;
      if (attempt === 1) throw new Error('synthetic cold-start load failure');
    });
    await assert.rejects(ctx[loaderName](), /synthetic cold-start load failure/);
    await ctx[loaderName]();
    const expected = ['ensureHondaPdfImportScripts', 'ensureShopPdfImportScripts'].includes(loaderName)
      ? [...Array.from(ctx.VEHICLE_CATALOG_FEATURE_SCRIPTS), ...Array.from(ctx[listName])]
      : Array.from(ctx[listName]);
    assert.ok(calls.length > expected.length, `${name}: retry harus melakukan load ulang setelah failure`);
    assert.deepEqual(calls.slice(-expected.length), expected);
  });
}

test('S2274 cold-start: Honda PDF and Shop PDF preserve Vehicle Catalog dependency first', async () => {
  for (const loaderName of ['ensureHondaPdfImportScripts', 'ensureShopPdfImportScripts']) {
    const calls = [];
    const ctx = freshLoader(async (src) => { calls.push(src); });
    await ctx[loaderName]();
    const vehicle = Array.from(ctx.VEHICLE_CATALOG_FEATURE_SCRIPTS);
    const lastVehicle = calls.lastIndexOf(vehicle[vehicle.length - 1]);
    const firstDependent = calls.findIndex(src => src !== vehicle[0] && !vehicle.includes(src));
    assert.ok(lastVehicle >= 0, `${loaderName}: Vehicle Catalog dependency harus dimuat`);
    assert.ok(firstDependent > lastVehicle, `${loaderName}: dependency Vehicle Catalog harus selesai sebelum feature turunan`);
  }
});
