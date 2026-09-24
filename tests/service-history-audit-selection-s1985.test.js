'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const servisB=fs.readFileSync(path.join(root,'modules/vehicle/servis-b.js'),'utf8');
const packageCode=fs.readFileSync(path.join(root,'modules/vehicle/service-history-audit-package.js'),'utf8');

function loadSelection(logs,editId,activeVehicle){
  const ctx={D:{servisLogs:logs},curVehicleId:activeVehicle,Servis:{editId,_selectedHistoryIds:new Set(),_selectedHistoryVehicleId:null},toast(){},console};
  ctx.Servis.renderList=()=>{};
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(servisB,ctx);
  return ctx.Servis;
}

test('S1985 edit-audit selection follows the edited service vehicle, not stale curVehicleId',()=>{
  const S=loadSelection([
    {id:'a',vehicleId:'v-edit'},
    {id:'b',vehicleId:'v-edit'},
    {id:'c',vehicleId:'v-other'}
  ],'a','v-other');
  assert.equal(S._historySelectionVehicleId(),'v-edit');
  assert.equal(S.setHistoryAuditSelection('a',true,'v-edit'),true);
  assert.equal(S.setHistoryAuditSelection('b',true,'v-edit'),true);
  assert.deepEqual(Array.from(S.getHistoryAuditSelectionIds('v-edit')),['a','b']);
  assert.equal(S.getHistoryAuditSelectionIds('v-other').length,0);
});

test('S1985 package API diagnoses ambiguous duplicate source IDs instead of collapsing them',()=>{
  const ctx={console,D:{servisLogs:[
    {id:'dup',vehicleId:'v1',item:'A'},
    {id:'dup',vehicleId:'v1',item:'B'},
    {id:'ok',vehicleId:'v1',item:'C'}
  ],serviceAuditGroups:[]},uid:()=>`pkg_${Date.now()}`,save:()=>true,saveFlush:()=>true};
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(packageCode,ctx);
  const A=ctx.ServiceHistoryAuditPackage;
  const audit=A.sourceIdentityAudit(['dup','ok'],'v1');
  assert.deepEqual(Array.from(audit.duplicateSourceIds),['dup']);
  const result=A.create({vehicleId:'v1',sourceServiceIds:['dup','ok']});
  assert.equal(result.ok,false);
  assert.equal(result.code,'duplicate_source_ids');
  assert.deepEqual(Array.from(result.details.duplicateSourceIds),['dup']);
});

test('S1985 package API keeps normal two-source creation intact',()=>{
  const ctx={console,D:{servisLogs:[
    {id:'a',vehicleId:'v1',item:'A'},
    {id:'b',vehicleId:'v1',item:'B'}
  ],serviceAuditGroups:[]},uid:()=>`pkg_${Date.now()}`,save:()=>true,saveFlush:()=>true};
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(packageCode,ctx);
  const result=ctx.ServiceHistoryAuditPackage.create({vehicleId:'v1',sourceServiceIds:['a','b']});
  assert.equal(result.ok,true);
  assert.deepEqual(Array.from(result.package.sourceServiceIds),['a','b']);
});
