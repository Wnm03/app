const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

function loadServisB(){
  const src=fs.readFileSync(path.join(root,'modules/vehicle/servis-b.js'),'utf8');
  const ctx={console,D:{servisLogs:[],transactions:[]},Servis:{openModal(){},_saveInner:async()=>{}},save(){},globalThis:null};
  ctx.globalThis=ctx;
  vm.createContext(ctx); vm.runInContext(src,ctx,{filename:'servis-b.js'}); return ctx;
}
function costRow(id,cost){return {itemId:id,itemName:id,serviceComponentId:id,costBreakdown:{labor:cost,parts:0,consumables:0,other:0,total:cost,source:'component'}};}

test('S1993 F-2: edit non-first component preserves one session transaction and session total',()=>{
  const c=loadServisB();
  c.D.servisLogs=[
    {id:'a',sessionId:'s1',vehicleId:'v1',cost:75000,txLinkId:'tx1',checklist:[costRow('a',15000)]},
    {id:'b',sessionId:'s1',vehicleId:'v1',cost:0,checklist:[costRow('b',25000)]},
    {id:'c',sessionId:'s1',vehicleId:'v1',cost:0,checklist:[costRow('c',35000)]}
  ]; c.D.transactions=[{id:'tx1',amount:75000}];
  const ctx=c.Servis._buildServiceSessionEditContext('b');
  assert.equal(ctx.mergedChecklist.length,3);
  const edited=ctx.selected; edited.checklist=ctx.mergedChecklist.map(r=>r.itemId==='b'?({...r,costBreakdown:{...r.costBreakdown,labor:30000,total:30000}}):r);
  const r=c.Servis._restoreServiceSessionAfterEdit(ctx,edited);
  assert.equal(r.total,80000); assert.equal(c.D.transactions.length,1); assert.equal(c.D.transactions[0].amount,80000);
  assert.deepEqual(c.D.servisLogs.map(x=>x.cost),[80000,0,0]);
  assert.equal(c.D.servisLogs[1].checklist[0].costBreakdown.labor,30000);
  assert.equal(c.D.servisLogs[1].txLinkId,null);
});

test('S1993 F-1: legacy checklist without component cost preserves legacy cost and Finance link',()=>{
  const c=loadServisB();
  c.D.servisLogs=[
    {id:'a',sessionId:'s2',vehicleId:'v1',cost:150000,txLinkId:'tx2',checklist:[{itemId:'a',itemName:'A',actionType:'ganti'}]},
    {id:'b',sessionId:'s2',vehicleId:'v1',cost:0,checklist:[{itemId:'b',itemName:'B',actionType:'periksa'}]}
  ]; c.D.transactions=[{id:'tx2',amount:150000}];
  const ctx=c.Servis._buildServiceSessionEditContext('b');
  assert.equal(c.Servis._resolveServiceEditCost(ctx,true,{total:0},0),150000);
  const r=c.Servis._restoreServiceSessionAfterEdit(ctx,ctx.selected);
  assert.equal(r.total,150000); assert.equal(c.D.transactions.length,1); assert.equal(c.D.transactions[0].amount,150000); assert.equal(c.D.servisLogs[0].txLinkId,'tx2');
});

test('S1993 F-3/F-4: checklist component costs are canonical and negative/empty costs normalize safely',()=>{
  const src=fs.readFileSync(path.join(root,'modules/vehicle/service-event-sot.js'),'utf8');
  const ctx={console,globalThis:null};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);
  const S=ctx.ServiceEventSOT;
  const log={cost:999,serviceCost:{components:[{itemId:'x',labor:1,parts:0,consumables:0,other:0}],total:1},checklist:[{itemId:'x',costBreakdown:{labor:10,parts:20,consumables:'',other:-5,source:'component'}}]};
  const sc=S.normalizeServiceCost(log); assert.equal(sc.total,30); assert.equal(sc.components[0].labor,10); assert.equal(sc.components[0].other,null);
  const n=S.normalizeCost({cost:100,costBreakdown:{labor:-5,parts:'',consumables:2,other:3}}); assert.equal(n.labor,null); assert.equal(n.parts,null); assert.equal(n.total,100);
});
