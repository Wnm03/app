'use strict';
// S2530 — regresi: tab BBM > Analisis Lanjutan (Fuel Dashboard / Fuel Trend)
// hilang total untuk kendaraan non-SELF karena _vehicles() menyaring ownership.
// Kontrak: tampilan per-kendaraan Car Notes tidak menyaring ownership.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadSource}=require('./helpers/loadSource');

const OE=loadSource(['modules/shared/ownership-engine.js'],{},['OwnershipEngine']).OwnershipEngine;
const core=fs.readFileSync('modules/vehicle/vehicle-core.js','utf8');
const fnSrc=core.match(/function isVehicleOwnershipSelf\(vehicleId\)\{[\s\S]*?\n\}/)[0];

const SUMMARY={ok:true,healthScore:80,efficiencyScore:90,monthlyCost:1,fuel:null,highestInsight:null,remainingDistance:null,maintenanceRisk:'rendah',confidenceScore:50};

for(const own of [undefined,'SELF','FAMILY','THIRD_PARTY','INVESTOR','CUSTOMER']){
  test(`Fuel Dashboard & Fuel Trend tetap tampil untuk kendaraan ownership=${own}`,()=>{
    const els={fuelDashWrap:{style:{},innerHTML:''},fuelDashBody:{style:{},innerHTML:''},fuelTrendWrap:{style:{},innerHTML:''},fuelTrendBody:{style:{},innerHTML:''}};
    const D={vehicles:[{id:'v1',name:'Vario 125',ownership:own}]};
    const isSelf=new Function('OwnershipEngine','D',fnSrc+';return isVehicleOwnershipSelf;')(OE,D);
    const ctx=loadSource(['modules/vehicle/fuel-dashboard.js','modules/vehicle/fuel-trend-dashboard.js'],{
      document:{getElementById:id=>els[id]||null},D,curVehicleId:'v1',escapeHtml:s=>String(s),isVehicleOwnershipSelf:isSelf,
      FuelInsightEngine:{getSummary:()=>SUMMARY,getInsights:()=>({ok:true,insights:[]})}
    },['FuelDashboard','FuelTrendDashboard']);
    ctx.FuelDashboard.render();
    assert.notEqual(els.fuelDashWrap.style.display,'none','Fuel Dashboard tidak boleh disembunyikan');
    assert.ok(els.fuelDashBody.innerHTML.length>0,'Fuel Dashboard harus terender');
    ctx.FuelTrendDashboard.render();
    assert.notEqual(els.fuelTrendWrap.style.display,'none','Fuel Trend tidak boleh disembunyikan');
  });
}

test('modul fuel per-kendaraan tidak lagi menyaring ownership di _vehicles()',()=>{
  for(const f of ['fuel-dashboard','fuel-trend-dashboard','fuel-fleet-selector','fuel-intelligence-engine']){
    const src=fs.readFileSync(`modules/vehicle/${f}.js`,'utf8');
    assert.doesNotMatch(src,/isVehicleOwnershipSelf\(v\.id\)/,f);
  }
});
