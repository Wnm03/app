const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(file,ctx){vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});}
const ctx={console,Date,Math,Number,String,Object,Array,JSON};
ctx.window=ctx; ctx.D={sparepartCats:[]};
ctx.ServiceInputCatalog={groups:()=>[{group:'G',icon:'',items:[{id:'thermostat',name:'Thermostat',actionMode:'periksa-conditional'},{id:'oli-mesin',name:'Oli Mesin'}]}]};
ctx.vehicleMatchesMaintenanceRuleSet=()=>true;
load('/mnt/data/v20work/tree/car-notes.js',ctx);
const p=ctx.getMaintenanceConditionProjection('v1');
assert.equal(p.length,1); assert.equal(p[0].serviceComponentId,'thermostat'); assert.equal(p[0].maintenanceType,'condition'); assert.ok(p[0].condition);
ctx.D.sparepartCats=[{serviceComponentId:'thermostat',name:'Thermostat'}];
assert.equal(ctx.getMaintenanceConditionProjection('v1').length,0);
console.log('v20 condition projection: PASS');
