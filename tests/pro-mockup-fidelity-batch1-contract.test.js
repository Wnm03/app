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

test('canonical Car Notes keeps the five supported tab surfaces',()=>{
  for(const h of [index,prod]) { assert.match(h,/id=\"page-carnotes\"/); assert.match(h,/id=\"vehicleSelect\"/); }
});

test('canonical cards do not depend on retired Pro-only DOM classes',()=>{
  assert.match(index,/id=\"cnTab-insight\"/); assert.match(index,/id=\"cnTab-bbm\"/);
});
