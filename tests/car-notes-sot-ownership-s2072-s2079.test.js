'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
function load(){
  const ctx={console,setTimeout,clearTimeout,JSON,Date,structuredClone,globalThis:null};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.D={vehicles:[],sparepartCats:[]};ctx.curVehicleId='A';
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'modules/vehicle/vehicle-car-notes-sot-s2071.js'),'utf8'),ctx,{filename:'vehicle-car-notes-sot-s2071.js'});
  return ctx;
}
function walk(dir){const out=[];for(const n of fs.readdirSync(dir)){const p=path.join(dir,n);if(n==='backups'||n==='docs'||n==='node_modules'||n.startsWith('.'))continue;const st=fs.statSync(p);if(st.isDirectory())out.push(...walk(p));else if(/\.js$/.test(n))out.push(p);}return out;}

test('S2072 canonical owner map: only D.vehicles[].sot is the persisted per-vehicle Car Notes root',()=>{
  const files=walk(path.join(root,'modules','vehicle'));
  const direct=files.filter(f=>/\b(?:vehicle|v)\.sot\s*=|\bD\.vehicles\[[^\]]+\]\.sot\s*=/.test(fs.readFileSync(f,'utf8')))
    .map(f=>path.relative(root,f)).filter(f=>f!=='modules/vehicle/vehicle-car-notes-sot-s2071.js');
  assert.deepEqual(direct,[]);
});

test('S2073 each vehicle has an independent service-category SOT',()=>{
  const c=load();
  c.D.vehicles=[{id:'A',name:'Motor A',vehicleType:'motor'},{id:'B',name:'Motor B',vehicleType:'motor'}];
  c.D.sparepartCats=[{id:'cat-a',name:'Busi',vehicleId:'A',intervalKm:8000,serviceComponentId:'busi'}];
  c.VehicleCarNotesSOT.ensure('A');c.VehicleCarNotesSOT.ensure('B');
  assert.equal(c.VehicleCarNotesSOT.getServiceCategories('A')[0].vehicleId,'A');
  assert.equal(c.VehicleCarNotesSOT.getServiceCategories('B').length,0);
  c.VehicleCarNotesSOT.upsertServiceCategory('B',{id:'cat-b',name:'Busi',vehicleId:'B',intervalKm:10000,serviceComponentId:'busi'});
  assert.equal(c.VehicleCarNotesSOT.getServiceCategories('A')[0].intervalKm,8000);
  assert.equal(c.VehicleCarNotesSOT.getServiceCategories('B')[0].intervalKm,10000);
});

test('S2074 category move removes old vehicle ownership before assigning new vehicle',()=>{
  const c=load();c.D.vehicles=[{id:'A',vehicleType:'motor'},{id:'B',vehicleType:'motor'}];
  c.VehicleCarNotesSOT.upsertServiceCategory('A',{id:'cat',name:'Oli',vehicleId:'A',intervalKm:1500});
  c.VehicleCarNotesSOT.removeLegacyCategoryProjection('cat','A');
  c.VehicleCarNotesSOT.upsertServiceCategory('B',{id:'cat',name:'Oli',vehicleId:'B',intervalKm:2000});
  assert.equal(c.VehicleCarNotesSOT.getServiceCategories('A').length,0);
  assert.equal(c.VehicleCarNotesSOT.getServiceCategories('B')[0].vehicleId,'B');
});

test('S2075 foreign vehicle write is rejected by canonical partition',()=>{
  const c=load();c.D.vehicles=[{id:'A',vehicleType:'motor'},{id:'B',vehicleType:'motor'}];
  const r=c.VehicleCarNotesSOT.upsertServiceCategory('B',{id:'cat',name:'Busi',vehicleId:'A',intervalKm:8000});
  assert.equal(r.ok,true);
  assert.equal(c.VehicleCarNotesSOT.getServiceCategories('B')[0].vehicleId,'B');
  assert.equal(c.VehicleCarNotesSOT.getServiceCategories('A').length,0);
});

test('S2076 SOT-named service adapters do not create a second persisted vehicle.sot root',()=>{
  const files=['modules/vehicle/vehicle-service-sot.js','modules/vehicle/vehicle-service-reminder-sot.js','modules/vehicle/vehicle-sot-provisioning.js','modules/vehicle/vehicle-sot-fleet-integrity.js'];
  for(const rel of files){const s=fs.readFileSync(path.join(root,rel),'utf8');assert.equal(/\.sot\s*=/.test(s),false,rel+' must delegate to VehicleCarNotesSOT');}
});

test('S2077 source map: vehicle-specific service state writers delegate to canonical SOT before legacy projection',()=>{
  const checks=[
    ['modules/vehicle/sparepart-servis-ui.js','syncLegacyCategoryProjection'],
    ['modules/vehicle/sparepart-servis.js','syncLegacyCategoryProjection'],
    ['modules/vehicle/servis.js','syncLegacyCategoryProjection'],
    ['modules/vehicle/service-history-checklist-edit-s2036.js','VehicleCarNotesSOT'],
    ['modules/finance/tx-stok-sparepart.js','VehicleCarNotesSOT']
  ];
  for(const [rel,needle] of checks){const s=fs.readFileSync(path.join(root,rel),'utf8');assert.match(s,new RegExp(needle),rel+' must use canonical SOT before compatibility writes');}
});

test('S2078 audit: canonical service categories are unique by component/id inside each vehicle',()=>{
  const c=load();c.D.vehicles=[{id:'A',vehicleType:'motor'}];
  c.VehicleCarNotesSOT.upsertServiceCategory('A',{id:'cat1',name:'Busi',vehicleId:'A',serviceComponentId:'busi',intervalKm:8000});
  c.VehicleCarNotesSOT.upsertServiceCategory('A',{id:'cat2',name:'Busi',vehicleId:'A',serviceComponentId:'busi',intervalKm:9000});
  const rows=c.VehicleCarNotesSOT.getServiceCategories('A');
  const keys=rows.map(x=>x.serviceComponentId||x.id);assert.equal(new Set(keys).size,keys.length);
});

test('S2079 final gate: vehicle SOT carries identity/type plus service schedules/categories and passes audit',()=>{
  const c=load();c.D.vehicles=[{id:'A',vehicleType:'motor',modelId:'m1'}];
  c.VehicleCarNotesSOT.setServiceSchedules('A',[{catalogPartId:'p1',serviceComponentId:'busi',intervalKm:8000}],{version:'test'});
  c.VehicleCarNotesSOT.upsertServiceCategory('A',{id:'cat',name:'Busi',vehicleId:'A',serviceComponentId:'busi',intervalKm:8000});
  const v=c.D.vehicles[0];assert.equal(v.sot.vehicleId,'A');assert.equal(v.sot.vehicleType,'motor');assert.equal(v.sot.serviceSchedules.length,1);assert.equal(v.sot.serviceCategories.length,1);assert.equal(c.VehicleCarNotesSOT.audit('A').ok,true);
});
