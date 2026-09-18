'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function ctx(D){
  return loadSource(['modules/vehicle/vehicle-core.js'], { D }, ['getFuelFullTankSegments','estimateRpPerKm','fuelEfficiency']);
}
const V={id:'v1',name:'Vario'};
const b=(id,km,liter,fullTank,cost=0)=>({id,vehicleId:'v1',km,liter,fullTank,cost,harga:liter>0&&cost>0?cost/liter:0});

test('S1840 — full-to-full tanpa partial: liter di full tank berikutnya menjadi konsumsi segmen',()=>{
  const c=ctx({vehicles:[V],bbmLogs:[b('a',1000,5,true,75000),b('b',1200,4,true,60000)]});
  const seg=c.getFuelFullTankSegments('v1');
  assert.equal(seg.length,1); assert.equal(seg[0].km,200); assert.equal(seg[0].liter,4); assert.equal(seg[0].kmPerLiter,50);
  const e=c.estimateRpPerKm('v1'); assert.equal(e.kmPerLiter,50); assert.equal(e.rpPerKm,300); assert.equal(e.avgHarga,15000);
});

test('S1840 — partial fill di antara full tank WAJIB ikut konsumsi segmen',()=>{
  const c=ctx({vehicles:[V],bbmLogs:[b('a',1000,5,true,75000),b('p',1200,2,false,30000),b('q',1400,3,false,45000),b('b',1600,4,true,60000)]});
  const seg=c.getFuelFullTankSegments('v1');
  assert.equal(seg.length,1); assert.equal(seg[0].km,600); assert.equal(seg[0].liter,9); assert.equal(seg[0].kmPerLiter,600/9);
  const e=c.estimateRpPerKm('v1'); assert.equal(e.totalLiter,9); assert.equal(e.totalKm,600); assert.equal(Math.round(e.kmPerLiter*100),Math.round((600/9)*100)); assert.equal(e.rpPerKm,135000/600);
});

test('S1840 — agregasi memakai total km/total liter, bukan rata-rata km/L per segmen',()=>{
  const c=ctx({vehicles:[V],bbmLogs:[b('a',1000,5,true,75000),b('b',1200,5,true,75000),b('c',2200,10,true,150000)]});
  const e=c.estimateRpPerKm('v1'); assert.equal(e.totalKm,1200); assert.equal(e.totalLiter,15); assert.equal(e.kmPerLiter,80); assert.equal(e.rpPerKm,225000/1200);
});

test('S1840 — partial fill tanpa km valid tidak boleh ditebak masuk segmen',()=>{
  const c=ctx({vehicles:[V],bbmLogs:[b('a',1000,5,true,75000),{id:'p',vehicleId:'v1',liter:2,fullTank:false,cost:30000},b('b',1400,4,true,60000)]});
  const seg=c.getFuelFullTankSegments('v1'); assert.equal(seg[0].liter,4); assert.equal(seg[0].kmPerLiter,100);
});

test('S1840 — fuelEfficiency() tetap memakai SSOT konsumsi yang sama',()=>{
  const c=ctx({vehicles:[V],bbmLogs:[b('a',1000,5,true,75000),b('p',1200,2,false,30000),b('b',1400,3,true,45000)],kmLogs:[{vehicleId:'v1',date:'2026-01-01',km:1000},{vehicleId:'v1',date:'2026-01-10',km:1400}]});
  const e=c.fuelEfficiency('v1'); assert.equal(e.ok,true); assert.equal(e.kmPerLiter,80); assert.equal(e.rpPerKm,187.5); assert.equal(e.avgHarga,15000);
});
