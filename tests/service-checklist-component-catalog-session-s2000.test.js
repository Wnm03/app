'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function loadChecklist(){
  const generated=require('../modules/vehicle/service-master-data.generated.js');
  const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis-checklist.js'),'utf8');
  const ctx={
    console,
    __SERVICE_CHECKLIST_GROUPS__:generated.SERVICE_CHECKLIST_GROUPS,
    ServiceEventSOT:{checklistState:()=> 'DONE'},
    ServiceMasterDB:{getStore:()=>({components:generated.SERVICE_MASTER_DATA.components})},
    resolveServisCatForVehicle:()=>null,
    module:{exports:{}},
    D:{vehicles:[{id:'v1',name:'Motor'}]},
    globalThis:null
  };
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(src,ctx,{filename:'servis-checklist.js'});
  return ctx.module.exports.ServisChecklist;
}

test('S2000: setiap checklist row membawa canonical serviceComponentId dan interval master',()=>{
  const A=loadChecklist();
  A.open('v1');
  A.toggleItem(0,0); // oli-mesin
  const rows=A.toLogPayload();
  assert.equal(rows.length,1);
  assert.equal(rows[0].serviceComponentId,'oli-mesin');
  assert.equal(rows[0].intervalKmAtService,4000);
  assert.equal(rows[0].reminderIntervalSource,'service-master');
  assert.equal(rows[0].checklistItemId,'oli-mesin');
});

test('S2000: catalog refs tersimpan per component dan survive reload',()=>{
  const A=loadChecklist();
  A.open('v1');
  A.toggleItem(0,0);
  A.toggleItem(0,2); // busi
  A.setCatalogPart('oli-mesin','part-oli',1);
  A.setCatalogPart('busi','part-busi',1);
  const rows=A.toLogPayload();
  const oil=rows.find(r=>r.itemId==='oli-mesin');
  const plug=rows.find(r=>r.itemId==='busi');
  assert.equal(JSON.stringify(oil.catalogPartRefs),JSON.stringify([{catalogId:'part-oli',qty:1}]));
  assert.equal(JSON.stringify(plug.catalogPartRefs),JSON.stringify([{catalogId:'part-busi',qty:1}]));
  A.loadFromLog({checklist:rows});
  assert.equal(JSON.stringify(A.getCatalogPartRefs('oli-mesin')),JSON.stringify([{catalogId:'part-oli',qty:1}]));
  assert.equal(JSON.stringify(A.getCatalogPartRefs('busi')),JSON.stringify([{catalogId:'part-busi',qty:1}]));
});

test('S2000: unset catalog part tidak membuat mapping palsu',()=>{
  const A=loadChecklist();
  A.open('v1');
  A.toggleItem(0,0);
  const row=A.toLogPayload()[0];
  assert.equal(JSON.stringify(row.catalogPartRefs),JSON.stringify([]));
  assert.equal(row.serviceComponentId,'oli-mesin');
});

test('S2000: save path menggunakan catalogPartRefs per row dan satu sessionId',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
  assert.match(src,/const _rowCatalogRefs=Array\.isArray\(_row\.catalogPartRefs\)/);
  assert.match(src,/serviceJobId:_serviceSessionId/);
  assert.match(src,/checklistItemId:_row\.itemId\|\|null/);
  assert.match(src,/catalogPartRefs:_rowCatalogRefs/);
  assert.match(src,/const _savedRows=D\.servisLogs\.filter/);
});

test('S2000: history filter has explicit pengerjaan/session and component controls',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
  assert.match(src,/setServiceHistorySessionFilter\(sessionId\)/);
  assert.match(src,/setServiceHistoryComponentFilter\(componentId\)/);
});
