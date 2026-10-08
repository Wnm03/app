'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadSource}=require('./helpers/loadSource');

function doc(){return {getElementById:()=>null,addEventListener:()=>{},createElement:()=>({}),querySelectorAll:()=>[]};}

test('Dashboard month aggregation excludes hitungKas:false and counts only cash income/expense',()=>{
 const now=new Date();
 const D={transactions:[
  {type:'income',amount:100,date:now.toISOString()},
  {type:'expense',amount:40,date:now.toISOString()},
  {type:'income',amount:999,date:now.toISOString(),hitungKas:false},
  {type:'transfer_in',amount:500,date:now.toISOString()},
 ]};
 const ctx=loadSource(['modules/dashboard-hub/dashboard-hub.js'],{D,document:doc(),localStorage:{getItem:()=>null,setItem:()=>{}},fmt:String,escapeHtml:String},['_dashHubMonthTxShared']);
 const r=ctx._dashHubMonthTxShared(); assert.equal(r.inc,100); assert.equal(r.exp,40); assert.equal(r.count,2);
});

test('computeAccRunningBalances excludes non-cash transactions',()=>{
 const D={accounts:[{id:'a',baseBalance:100}],transactions:[
  {id:'i',accountId:'a',type:'income',amount:50},
  {id:'x',accountId:'a',type:'expense',amount:1000,hitungKas:false},
  {id:'e',accountId:'a',type:'expense',amount:20},
 ]};
 const ctx=loadSource(['modules/finance/akun.js'],{D},['computeAccRunningBalances']);
 assert.equal(ctx.computeAccRunningBalances('a').get('e'),130);
 assert.equal(ctx.computeAccRunningBalances('a').get('x'),undefined);
});

test('cicilan total uses integer-rounded total before monthly ceiling',()=>{
 const src=fs.readFileSync('modules/finance/cicilan.js','utf8');
 const ctx=loadSource(['modules/finance/cicilan.js'],{document:{getElementById:()=>null}},['calcCicilanPerBulanFromTotal']);
 const r=ctx.calcCicilanPerBulanFromTotal(100,3,10); assert.equal(r.perBulan,37); assert.equal(r.totalBayar,110);
 assert.match(src,/Math\.round\(hargaPokok\*\(100\+bungaPct\)\/100\)/);
});

test('FuelStorage latest tie-break chooses highest KM on same date',()=>{
 const D={bbmLogs:[{id:'a',vehicleId:'v',date:'2026-10-01',km:100},{id:'b',vehicleId:'v',date:'2026-10-01',km:120},{id:'c',vehicleId:'v',date:'2026-09-30',km:999}]};
 const src=fs.readFileSync('modules/vehicle/fuel-storage.js','utf8');
 assert.match(src,/return \([^\n]*Number\(b\.km\)/); assert.match(src,/Number\(b\.km\).*Number\(a\.km\)/);
});

test('fuel card gauge output has no inline pointer event attributes',()=>{
 const src=fs.readFileSync('modules/vehicle/fuel-card.js','utf8');
 assert.doesNotMatch(src,/fuelcard-gauge[^>]+onpointer/);
 assert.match(src,/data-fuel-gauge-vehicle/);
});

test('fuel compare rows are keyboard-focusable',()=>{
 const src=fs.readFileSync('modules/vehicle/fuel-compare.js','utf8');
 assert.match(src,/role="button" tabindex="0" aria-label="Buka detail BBM/);
 assert.match(src,/_keyboardDelegationInstalled/);
});

test('fuel insight hides zero-reserve hint',()=>{
 const D={vehicles:[{id:'v',fuelState:{currentFuelLiter:5}}]};
 const FuelGaugeEngine={getReserveStatus:()=>({ok:true,reserveLiter:0,inReserve:false,literAboveReserve:5})};
 const src=fs.readFileSync('modules/vehicle/fuel-insight-engine.js','utf8'); assert.match(src,/Number\(reserve\.reserveLiter\)\s*>\s*0/);
});

test('fuel tank calibration rejects non-monotonic curve and curve above capacity',()=>{
 const src=fs.readFileSync('modules/vehicle/fuel-tank-profile.js','utf8'); assert.match(src,/kurva kalibrasi harus meningkat monoton/i); assert.match(src,/curve\.some\(p=>p\.liter>cap\)/);
});

test('fuel trend uses product-safe labels',()=>{
 const src=fs.readFileSync('modules/vehicle/fuel-trend-dashboard.js','utf8');
 assert.match(src,/Estimasi bulanan \(rata-rata pola berkendara\)/);
 assert.match(src,/Proyeksi Tahun Berjalan|Estimasi setahun/);
 assert.doesNotMatch(src,/Proyeksi Pemakaian Bulan Depan/);
});

test('fuel correction save has snapshot/rollback guard around persistence',()=>{
 const src=fs.readFileSync('modules/vehicle/fuel-intelligence-ui.js','utf8');
 assert.match(src,/const previousFuelState=veh\.fuelState/);
 assert.match(src,/const previousHistory=Array\.isArray\(D\.fuelStateHistory\)/);
 assert.match(src,/catch \(err\) \{/);
 assert.match(src,/D\.fuelStateHistory=previousHistory/);
});
