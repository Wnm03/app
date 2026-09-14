'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','modules','vehicle','servis.js'),'utf8');

test('Servis 2A: create checklist multi-item memakai sessionId dan memecah menjadi N log',()=>{
  assert.match(src,/const _serviceSessionId=uid\(\);/);
  assert.match(src,/const _checkedServiceRows=checklistPayload\.slice\(\);/);
  assert.match(src,/const _rowsToPersist=_hasChecklistRows\?_checkedServiceRows/);
  assert.match(src,/_rowsToPersist\.forEach\(\(_row,_rowIdx\)=>/);
  assert.match(src,/sessionId:_serviceSessionId/);
  assert.match(src,/checklist:\[_row\]/);
});

test('Servis 2A: biaya dan linkage transaksi hanya masuk record pertama',()=>{
  assert.match(src,/cost:_rowIdx===0\?cost:0/);
  assert.match(src,/txLinkId:_rowIdx===0\?txId:null/);
  assert.match(src,/usedPartId:_rowIdx===0\?/);
  assert.match(src,/catalogPartId:_rowIdx===0\?/);
});

test('Servis 2A: interval/reminder dihitung per kategori hasil split',()=>{
  assert.match(src,/const _rowCat=_rowCategoryId\?/);
  assert.match(src,/const _rowIv=.*getEffectiveIntervalKm/);
  assert.match(src,/const _rowIb=.*getEffectiveIntervalBulan/);
  assert.match(src,/buildServiceNextDueSnapshot\(\{vehicleId:curVehicleId,cat:_rowCat/);
});

test('Servis 2A: checklist boleh menjadi sumber item saat Jenis Servis kosong',()=>{
  assert.match(src,/const _effectiveItem=item\|\|\(_hasChecklistRows\?_checkedServiceRows\[0\]\.itemName/);
  assert.match(src,/if\(!_effectiveItem\)\{toast\('⚠️ Pilih minimal satu komponen checklist atau isi jenis servis'\);return;\}/);
});
