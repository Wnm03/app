'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

test('S2603: shared BBM validator rejects invalid values and implausible liters',()=>{
 const D={bbmLogs:[]};
 const ctx=loadSource(['modules/finance/tx-bbm.js'],{D},['validateFuelLogInput','recordBbmLog']);
 assert.equal(ctx.validateFuelLogInput({vehicleId:'v1',km:-1,liter:2}).ok,false);
 assert.equal(ctx.validateFuelLogInput({vehicleId:'v1',km:100,liter:0}).ok,false);
 assert.match(ctx.validateFuelLogInput({vehicleId:'v1',km:100,liter:201}).reason,/200 L/);
 assert.equal(ctx.recordBbmLog({vehicleId:'v1',km:100,liter:201}).ok,false);
 assert.equal(D.bbmLogs.length,0,'invalid log must not mutate persistent log array');
});

test('S2603: shared validator blocks odometer backstep by dated neighbours',()=>{
 const D={bbmLogs:[{id:'old',vehicleId:'v1',date:'2026-01-01',km:1000,liter:5},{id:'new',vehicleId:'v1',date:'2026-01-10',km:1200,liter:5}]};
 const ctx=loadSource(['modules/finance/tx-bbm.js'],{D},['validateFuelLogInput']);
 const prior=ctx.validateFuelLogInput({vehicleId:'v1',date:'2026-01-05',km:900,liter:3});
 const next=ctx.validateFuelLogInput({vehicleId:'v1',date:'2026-01-05',km:1300,liter:3});
 assert.equal(prior.ok,false);
 assert.equal(next.ok,false);
 assert.equal(ctx.validateFuelLogInput({vehicleId:'v1',date:'2026-01-05',km:1100,liter:3}).ok,true);
});

test('S2603: exact duplicate is flagged for review, not blocked or deleted',()=>{
 const row={id:'a',vehicleId:'v1',date:'2026-01-01',km:'1000',liter:'5',cost:50000,fullTank:true,spbu:'Pertamina'};
 const D={bbmLogs:[{...row},{...row,id:'b'}],vehicles:[{id:'v1',fuelTankCapacityLiter:5}]};
 const ctx=loadSource(['modules/vehicle/vehicle-core.js'],{D},['getFuelDataQuality']);
 const q=ctx.getFuelDataQuality('v1');
 assert.equal(q.possibleDuplicateCount,1);
 assert.ok(q.flags.includes('possible-duplicate'));
 assert.equal(q.validLogCount,2,'numeric strings from imports count as valid numeric values');
 assert.equal(D.bbmLogs.length,2,'quality audit is read-only');
});

test('S2603: missing cost on partial fill does not dilute measured price per liter',()=>{
 const D={bbmLogs:[
  {id:'a',vehicleId:'v1',date:'2026-01-01',km:1000,liter:4,cost:60000,harga:15000,fullTank:true},
  {id:'b',vehicleId:'v1',date:'2026-01-02',km:1100,liter:2,cost:0,harga:0,fullTank:false},
  {id:'c',vehicleId:'v1',date:'2026-01-03',km:1200,liter:3,cost:45000,harga:15000,fullTank:true}
 ],vehicles:[{id:'v1',fuelTankCapacityLiter:5}]};
 const ctx=loadSource(['modules/vehicle/vehicle-core.js'],{D},['estimateRpPerKm','getFuelConsumptionSummary']);
 const summary=ctx.getFuelConsumptionSummary('v1');
 const cost=ctx.estimateRpPerKm('v1');
 assert.equal(summary.totalLiter,5);
 assert.equal(summary.totalCostedLiter,3);
 assert.equal(cost.avgHarga,15000);
 assert.equal(cost.rpPerKm,375);
});
