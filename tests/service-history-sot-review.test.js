const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('modules/vehicle/service-history-sot-review.js','utf8');
function api(extra={}){const ctx={console,Date, ...extra};vm.createContext(ctx);vm.runInContext(src,ctx);return ctx.ServiceHistorySOTReview;}

test('review queue keeps legacy labour unmapped',()=>{
 const D={servisLogs:[{id:'ov',vehicleId:'v1',item:'Jasa Overhoul',serviceSotStatus:'LEGACY_UNMAPPED',serviceType:'LABOR'},{id:'ok',vehicleId:'v1',item:'Oli',serviceSotStatus:'CANONICAL'}]};
 const A=api({D,curVehicleId:'v1'});
 assert.deepEqual(A.queue('v1').map(x=>x.id),['ov']);
 const st=A.stats('v1'); assert.equal(st.total,1); assert.equal(st.labor,1); assert.equal(st.vehicleId,'v1');
});

test('manual mapping requires canonical component/category and never guesses',()=>{
 const log={id:'ov',vehicleId:'v1',item:'Jasa Overhoul',serviceSotStatus:'LEGACY_UNMAPPED',serviceType:'LABOR'};
 const D={servisLogs:[log]};
 const ServiceInputCatalog={
   itemById:id=>id==='engine-overhaul'?{item:{id:'engine-overhaul',name:'Overhaul Mesin',masterCategoryId:'engine'}}:null,
   groupById:id=>id==='engine'?{id:'engine',name:'Mesin'}:null
 };
 const A=api({D,ServiceInputCatalog});
 const bad=A.manualMap('ov',{serviceComponentId:'invented'});
 assert.equal(bad.ok,false);
 assert.equal(log.serviceSotStatus,'LEGACY_UNMAPPED');
 const good=A.manualMap('ov',{serviceComponentId:'engine-overhaul'});
 assert.equal(good.ok,true);
 assert.equal(log.serviceSotStatus,'CANONICAL');
 assert.equal(log.serviceComponentId,'engine-overhaul');
 assert.equal(log.masterCategoryId,'engine');
});

test('explicitly keeping unmapped is supported',()=>{
 const log={id:'x',item:'Jasa Lama',serviceSotStatus:'LEGACY_UNMAPPED'};
 const D={servisLogs:[log]};
 const A=api({D});
 const r=A.manualMap('x',{});
 assert.equal(r.ok,true); assert.equal(log.serviceSotStatus,'LEGACY_UNMAPPED');
 assert.equal(log.masterCategoryId,null); assert.equal(log.serviceComponentId,null);
});
