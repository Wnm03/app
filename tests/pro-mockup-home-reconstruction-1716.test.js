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

test('canonical Car Notes starts from the legacy vehicle shell rather than a mockup shell',()=>{
  assert.match(core,/getVehicleKm/); assert.match(index,/vehicleSelect/);
});

test('canonical navigation has explicit Insight, BBM, Servis, Pajak and Jalan tabs',()=>{
  assert.doesNotMatch(index,/proMockScreen\d|proMockupScreens|proCnBottomNav/i);
});
