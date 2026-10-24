'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');

function runtime(data={}){
  const c=loadSource(['modules/vehicle/service-history-reminder-reconciliation-sot.js','modules/vehicle/servis-checklist.js','car-notes.js','modules/vehicle/service-input-catalog.js','modules/vehicle/servis.js','modules/vehicle/sparepart-servis.js','modules/vehicle/sparepart-servis-b.js'],{D:Object.assign({vehicles:[{id:'v1',name:'Honda Vario 125'}],sparepartCats:[],servisLogs:[]},data)},['servisLogMatchesCat','matchesActionTypeForReset','normalizeServiceActionType','computeServiceUrgency']);
  return c;
}

test('S2727 T2: free-text log without component cannot match a component target through its master category',()=>{
  const c=runtime();
  const cat={id:'busi',vehicleId:'v1',name:'Busi',serviceComponentId:'spark-plug',masterCategoryId:'servis-mesin'};
  const log={id:'free',vehicleId:'v1',item:'Korter Piston',masterCategoryId:'servis-mesin',km:5600,actionType:'ganti'};
  assert.equal(c.ServiceHistoryReminderReconciliationSOT.match(log,cat,{vehicleId:'v1'}).ok,false);
});

test('S2727 T2: old category target without component still matches a master-category history log',()=>{
  const c=runtime();
  const cat={id:'old-cvt',vehicleId:'v1',name:'Servis Cvt',masterCategoryId:'servis-cvt'};
  const log={id:'legacy',vehicleId:'v1',item:'Servis Cvt',masterCategoryId:'servis-cvt',km:12000,actionType:'ganti'};
  assert.equal(c.ServiceHistoryReminderReconciliationSOT.match(log,cat,{vehicleId:'v1'}).ok,true);
});

test('S2727 T2: explicit component identity matches only that component',()=>{
  const c=runtime();
  const cat={id:'boss',vehicleId:'v1',name:'Boss Pulley',serviceComponentId:'slide-piece-cvt',masterCategoryId:'servis-cvt'};
  const right={id:'right',vehicleId:'v1',serviceComponentId:'slide-piece-cvt',masterCategoryId:'servis-cvt',item:'Slide Piece CVT',actionType:'ganti'};
  const wrong={id:'wrong',vehicleId:'v1',serviceComponentId:'roller-cvt',masterCategoryId:'servis-cvt',item:'Roller CVT',actionType:'ganti'};
  assert.equal(c.ServiceHistoryReminderReconciliationSOT.match(right,cat,{vehicleId:'v1'}).ok,true);
  assert.equal(c.ServiceHistoryReminderReconciliationSOT.match(wrong,cat,{vehicleId:'v1'}).ok,false);
});

test('S2727 business rule: missing actionType is not replacement evidence',()=>{
  const c=runtime();
  const cat={id:'busi',vehicleId:'v1',name:'Busi',serviceComponentId:'spark-plug'};
  assert.equal(c.matchesActionTypeForReset({serviceComponentId:'spark-plug',km:5600},cat,'ganti',true),false);
});

test('S2727 T3: category matching is delegated to the shared reconciliation SOT; no ai-chat matcher copy exists',()=>{
  const root=path.resolve(__dirname,'..');
  const engine=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis.js'),'utf8');
  const sot=fs.readFileSync(path.join(root,'modules/vehicle/service-history-reminder-reconciliation-sot.js'),'utf8');
  const ai=fs.readFileSync(path.join(root,'ai-chat.js'),'utf8');
  assert.match(engine,/ServiceHistoryReminderReconciliationSOT\.match\(s,cat/);
  assert.match(sot,/function match\(log,target,opts\)/);
  assert.doesNotMatch(ai,/function\s+servisLogMatchesCat\s*\(|function\s+_servisLogMatchesCatImpl\s*\(/);
});

test('S2727 T1: clean axis derives from effective action, not lastFilter, and replacement is admitted on clean axis',()=>{
  const src=fs.readFileSync(path.resolve(__dirname,'../modules/vehicle/sparepart-servis.js'),'utf8');
  assert.match(src,/const cleanAxis=normalizeServiceActionType\(action\)==='bersih'/);
  assert.match(src,/const effectiveFilter=cleanAxis\?'bersih':lastFilter/);
  assert.match(src,/\(\(inspectAxis\|\|cleanAxis\)&&matchesActionTypeForReset\(s,cat,'ganti',true\)\)/);
});
