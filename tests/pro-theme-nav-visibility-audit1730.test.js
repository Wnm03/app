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

test('global main navigation remains a canonical app navigation surface',()=>{
  assert.match(index,/id=\"page-carnotes\"/); assert.match(index,/id=\"cnTab-insight\"/);
});

test('Car Notes does not require theme-specific Pro navigation suppression',()=>{
  assert.match(core,/function setCnTab\(/); assert.match(render,/Servis\.renderReminder\(\)/);
});

test('both shipped HTML variants avoid retired Pro asset registration',()=>{
  assert.match(render,/FuelCard\.render\(\)/); assert.match(index,/FuelCard/);
});

test('service worker avoids retired Pro UI assets',()=>{
  assert.doesNotMatch(build,/pro-mockup-presenter|pro-ui-layer/i);
});
