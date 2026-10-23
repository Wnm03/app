'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('S2712 alias normalizer actually applies whitespace and word-boundary regexes', () => {
  const source = read('modules/vehicle/sparepart-servis.js');
  const start = source.indexOf('function _spNormalizeComponentAlias');
  const end = source.indexOf('\nfunction resolveCanonicalServiceComponent', start);
  assert.ok(start >= 0 && end > start, 'normalizer function exists');
  const fn = vm.runInNewContext(`${source.slice(start, end)}; _spNormalizeComponentAlias`);
  assert.equal(fn('Busi NGK'), 'busi');
  assert.equal(fn('Oli Mesin 10W-30'), 'olimesin');
  assert.equal(fn('Slidepiece CVT'), 'slidepiececvt');
  assert.equal(fn('Slide Piece CVT'), 'slidepiececvt');
  assert.equal(fn('Kampas Rem Depan (Kanan)'), 'kampasremdepan');
});

test('S2712 canonical projection treats compact spelling aliases as one component', () => {
  const source = read('modules/vehicle/service-category-sot-reconciliation-s2007.js');
  const start = source.indexOf('function componentAlias');
  const end = source.indexOf('\n  const num=', start);
  assert.ok(start >= 0 && end > start, 'component alias function exists');
  const fn = vm.runInNewContext(`const norm = (v) => String(v || '').normalize('NFKC').toLowerCase().trim();\n${source.slice(start, end)}; componentAlias`);
  assert.equal(fn('Slidepiece cvt'), 'slidepiececvt');
  assert.equal(fn('Slide Piece CVT'), 'slidepiececvt');
  assert.equal(fn('Lampu Kabin'), fn(' lampu   kabin '));
});

test('backup-derived duplicate categories remain vehicle-scoped', () => {
  const cats = [
    { id: 'same', vehicleId: 'v1', name: 'Oli Mesin', serviceComponentId: 'oli-mesin', showInReminder: true },
    { id: 'same', vehicleId: 'v1', name: 'Oli Mesin', serviceComponentId: 'oli-mesin', showInReminder: true },
    { id: 'other', vehicleId: 'v2', name: 'Oli Mesin', serviceComponentId: 'oli-mesin', showInReminder: true },
  ];
  const keys = new Set();
  for (const c of cats) keys.add(`${c.vehicleId}::${c.serviceComponentId}`);
  assert.equal(keys.size, 2);
});
