'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function ctx(D){
  return loadSource(['modules/vehicle/vehicle-core.js'], { D }, ['getFuelDataQuality','estimateRpPerKm','fuelEfficiency']);
}
const V={id:'v1',name:'Vario'};
const b=(id,km,liter,fullTank,cost=0,date='2026-01-01')=>({id,vehicleId:'v1',km,liter,fullTank,cost,harga:liter>0&&cost>0?cost/liter:0,date});

test('S1841 — kualitas data mendeteksi partial fill tanpa KM tanpa mengubah konsumsi',()=>{
  const c=ctx({vehicles:[V],bbmLogs:[b('a',1000,5,true,75000),{id:'p',vehicleId:'v1',liter:2,fullTank:false,cost:30000},b('b',1400,4,true,60000)]});
  const q=c.getFuelDataQuality('v1');
  assert.equal(q.status,'warning');
  assert.equal(q.partialMissingKmCount,1);
  assert.ok(q.flags.includes('partial-fill-missing-km'));
  assert.equal(c.estimateRpPerKm('v1').kmPerLiter,100);
});

test('S1841 — odometer backstep ditandai sebagai warning',()=>{
  const c=ctx({vehicles:[V],bbmLogs:[b('a',1000,5,true,75000,'2026-01-01'),b('b',900,4,true,60000,'2026-01-02'),b('c',1400,5,true,75000,'2026-01-03')]});
  const q=c.getFuelDataQuality('v1');
  assert.equal(q.odometerBackstepCount,1);
  assert.ok(q.flags.includes('odometer-backstep'));
});

test('S1841 — kapasitas tangki opsional mendeteksi full fill tidak wajar',()=>{
  const c=ctx({vehicles:[{...V,fuelTankCapacityLiter:5.5}],bbmLogs:[b('a',1000,6.5,true,97500),b('b',1200,5,true,75000)]});
  const q=c.getFuelDataQuality('v1');
  assert.equal(q.capacityLiter,5.5);
  assert.equal(q.overCapacityFillCount,1);
  assert.ok(q.flags.includes('full-fill-over-capacity'));
});

test('S1841 — segment outlier hanya ditandai, tidak dikeluarkan dari SSOT',()=>{
  const logs=[
    b('a',1000,5,true,75000), b('b',1200,5,true,75000),
    b('c',2200,5,true,75000), b('d',2400,20,true,300000),
    b('e',2600,5,true,75000), b('f',2800,5,true,75000),
  ];
  const c=ctx({vehicles:[V],bbmLogs:logs});
  const q=c.getFuelDataQuality('v1');
  assert.ok(q.outlierSegmentIndexes.length>=1);
  assert.equal(q.segmentCount,5);
  assert.equal(c.estimateRpPerKm('v1').segmentCount,5);
});

test('S1841 — fuelEfficiency membawa transparansi metode dan kualitas data',()=>{
  const c=ctx({vehicles:[V],bbmLogs:[b('a',1000,5,true,75000),b('b',1200,4,true,60000)] ,kmLogs:[{vehicleId:'v1',date:'2026-01-01',km:1000},{vehicleId:'v1',date:'2026-01-10',km:1200}]});
  const e=c.fuelEfficiency('v1');
  assert.equal(e.method,'full-to-full-total-km-total-liter');
  assert.equal(e.segmentCount,1);
  assert.equal(e.dataQuality.status,'ok');
});
