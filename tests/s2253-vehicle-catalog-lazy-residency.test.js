const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BUILD = fs.readFileSync(path.join(ROOT, 'scripts/build.js'), 'utf8');
const LOADER = fs.readFileSync(path.join(ROOT, 'modules/shared/feature-lazy-loader.js'), 'utf8');
const CATALOG_UI = fs.readFileSync(path.join(ROOT, 'modules/vehicle/vehicle-catalog-ui.js'), 'utf8');

const FEATURES = [
  'modules/vehicle/vehicle-scanner.js',
  'modules/vehicle/sparepart-scanner.js',
  'modules/vehicle/sparepart-scanner-ui.js',
  'modules/vehicle/sparepart-ocr.js',
  'modules/vehicle/sparepart-ocr-parser.js',
  'modules/vehicle/sparepart-ocr-catalog-link.js',
  'modules/vehicle/sparepart-ocr-catalog-detail.js',
  'modules/vehicle/sparepart-ocr-catalog-add.js',
  'modules/vehicle/sparepart-ocr-orchestrator.js',
  'modules/vehicle/vehicle-catalog-import.js',
  'modules/vehicle/vehicle-catalog-import-ui.js',
  'modules/vehicle/vehicle-catalog-import-stock-push.js',
  'modules/vehicle/vehicle-catalog-web-import.js',
  'modules/vehicle/vehicle-catalog-web-import-ui.js',
];

test('S2253: scanner/import/OCR cluster is lazy-resident, source-preserved, ordered, and gated at catalog entry', () => {
  for (const f of FEATURES) assert.equal(fs.existsSync(path.join(ROOT, f)), true, `source missing: ${f}`);
  for (const f of FEATURES) {
    assert.equal((BUILD.match(new RegExp(f.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'), 'g')) || []).length, 0, `feature returned to GROUP_B: ${f}`);
    assert.equal(LOADER.includes(`'${f}'`), true, `loader missing: ${f}`);
  }
  assert.equal(LOADER.includes('await _loadScriptOnce(src);'), true);
  assert.match(CATALOG_UI, /await ensureVehicleCatalogFeatureScripts\(\)/);
  assert.match(CATALOG_UI, /catch \(err\)/);
  assert.match(CATALOG_UI, /Fitur Scan\/Import belum siap dimuat/);
});

test('S2253: lazy loader failure is retryable and deduplicated', () => {
  assert.match(LOADER, /if \(_vehicleCatalogFeatureLoadPromise\) return _vehicleCatalogFeatureLoadPromise/);
  assert.match(LOADER, /_vehicleCatalogFeatureLoadPromise = null/);
});
