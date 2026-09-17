'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const index=read('index.html');
const prod=read('app_production.html');
const core=read('modules/vehicle/vehicle-core.js');
const render=read('modules/shared/modules-render-b.js');
const bundle=read('app-bundle-b.min.js');
const sw=read('sw.js');
const build=read('scripts/build.js');

test('canonical Car Notes remains data driven by the selected vehicle',()=>{
  assert.doesNotMatch(index,/pro-ui-layer\.css|proMockScreen|proCnBottomNav/i); assert.doesNotMatch(prod,/pro-ui-layer\.css|proMockScreen|proCnBottomNav/i)
});

test('fuel intelligence remains wired to the canonical BBM surface',()=>{
  assert.match(index,/id=\"page-carnotes\"/); assert.match(index,/data-action=\"setCnTab\"/);
});

test('canonical service rendering remains wired after Pro rollback',()=>{
  for(const s of [index,core,render,bundle,sw,build]) assert.doesNotMatch(s,/proMockup|proOpenHistoryTab|proCnBottomNav|proReturnToMainNav|pro-ui-layer/i);
});
