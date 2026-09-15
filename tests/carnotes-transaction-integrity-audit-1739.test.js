const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

test('Car Notes BBM save: new entry uses one stable tx id and reciprocal finance link',()=>{
  const src=read('car-notes.js');
  assert.match(src,/const txId=isEdit\?\(existing\.txLinkId\|\|uid\(\)\):uid\(\)/);
  assert.match(src,/bbmLinkId:result\.bbmId/);
  assert.match(src,/if\(b\)b\.txLinkId=txId/);
  assert.match(src,/save\(\);closeModal\('bbmModal'\)/);
});

test('Car Notes BBM edit orphan repairs the missing Finance side without duplicating linked tx',()=>{
  const src=read('car-notes.js');
  assert.match(src,/const wasOrphan=isEdit&&!existing\.txLinkId/);
  assert.match(src,/if\(wasOrphan\)\{/);
  assert.match(src,/D\.transactions\.push\(\{id:txId,type:'expense'/);
  assert.match(src,/bbmLinkId:result\.bbmId/);
  assert.match(src,/else\{\nconst tx=D\.transactions\.find\(t=>t\.id===txId\)/);
});

test('Car Notes BBM delete cascades to Finance and persists once',()=>{
  const src=read('car-notes.js');
  assert.match(src,/if\(b&&b\.txLinkId\)D\.transactions=D\.transactions\.filter\(tx=>tx\.id!==b\.txLinkId\)/);
  assert.match(src,/D\.bbmLogs=D\.bbmLogs\.filter\(b=>b\.id!==id\)/);
  assert.match(src,/save\(\);renderCnTab\(\);renderDashboard\(\);renderKeuangan\(\)/);
});

test('Car Notes service save delegates to canonical Servis.save only once',()=>{
  const src=read('modules/vehicle/sparepart-servis-b.js');
  assert.match(src,/function saveServis\(\)\{\n\/\/ V32: Servis\.save\(\) owns canonical post-commit service events\.\nreturn Servis\.save\(\);\n\}/);
  assert.doesNotMatch(src,/function saveServis\(\)\{[\s\S]{0,300}AIBus\.emit\("vehicle\.updated"/);
});

test('Car Notes service edit/delete keep Finance linkage contract',()=>{
  const src=read('modules/vehicle/servis.js');
  assert.match(src,/P10 FIX: transaksi Finance tertaut bisa hilang lebih dulu/);
  assert.match(src,/s\.txLinkId=repairTxId;/);
  assert.match(src,/const deletedTxId=s\.txLinkId/);
  assert.match(src,/D\.transactions=D\.transactions\.filter\(tx=>tx\.id!==deletedTxId\)/);
});

test('Car Notes data integrity reconcilers remain available for final audit',()=>{
  const fuel=read('modules/vehicle/fuel-integrity-reconciler.js');
  const suite=read('modules/vehicle/car-notes-integrity-suite.js');
  assert.match(fuel,/DUPLICATE_BBM_TX_LINK/);
  assert.match(fuel,/MISSING_FINANCE/);
  assert.match(fuel,/CROSS_VEHICLE_LINK/);
  assert.match(suite,/FuelIntegrityReconciler/);
  assert.match(suite,/service/);
});
