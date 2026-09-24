'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
const servisB=fs.readFileSync(path.join(root,'modules/vehicle/servis-b.js'),'utf8');
const bulk=fs.readFileSync(path.join(root,'modules/vehicle/service-history-bulk-identity-editor.js'),'utf8');

function makeContext(){
  const logs=Array.from({length:3},(_,i)=>({id:'s'+(i+1),vehicleId:'v1',date:`2026-09-${20+i}`,km:100+i,item:'Servis '+(i+1)}));
  const input={
    groups(){return[{masterCategoryId:'m1',group:'Mesin',items:[{id:'c1',name:'Oli Mesin'}]}]},
    groupById(id){return this.groups().find(x=>x.masterCategoryId===id)||null},
    itemById(id){const g=this.groups().find(x=>x.items.some(i=>i.id===id));const item=g&&g.items.find(i=>i.id===id);return item?{item,group:g}:null},
    infer(){return null}
  };
  const panel={
    _checks:logs.map(x=>({id:x.id,checked:false,getAttribute(){return this.id}})),
    querySelectorAll(sel){return sel.includes(':checked')?this._checks.filter(x=>x.checked):this._checks;}
  };
  const els={servisAuditPanel:panel,serviceAuditSelectionCount:{textContent:''},serviceBulkHistoryEditBtn:{disabled:false},serviceBulkHistoryJobTypeBtn:{disabled:false}};
  const ctx={window:{},console,D:{servisLogs:logs},curVehicleId:'v1',escapeHtml:x=>String(x),toast(){},askConfirm:async()=>true,save(){return true},ServiceInputCatalog:input,document:{getElementById:id=>els[id]||null}};
  vm.createContext(ctx);
  vm.runInContext(servis,ctx,{filename:'servis.js'});
  vm.runInContext(servisB,ctx,{filename:'servis-b.js'});
  vm.runInContext(bulk,ctx,{filename:'service-history-bulk-identity-editor.js'});
  return {ctx,Servis:ctx.window.Servis,panel,els};
}

test('S1975 selection Riwayat tetap sama saat Audit dirender ulang',()=>{
  const {Servis,panel,els}=makeContext();
  Servis._selectedHistoryVehicleId='v1';
  Servis._selectedHistoryIds=new Set(['s1','s2']);
  Servis.updateHistoryAuditSelection();
  assert.equal(panel._checks.filter(x=>x.checked).length,2);
  assert.equal(els.serviceAuditSelectionCount.textContent,'2 dipilih');
  // Simulasikan render ulang: DOM checkbox baru semuanya unchecked.
  panel._checks.forEach(x=>{x.checked=false});
  Servis.updateHistoryAuditSelection();
  assert.equal(panel._checks.filter(x=>x.checked).map(x=>x.id).sort().join(','),'s1,s2');
  assert.equal(els.serviceAuditSelectionCount.textContent,'2 dipilih');
});

test('S1975 selection Audit dibatasi 100 dan tidak merender ulang halaman utama',()=>{
  const {Servis}=makeContext();
  Servis.renderList=()=>{throw new Error('Audit selection must not rerender main history');};
  Servis._selectedHistoryVehicleId='v1';
  Servis._selectedHistoryIds=new Set(['s1']);
  assert.equal(Servis.setHistoryAuditSelection('s2',true,'v1'),true);
  assert.deepEqual(Array.from(Servis._selectedHistoryIds),['s1','s2']);
  Servis.setHistoryAuditSelection('s1',false,'v1');
  assert.deepEqual(Array.from(Servis._selectedHistoryIds),['s2']);
});

test('S1975 bulk/job-type/package memakai canonical selection state, bukan checkbox DOM sebagai SoT',()=>{
  assert.match(bulk,/getHistoryAuditSelectionIds\(/g);
  assert.match(bulk,/_historySelectionVehicleId\(\)/);
  assert.match(servis,/getHistoryAuditSelectionIds\(/g);
  assert.match(servis,/_historySelectionVehicleId\(\)/);
  assert.match(bulk,/setEditHistoryAuditSelection/);
  assert.match(bulk,/selectedIds\.has\(key\)/);
});

test('S1975 modal servis dinormalisasi lagi setelah global openModal reset geometry',()=>{
  const open=servis.indexOf("openModal('servisModal');");
  const normalize=servis.indexOf('Servis._normalizeEditModalGeometry();',open);
  assert.ok(open>=0&&normalize>open);
  assert.match(servis.slice(normalize,normalize+500),/requestAnimationFrame/);
});
