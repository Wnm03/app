'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const core=fs.readFileSync(path.join(ROOT,'modules/vehicle/vehicle-core.js'),'utf8');
const bundle=fs.readFileSync(path.join(ROOT,'app-bundle-b.min.js'),'utf8');

test('S1733: Pro Car Notes primary tabs route the visible mockup screens',()=>{
  assert.match(core,/const proScreenMap=\{beranda:1,servis:3,bbm:7,pajak:8,insight:1,jalan:1\}/);
  assert.match(core,/if\(target!=null\)proMockupSetScreen\(target\)/);
  assert.match(html,/data-action="setCnTab" data-args='\["servis", "\$el"\]'/);
  assert.match(html,/data-action="setCnTab" data-args='\["bbm", "\$el"\]'/);
  assert.match(html,/data-action="setCnTab" data-args='\["pajak", "\$el"\]'/);
  assert.match(bundle,/proScreenMap/);
});

test('S1733: Pro History opens visible mockup screen 5 instead of only hidden legacy Servis',()=>{
  assert.match(core,/function proOpenHistoryTab\(\)\{[\s\S]*?dataset\.theme==='pro'[\s\S]*?proMockupSetScreen\(5\)/);
  assert.match(html,/data-action="proOpenHistory"/);
  assert.match(bundle,/function proOpenHistoryTab\(\)/);
});
