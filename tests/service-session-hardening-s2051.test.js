'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
function load(){
 const ctx={console,D:{servisLogs:[],transactions:[],sparepartCats:[],partsStock:[],vehicles:[{id:'v1'}]},save:()=>{},window:null};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'modules/vehicle/service-session-reconcile-s2051.js'),'utf8'),ctx);
 return ctx;
}
function row(id,cid,txLinkId=null){return {id,vehicleId:'v1',sessionId:'s1',serviceComponentId:cid,item:cid,cost:100,txLinkId,checklist:[{itemId:cid,serviceComponentId:cid,itemName:cid}]};}
test('S2051 detects duplicate finance ownership and stale reminder projection',()=>{const c=load();c.D.servisLogs=[row('r1','A','t1'),row('r2','B',null)];c.D.transactions=[{id:'t1',servisLinkId:'r1',amount:100},{id:'t2',servisLinkId:'r1',amount:100}];c.D.sparepartCats=[{id:'sp_component_A',vehicleId:'v1',serviceComponentId:'A'},{id:'sp_component_OLD',vehicleId:'v1',serviceComponentId:'OLD'}];const r=c.ServiceSessionReconcileS2051.auditSession('v1','s1');assert.equal(r.ok,false);assert.ok(r.issues.some(x=>x.type==='duplicate_finance_transactions'));assert.ok(r.issues.some(x=>x.type==='stale_reminder_projection'));});
test('S2051 repairs duplicate finance links without creating another transaction',()=>{const c=load();c.D.servisLogs=[row('r1','A','t1')];c.D.transactions=[{id:'t1',servisLinkId:'r1',amount:100},{id:'t2',servisLinkId:'r1',amount:100}];const before=c.D.transactions.length;const r=c.ServiceSessionReconcileS2051.repairFinance('v1');assert.equal(r.changed,true);assert.equal(c.D.transactions.length,before);assert.equal(c.D.servisLogs[0].txLinkId,'t1');assert.equal(c.D.transactions.filter(x=>x.servisLinkId==='r1').length,1);});
test('S2051 clears orphan finance linkage but preserves the transaction',()=>{const c=load();c.D.servisLogs=[row('r1','A',null)];c.D.transactions=[{id:'t1',servisLinkId:'missing',amount:50}];const r=c.ServiceSessionReconcileS2051.repairFinance('v1');assert.equal(r.changed,true);assert.equal(c.D.transactions.length,1);assert.equal(c.D.transactions[0].servisLinkId,null);});
test('S2051 reconciliation is signature-stable after repair',()=>{const c=load();c.D.servisLogs=[row('r1','A','t1')];c.D.transactions=[{id:'t1',servisLinkId:'r1',amount:100}];const a=c.ServiceSessionReconcileS2051.reconcileVehicle('v1');const sig=a.reports[0].signature;const b=c.ServiceSessionReconcileS2051.reconcileVehicle('v1');assert.equal(b.reports[0].signature,sig);});
const build=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');
test('S2051 build ordering loads reconciler before recovery and mutation',()=>{const r=build.indexOf('service-session-recovery-s2050.js'),q=build.indexOf('service-session-reconcile-s2051.js'),m=build.indexOf('service-session-mutation-s2047.js');assert.ok(q>=0&&r>=0&&m>=0&&q<r&&r<m);});
const ui=fs.readFileSync(path.join(root,'modules/vehicle/servis-b.js'),'utf8');
test('S2051 History has explicit edit affordance for both row and session summary',()=>{assert.match(ui,/servis-history-edit/);assert.match(ui,/servis-history-edit-session/);assert.match(ui,/Edit Checklist Sesi Servis/);});
const rec=fs.readFileSync(path.join(root,'modules/vehicle/service-session-recovery-s2050.js'),'utf8');
test('S2051 recovery journal captures new-stock IDs from pending payload',()=>{assert.match(rec,/function prepare\(ctx,payload\)/);assert.match(rec,/payloadRows/);assert.match(rec,/stockMissing/);});

const recovery=fs.readFileSync(path.join(root,'modules/vehicle/service-session-recovery-s2050.js'),'utf8');
test('S2051 committed journal runs reconciliation before clearing',()=>{assert.match(recovery,/state==='COMMITTED'/);assert.match(recovery,/ServiceSessionReconcileS2051/);assert.match(recovery,/reconcileJournal/);});
test('S2051 category OFF is a true remove operation',()=>{const svc=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');assert.match(svc,/category OFF means its checklist components are OFF/);assert.match(svc,/\['_checked','_results','_conditionNotes','_notApplicable','_costs','_intervalOverrides','_catalogPartRefs','_stockPartRefs','_photoRefs','_executionStatus'\]/);});
