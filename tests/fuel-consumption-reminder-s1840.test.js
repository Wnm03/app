'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function ctx(D, fuel, segments, curKm=1300) {
  return loadSource(['modules/vehicle/vehicle-reminder.js'], {
    D,
    fuelEfficiency: () => fuel,
    getVehicleKm: () => curKm,
    getFuelFullTankSegments: () => segments,
    estimateServiceDateISO: () => null,
    isVehicleOwnershipSelf: () => true,
    predictService: () => ({ok:true,items:[]}),
    VEHTAX_ITEMS: {},
    dateStatusBadge: () => ({col:''}),
    daysUntilDate: () => 999,
  }, ['VehicleReminder']);
}
const V={id:'v1',name:'Vario'};

test('S1840 — fuel reminder memakai rata-rata liter segmen full-to-full, termasuk partial fill',()=>{
  const D={vehicles:[V],bbmLogs:[
    {vehicleId:'v1',km:1000,liter:5,fullTank:true},
    {vehicleId:'v1',km:1100,liter:2,fullTank:false},
    {vehicleId:'v1',km:1200,liter:8,fullTank:true},
    {vehicleId:'v1',km:1300,liter:1,fullTank:false},
  ]};
  const c=ctx(D,{ok:true,kmPerLiter:20,kmPerDay:10},[{km:200,liter:10,kmPerLiter:20},{km:200,liter:8,kmPerLiter:25}],1360);
  const rows=c.VehicleReminder.fuelReminders('v1');
  assert.equal(rows.length,1); assert.equal(rows[0].severity,'due-soon');
  // avg segment liters = 9; range = 9*20 = 180; 160 km since last full => 20 km left.
  assert.match(rows[0].message,/20 km/);
});

test('S1840 — tanpa segmen full-to-full valid, reminder tidak menebak range dari satu full tank',()=>{
  const D={vehicles:[V],bbmLogs:[{vehicleId:'v1',km:1000,liter:5,fullTank:true}]};
  const c=ctx(D,{ok:true,kmPerLiter:20,kmPerDay:10},[],1200);
  assert.equal(c.VehicleReminder.fuelReminders('v1').length,0);
});
