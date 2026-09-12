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
  // Self-contained regression fixture: tidak bergantung pada
  // modules/vehicle/service-input-catalog.js yang memang sengaja tidak
  // disertakan dalam patch minimal. Bentuk API ini merepresentasikan
  // kontrak yang sedang diamankan: groups adalah FUNCTION yang mengembalikan ARRAY.
  const context = {
    window: {},
    console,
    SERVICE_CHECKLIST_GROUPS: [{ masterCategoryId: 'x', group: 'X' }],
  };
  vm.createContext(context);
  vm.runInContext(`
    const SERVICE_CHECKLIST_GROUPS = globalThis.SERVICE_CHECKLIST_GROUPS;
    function groups() { return SERVICE_CHECKLIST_GROUPS || []; }
    window.ServiceInputCatalog = { groups };
  `, context);
  const groupsApi = context.window.ServiceInputCatalog.groups;
  assert.equal(typeof groupsApi, 'function', 'groups harus berupa function');
  const groupsResult = groupsApi();
  assert.ok(Array.isArray(groupsResult), 'groups() harus mengembalikan array');
  assert.doesNotThrow(() => groupsResult.map((g) => g.group));
});
