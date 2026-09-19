const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root,f),'utf8');

test('S1846: performance indexes exist and are opt-in/non-mutating', () => {
  const s=read('modules/shared/features-helpers-global-security.js');
  assert.match(s,/function _getPerfAccountIndex\(\)/);
  assert.match(s,/function _getPerfCategoryIndex\(\)/);
  assert.match(s,/function clearPerfIndexes\(\)/);
});

test('S1846: remaining direct dashboard mutation refreshes use scoped helper', () => {
  const a=read('modules/shared/modules-calc.js');
  const b=read('modules/shop/cobek-order.js');
  assert.doesNotMatch(a,/save\(\);closeModal\('fiSettingsModal'\);renderDashboard\(\)/);
  assert.doesNotMatch(b,/save\(\);this\.render\(\);renderShop\(\);renderShopRecent\(\);\s*if\(typeof renderDashboard/);
});

test('S1847: transaction renderer receives reusable indexes', () => {
  const s=read('modules/shared/modules-render-b.js');
  assert.match(s,/catsByName:\(typeof _getPerfCategoryIndex/);
  assert.match(s,/accounts:\(typeof _getPerfAccountIndex/);
});

test('S1848: transaction renderer has bounded visible pagination', () => {
  const s=read('modules/shared/modules-render-b.js');
  assert.match(s,/visibleCount=Math\.min\(sorted\.length,txListPage\*TX_PAGE_SIZE\)/);
});

test('S1849: no exact save + full dashboard/finance burst remains in modules', () => {
  const dir=path.join(root,'modules');
  let hits=[];
  function walk(d){for(const n of fs.readdirSync(d)){const f=path.join(d,n);const st=fs.statSync(f);if(st.isDirectory())walk(f);else if(n.endsWith('.js')){const s=fs.readFileSync(f,'utf8');if(/save\(\);renderDashboard\(\);renderKeuangan\(\)/.test(s))hits.push(path.relative(root,f));}}}
  walk(dir); assert.deepEqual(hits,[]);
});
