'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function load(){
 const code=fs.readFileSync(require.resolve('../modules/vehicle/service-reminder-vehicle-scope-s2015.js'),'utf8');
 const root={
  D:{
   vehicles:[{id:'v125',name:'Vario 125',modelId:'m125'},{id:'v150',name:'Vario 150',modelId:'m150'}],
   sparepartCats:[]
  },
  ServiceInputCatalog:{
   itemById(id){
    const m={
     'filter-udara':{id:'filter-udara',name:'Filter Udara',masterCategoryId:'filter-udara'},
     'v-belt-cvt':{id:'v-belt-cvt',name:'V-Belt CVT',masterCategoryId:'servis-cvt'},
     'coolant':{id:'coolant',name:'Coolant',masterCategoryId:'sistem-pendingin'},
     'oli-gardan':{id:'oli-gardan',name:'Oli Gardan/Final Drive',masterCategoryId:'final-gear'}
    };
    const item=m[id]; return item?{item,group:{masterCategoryId:item.masterCategoryId}}:null;
   },
   infer(name){return null;}
  },
  VehicleCatalog:{
   getStore(){return {items:[
    {id:'p-filter',partName:'Filter Udara',compatibleVehicleIds:['v125']},
    {id:'p-vbelt',partName:'V-Belt CVT',compatibleVehicleIds:['v125']},
    {id:'p-coolant',partName:'Coolant',compatibleVehicleIds:['v125']},
    {id:'p-oli',partName:'Oli Gardan/Final Drive',compatibleVehicleIds:['v125']}
   ]};}
  }
 };
 root.globalThis=root; root.setTimeout=()=>{}; root.console=console;
 vm.runInNewContext(code,root,{filename:'service-reminder-vehicle-scope-s2014.js'});
 return root;
}

const r=load();
const cats=r.D.sparepartCats=[
 {id:'legacy-filter',name:'Saringan udara',intervalKm:16000,showInReminder:true},
 {id:'canonical-filter',name:'Filter Udara',serviceComponentId:'filter-udara',intervalKm:16000,showInReminder:true},
 {id:'foreign',name:'Filter Udara',serviceComponentId:'filter-udara',vehicleId:'v150',intervalKm:16000,showInReminder:true},
 {id:'universal-vbelt',name:'Drive belt (v-belt CVT)',intervalKm:32000,showInReminder:true,catalogPartId:'p-vbelt'},
 {id:'canonical-vbelt',name:'V-Belt CVT',serviceComponentId:'v-belt-cvt',intervalKm:32000,showInReminder:true,catalogPartId:'p-vbelt'},
 {id:'foreign-coolant',name:'Coolant',serviceComponentId:'coolant',intervalKm:4000,showInReminder:true,catalogPartId:'p-coolant'}
];

let p=r.ServiceReminderVehicleScopeS2014.projectCategories(r.D.sparepartCats,'v125');
assert.strictEqual(p.filter(x=>x._s2014ComponentId==='filter-udara').length,1,'filter alias duplicate must collapse');
assert.strictEqual(p.filter(x=>x._s2014ComponentId==='v-belt-cvt').length,1,'v-belt alias duplicate must collapse');
assert.ok(!p.some(x=>x.id==='foreign'),'foreign vehicle category must be hidden');
assert.ok(p.some(x=>x.id==='canonical-filter'),'canonical row should win alias');
assert.ok(p.some(x=>x.id==='canonical-vbelt'),'canonical row should win alias');
assert.ok(r.ServiceReminderVehicleScopeS2014.isVisible({name:'V-Belt CVT',catalogPartId:'p-vbelt'},'v125'),'compatible catalog row must be visible');
assert.ok(!r.ServiceReminderVehicleScopeS2014.isVisible({name:'V-Belt CVT',catalogPartId:'p-vbelt'},'v150'),'explicitly incompatible catalog row must be hidden');
assert.ok(!r.ServiceReminderVehicleScopeS2014.isVisible({name:'Saringan udara',_s2014DuplicateOf:'filter-udara'},'v125'),'dedupe marker must hide duplicate from all reminder consumers');

r.D.sparepartCats=[
 {id:'a',name:'Saringan udara',intervalKm:16000,showInReminder:true},
 {id:'b',name:'Filter Udara',serviceComponentId:'filter-udara',intervalKm:16000,showInReminder:true}
];
const c=r.ServiceReminderVehicleScopeS2014.cleanupPersistedDuplicates();
assert.strictEqual(c.hidden,1,'persisted duplicate should be hidden idempotently');
assert.strictEqual(r.D.sparepartCats.filter(x=>x.showInReminder!==false).length,1);
assert.strictEqual(r.D.sparepartCats[0].serviceComponentId,'filter-udara','legacy alias must be canonicalized');
const before=r.D.sparepartCats.map(x=>x.showInReminder);
r.ServiceReminderVehicleScopeS2014.cleanupPersistedDuplicates();
assert.deepStrictEqual(r.D.sparepartCats.map(x=>x.showInReminder),before,'cleanup must be idempotent');

console.log('S2014 PASS');
