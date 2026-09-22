const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const modalNav = fs.readFileSync(path.join(ROOT, 'modules/shared/modal-navigasi.js'), 'utf8');
const render = fs.readFileSync(path.join(ROOT, 'modules/shared/modules-render.js'), 'utf8');
const renderB = fs.readFileSync(path.join(ROOT, 'modules/shared/modules-render-b.js'), 'utf8');
const settings = fs.readFileSync(path.join(ROOT, 'modules/shared/pengaturan-search.js'), 'utf8');
const shop = fs.readFileSync(path.join(ROOT, 'modules/shop/cobek-io.js'), 'utf8');
const asset = fs.readFileSync(path.join(ROOT, 'modules/asset/aset-misc.js'), 'utf8');
const finance = fs.readFileSync(path.join(ROOT, 'modules/finance/tx-list-cashflow.js'), 'utf8');
const vehicle = fs.readFileSync(path.join(ROOT, 'modules/vehicle/vehicle-core.js'), 'utf8');
const pajak = fs.readFileSync(path.join(ROOT, 'pajak-aset-ui-wrappers.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

const pages = ['dashboard-hub','keuangan','shop','aset','carnotes','pajak','settings','ai'];
const pageIds = new Set([...index.matchAll(/id="page-([^"]+)"/g)].map(m => m[1]));

test('S1923 baseline: every primary navigation destination has a real page', () => {
  for (const page of pages) assert.ok(pageIds.has(page), `missing #page-${page}`);
  const navTargets = [...index.matchAll(/data-action="showPage"\s+data-args='\["([^"]+)"/g)].map(m => m[1]);
  assert.ok(navTargets.length >= 6);
  for (const target of navTargets) assert.ok(pageIds.has(target), `nav target has no page: ${target}`);
});

test('S1923 baseline: every primary page has a renderPageContent route', () => {
  const required = {
    'dashboard-hub': "name==='dashboard-hub'",
    keuangan: "name==='keuangan'",
    shop: "name==='shop'",
    carnotes: "name==='carnotes'",
    pajak: "name==='pajak'",
    aset: "name==='aset'",
    settings: "name==='settings'",
    ai: "name==='ai'",
  };
  for (const [page, marker] of Object.entries(required)) assert.match(render, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing renderer route: ${page}`);
  assert.match(renderB, /function renderCnTab\(\)/);
  assert.match(renderB, /function renderSettings\(\)/);
});

test('S1923: invalid showPage target cannot blank the currently active page', () => {
  assert.match(modalNav, /const pageEl=document\.getElementById\('page-'\+name\);/);
  const guard = modalNav.indexOf('if(!pageEl){');
  const destructiveScan = modalNav.indexOf("document.querySelectorAll('.page').forEach(p=>");
  const destructive = modalNav.indexOf("p.classList.remove('active')", destructiveScan);
  assert.ok(guard >= 0 && destructiveScan >= 0 && destructive >= 0 && guard < destructiveScan && destructiveScan < destructive);
  assert.match(modalNav, /return false;/);
});

test('S1923: page render exceptions produce a visible recovery state', () => {
  assert.match(modalNav, /try\{\s*renderPageContent\(name\);\s*\}\s*catch\(err\)/);
  assert.match(modalNav, /page-render-error/);
});

test('S1923: all page-level tab switchers reject invalid tabs and tolerate programmatic calls', () => {
  assert.match(settings, /if\(!SETTINGS_TAB_ORDER\.includes\(tab\)\)tab='profil';/);
  assert.match(shop, /if\(!_SHOP_TAB_ORDER\.includes\(t\)\)t='kasir';/);
  assert.match(shop, /if\(el\) el\.classList\.add\('active'\)/);
  assert.match(asset, /if\(!ASET_TAB_ORDER\.includes\(t\)\)t='ringkasan';/);
  assert.match(finance, /if\(!KEU_TAB_ORDER\.includes\(t\)\)t='kelola';/);
  assert.match(vehicle, /if\(!\['beranda','insight','bbm','servis','pajak','jalan'\]\.includes\(t\)\)t='bbm';/);
  assert.match(pajak, /if\(!Object\.prototype\.hasOwnProperty\.call\(PAJAK_TAB_LABEL,tab\)\)tab='zakat';/);
  assert.match(pajak, /if\(!PJK_SUBTAB_ORDER\.includes\(t\)\)t='pph21';/);
});

test('S1923: narrow Android shows all six primary domain tab rails as wrapping grids', () => {
  for (const id of ['#page-keuangan','#page-shop','#page-aset','#page-carnotes','#page-pajak','#page-settings']) {
    assert.match(css, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + String.raw` > \.cn-tabs`));
  }
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /min-height:44px/);
});

test('S1923: the current eight-page shell remains the only primary page set', () => {
  assert.deepEqual([...pageIds].sort(), pages.slice().sort());
});
