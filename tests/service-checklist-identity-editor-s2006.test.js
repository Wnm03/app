'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'modules/vehicle/servis.js'),'utf8');

test('S2006 identity editor does not reassign a const DOM variable',()=>{
  assert.match(src,/let box=document\.getElementById\('serviceChecklistIdentityEditor'\);if\(box\)box\.remove\(\);/);
  assert.doesNotMatch(src,/const box=document\.getElementById\('serviceChecklistIdentityEditor'\);if\(box\)box\.remove\(\);[\s\S]{0,1200}?box=document\.createElement\('div'\)/);
});

test('S2006 identity editor action remains namespaced and wired from checklist UI',()=>{
  assert.match(src,/data-action="Servis\.openServiceChecklistIdentityEditor"/);
  assert.match(src,/data-action="Servis\.commitServiceChecklistIdentityEditor"/);
  assert.match(src,/data-action="Servis\.closeServiceChecklistIdentityEditor"/);
});
