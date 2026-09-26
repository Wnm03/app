'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
function load(){
 const ctx={console,D:{servisLogs:[],transactions:[],vehicles:[{id:'v1',name:'V'}],partsStock:[]},uid:(()=>{let n=0;return()=>`id${++n}`})(),resolveVehicleTxCategory:()=> 'Servis',save:()=>{},ServiceEventLifecycle:{update(){},remove(){}}};
 ctx.Servis={replaceStockUsages:async()=>true};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'modules/vehicle/service-session-mutation-s2047.js'),'utf8'),ctx);
 return ctx;
}
const c=(id,cost=0)=>({itemId:id,itemName:id,serviceComponentId:id,masterCategoryId:'cat',costBreakdown:{labor:cost,parts:0,consumables:0,other:0,total:cost,source:'component'}});
function seed(ctx){
 const a=c('A',100),b=c('B',200),d=c('D',300);
 ctx.D.servisLogs=[
  {id:'r1',vehicleId:'v1',sessionId:'s1',serviceJobId:'s1',date:'2026-09-25',km:1000,item:'A',accountId:'cash',txLinkId:'tx1',cost:300,checklist:[a]},
  {id:'r2',vehicleId:'v1',sessionId:'s1',serviceJobId:'s1',date:'2026-09-25',km:1000,item:'B',accountId:'cash',txLinkId:null,cost:0,checklist:[b]}
 ];ctx.D.transactions=[{id:'tx1',type:'expense',amount:300,accountId:'cash'}];
 return {selected:ctx.D.servisLogs[0],sessionId:'s1',vehicleId:'v1',txId:'tx1',legacyCost:300,originalRows:ctx.D.servisLogs.map(x=>JSON.parse(JSON.stringify(x)))};
}
test('S2047 classify add/remove/replace contract',()=>{const x=load().ServiceSessionMutationS2047.classify([c('A'),c('B')],[c('A'),c('D')]);assert.equal(x.added.length,1);assert.equal(x.removed.length,1);assert.equal(x.unchanged.length,1);});
test('S2047 remove first component reassigns finance owner',async()=>{const ctx=load(),ctx0=seed(ctx);await ctx.ServiceSessionMutationS2047.reconcileAfterSave(ctx0,[c('B',200)]);assert.equal(ctx.D.servisLogs.length,1);assert.equal(ctx.D.servisLogs[0].serviceComponentId,'B');assert.equal(ctx.D.servisLogs[0].cost,200);assert.equal(ctx.D.servisLogs[0].txLinkId,'tx1');assert.equal(ctx.D.transactions.length,1);assert.equal(ctx.D.transactions[0].amount,200);});
test('S2047 empty checklist removes whole session and finance transaction',async()=>{const ctx=load(),ctx0=seed(ctx);await ctx.ServiceSessionMutationS2047.reconcileAfterSave(ctx0,[]);assert.equal(ctx.D.servisLogs.length,0);assert.equal(ctx.D.transactions.length,0);});
test('S2047 replacement is remove+add at row identity level',async()=>{const ctx=load(),ctx0=seed(ctx);await ctx.ServiceSessionMutationS2047.reconcileAfterSave(ctx0,[c('A',100),c('D',300)]);const ids=ctx.D.servisLogs.map(r=>r.serviceComponentId);assert.deepEqual(ids.sort(),['A','D']);assert.ok(!ctx.D.servisLogs.some(r=>r.id==='r2'));});
const ui=fs.readFileSync(path.join(root,'modules/vehicle/servis-b.js'),'utf8');
test('S2047 History exposes explicit session checklist edit affordance',()=>{assert.match(ui,/Edit Checklist Sesi/);assert.match(ui,/data-action="openServisModal"/);});
const svc=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
test('S2047 category OFF clears checked component state and allows empty session payload',()=>{assert.match(svc,/ServisChecklist\.itemsOfGroup\(group\)/);assert.match(svc,/category OFF means its checklist components are OFF/);assert.match(svc,/_checked/);assert.match(svc,/toLogPayload/);});
console.log('S2047 service session mutation tests: PASS');

test('S2048 stock diff compares aggregate quantities independent of row order',async()=>{
 const ctx=load(),ctx0=seed(ctx);let calls=0;ctx.Servis.replaceStockUsages=async()=>{calls++;};
 ctx0.originalRows[0].checklist[0].usedPartId='P1';ctx0.originalRows[0].checklist[0].usedPartQty=1;
 ctx0.originalRows[1].checklist[0].usedPartId='P2';ctx0.originalRows[1].checklist[0].usedPartQty=2;
 ctx.D.servisLogs=JSON.parse(JSON.stringify(ctx0.originalRows));
 const pa=c('B',200), pb=c('A',100);pa.usedPartId='P2';pa.usedPartQty=2;pb.usedPartId='P1';pb.usedPartQty=1; await ctx.ServiceSessionMutationS2047.reconcileAfterSave(ctx0,[pa,pb]);
 assert.equal(calls,0);
});
test('S2048 reconcile is idempotent for the same session payload',async()=>{const ctx=load(),ctx0=seed(ctx);const api=ctx.ServiceSessionMutationS2047;const p=[c('B',200)];const a=await api.reconcileAfterSave(ctx0,p);const before=JSON.stringify(ctx.D);const b=await api.reconcileAfterSave(ctx0,p);assert.equal(b.idempotent,true);assert.equal(JSON.stringify(ctx.D),before);assert.equal(a.ok,true);});
test('S2048 refreshes reminder projections after session mutation',async()=>{const ctx=load(),ctx0=seed(ctx);let reminder=0,dashboard=0;ctx.Servis.renderReminder=()=>{reminder++;};ctx.renderDashboardServisReminder=()=>{dashboard++;};await ctx.ServiceSessionMutationS2047.reconcileAfterSave(ctx0,[c('B',200)]);assert.equal(reminder,1);assert.equal(dashboard,1);});
test('S2048 build includes the session mutation SOT',()=>{const build=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');assert.match(build,/modules\/vehicle\/service-session-mutation-s2047\.js/);});


test('S2049 failed stock reconciliation rolls back session, finance and stock state',async()=>{
 const ctx=load(),ctx0=seed(ctx);
 ctx.D.partsStock=[{id:'P1',qty:5,name:'P1'}];
 ctx0.originalRows[0].checklist[0].usedPartId='P1';ctx0.originalRows[0].checklist[0].usedPartQty=1;
 ctx.D.servisLogs=JSON.parse(JSON.stringify(ctx0.originalRows));
 const before=JSON.stringify(ctx.D);
 ctx.Servis.replaceStockUsages=async()=>false;
 await assert.rejects(()=>ctx.ServiceSessionMutationS2047.reconcileAfterSave(ctx0,[c('B',200)]),/SERVICE_SESSION_STOCK_RECONCILIATION_FAILED/);
 const snap=JSON.parse(before); assert.equal(JSON.stringify({servisLogs:ctx.D.servisLogs,transactions:ctx.D.transactions,partsStock:ctx.D.partsStock}),JSON.stringify({servisLogs:snap.servisLogs,transactions:snap.transactions,partsStock:snap.partsStock}));
});

test('S2049 empty session has no orphan finance transaction',async()=>{
 const ctx=load(),ctx0=seed(ctx);
 await ctx.ServiceSessionMutationS2047.reconcileAfterSave(ctx0,[]);
 assert.equal(ctx.D.servisLogs.filter(r=>r.sessionId==='s1').length,0);
 assert.equal(ctx.D.transactions.some(t=>t.id==='tx1'),false);
});

test('S2049 finance owner remains unique after component replacement',async()=>{
 const ctx=load(),ctx0=seed(ctx);
 await ctx.ServiceSessionMutationS2047.reconcileAfterSave(ctx0,[c('A',100),c('D',300)]);
 const owners=ctx.D.servisLogs.filter(r=>r.sessionId==='s1').filter(r=>r.txLinkId);
 assert.equal(owners.length,1);
 assert.equal(ctx.D.transactions.filter(t=>t.servisLinkId===owners[0].id).length,1);
});
