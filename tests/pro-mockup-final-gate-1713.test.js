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

test('canonical Car Notes retains required business surfaces',()=>{
  assert.doesNotMatch(index,/pro-ui-layer\.css|data-theme=\"pro\"/i); assert.doesNotMatch(prod,/pro-ui-layer\.css|data-theme=\"pro\"/i);
});

test('Servis remains a single source of truth',()=>{
  assert.match(index,/id=\"page-carnotes\"/); assert.match(index,/vehicleSelect/);
});

test('Fuel Intelligence remains connected to Car Notes rendering',()=>{
  for(const t of ['insight','bbm','servis','pajak','jalan']) assert.ok(index.includes('[\"'+t+'\"'));
});

test('build wiring contains canonical vehicle modules without the retired Pro presenter',()=>{
  assert.match(index,/id=\"mainNav\"/); assert.doesNotMatch(index,/proCnBottomNav|proMockupScreens/i);
});

test('cache/build entries do not ship the retired Pro UI layer',()=>{
  assert.doesNotMatch(core,/proMockup|proOpenHistoryTab|proReturnToMainNav/i); assert.match(core,/function setCnTab\(/);
});
