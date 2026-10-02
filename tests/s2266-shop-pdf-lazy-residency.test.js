const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const build = fs.readFileSync(path.join(root, 'scripts/build.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'modules/shared/feature-lazy-loader.js'), 'utf8');
const dispatch = fs.readFileSync(path.join(root, 'modules/shared/features-helpers-global-security.js'), 'utf8');

test('S2266: Shop PDF UI removed from eager GROUP_B', () => {
  assert.doesNotMatch(build, /['"]modules\/business\/shop-pdf-import-ui\.js['"]/);
});
test('S2266: dedicated Shop PDF lazy loader exists', () => {
  assert.match(loader, /function ensureShopPdfImportScripts\s*\(/);
  assert.match(loader, /modules\/business\/shop-pdf-import-ui\.js/);
  assert.match(loader, /ensureVehicleCatalogFeatureScripts\(\)/);
});
test('S2266: dispatcher retries ShopPdfImportUI after lazy load', () => {
  const i = dispatch.indexOf('const lazyOwnerLoaders={');
  const j = dispatch.indexOf('};', i);
  const block = dispatch.slice(i,j);
  assert.match(block, /ShopPdfImportUI:\s*typeof ensureShopPdfImportScripts/);
});
test('S2266: index action remains canonical', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /data-action="ShopPdfImportUI\.open"/);
});
