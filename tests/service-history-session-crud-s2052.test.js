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
function row(id,cid,tx=null){return {id,vehicleId:'v1',sessionId:'s1',serviceComponentId:cid,item:cid,cost:cid==='A'?100:0,txLinkId:tx,checklist:[{itemId:cid,serviceComponentId:cid,itemName:cid,costBreakdown:{total:cid==='A'?100:0,source:'component'}}]};}
test('S2052 exposes session component removal through S2047 mutation SOT',()=>{const c=loadMutation();const a=row('r1','A','t1'),b=row('r2','B',null);c.D.servisLogs=[a,b];c.D.transactions=[{id:'t1',servisLinkId:'r1',amount:100}];return c.ServiceSessionMutationS2047.removeComponent({sessionId:'s1',vehicleId:'v1',originalRows:[a,b],txId:'t1'},'B').then(r=>{assert.equal(r.ok,true);assert.equal(c.D.servisLogs.some(x=>x.serviceComponentId==='B'),false);assert.equal(c.D.servisLogs.some(x=>x.serviceComponentId==='A'),true);assert.equal(c.D.servisLogs.find(x=>x.serviceComponentId==='A').txLinkId,'t1');});});
const ui=fs.readFileSync(path.join(root,'modules/vehicle/servis-b.js'),'utf8');
test('S2052 History session UI exposes edit/add/delete component actions',()=>{assert.match(ui,/openHistorySessionEditor/);assert.match(ui,/addHistorySessionComponent/);assert.match(ui,/removeHistorySessionComponent/);assert.match(ui,/Edit Sesi/);assert.match(ui,/Tambah Komponen|Tambah/);assert.match(ui,/Hapus/);});
const history=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
test('S2052 Edit Riwayat tab exposes session CRUD controls',()=>{assert.match(history,/Riwayat checklist dapat diedit sebagai satu sesi/);assert.match(history,/Servis\.openHistorySessionEditor/);assert.match(history,/Servis\.addHistorySessionComponent/);assert.match(history,/Servis\.removeHistorySessionComponent/);});
const rec=fs.readFileSync(path.join(root,'modules/vehicle/service-session-recovery-s2050.js'),'utf8');
test('S2052 recovery snapshots sparepartCats and does not clear failed reconciliation',()=>{assert.match(rec,/sparepartCats:clone/);assert.match(rec,/status:'reconcile-pending'/);assert.match(rec,/reconciliation&&reconciliation\.ok===false/);});
const mut=fs.readFileSync(path.join(root,'modules/vehicle/service-session-mutation-s2047.js'),'utf8');
test('S2052 removes duplicate PREPARED journal write',()=>{const m=mut.match(/persistPrepared\(ctx,payload\)/g)||[];assert.equal(m.length,1);});
