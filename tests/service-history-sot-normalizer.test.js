const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('modules/vehicle/service-history-sot-normalizer.js','utf8');
function api(extra={}){const ctx={console, ...extra};vm.createContext(ctx);vm.runInContext(src,ctx);return ctx.ServiceHistorySOTNormalizer;}

test('explicit Overhoul maps only to Servis Mesin/job type and still has no component or catalog requirement',()=>{
 const A=api({});
 const r=A.normalizeOne({id:1,vehicleId:'veh_1',item:'Jasa Overhoul',categoryId:null,masterCategoryId:null,serviceComponentId:null,cost:325000,catalogPartId:null});
 assert.equal(r.serviceSotStatus,'CANONICAL');
 assert.equal(r.serviceType,'LABOR');
 assert.equal(r.masterCategoryId,'servis-mesin');
 assert.equal(r.serviceJobType,'overhaul_turun_mesin');
 assert.equal(r.serviceComponentId,null);
 assert.equal(r.serviceComponentId,null);
 assert.equal(r.cost,325000);
 assert.equal(r.catalogPartId,null);
});

test('component is safely recovered from checklist',()=>{
 const A=api({ServiceInputCatalog:{itemById:id=>id==='coolant'?{item:{id:'coolant',name:'Coolant',masterCategoryId:'sistem-pendingin'}}:null}});
 const r=A.normalizeOne({item:'Antifreeze',checklist:[{itemId:'coolant'}],categoryId:'sp_component_coolant'});
 assert.equal(r.serviceComponentId,'coolant');
 assert.equal(r.masterCategoryId,'sistem-pendingin');
 assert.equal(r.item,'Coolant');
 assert.equal(r.serviceSotStatus,'CANONICAL');
});

test('empty cost and absent catalog remain valid',()=>{
 const A=api({});
 const r=A.normalizeOne({item:'Jasa Pasang Stang Laher',cost:0,catalogPartId:null,catalogPartQty:0});
 assert.equal(r.cost,0); assert.equal(r.catalogPartId,null); assert.equal(r.catalogPartQty,0);
});

test('existing unknown component is not trusted or invented',()=>{
 const A=api({});
 const r=A.normalizeOne({item:'Layanan lama',serviceComponentId:'unknown-x',masterCategoryId:null});
 assert.equal(r.serviceComponentId,null); assert.equal(r.masterCategoryId,null); assert.equal(r.serviceSotStatus,'LEGACY_UNMAPPED');
});
