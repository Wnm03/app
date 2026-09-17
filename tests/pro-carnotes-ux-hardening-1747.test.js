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

test('both shipped HTML variants expose the same canonical Car Notes structure',()=>{
  assert.doesNotMatch(sw,/pro-ui-layer|pro-mockup-presenter/i);
});

test('Car Notes has no retired Pro breadcrumb or offline mockup controls',()=>{
  assert.doesNotMatch(index,/pro-ui-layer\.css|proMockScreen|proCnBottomNav/i); assert.doesNotMatch(prod,/pro-ui-layer\.css|proMockScreen|proCnBottomNav/i)
});

test('primary Car Notes actions remain data-action driven',()=>{
  assert.match(index,/id=\"page-carnotes\"/); assert.match(index,/data-action=\"setCnTab\"/);
});

test('production Bundle-B remains free of retired Pro routing symbols',()=>{
  for(const s of [index,core,render,bundle,sw,build]) assert.doesNotMatch(s,/proMockup|proOpenHistoryTab|proCnBottomNav|proReturnToMainNav|pro-ui-layer/i);
});
