const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const navSrc = fs.readFileSync(path.join(root, 'modules/shared/modal-navigasi.js'), 'utf8');
const vehicleSrc = fs.readFileSync(path.join(root, 'modules/vehicle/vehicle-core.js'), 'utf8');
const bundleB = fs.readFileSync(path.join(root, 'app-bundle-b.min.js'), 'utf8');

test('Main App: all primary nav destinations exist and are wired to showPage', () => {
  const routes = ['dashboard-hub','keuangan','shop','aset','carnotes','pajak'];
  for (const route of routes) {
    assert.match(html, new RegExp(`id="page-${route}"`), `missing page-${route}`);
    assert.match(html, new RegExp(`data-action="showPage" data-args='\\["${route}"`), `nav route ${route} not wired`);
  }
  assert.match(html, /id="page-settings"/);
});

test('Main App: showPage has lightweight history contract and Back replay', () => {
  assert.match(navSrc, /_MAIN_APP_NAV_PAGES=new Set\(\['dashboard-hub','keuangan','shop','aset','carnotes','pajak','settings'\]\)/);
  assert.match(navSrc, /__mainAppNav/);
  assert.match(navSrc, /history\.pushState\(/);
  assert.match(navSrc, /showPage\(target,null,\{fromHistory:true\}\)/);
  assert.match(navSrc, /_mainAppNavEnsureInitial\(\)/);
});

test('Main App: Car Notes Pro history preserves the parent Main App route state', () => {
  assert.match(vehicleSrc, /history\.pushState\(Object\.assign\(\{\},history\.state\|\|\{\},\{__carnotesPro:true,screen:/);
  assert.match(vehicleSrc, /history\.replaceState\(Object\.assign\(\{\},history\.state\|\|\{\},\{__carnotesPro:true,screen:/);
  assert.match(bundleB, /function proMockupPushHistory\(n\)/);
  assert.match(bundleB, /__carnotesPro/);
});

test('Main App: production Bundle-B contains the same primary navigation history contract', () => {
  assert.match(bundleB, /_MAIN_APP_NAV_PAGES=new Set\(\['dashboard-hub','keuangan','shop','aset','carnotes','pajak','settings'\]\)/);
  assert.match(bundleB, /function showPage\(name,el,opts\)/);
  assert.match(bundleB, /if\s*\(\s*!_mainAppNavPopInProgress\s*&&\s*!\(opts\s*&&\s*opts\.fromHistory\)\s*&&\s*el\s*\)\s*\{\s*_mainAppNavPush\(name\)\s*;?\s*\}/);
});

test('Main App: shipped Car Notes actions exist in production Bundle-B', () => {
  assert.match(bundleB, /function proOpenHistory\(\)/);
  assert.match(bundleB, /function proReturnToMainNav\(\)/);
  assert.match(bundleB, /function proOpenGlobalSearch\(\)/);
});
