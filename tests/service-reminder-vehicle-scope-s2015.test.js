'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function load(){
 const code=fs.readFileSync(require.resolve('../modules/vehicle/service-reminder-vehicle-scope-s2015.js'),'utf8');
 const catalogItems=[
  {id:'p-filter-a',partName:'Filter Udara',compatibleVehicleIds:['v125']},
  {id:'p-filter-model',partName:'Filter Udara Model',compatibleModelIds:['m125']},
  {id:'p-filter-b',partName:'Filter Udara',compatibleVehicleIds:['v150']},
  {id:'p-filter-both',partName:'Filter Udara',compatibleVehicleIds:['v150'],compatibleModelIds:['m125']},
  {id:'p-vbelt',partName:'V-Belt CVT',compatibleVehicleIds:['v125']}
 ];
 const root={
  D:{vehicles:[{id:'v125',name:'Vario 125',modelId:'m125'},{id:'v150',name:'Vario 150',modelId:'m150'}],sparepartCats:[]},
  ServiceInputCatalog:{
   itemById(id){const m={
    'filter-udara':{id:'filter-udara',name:'Filter Udara',masterCategoryId:'filter-udara'},
    'v-belt-cvt':{id:'v-belt-cvt',name:'V-Belt CVT',masterCategoryId:'servis-cvt'}
   };const item=m[id];return item?{item,group:{masterCategoryId:item.masterCategoryId}}:null;},
   infer(){return null;}
  },
  resolveServisCatForVehicle(name,vehicleId){return {id:'fallback',name,vehicleId};},
  VehicleCatalog:{
   getStore(){return {items:catalogItems};},
   isLoaded(){return true;},
   filterForVehicle(items,vehicleId){return items.filter(x=>!x.compatibleVehicleIds?.length||x.compatibleVehicleIds.includes(vehicleId));},
   async recommend(){return [];}
  }
 };
 root.globalThis=root;root.setTimeout=()=>{};root.console=console;
 vm.runInNewContext(code,root,{filename:'service-reminder-vehicle-scope-s2014.js'});
 root.__catalogItems=catalogItems;
 return root;
}

(async()=>{
const r=load();
const compat=r.ServiceReminderVehicleScopeS2014.isCatalogItemCompatibleWithVehicle;
assert.strictEqual(compat({id:'u'},'v125'),true,'no compatibility lists stay universal');
assert.strictEqual(compat({compatibleVehicleIds:['v125']},'v125'),true,'vehicle match');
assert.strictEqual(compat({compatibleVehicleIds:['v125']},'v150'),false,'foreign vehicle hidden');
assert.strictEqual(compat({compatibleModelIds:['m125']},'v125'),true,'model match');
assert.strictEqual(compat({compatibleModelIds:['m125']},'v150'),false,'foreign model hidden');
assert.strictEqual(compat({compatibleVehicleIds:['v150'],compatibleModelIds:['m125']},'v125'),true,'vehicle OR model compatibility');
assert.strictEqual(typeof r.resolveServisCatForVehicle,'function');
r.D.sparepartCats=[
 {id:'scoped-filter',name:'Filter Udara',serviceComponentId:'filter-udara',vehicleId:'v125'},
 {id:'universal-filter',name:'Saringan udara',serviceComponentId:'filter-udara'}
];
assert.strictEqual(r.resolveServisCatForVehicle('Saringan udara','v125').id,'scoped-filter','history/category resolver must use canonical component and active vehicle scope');

const filtered=r.VehicleCatalog.filterForVehicle(r.__catalogItems,'v125');
assert.deepStrictEqual(filtered.map(x=>x.id),['p-filter-a','p-filter-model','p-filter-both','p-vbelt'],'shared compatibility must include model-compatible items and exclude foreign-only items');
const rec=await r.VehicleCatalog.recommend({vehicleId:'v125',item:'Filter',limit:10});
assert.ok(rec.some(x=>x.id==='p-filter-model'),'catalog recommendation must include model-compatible items');
assert.ok(!rec.some(x=>x.id==='p-filter-b'),'catalog recommendation must exclude foreign-only items');

r.D.sparepartCats=[
 {id:'universal-a',name:'Saringan udara',intervalKm:16000,showInReminder:true,catalogPartId:'p-filter-a'},
 {id:'universal-b',name:'Filter Udara',serviceComponentId:'filter-udara',intervalKm:16000,showInReminder:true,catalogPartId:'p-filter-b'},
 {id:'model-row',name:'Filter Udara',serviceComponentId:'filter-udara',intervalKm:16000,showInReminder:true,catalogPartId:'p-filter-model'},
 {id:'vbelt',name:'V-Belt CVT',serviceComponentId:'v-belt-cvt',intervalKm:32000,showInReminder:true,catalogPartId:'p-vbelt'}
];

const projected=r.ServiceReminderVehicleScopeS2014.projectCategories(r.D.sparepartCats,'v125');
assert.ok(projected.some(x=>x.id==='model-row'||x.id==='universal-a'),'at least one compatible catalog row remains visible');
assert.ok(projected.some(x=>x.id==='model-row'),'model-compatible canonical row participates in projection');
assert.ok(!projected.some(x=>x.id==='universal-b'),'foreign catalog-linked row must not leak');
assert.strictEqual(projected.filter(x=>x._s2015ComponentId==='filter-udara').length,1,'active vehicle still gets one projected component row');

const ambiguous=[
 {id:'a',name:'Saringan udara',serviceComponentId:'filter-udara',intervalKm:16000,showInReminder:true,catalogPartId:'p-filter-a'},
 {id:'b',name:'Filter Udara',serviceComponentId:'filter-udara',intervalKm:16000,showInReminder:true,catalogPartId:'p-filter-b'}
];
r.D.sparepartCats=ambiguous;
let c=r.ServiceReminderVehicleScopeS2014.cleanupPersistedDuplicates();
assert.strictEqual(c.hidden,0,'different catalog compatibility must never be persistently deduped');
assert.strictEqual(ambiguous.every(x=>x.showInReminder!==false),true,'ambiguous rows remain active');

const safe=[
 {id:'a',name:'Saringan udara',intervalKm:16000,showInReminder:true},
 {id:'b',name:'Filter Udara',serviceComponentId:'filter-udara',intervalKm:16000,showInReminder:true}
];
r.D.sparepartCats=safe;
c=r.ServiceReminderVehicleScopeS2014.cleanupPersistedDuplicates();
assert.strictEqual(c.hidden,1,'unlinked canonical aliases remain safe to persistently dedupe');
assert.strictEqual(safe.filter(x=>x.showInReminder!==false).length,1);
const before=safe.map(x=>x.showInReminder);
r.ServiceReminderVehicleScopeS2014.cleanupPersistedDuplicates();
assert.deepStrictEqual(safe.map(x=>x.showInReminder),before,'safe cleanup remains idempotent');

const oldMarker=[
 {id:'legacy',name:'Filter Udara',serviceComponentId:'filter-udara',intervalKm:16000,showInReminder:false,_s2014DuplicateOf:'filter-udara',catalogPartId:'p-filter-a'},
 {id:'other',name:'Filter Udara',serviceComponentId:'filter-udara',intervalKm:16000,showInReminder:true,catalogPartId:'p-filter-b'}
];
r.D.sparepartCats=oldMarker;
c=r.ServiceReminderVehicleScopeS2014.cleanupPersistedDuplicates();
assert.strictEqual(c.restored,1,'stale S2014 marker is restored when equivalence is no longer provable');
assert.strictEqual(oldMarker[0].showInReminder,true);
assert.strictEqual(oldMarker[0]._s2014DuplicateOf,undefined);

console.log('S2015 PASS');
})().catch(err=>{console.error(err);process.exit(1);});
