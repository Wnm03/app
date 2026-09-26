const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('S2081 all service transaction creation paths stamp vehicleId',()=>{
  assert.match(read('modules/finance/tx-servis.js'),/tx\.servisLinkId=servisId;tx\.vehicleId=vehicleId/);
  assert.match(read('modules/vehicle/servis.js'),/servisLinkId:s\.id,vehicleId:s\.vehicleId\|\|curVehicleId/);
  assert.match(read('modules/vehicle/servis.js'),/servisLinkId:servisId,vehicleId:curVehicleId/);
  assert.match(read('chat-action-handlers.js'),/servisLinkId:servisId,vehicleId:veh\.id/);
});

test('S2082 deletion keeps Finance/History rollback atomic and session scoped',()=>{
  const s=read('modules/vehicle/servis.js');
  assert.match(s,/beforeLogs=logs\.map/); assert.match(s,/beforeTx=/); assert.match(s,/Penghapusan sesi servis dibatalkan/);
  assert.match(s,/_sessionKey=x=>String/); assert.match(s,/D\.servisLogs=D\.servisLogs\.filter\(x=>!x\|\|_sessionKey\(x\)!==String\(sessionId\)\)/);
});

test('S2083 edits reuse existing service identity and do not create a second finance owner',()=>{
  const s=read('modules/finance/tx-servis.js');
  assert.match(s,/if\(opts\.existingServisId\)/); assert.match(s,/one Service Event may have at most one Finance owner/);
  assert.match(s,/findServiceEventByIdempotencyKey/); assert.match(s,/Object\.assign\(s,/);
});

test('S2084 interval snapshot prefers canonical VehicleCarNotesSOT category',()=>{
  const s=read('modules/finance/tx-servis.js');
  assert.match(s,/VehicleCarNotesSOT\.getServiceCategories\(vid\)/);
  assert.match(s,/buildServiceNextDueSnapshot/);
});

test('S2085 date and odometer are validated before Finance -> History commit',()=>{
  const s=read('modules/finance/tx-servis.js');
  assert.match(s,/validateServiceOdometer\(\{vehicleId,km,date/);
  assert.match(s,/date:opts\.date/); assert.match(s,/km:opts\.km/);
});

test('S2086 multi-component session identity is vehicle + session + component',()=>{
  const s=read('modules/vehicle/vehicle-car-notes-sot-s2071.js');
  assert.match(s,/vid\+'::'\+sid\+'::'\+cid/);
  assert.match(s,/DUPLICATE_SESSION_COMPONENT/);
});

test('S2087 restore/import path has explicit migration hook and does not require a second vehicle SOT',()=>{
  const s=read('modules/shared/features-helpers-global-security.js');
  assert.match(s,/applyRestoredData/);
  const sot=read('modules/vehicle/vehicle-car-notes-sot-s2071.js');
  assert.match(sot,/v\.sot/); assert.match(sot,/VehicleCarNotesSOT/);
});

test('S2088 duplicate detector covers session component and reminder identities',()=>{
  const s=read('modules/vehicle/vehicle-car-notes-sot-s2071.js');
  assert.match(s,/DUPLICATE_SESSION_COMPONENT/); assert.match(s,/DUPLICATE_REMINDER/); assert.match(s,/CONFLICTING_INTERVAL_OWNER/);
});

test('S2089 runtime end-to-end clean flow for vehicle A stays isolated from B',()=>{
  const sandbox={D:{vehicles:[{id:'A',vehicleType:'motor'},{id:'B',vehicleType:'motor'}],transactions:[{id:'T1',vehicleId:'A',servisLinkId:'S1'}],servisLogs:[{id:'S1',vehicleId:'A',txLinkId:'T1',sessionId:'J1',serviceComponentId:'BUSA',km:10000,intervalKmAtService:5000,nextDueKm:15000}]},curVehicleId:'A',ServiceInputCatalog:{itemById:id=>id==='BUSA'?{item:{id:'BUSA',name:'Busi'},group:{masterCategoryId:'mesin'}}:null},getReminderCategoriesForVehicle:vid=>vid==='A'?[{id:'C1',vehicleId:'A',serviceComponentId:'BUSA'}]:[]};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(read('modules/vehicle/vehicle-car-notes-sot-s2071.js'),sandbox);
  const r=sandbox.VehicleCarNotesSOT.auditFullFlow('A');
  assert.equal(r.ok,true,JSON.stringify(r.issues));
  assert.equal(sandbox.VehicleCarNotesSOT.auditFullFlow('B').ok,true);
});

test('S2090 final gate rejects service Finance record without vehicle boundary',()=>{
  const sandbox={D:{vehicles:[{id:'A',vehicleType:'motor'}],transactions:[{id:'T1',servisLinkId:'S1'}],servisLogs:[{id:'S1',vehicleId:'A',txLinkId:'T1',serviceComponentId:'BUSA'}]},curVehicleId:'A',ServiceInputCatalog:{itemById:id=>({item:{id},group:{masterCategoryId:'mesin'}})},getReminderCategoriesForVehicle:()=>[]};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(read('modules/vehicle/vehicle-car-notes-sot-s2071.js'),sandbox);
  const r=sandbox.VehicleCarNotesSOT.auditFullFlow('A');
  assert.equal(r.ok,false); assert.ok(r.issues.some(x=>x.code==='FINANCE_SERVICE_WITHOUT_VEHICLE'));
});

test('S2090 final gate rejects cross-vehicle service linkage',()=>{
  const sandbox={D:{vehicles:[{id:'A',vehicleType:'motor'},{id:'B',vehicleType:'motor'}],transactions:[{id:'T1',vehicleId:'B',servisLinkId:'S1'}],servisLogs:[{id:'S1',vehicleId:'A',txLinkId:'T1',serviceComponentId:'BUSA'}]},curVehicleId:'A',ServiceInputCatalog:{itemById:id=>({item:{id},group:{masterCategoryId:'mesin'}})},getReminderCategoriesForVehicle:()=>[]};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(read('modules/vehicle/vehicle-car-notes-sot-s2071.js'),sandbox);
  const r=sandbox.VehicleCarNotesSOT.auditFullFlow('A');
  assert.equal(r.ok,false); assert.ok(r.issues.some(x=>x.code==='SERVICE_FINANCE_CROSS_VEHICLE'));
});

test('S2090 final gate rejects conflicting interval owners and duplicate reminders',()=>{
  const sandbox={D:{vehicles:[{id:'A',vehicleType:'motor',sot:{serviceCategories:[{id:'c1',serviceComponentId:'BUSA',intervalKm:5000},{id:'c2',serviceComponentId:'BUSA',intervalKm:10000}]} }],transactions:[],servisLogs:[]},curVehicleId:'A',ServiceInputCatalog:{itemById:id=>({item:{id},group:{masterCategoryId:'mesin'}})},getReminderCategoriesForVehicle:()=>[{id:'R1',vehicleId:'A',serviceComponentId:'BUSA'},{id:'R2',vehicleId:'A',serviceComponentId:'BUSA'}]};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(read('modules/vehicle/vehicle-car-notes-sot-s2071.js'),sandbox);
  const r=sandbox.VehicleCarNotesSOT.auditFullFlow('A');
  assert.equal(r.ok,false); assert.ok(r.issues.some(x=>x.code==='CONFLICTING_INTERVAL_OWNER')); assert.ok(r.issues.some(x=>x.code==='DUPLICATE_REMINDER'));
});
