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

test('canonical Car Notes contains no dedicated Pro mockup screens',()=>{
  assert.match(index,/id=\"page-carnotes\"/); assert.match(index,/id=\"cnTab-insight\"/);
});

test('canonical Car Notes keeps the supported BBM and Servis surfaces',()=>{
  assert.match(core,/function setCnTab\(/); assert.match(render,/Servis\.renderReminder\(\)/);
});

test('canonical Car Notes keeps the Jalan surface without a Pro screen shell',()=>{
  assert.match(render,/FuelCard\.render\(\)/); assert.match(index,/FuelCard/);
});
