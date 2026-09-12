'use strict';
// Regresi: ServiceInputCatalog.groups diekspos sebagai FUNGSI
// (window.ServiceInputCatalog={groups,...}), tapi beberapa file caller
// sempat memakainya sebagai NILAI langsung (ServiceInputCatalog.groups
// tanpa tanda kurung panggil). Karena function reference selalu truthy,
// fallback `||[]` tidak pernah aktif, sehingga variabel `cats`/`groups`
// berisi function itu sendiri -> `cats.map is not a function` di produksi
// (dilaporkan lewat error banner: app-bundle-b.min.js filter-laporan.js).
//
// Test ini memuat source ASLI (bukan re-implementasi) dan memastikan tiap
// caller memanggil ServiceInputCatalog.groups() dengan benar (mengembalikan
// array asli, bisa di-.map()), bukan mereferensikan fungsinya.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readFile(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const CALLER_FILES = [
  'modules/finance/filter-laporan.js',
  'modules/vehicle/sparepart-servis.js',
  'modules/vehicle/vehicle-catalog-ui.js',
  'modules/vehicle/vehicle-analytics-presenter.js',
  'car-notes.js',
];

test('semua caller memanggil ServiceInputCatalog.groups() dengan tanda kurung, bukan referensi fungsi telanjang', () => {
  for (const file of CALLER_FILES) {
    const src = readFile(file);
    // Setiap 'ServiceInputCatalog.groups' HARUS langsung diikuti '('
    const bareRefPattern = /ServiceInputCatalog\.groups(?!\()/g;
    const matches = src.match(bareRefPattern);
    assert.equal(
      matches,
      null,
      `${file} masih memakai ServiceInputCatalog.groups tanpa memanggilnya sebagai fungsi (akan jadi function reference, bukan array)`
    );
    assert.match(
      src,
      /ServiceInputCatalog\.groups\(\)/,
      `${file} seharusnya memanggil ServiceInputCatalog.groups()`
    );
  }
});

test('ServiceInputCatalog.groups() benar-benar mengembalikan array yang bisa di-.map()', () => {
  const vm = require('node:vm');
  const context = { window: {}, console, SERVICE_CHECKLIST_GROUPS: [{ masterCategoryId: 'x', group: 'X' }] };
  vm.createContext(context);
  vm.runInContext(readFile('modules/vehicle/service-input-catalog.js'), context);
  const groupsResult = context.window.ServiceInputCatalog.groups();
  assert.ok(Array.isArray(groupsResult), 'groups() harus mengembalikan array');
  assert.doesNotThrow(() => groupsResult.map((g) => g.group));
});
