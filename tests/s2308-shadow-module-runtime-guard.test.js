const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const BUILD = fs.readFileSync(path.join(ROOT, 'scripts/build.js'), 'utf8');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const canonical = 'modules/shared/features-helpers-global-security.js';
const shadows = [
  'modules/asset/features-helpers-global-security.js',
  'modules/finance/features-helpers-global-security.js',
  'modules/shop/features-helpers-global-security.js',
];

test('S2308 canonical global-security source is the only build runtime entry', () => {
  assert.match(BUILD, new RegExp(esc(canonical)));
  for (const shadow of shadows) assert.doesNotMatch(BUILD, new RegExp(esc(shadow)));
});

test('S2308 shadow global-security files remain explicitly classified as non-runtime', () => {
  for (const shadow of shadows) {
    const full = path.join(ROOT, shadow);
    assert.ok(fs.existsSync(full), `${shadow} missing unexpectedly`);
    const text = fs.readFileSync(full, 'utf8');
    assert.match(text, /Dipindah ke modules\/shared\/features-helpers-global-security\.js/,
      `${shadow} is not marked as a relocated historical copy`);
  }
});
