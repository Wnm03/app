'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function makeCore(logs){
 const D={bbmLogs:logs,vehicles:[{id:'v1',fuelTankCapacityLiter:5}]};
 return {D,ctx:loadSource(['modules/vehicle/vehicle-core.js'],{D},['getFuelFullTankSegments','getFuelConsumptionSummary','estimateRpPerKm','getFuelDataQuality'])};
}
test('S2602 behavior: SSOT sums full-to-full km and all intervening partial fills',()=>{
 const {ctx}=makeCore([
  {id:'a',vehicleId:'v1',km:1000,liter:4,fullTank:true,cost:50000,date:'2026-01-01'},
  {id:'b',vehicleId:'v1',km:1100,liter:2,fullTank:false,cost:0,date:'2026-01-02'},
  {id:'c',vehicleId:'v1',km:1200,liter:3,fullTank:true,cost:45000,date:'2026-01-03'}
 ]);
 const s=ctx.getFuelConsumptionSummary('v1');
 assert.equal(s.kmPerLiter,40);
 assert.equal(s.totalKm,200);
 assert.equal(s.totalLiter,5);
 assert.equal(s.segmentCount,1);
});
test('S2602 behavior: imported numeric strings are normalized, and no measurable segment returns null',()=>{
 const {ctx}=makeCore([
  {id:'a',vehicleId:'v1',km:'1000',liter:'4',fullTank:true},
  {id:'b',vehicleId:'v1',km:'1100',liter:'2',fullTank:false},
  {id:'c',vehicleId:'v1',km:'1200',liter:'3',fullTank:true}
 ]);
 assert.equal(ctx.getFuelConsumptionSummary('v1').kmPerLiter,40);
 const empty=makeCore([{id:'x',vehicleId:'v1',km:'1000',liter:'4',fullTank:true}]).ctx;
 assert.equal(empty.getFuelConsumptionSummary('v1'),null);
});
