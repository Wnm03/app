'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');

function loadServis(){
  const context={
    console,
    D:{
      servisLogs:[{
        id:'h1',vehicleId:'v1',sessionId:'sess1',serviceJobId:'sess1',date:'2026-09-24',km:20237,
        item:'Throttle Body (bersihkan)',serviceComponentId:'throttle-body',masterCategoryId:'sistem-injeksi-pgmfi',
        categoryId:null,actionType:'bersih',cost:0,note:'',accountId:'cash',txLinkId:null,
        checklist:[{itemId:'throttle-body',itemName:'Throttle Body (bersihkan)',serviceComponentId:'throttle-body',masterCategoryId:'sistem-injeksi-pgmfi',actionType:'bersih'}]
      }],
      sparepartCats:[],vehicles:[{id:'v1',name:'Vario 125'}],transactions:[],partsStock:[]
    },
    curVehicleId:'v1',
    ServiceInputCatalog:{itemById(id){
      const map={
        'throttle-body':{item:{id:'throttle-body',name:'Throttle Body (bersihkan)',intervalKm:8000,intervalTimeMonths:null},group:{masterCategoryId:'sistem-injeksi-pgmfi',group:'Sistem Injeksi PGM-FI',icon:'💉'}},
        injector:{item:{id:'injector',name:'Injector (bersihkan)',intervalKm:8000,intervalTimeMonths:null},group:{masterCategoryId:'sistem-injeksi-pgmfi',group:'Sistem Injeksi PGM-FI',icon:'💉'}}
      }; return map[id]||null;
    }},
    codeFromName:s=>String(s).toUpperCase().replace(/[^A-Z0-9]+/g,'_'),
    getEffectiveIntervalKm:(vid,cat)=>Number(cat.intervalKm)>0?Number(cat.intervalKm):null,
    getEffectiveIntervalBulan:(cat)=>Number(cat.intervalBulan)>0?Number(cat.intervalBulan):null,
    buildServiceNextDueSnapshot:({cat,serviceKm})=>({nextDueKm:Number(serviceKm)+Number(cat.intervalKm),nextDueDate:null,nextDueAxis:'km'}),
    uid:(()=>{let n=0;return()=>`new-${++n}`})(),
    withSaveGuardAsync:(d,id,fn)=>fn(),
    window:null,
    document:{getElementById(){return null;}}
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'servis.js'});
  const adapter=fs.readFileSync(path.join(root,'modules/vehicle/service-history-checklist-edit-s2036.js'),'utf8');
  vm.runInContext(adapter,context,{filename:'service-history-checklist-edit-s2036.js'});
  return context;
}

test('S2036: edit checklist menambah komponen menjadi row session + reminder projection',()=>{
  const ctx=loadServis();
  const s=ctx.D.servisLogs[0];
  const payload=[
    {...s.checklist[0]},
    {itemId:'injector',itemName:'Injector (bersihkan)',serviceComponentId:'injector',masterCategoryId:'sistem-injeksi-pgmfi',actionType:'bersih',intervalKmAtService:8000}
  ];
  const result=ctx.ServiceHistoryChecklistEditS2036.reconcile(s,payload,'v1','2026-09-24',20237);
  assert.equal(result.added,1);
  assert.equal(result.rows.length,2);
  const added=ctx.D.servisLogs.find(x=>x.serviceComponentId==='injector');
  assert.ok(added,'komponen baru harus tersimpan sebagai row session');
  assert.equal(added.sessionId,'sess1');
  assert.equal(added.intervalKmAtService,8000);
  assert.equal(added.nextDueKm,28237);
  assert.equal(added.reminderIntervalSource,'service-master');
  const cat=ctx.D.sparepartCats.find(x=>x.serviceComponentId==='injector');
  assert.ok(cat,'compatibility reminder category harus diprovision');
  assert.equal(cat.intervalKm,8000);
  assert.equal(cat.showInReminder,true);
  assert.equal(s.checklist.length,2,'parent history tetap membawa snapshot checklist lengkap');
});

test('S2036: session projection tidak kehilangan komponen baru setelah reload projection',()=>{
  const ctx=loadServis();
  const s=ctx.D.servisLogs[0];
  ctx.ServiceHistoryChecklistEditS2036.reconcile(s,[
    s.checklist[0],
    {itemId:'injector',itemName:'Injector (bersihkan)',serviceComponentId:'injector',masterCategoryId:'sistem-injeksi-pgmfi',actionType:'bersih'}
  ],'v1','2026-09-24',20237);
  const multiSrc=fs.readFileSync(path.join(root,'modules/vehicle/service-history-multichecklist-s2019.js'),'utf8');
  vm.runInContext(multiSrc,ctx,{filename:'service-history-multichecklist-s2019.js'});
  const api=ctx.ServiceHistoryMultiChecklistS2019;
  assert.equal(api.sessionComponents(s).length,2);
  assert.ok(api.sessionComponents(s).some(x=>x.serviceComponentId==='injector'));
});

const servisText=source;
test('S2036: edit path explicitly reconciles session rows and component-owned reminder snapshots',()=>{
  assert.match(servisText,/const _editSessionReconcile=typeof ServiceHistoryChecklistEditS2036/);
  const adapter=fs.readFileSync(path.join(root,'modules/vehicle/service-history-checklist-edit-s2036.js'),'utf8');
  assert.match(adapter,/function reconcile\(s,checklistPayload,vehicleId,serviceDate,serviceKm\)/);
  assert.match(adapter,/intervalKmAtService=projection\.intervalKm/);
  assert.match(adapter,/nextDueKm=snap\.nextDueKm/);
  assert.match(adapter,/g\.D\.servisLogs\.push\(owner\)/);
});

console.log('S2036 checklist-edit session/reminder regression tests: PASS');
