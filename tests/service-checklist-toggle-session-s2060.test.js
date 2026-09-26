'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const checklist=fs.readFileSync('modules/vehicle/servis-checklist.js','utf8');
const servis=fs.readFileSync('modules/vehicle/servis.js','utf8');
const mutation=fs.readFileSync('modules/vehicle/service-session-mutation-s2047.js','utf8');


test('S2060 checklist toggle is true add/remove SoT and clears stale component state',()=>{
  assert.match(checklist,/if \(this\._checked\[item\.id\] !== undefined\) \{/);
  assert.match(checklist,/delete this\._checked\[item\.id\];/);
  assert.match(checklist,/\['_results','_conditionNotes','_notApplicable','_costs','_intervalOverrides','_catalogPartRefs','_stockPartRefs','_photoRefs','_executionStatus'\]/);
  assert.match(checklist,/removed: true/);
});

test('S2060 checklist session edit is routed through one Session Mutation SOT',()=>{
  assert.match(servis,/_isChecklistSessionEdit/);
  assert.match(servis,/ServiceSessionMutationS2047\.reconcileAfterSave/);
  assert.match(servis,/const _s2060Payload=checklistPayload\.map/);
  assert.match(servis,/Semua checklist dilepas: sesi riwayat & pengingat terkait dihapus/);
});

test('S2060 empty checklist is allowed only for an existing checklist session edit',()=>{
  assert.match(servis,/if\(!_preSaveEffectiveItem&&!_isChecklistSessionEdit\)/);
  assert.match(servis,/if\(!_hasCanonicalChecklist&&!_isChecklistSessionEdit\)/);
});

test('S2060 mutation removes deselected component and transfers Finance owner to remaining component',async()=>{
  const sandbox={
    console,
    D:{
      servisLogs:[
        {id:'a',sessionId:'sess',serviceJobId:'sess',vehicleId:'v1',item:'A',serviceComponentId:'a',checklist:[{itemId:'a',serviceComponentId:'a',itemName:'A',costBreakdown:{source:'component',total:100}}],cost:100,txLinkId:'tx1',accountId:'cash',date:'2026-09-26',km:1000},
        {id:'b',sessionId:'sess',serviceJobId:'sess',vehicleId:'v1',item:'B',serviceComponentId:'b',checklist:[{itemId:'b',serviceComponentId:'b',itemName:'B',costBreakdown:{source:'component',total:0}}],cost:0,txLinkId:null,accountId:'cash',date:'2026-09-26',km:1000}
      ],
      transactions:[{id:'tx1',amount:100,accountId:'cash',servisLinkId:'a'}],
      partsStock:[],sparepartCats:[]
    },
    uid:(()=>{let n=0;return()=>`u${++n}`})(),
    save:()=>{},
    ServiceHistoryChecklistEditS2036:{ensureProjection:(row)=>({category:null,serviceComponentId:row.serviceComponentId,masterCategoryId:row.masterCategoryId||null,intervalKm:null,intervalBulan:null})},
    ServiceEventLifecycle:{update:()=>{},remove:()=>{},create:()=>{}},
    Servis:{replaceStockUsages:async()=>true}
  };
  sandbox.globalThis=sandbox;
  vm.runInNewContext(mutation,sandbox,{filename:'service-session-mutation-s2047.js'});
  const api=sandbox.ServiceSessionMutationS2047;
  const original=sandbox.D.servisLogs.map(x=>JSON.parse(JSON.stringify(x)));
  const result=await api.reconcileAfterSave({vehicleId:'v1',sessionId:'sess',originalRows:original,selected:original[0],txId:'tx1'},[
    {itemId:'b',serviceComponentId:'b',itemName:'B',masterCategoryId:'cat',actionType:'ganti',costBreakdown:{source:'component',total:100},date:'2026-09-26',km:1000,accountId:'cash'}
  ]);
  assert.equal(result.ok,true);
  assert.deepEqual(sandbox.D.servisLogs.map(x=>x.id),['b']);
  assert.equal(sandbox.D.servisLogs[0].txLinkId,'tx1');
  assert.equal(sandbox.D.transactions[0].servisLinkId,'b');
});

test('S2060 empty payload removes whole checklist session, Finance link and lifecycle rows',async()=>{
  const removed=[];
  const sandbox={
    D:{servisLogs:[{id:'a',sessionId:'sess',serviceJobId:'sess',vehicleId:'v1',item:'A',serviceComponentId:'a',checklist:[{itemId:'a',serviceComponentId:'a',itemName:'A',costBreakdown:{source:'component',total:100}}],cost:100,txLinkId:'tx1',accountId:'cash',date:'2026-09-26',km:1000}],transactions:[{id:'tx1',amount:100,accountId:'cash',servisLinkId:'a'}],partsStock:[],sparepartCats:[]},
    save:()=>{},uid:()=> 'u1',ServiceHistoryChecklistEditS2036:{ensureProjection:()=>({category:null})},ServiceEventLifecycle:{remove:r=>removed.push(r.id),update:()=>{},create:()=>{}},Servis:{replaceStockUsages:async()=>true}
  };
  sandbox.globalThis=sandbox;
  vm.runInNewContext(mutation,sandbox,{filename:'service-session-mutation-s2047.js'});
  const api=sandbox.ServiceSessionMutationS2047;
  const original=sandbox.D.servisLogs.map(x=>JSON.parse(JSON.stringify(x)));
  const result=await api.reconcileAfterSave({vehicleId:'v1',sessionId:'sess',originalRows:original,selected:original[0],txId:'tx1'},[]);
  assert.equal(result.ok,true);
  assert.equal(sandbox.D.servisLogs.length,0);
  assert.equal(sandbox.D.transactions.length,0);
  assert.deepEqual(removed,['a']);
});
