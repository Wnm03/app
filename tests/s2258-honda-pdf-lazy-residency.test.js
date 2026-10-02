const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const build = read('scripts/build.js');
const loader = read('modules/shared/feature-lazy-loader.js');
const dispatch = read('modules/shared/features-helpers-global-security.js');
const self = read('self-test.js');
const FEATURES = [
  'modules/vehicle/honda-pdf-catalog-auto-import.js',
  'modules/vehicle/honda-pdf-import.js',
  'modules/vehicle/honda-pdf-import-extract.js',
  'modules/vehicle/honda-pdf-import-parse.js',
  'modules/vehicle/honda-pdf-import-commit.js',
  'modules/vehicle/honda-pdf-import-ui.js',
];

test('S2258: Honda PDF pipeline is lazy-resident and ordered', () => {
  for (const f of FEATURES) {
    assert.equal(fs.existsSync(path.join(ROOT, f)), true, `source missing: ${f}`);
    assert.equal((build.match(new RegExp(f.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'), 'g')) || []).length, 0, `feature returned to GROUP_B: ${f}`);
    assert.match(loader, new RegExp("'" + f.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') + "'"));
  }
  const order = FEATURES.map(f => loader.indexOf(`'${f}'`));
  assert.deepEqual(order, [...order].sort((a,b)=>a-b));
  assert.match(loader, /ensureVehicleCatalogFeatureScripts\(\)/);
  assert.match(loader, /if \(_hondaPdfFeatureLoadPromise\) return _hondaPdfFeatureLoadPromise/);
  assert.match(loader, /_hondaPdfFeatureLoadPromise = null/);
});

test('S2258: dispatcher retries HondaPdfImportUI after lazy load', () => {
  assert.match(dispatch, /HondaPdfImportUI: typeof ensureHondaPdfImportScripts/);
});

test('S2258: modal sweep awaits lazy async openers', () => {
  assert.match(self, /call:async\(\)=>\{await ensureHondaPdfImportScripts\(\); return HondaPdfImportUI\.open\(\);\}/);
  assert.match(self, /if\(spec\.call\) await spec\.call\(\);/);
  assert.match(self, /if\(r&&typeof r\.then==='function'\) await r/);
});
