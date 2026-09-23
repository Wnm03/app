'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const servisSrc=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
const bulkSrc=fs.readFileSync(path.join(__dirname,'../modules/vehicle/service-history-bulk-identity-editor.js'),'utf8');

function makeContext(saveResult){
  const D={servisLogs:[
    {id:'a',vehicleId:'v1',date:'2026-01-01',km:100,masterCategoryId:'m1',serviceComponentId:'c1',checklist:[{itemId:'c1'}],cost:10,accountId:'x',foto:['p']},
    {id:'b',vehicleId:'v1',date:'2026-02-01',km:200,masterCategoryId:'m1',serviceComponentId:'c1',checklist:[{itemId:'c1'}],cost:20,accountId:'y',foto:['q']}
  ]};
  const els={};
  const ctx={console,window:{},localStorage:{getItem(){return null},setItem(){}},curVehicleId:'v1',D,
    ServiceInputCatalog:{
      groups(){return [{masterCategoryId:'m2',group:'Servis CVT',items:[{id:'c2',name:'CVT'}]}]},
      groupById(id){return this.groups().find(x=>x.masterCategoryId===id)},
      itemById(id){for(const g of this.groups())for(const i of g.items)if(i.id===id)return {item:i,group:g}},
      infer(){return null}
    },
    escapeHtml:x=>String(x),toast(){},askConfirm:async()=>true,
    save(){return saveResult},refreshCarNotesAfterMutation(){},document:null};
  ctx.document={getElementById(id){return els[id]||null},querySelectorAll(){return[]},body:{appendChild(){}}};
  vm.createContext(ctx);
  vm.runInContext(servisSrc,ctx,{filename:'servis.js'});
  vm.runInContext(bulkSrc,ctx,{filename:'service-history-bulk-identity-editor.js'});
  const Servis=ctx.window.Servis;
  Servis.editId='a';Servis.renderList=()=>{};Servis.renderEditHistoryTab=()=>{};
  const checks=[{id:'a'},{id:'b'}];
  els.serviceHistoryBulkIdentityEditor={remove(){},querySelectorAll(sel){return sel.includes('data-bulk-history-id')?checks.map(x=>({getAttribute(){return x.id}})):[]}};
  els.serviceHistoryBulkCategory={value:'m2'};
  els.serviceHistoryBulkComponent={value:'c2'};
  return {ctx,Servis,D};
}

test('S1972 runtime: bulk edit mengubah dua riwayat sekaligus tanpa menyentuh field historis',async()=>{
  const {Servis,D}=makeContext(undefined);
  await Servis.commitBulkHistoryIdentityEdit();
  for(const log of D.servisLogs){
    assert.equal(log.masterCategoryId,'m2');
    assert.equal(log.serviceComponentId,'c2');
  }
  assert.equal(D.servisLogs[0].km,100);assert.equal(D.servisLogs[0].date,'2026-01-01');
  assert.deepEqual(D.servisLogs[0].checklist,[{itemId:'c1'}]);
  assert.equal(D.servisLogs[0].cost,10);assert.equal(D.servisLogs[0].accountId,'x');assert.deepEqual(D.servisLogs[0].foto,['p']);
  assert.deepEqual(Array.from(D.servisLogs[0].editHistory[0].fields),['masterCategoryId','serviceComponentId']);
});

test('S1972 runtime: save=false mengembalikan seluruh identitas dan audit history (atomic rollback)',async()=>{
  const {Servis,D}=makeContext(false);
  const before=D.servisLogs.map(x=>({masterCategoryId:x.masterCategoryId,serviceComponentId:x.serviceComponentId,editHistory:x.editHistory}));
  await Servis.commitBulkHistoryIdentityEdit();
  D.servisLogs.forEach((x,i)=>{assert.equal(x.masterCategoryId,before[i].masterCategoryId);assert.equal(x.serviceComponentId,before[i].serviceComponentId);assert.equal(x.editHistory,before[i].editHistory);});
});

console.log('S1972 runtime bulk identity: PASS');
