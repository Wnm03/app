'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
function loadMutation(){
 const ctx={console,D:{servisLogs:[],transactions:[],sparepartCats:[],partsStock:[],vehicles:[{id:'v1'}]},save:()=>{},uid:()=> 'tx_new'};
 ctx.window=ctx;ctx.ServiceSessionRecoveryS2050={persistPrepared:()=>true,markCommitted:()=>true,clearJournal:()=>{}};
 ctx.ServiceSessionIntegrityS2045={repair:()=>{}};ctx.Servis={replaceStockUsages:async()=>true,renderReminder:()=>{}};ctx.ServiceEventLifecycle={create:()=>{},update:()=>{},remove:()=>{}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'modules/vehicle/service-session-mutation-s2047.js'),'utf8'),ctx);return ctx;
}
function row(id,cid,mid,tx=null,cost=0){return {id,vehicleId:'v1',sessionId:'s1',serviceComponentId:cid,masterCategoryId:mid,item:cid,cost,txLinkId:tx,checklist:[{itemId:cid,serviceComponentId:cid,masterCategoryId:mid,itemName:cid,costBreakdown:{total:cost,source:'component'}}]};}
test('S2053 removes an entire service category through the single mutation SOT',async()=>{
 const c=loadMutation();const a=row('r1','A','cat-a','t1',100),b=row('r2','B','cat-a'),d=row('r3','C','cat-b');
 c.D.servisLogs=[a,b,d];c.D.transactions=[{id:'t1',servisLinkId:'r1',amount:100}];
 const r=await c.ServiceSessionMutationS2047.removeCategory({sessionId:'s1',vehicleId:'v1',originalRows:[a,b,d],txId:'t1'},'cat-a');
 assert.equal(r.ok,true);assert.deepEqual(c.D.servisLogs.map(x=>x.serviceComponentId),['C']);
});
test('S2053 History uses one session form for edit/add/component/category actions',()=>{
 const src=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
 for(const token of ['openHistorySessionEditor','addHistorySessionComponent','editHistorySessionComponent','removeHistorySessionComponent','removeHistorySessionCategory'])assert.match(src,new RegExp(token));
 assert.match(src,/Satu SOT.*satu sesi.*satu formulir/s);
 assert.match(src,/ServiceSessionMutationS2047\.reconcileAfterSave\(_s2060Ctx,_s2060Payload\)/);
});
test('S2053 edit path routes multi-component sessions before legacy Finance/Stock mutation',()=>{
 const src=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
 const gate=src.indexOf('const _isChecklistSessionMutation=');
 const editBranch=src.indexOf('if(Servis.editId!==null){',gate);
 const legacy=src.indexOf('if(!await Servis.replaceStockUsages(',editBranch);
 assert.ok(gate>0,'session mutation gate missing');
 assert.ok(editBranch>gate,'edit branch should remain after the session SOT gate');
 assert.ok(legacy>editBranch,'legacy single-row stock path remains only after the session gate');
});
test('S2053 mutation SOT exposes removeComponents and removeCategory',()=>{
 const src=fs.readFileSync(path.join(root,'modules/vehicle/service-session-mutation-s2047.js'),'utf8');
 assert.match(src,/async function removeComponents\(/);
 assert.match(src,/async function removeCategory\(/);
 assert.match(src,/g\.ServiceSessionMutationS2047=\{[^}]*removeComponents[^}]*removeCategory/);
});
