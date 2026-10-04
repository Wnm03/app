'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function makeCtx(D){
  const ctx=loadSource(['modules/vehicle/sparepart-servis-ui.js'],{
    D,curVehicleId:'v1',Sparepart:{},save:()=>true,codeFromName:s=>String(s).slice(0,3).toUpperCase(),
    document:{getElementById:()=>null,querySelectorAll:()=>[]},MY_WRENCH:{},toast:()=>{},
    VehicleCarNotesSOT:null
  },['Sparepart']);
  const canonical=D.vehicles.find(v=>v.id==='v1').sot.serviceCategories;
  ctx.VehicleCarNotesSOT={
    getServiceCategories:()=>JSON.parse(JSON.stringify(canonical)),
    upsertServiceCategory:(vid,cat)=>{const i=canonical.findIndex(x=>x.id===cat.id); if(i>=0)canonical[i]=Object.assign({},canonical[i],cat); else canonical.push(Object.assign({},cat)); return {ok:true};},
    reconcileLegacyCategoryProjection:vid=>{for(const c of canonical){const i=D.sparepartCats.findIndex(x=>x.vehicleId===vid&&x.id===c.id); if(i>=0)D.sparepartCats[i]=Object.assign({},D.sparepartCats[i],c); else D.sparepartCats.push(Object.assign({},c));} return {ok:true};},
    syncLegacyCategoryProjection:(cat)=>{const c=Object.assign({},cat);const i=canonical.findIndex(x=>x.id===c.id);if(i>=0)canonical[i]=c;else canonical.push(c);const j=D.sparepartCats.findIndex(x=>x.vehicleId==='v1'&&x.id===c.id);if(j>=0)D.sparepartCats[j]=Object.assign({},D.sparepartCats[j],c);else D.sparepartCats.push(c);return {ok:true};}
  };
  return ctx;
}

test('S2454 CSV update of a global legacy category never mutates the global row into vehicle ownership',()=>{
  const D={vehicles:[{id:'v1',name:'Vario',sot:{serviceCategories:[]}}],sparepartCats:[{id:'global-aki',name:'Aki',intervalKm:8000,vehicleId:null}]};
  const ctx=makeCtx(D);
  const r=ctx.Sparepart.commitCategoryCSV([{nama:'Aki',intervalKm:12000}]);
  assert.equal(r.updated,1);
  const global=D.sparepartCats.find(c=>c.id==='global-aki');
  assert.equal(global.vehicleId,null);
  const scoped=D.sparepartCats.find(c=>c.vehicleId==='v1'&&c.name==='Aki');
  assert.ok(scoped,'vehicle-scoped canonical projection must be created');
  assert.equal(scoped.intervalKm,12000);
  assert.equal(D.vehicles[0].sot.serviceCategories.length,1);
  assert.equal(D.vehicles[0].sot.serviceCategories[0].intervalKm,12000);
});

console.log('S2454 CSV category SOT boundary gate: 1/1 PASS');
