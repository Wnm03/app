'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function load(logs=[]){
  return loadSource(['modules/vehicle/service-event-sot.js'],{D:{servisLogs:logs}} ,['ServiceEventSOT']);
}

test('S1989-D/E SOT: component costs normalize menjadi satu serviceCost canonical',()=>{
  const c=load();
  const log={cost:175000,checklist:[
    {itemId:'oil',itemName:'Oli Mesin',serviceComponentId:'c-oil',costBreakdown:{labor:50000,parts:70000,consumables:0,other:null,total:120000,source:'component'}},
    {itemId:'filter',itemName:'Filter Oli',serviceComponentId:'c-filter',costBreakdown:{labor:20000,parts:35000,consumables:null,other:0,total:55000,source:'component'}}
  ]};
  const r=c.ServiceEventSOT.normalize(log,{persist:false});
  assert.equal(r.ok,true);
  assert.equal(log.serviceCost.total,175000);
  assert.equal(log.serviceCost.labor,70000);
  assert.equal(log.serviceCost.parts,105000);
  assert.equal(log.serviceCost.components.length,2);
  assert.equal(log.costBreakdown.source,'component');
  assert.equal(log.costBreakdown.total,175000);
});

test('S1989-D legacy total tetap historical_total dan tidak ditebak sebagai jasa/part',()=>{
  const c=load();
  const log={cost:150000};
  c.ServiceEventSOT.normalize(log,{persist:false});
  assert.equal(log.costBreakdown.total,150000);
  assert.equal(log.costBreakdown.labor,null);
  assert.equal(log.costBreakdown.parts,null);
  assert.equal(log.costBreakdown.source,'historical_total');
  assert.equal(log.serviceCost,undefined);
});

test('S1989-E session cost projection memilih serviceCost canonical atau merekonstruksi dari component rows',()=>{
  const logs=[
    {id:'a',sessionId:'s1',vehicleId:'v1',cost:175000,serviceCost:{labor:70000,parts:105000,consumables:0,other:0,total:175000,source:'component',components:[]}},
    {id:'b',sessionId:'s1',vehicleId:'v1',cost:0}
  ];
  const c=load(logs);
  const r=c.ServiceEventSOT.costForSession('s1','v1');
  assert.equal(r.total,175000);
  assert.equal(r.parts,105000);
});
