const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/sparepart-servis.js'),'utf8');
function load(){
 const D={vehicles:[{id:'v1'}],sparepartCats:[]};
 const ctx={D,window:{},console,Number,Date,JSON,Math,Array,Object,String,parseFloat,parseInt,isNaN,Infinity,localStorage:{getItem(){return null}}};
 ctx.getEffectiveIntervalKm=(vehicleId,cat)=>Number(cat.intervalKm)||null;
 ctx.getEffectiveIntervalBulan=(cat,vehicleId)=>Number(cat.intervalBulan)||null;
 vm.createContext(ctx); vm.runInContext(src,ctx); return ctx;
}
const c=load();
assert.strictEqual(c.formatServiceDateOnly(c.parseServiceDateOnly('2026-09-13')),'2026-09-13');
assert.strictEqual(c.formatServiceDateOnly(c.addServiceMonthsClamped('2026-01-31',1)),'2026-02-28');
assert.strictEqual(c.formatServiceDateOnly(c.addServiceMonthsClamped('2028-01-31',1)),'2028-02-29');
assert.strictEqual(c.diffServiceDays('2026-09-13','2026-09-14'),1);
const cat={id:'oil',name:'Oli',intervalKm:5000,intervalBulan:1};
const snap=c.buildServiceNextDueSnapshot({vehicleId:'v1',cat,serviceKm:80000,serviceDate:'2026-01-31'});
assert.strictEqual(snap.nextDueKm,85000);
assert.strictEqual(snap.nextDueDate,'2026-02-28');
assert.strictEqual(snap.nextDueAxis,'km_or_date');
console.log('P20 date/time boundary: 6/6 PASS');
