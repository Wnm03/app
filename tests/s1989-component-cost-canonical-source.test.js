'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function load(){
  return loadSource(['modules/vehicle/servis-checklist.js'],{},['ServisChecklist']);
}

test('S1989-B/C source canonical: component cost state + aggregator tersedia',()=>{
  const c=load(),S=c.ServisChecklist;
  S.open('veh1');
  const item=S._item(0,0);
  assert.ok(item&&item.id);
  assert.equal(S.toggleItem(0,0).ok,true);
  assert.equal(S.setItemCost(item.id,{labor:50000,parts:70000,consumables:0,other:null}).ok,true);
  assert.deepEqual(JSON.parse(JSON.stringify(S.getItemCost(item.id))),{labor:50000,parts:70000,consumables:0,other:null,total:120000,source:'component'});
  const summary=S.costSummary();
  assert.equal(summary.total,120000);
  assert.equal(summary.labor,50000);
  assert.equal(summary.parts,70000);
  assert.equal(summary.byComponent.length,1);
  const payload=S.toLogPayload();
  assert.equal(payload[0].cost,120000);
  assert.equal(payload[0].costBreakdown.total,120000);
  assert.equal(payload[0].costBreakdown.source,'component');
});

test('S1989-B null vs zero semantics dan restore edit',()=>{
  const c=load(),S=c.ServisChecklist;
  S.open('veh1');
  const item=S._item(0,0);
  S.toggleItem(0,0);
  S.setItemCost(item.id,{labor:0,parts:null,consumables:2500,other:0});
  const payload=S.toLogPayload();
  assert.equal(payload[0].costBreakdown.labor,0);
  assert.equal(payload[0].costBreakdown.parts,null);
  assert.equal(payload[0].costBreakdown.consumables,2500);
  S.loadFromLog({checklist:payload});
  assert.deepEqual(JSON.parse(JSON.stringify(S.getItemCost(item.id))),{labor:0,parts:null,consumables:2500,other:0,total:2500,source:'component'});
});

test('S1989-B invalid negative component cost ditolak',()=>{
  const c=load(),S=c.ServisChecklist;
  S.open('veh1');
  const item=S._item(0,0);
  S.toggleItem(0,0);
  assert.throws(()=>S.setItemCost(item.id,{labor:-1}),/harus 0 atau lebih/);
});
