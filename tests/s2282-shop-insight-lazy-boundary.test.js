'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('ShopInsight is explicitly published for the demand-loaded Business Intelligence presenter',()=>{
  const src=fs.readFileSync(path.join(root,'modules/ai/feature-insights.js'),'utf8');
  assert.match(src,/if\(typeof window!=='undefined'\)window\.ShopInsight=ShopInsight;/);
});

test('Business Intelligence consumes ShopInsight without defining a second insight engine',()=>{
  const src=fs.readFileSync(path.join(root,'modules/shop/business-intelligence-presenter.js'),'utf8');
  assert.match(src,/typeof ShopInsight === 'undefined'/);
  assert.match(src,/ShopInsight\.compute\(\)/);
  assert.doesNotMatch(src,/^(?:const|function)\s+ShopInsight/m);
});

console.log('S2282 ShopInsight lazy-boundary gate: 2/2 PASS');
