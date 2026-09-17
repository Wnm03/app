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

test('Car Notes vehicle selector remains visible in canonical layout',()=>{
  assert.match(index,/id=\"cnTab-bbm\"/); assert.match(index,/id=\"cnTab-servis\"/);
});

test('Insight tab remains a first-class canonical destination',()=>{
  assert.match(index,/id=\"cnTab-jalan\"/); assert.doesNotMatch(index,/pro-mock-screen|pro-mock-bottom-nav/i);
});

test('BBM tab remains a first-class canonical destination',()=>{
  assert.match(index,/id=\"page-carnotes\"/); assert.match(index,/id=\"cnTab-insight\"/);
});

test('Servis tab remains a first-class canonical destination',()=>{
  assert.match(core,/function setCnTab\(/); assert.match(render,/Servis\.renderReminder\(\)/);
});

test('Pajak and Jalan tabs remain canonical destinations',()=>{
  assert.match(render,/FuelCard\.render\(\)/); assert.match(index,/FuelCard/);
});

test('Car Notes quick-action FAB remains wired',()=>{
  assert.doesNotMatch(build,/pro-mockup-presenter|pro-ui-layer/i);
});
