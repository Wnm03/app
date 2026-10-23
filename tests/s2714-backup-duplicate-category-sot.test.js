'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function load(categories){
  const D={vehicles:[{id:'vario110',name:'Vario 110',vehicleType:'motor',sot:{serviceCategories:categories}}],sparepartCats:[]};
  const c=loadSource(['modules/vehicle/vehicle-car-notes-sot-s2071.js'],{D,curVehicleId:'vario110'},['VehicleCarNotesSOT']);
  return {D,sot:c.VehicleCarNotesSOT};
}

test('S2714 collapses exact backup duplicate category rows with equivalent effective intervals',()=>{
  const rows=[
    {id:'sp_1787635705426',name:'Oli Mesin',vehicleId:'vario110',serviceComponentId:'oli-mesin',intervalKm:1500},
    {id:'sp_1787635705426',name:'Oli Mesin',vehicleId:'vario110',serviceComponentId:'oli-mesin',intervalKm:1500,intervalBulan:0}
  ];
  const {D,sot}=load(rows);
  const got=sot.getServiceCategories('vario110');
  assert.equal(got.length,1);
  assert.equal(got[0].id,'sp_1787635705426');
  assert.equal(got[0].serviceComponentId,'oli-mesin');
  assert.equal(got[0].intervalKm,1500);
  assert.equal(got[0].intervalBulan,0);
  assert.equal(D.vehicles[0].sot.serviceCategories.length,1);
});

test('S2714 preserves same-component rows when intervals conflict or IDs differ',()=>{
  const rows=[
    {id:'legacy-a',name:'Oli Mesin',vehicleId:'vario110',serviceComponentId:'oli-mesin',intervalKm:1500,intervalBulan:0},
    {id:'legacy-b',name:'Oli Mesin',vehicleId:'vario110',serviceComponentId:'oli-mesin',intervalKm:3000,intervalBulan:0},
    {id:'legacy-c',name:'Oli Mesin',vehicleId:'vario110',serviceComponentId:'oli-mesin',intervalKm:1500,intervalBulan:0}
  ];
  const {sot}=load(rows);
  const got=sot.getServiceCategories('vario110');
  assert.equal(got.length,3,'conflicting intervals and distinct category IDs must not be destructively merged');
});
