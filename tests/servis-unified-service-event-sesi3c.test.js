const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const car=fs.readFileSync(require.resolve('../car-notes.js'),'utf8');
const tx=fs.readFileSync(require.resolve('../modules/finance/tx-servis.js'),'utf8');

test('Sesi 3C: satu catatan servis = satu canonical service event/log',()=>{
  assert.match(car,/const servisId=uid\(\);/);
  assert.match(car,/D\.servisLogs\.push\(\{id:servisId/);
  assert.match(car,/checklist:checklistPayload/);
  assert.match(car,/txLinkId:txId/);
});

test('Sesi 3C: edit memperbarui event yang sama, tidak membuat log kedua',()=>{
  assert.match(car,/const s=D\.servisLogs\.find\(x=>x\.id===Servis\.editId\);/);
  assert.match(car,/Object\.assign\(s,\{date,item,categoryId:/);
  const editBlock=car.slice(car.indexOf('if(Servis.editId!==null){'),car.indexOf('const servisId=uid();',car.indexOf('if(Servis.editId!==null){')));
  assert.doesNotMatch(editBlock,/D\.servisLogs\.push\(/);
});

test('Sesi 3C: checklist, part, foto dan kategori melekat pada event yang sama',()=>{
  assert.match(car,/usedPartId:usedPartId\|\|null/);
  assert.match(car,/catalogPartId:catalogPartId\|\|null/);
  assert.match(car,/foto:Servis\._photoDraft\.slice\(\)/);
  assert.match(car,/checklist:checklistPayload/);
  assert.match(car,/categoryId:catIdForLog/);
});

test('Sesi 3C: transaksi memakai servisLinkId untuk hubungan 1:1',()=>{
  assert.match(car,/servisLinkId:servisId/);
  assert.match(tx,/opts\.existingServisId/);
  assert.match(tx,/tx\.servisLinkId=servisId/);
});

test('Sesi 3C: batch tetap punya batchId bersama tanpa menggabungkan event kategori',()=>{
  assert.match(car,/const batchId=uid\(\);/);
  assert.match(car,/batchId/);
  assert.match(car,/Servis\.markServiced\(it\.catId,it\.actionType/);
});
