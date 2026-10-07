'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');

test('S256AE: reminder row header and interval span carry sv-tap, data-action unchanged', () => {
  const s = rd('modules/vehicle/servis-b.js');
  assert.ok(s.includes('u-pointer sv-tap" data-action="editSparepartFromReminder"'));
  assert.ok(s.includes('data-action="editVehicleIntervalOverride"'));
  assert.ok(s.includes('class="u-pointer sv-tap">'));
});

test('S256AE: catalog reminder-visibility pills carry sv-tap (both states)', () => {
  const s = rd('modules/vehicle/sparepart-servis.js');
  const n = s.split('u-pointer sv-tap" data-action="toggleSparepartShowInReminder"').length - 1;
  assert.strictEqual(n, 2);
});

test('S256AE: sv-tap CSS is mobile-scoped with 44px floor', () => {
  const c = rd('modern-ui-layer.css');
  assert.ok(/@media \(max-width:768px\)\{\s*html body\[data-theme\] \.sv-tap\{min-height:44px/.test(c));
});

test('S256AE: bundles contain the sv-tap markup', () => {
  assert.ok(rd('app-bundle-a.min.js').includes('sv-tap') || rd('app-bundle-b.min.js').includes('sv-tap'));
});
