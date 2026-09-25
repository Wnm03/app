'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const s2037=fs.readFileSync(path.join(root,'modules/vehicle/service-history-multicategory-sync-s2037.js'),'utf8');
const s2045=fs.readFileSync(path.join(root,'modules/vehicle/service-session-integrity-s2045.js'),'utf8');
function ctx(){
  const c={console,curVehicleId:'v1',saved:0,D:{servisLogs:[],sparepartCats:[],vehicles:[{id:'v1',name:'Vario'}]},ServiceInputCatalog:{itemById(id){
    const m={
      oli:{item:{id:'oli',name:'Oli Mesin',intervalKm:4000,intervalTimeMonths:null},group:{masterCategoryId:'servis-mesin',group:'Servis Mesin',icon:'🔧'}},
      injector:{item:{id:'injector',name:'Injector',intervalKm:8000,intervalTimeMonths:null},group:{masterCategoryId:'sistem-injeksi-pgmfi',group:'Sistem Injeksi PGM-FI',icon:'💉'}},
      coolant:{item:{id:'coolant',name:'Coolant',intervalKm:10000,intervalTimeMonths:12},group:{masterCategoryId:'sistem-pendingin',group:'Sistem Pendingin',icon:'❄️'}}
    };return m[id]||null;
  }},
  save(){this.saved++;return true;},codeFromName:s=>String(s).toUpperCase().replace(/[^A-Z0-9]+/g,'_')};
  vm.createContext(c);vm.runInContext(s2037,c,{filename:'s2037.js'});vm.runInContext(s2045,c,{filename:'s2045.js'});return c;
}
function log(c,items){
  const s={id:'h1',vehicleId:'v1',sessionId:'sess1',serviceJobId:'sess1',date:'2026-09-24',km:20000,item:items[0].itemName,serviceComponentId:items[0].serviceComponentId,masterCategoryId:items[0].masterCategoryId,checklist:items};
  c.D.servisLogs=[s];return s;
}
const item=(id,mid)=>({itemId:id,itemName:cName(id),serviceComponentId:id,masterCategoryId:mid,actionType:'ganti'});
function cName(id){return ({oli:'Oli Mesin',injector:'Injector',coolant:'Coolant'})[id]||id;}

test('S2045: 3 kategori dalam satu session tetap menjadi 3 component reminder projections',()=>{
  const c=ctx(),s=log(c,[item('oli','servis-mesin'),item('injector','sistem-injeksi-pgmfi'),item('coolant','sistem-pendingin')]);
  const a=c.ServiceSessionIntegrityS2045.audit(s);
  assert.equal(a.ok,false);assert.equal(a.componentCount,3);assert.equal(a.categoryCount,3);
  const r=c.ServiceSessionIntegrityS2045.repair(s,{persist:true});
  assert.equal(r.created.length,3);assert.equal(c.saved,1);
  const b=c.ServiceSessionIntegrityS2045.audit(s);assert.equal(b.ok,true);assert.equal(b.reminders.length,3);
  assert.equal(JSON.stringify(b.reminders.map(x=>x.intervalKm)),JSON.stringify([4000,8000,10000]));
});

test('S2045: reload shape mempertahankan semua kategori/component',()=>{
  const c=ctx(),s=log(c,[item('oli','servis-mesin'),item('injector','sistem-injeksi-pgmfi')]);
  c.ServiceSessionIntegrityS2045.repair(s,{persist:true});
  const fresh=JSON.parse(JSON.stringify(c.D));c.D=fresh;
  const b=c.ServiceSessionIntegrityS2045.verifyReloadShape(c.D.servisLogs[0]);
  assert.equal(b.ok,true);assert.equal(b.componentCount,2);assert.equal(b.reminderCount,2);assert.equal(b.categoryCount,2);
});

test('S2045: partial edit A+B+C -> A+C+D tidak meninggalkan reminder B',()=>{
  const c=ctx();const s=log(c,[item('oli','servis-mesin'),item('injector','sistem-injeksi-pgmfi'),item('coolant','sistem-pendingin')]);
  c.ServiceSessionIntegrityS2045.repair(s,{persist:true});
  s.checklist=[item('oli','servis-mesin'),item('coolant','sistem-pendingin'),item('injector','sistem-injeksi-pgmfi')];
  const b=c.ServiceSessionIntegrityS2045.audit(s);assert.equal(b.componentCount,3);assert.equal(b.reminders.length,3);
  const ids=b.reminders.map(x=>x.componentId);assert.deepEqual(new Set(ids),new Set(['oli','injector','coolant']));
});

test('S2045: identity memakai row+component, bukan componentId saja',()=>{
  const c=ctx();const s={id:'h1',vehicleId:'v1',sessionId:'sess1',checklist:[item('oli','servis-mesin')]};
  c.D.servisLogs=[s,{id:'h2',vehicleId:'v1',sessionId:'sess1',checklist:[item('oli','servis-mesin')]}];
  const rows=c.ServiceSessionIntegrityS2045.checklistComponents(s);assert.equal(rows.length,2);
  c.ServiceHistoryMultiCategorySyncS2037={components:()=>rows};
  assert.equal(c.ServiceHistoryMultiCategorySyncS2037.components(s).length,2);
});

test('S2045: missing reminder category is detectable and repairable without new store',()=>{
  const c=ctx(),s=log(c,[item('injector','sistem-injeksi-pgmfi')]);
  const a=c.ServiceSessionIntegrityS2045.audit(s);assert.equal(a.ok,false);assert.equal(a.issues[0].code,'REMINDER_CATEGORY_MISSING');
  const r=c.ServiceSessionIntegrityS2045.repair(s);assert.equal(r.created.length,1);assert.equal(c.D.sparepartCats.length,1);
  assert.equal(r.report.ok,true);
});

test('S2045: master category drift is an ERROR',()=>{
  const c=ctx(),s=log(c,[item('injector','servis-mesin')]);
  const a=c.ServiceSessionIntegrityS2045.audit(s);assert.equal(a.ok,false);assert.ok(a.issues.some(x=>x.code==='MASTER_CATEGORY_DRIFT'));
});

console.log('S2045 service-session integrity tests: PASS');
