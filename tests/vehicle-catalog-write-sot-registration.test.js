'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const build = fs.readFileSync(path.join(root, 'scripts', 'build.js'), 'utf8');
const lazyLoader = fs.readFileSync(path.join(root, 'modules', 'shared', 'feature-lazy-loader.js'), 'utf8');

test('VehicleCatalogWriteSOT terdaftar sebelum semua consumer canonical write', () => {
  const gate = build.indexOf("'modules/vehicle/vehicle-catalog-write-sot.js'");
  assert.ok(gate >= 0, 'Write SOT harus terdaftar di build');
  // vehicle-catalog-import.js is intentionally lazy-loaded since S2253.
  // It therefore must be registered in feature-lazy-loader.js, not in the
  // eager build list. The Write SOT remains eager and must precede the
  // eager consumers that still depend on it at startup.
  const lazyImport = "'modules/vehicle/vehicle-catalog-import.js'";
  assert.ok(lazyLoader.includes(lazyImport), `${lazyImport} harus terdaftar di feature-lazy-loader`);

  const eagerConsumer = "'modules/vehicle/sparepart-servis-ui.js'";
  const eagerPos = build.indexOf(eagerConsumer);
  assert.ok(eagerPos >= 0, `${eagerConsumer} harus terdaftar di build`);
  assert.ok(gate < eagerPos, `Write SOT harus dimuat sebelum ${eagerConsumer}`);
});
