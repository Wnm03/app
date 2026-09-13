const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(file,ctx){vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});}
const ctx={console,Date,Math,Number,String,Object,Array,JSON};
ctx.window=ctx; ctx.D={sparepartCats:[],vehicles:[{id:'v1',name:'KZR'}]};
ctx.ServiceInputCatalog={groups:()=>[{group:'Mesin',masterCategoryId:'mesin',icon:'🔧',items:[{id:'thermostat',name:'Thermostat',actionMode:'periksa-conditional'},{id:'oli-mesin',name:'Oli Mesin',actionMode:'ganti'}]}],itemById:id=>id==='thermostat'?{group:{masterCategoryId:'mesin'}}:null};
ctx.vehicleMatchesMaintenanceRuleSet=()=>true;
load(require.resolve('../car-notes.js'),ctx);
const p=ctx.getMaintenanceConditionProjection('v1');
assert.equal(p.length,1); assert.equal(p[0].serviceComponentId,'thermostat'); assert.equal(p[0].maintenanceType,'condition'); assert.ok(p[0].condition);
const normal=ctx.getMaintenanceReminderProjection('v1');
assert.ok(Array.isArray(normal)); assert.ok(!normal.some(x=>x.serviceComponentId==='thermostat'));
assert.equal(p[0].maintenanceActionPlan.length,0);
console.log('v21 condition reminder separation: PASS');
