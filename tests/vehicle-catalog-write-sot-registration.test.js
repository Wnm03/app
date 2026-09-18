'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const build = fs.readFileSync(path.join(root, 'scripts', 'build.js'), 'utf8');

test('VehicleCatalogWriteSOT terdaftar sebelum semua consumer canonical write', () => {
  const gate = build.indexOf("'modules/vehicle/vehicle-catalog-write-sot.js'");
  assert.ok(gate >= 0, 'Write SOT harus terdaftar di build');
  for (const consumer of [
    "'modules/vehicle/vehicle-catalog-import.js'",
    "'modules/vehicle/sparepart-servis-ui.js'",
  ]) {
    const pos = build.indexOf(consumer);
    assert.ok(pos >= 0, `${consumer} harus terdaftar di build`);
    assert.ok(gate < pos, `Write SOT harus dimuat sebelum ${consumer}`);
  }
});
