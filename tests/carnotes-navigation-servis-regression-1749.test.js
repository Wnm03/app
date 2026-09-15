'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const vehicle=fs.readFileSync(path.join(__dirname,'..','modules','vehicle','vehicle-core.js'),'utf8');
const servis=fs.readFileSync(path.join(__dirname,'..','modules','vehicle','servis.js'),'utf8');
const bundle=fs.readFileSync(path.join(__dirname,'..','app-bundle-b.min.js'),'utf8');

test('1749: setCnTab tolerates partial DOM/test harnesses without offline helper',()=>{
  assert.match(vehicle,/if\(typeof _cnUpdateOfflineStatus==='function'\)_cnUpdateOfflineStatus\(\);/);
});

test('1749: checklist-only service validates effective item before mutation',()=>{
  assert.match(servis,/const _effectiveItem=item\|\|\(_hasChecklistRows\?_checkedServiceRows\[0\]\.itemName:_preSaveEffectiveItem\);/);
  assert.match(servis,/if\(!_effectiveItem\)\{toast\('⚠️ Pilih minimal satu komponen checklist atau isi jenis servis'\);return;\}/);
  assert.match(servis,/if\(!_preSaveEffectiveItem\)\{toast\('⚠️ Pilih minimal satu komponen checklist atau isi jenis servis'\);return;\}/);
  assert.match(bundle,/const _effectiveItem=item\|\|\(_hasChecklistRows\?_checkedServiceRows\[0\]\.itemName:_preSaveEffectiveItem\);/);
});
