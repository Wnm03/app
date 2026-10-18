'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function core(logs){
 const D={bbmLogs:logs};
 return loadSource(['modules/vehicle/vehicle-core.js'],{D},['getFuelFullTankSegments','getFuelConsumptionSummary']);
}
test('S2601 behavior: partial fill between full anchors contributes to consumption',()=>{
 const ctx=core([
  {id:'a',vehicleId:'v',km:20859,liter:4.2,fullTank:true},
  {id:'b',vehicleId:'v',km:21088,liter:3.5,fullTank:false},
  {id:'c',vehicleId:'v',km:21310,liter:4.5,fullTank:true}
 ]);
 const summary=ctx.getFuelConsumptionSummary('v');
 assert.equal(summary.totalKm,451);
 assert.equal(summary.totalLiter,8);
 assert.equal(summary.kmPerLiter,451/8);
});
test('S2601 behavior: one full-tank anchor is insufficient and returns no consumption',()=>{
 const ctx=core([{id:'a',vehicleId:'v',km:100,liter:4,fullTank:true}]);
 assert.equal(ctx.getFuelConsumptionSummary('v'),null);
});
