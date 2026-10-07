'use strict';
// S256AN: penjaga statis untuk scripts/a11y-runtime-census-modals.py (uji klik sungguhan di dalam modal + data 2 kendaraan).
// Skrip Python/Chromium itu tidak ikut `node --test`; tes ini mencegah DRIFT: id modal yang diuji harus masih ada di modals.js,
// opener yang dipanggil harus masih ada, dan kendaraan ke-2 harus tetap dibuat lewat saveVehicle() asli (bukan push langsung ke D.vehicles).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const py = rd('scripts/a11y-runtime-census-modals.py');
const modalsSrc = rd('modules/shared/modals.js');

function modalIds() {
  const block = py.slice(py.indexOf('MODALS = ['), py.indexOf('SEED = '));
  return [...block.matchAll(/\('([A-Za-z0-9_]+)',/g)].map((m) => m[1]);
}

test('S256AN: semua id modal yang diuji ada di MODAL_HTML (modules/shared/modals.js)', () => {
  const ids = modalIds();
  assert.ok(ids.length >= 20, 'daftar modal tidak boleh menyusut diam-diam: ' + ids.length);
  assert.strictEqual(new Set(ids).size, ids.length, 'id modal duplikat di daftar uji');
  const missing = ids.filter((id) => !new RegExp('id=\\\\?"' + id + '\\\\?"').test(modalsSrc));
  assert.deepStrictEqual(missing, [], 'modal tidak ada di modals.js: ' + missing.join(','));
});

test('S256AN: opener khusus yang dipakai skrip masih terdefinisi di source', () => {
  const openers = [...py.matchAll(/'((?:open[A-Za-z]+)\([^']*\))'|"((?:open[A-Za-z]+)\([^"]*\))"/g)].map((m) => (m[1] || m[2]).replace(/\(.*$/, ''));
  assert.ok(openers.includes('openTxModal') && openers.includes('openBbmModal') && openers.includes('openVehicleModal'));
  const all = ['modules/finance/transaksi.js', 'modules/vehicle/vehicle-core.js'].map(rd).join('\n');
  openers.forEach((fn) => assert.ok(new RegExp('function ' + fn + '\\b').test(all), 'opener hilang: ' + fn));
});

test('S256AN: kendaraan ke-2 dibuat lewat saveVehicle() asli, bukan menulis D.vehicles langsung', () => {
  assert.ok(/await saveVehicle\(\)/.test(py), 'seed harus memanggil saveVehicle()');
  assert.ok(!/D\.vehicles\.push|D\.vehicles\s*=/.test(py), 'dilarang menulis D.vehicles langsung (melewati SOT/provisioning)');
  const core = rd('modules/vehicle/vehicle-core.js');
  ['vehName', 'vehEmoji', 'vehKmAwal'].forEach((id) => {
    assert.ok(new RegExp("getElementById\\('" + id + "'\\)").test(core), 'field form kendaraan berubah: ' + id);
  });
});

test('S256AN: harness memakai showMain() + klik mouse sungguhan, dan temuan membuat exit code 1', () => {
  assert.ok(/showMain\(\)/.test(py), 'tanpa showMain(), #onboard z=950 menutup layar dan klik sungguhan timeout');
  assert.ok(/\.click\(timeout=/.test(py), 'harus klik Playwright (bukan el.click() JS)');
  assert.ok(/sys\.exit\(1 if fail else 0\)/.test(py));
  assert.ok(/firstSessionBbm/.test(py), 'cek informasional BBM sesi-pertama harus tetap dicatat');
});
