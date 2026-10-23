'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis-b.js'),'utf8');
test('S2722: aksi kosong/tidak diketahui tidak dinormalisasi menjadi ganti pada reset reminder',()=>{
  const start=src.indexOf('_matchesActionTypeForReset(log,cat,actionTypeFilter,forReminder){');
  assert.notEqual(start,-1,'fungsi reset harus ada');
  const end=src.indexOf('\n},',start);
  assert.notEqual(end,-1,'batas fungsi reset ditemukan');
  const body=src.slice(start,end);
  assert.match(body,/return raw;/,'normalisasi harus mempertahankan aksi kosong sebagai kosong');
  assert.doesNotMatch(body,/return raw\s*\|\|\s*'ganti'/,'aksi kosong tidak boleh dianggap ganti');
  assert.match(body,/const resets=\['ganti','pasang','overhaul'\]\.includes\(effType\)/);
});
