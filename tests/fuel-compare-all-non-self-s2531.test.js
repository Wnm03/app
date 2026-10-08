'use strict';
// S2531 — Fuel Compare tidak boleh hilang diam-diam kalau SEMUA kendaraan non-SELF.
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function run(vehicles){
  const els={fuelCompareWrap:{style:{},innerHTML:''},fuelCompareBody:{style:{},innerHTML:''}};
  const D={vehicles,bbmLogs:[]};
  const isSelf=(id)=>{const v=D.vehicles.find(x=>x.id===id);return !v||!v.ownership||v.ownership==='SELF';};
  const ctx=loadSource(['modules/vehicle/fuel-compare.js'],{document:{getElementById:id=>els[id]||null,addEventListener(){}},D,escapeHtml:s=>String(s),isVehicleOwnershipSelf:isSelf},['FuelCompare']);
  ctx.FuelCompare.render();
  return els;
}
test('semua kendaraan non-SELF -> kartu tampil dengan penjelasan (bukan display:none)',()=>{
  const e=run([{id:'a',name:'A',ownership:'FAMILY'},{id:'b',name:'B',ownership:'THIRD_PARTY'}]);
  assert.notEqual(e.fuelCompareWrap.style.display,'none');
  assert.match(e.fuelCompareBody.innerHTML,/milik sendiri \(SELF\)/);
});
test('tidak ada kendaraan sama sekali -> tetap disembunyikan',()=>{
  const e=run([]);
  assert.equal(e.fuelCompareWrap.style.display,'none');
});
