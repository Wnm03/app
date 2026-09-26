const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

test('S2080 Finance -> Service History linkage is vehicle-scoped and bidirectional',()=>{
  const src=fs.readFileSync(path.join(root,'modules/finance/tx-servis.js'),'utf8');
  assert.match(src,/existingServis&&existingServis\.vehicleId/);
  assert.match(src,/tx\.servisLinkId=servisId;tx\.vehicleId=vehicleId/);
  assert.match(src,/const active=.*curVehicleId/);
  assert.doesNotMatch(src,/const fallback=.*D\.vehicles\[0\]/);
});

test('S2080 Service-created Finance transaction carries the same vehicleId',()=>{
  const src=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
  assert.match(src,/servisLinkId:s\.id,vehicleId:s\.vehicleId\|\|curVehicleId/);
  assert.match(src,/servisLinkId:servisId,vehicleId:curVehicleId/);
  assert.match(src,/const newCat=\{[^\n]*vehicleId:curVehicleId/);
});

test('S2080 canonical Vehicle SOT exposes real Finance -> History -> Reminder audit',()=>{
  const src=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-car-notes-sot-s2071.js'),'utf8');
  assert.match(src,/function auditFinanceHistoryReminder\(id\)/);
  assert.match(src,/SERVICE_MISSING_FINANCE/);
  assert.match(src,/FINANCE_MISSING_SERVICE/);
  assert.match(src,/REMINDER_CROSS_VEHICLE/);
  assert.match(src,/REMINDER_COMPONENT_NOT_CANONICAL/);
  assert.match(src,/auditFinanceHistoryReminder(?:,auditFullFlow)?};/);
});

test('S2080 runtime audit reports clean canonical round-trip for one vehicle',()=>{
  const sandbox={
    D:{vehicles:[{id:'A',vehicleType:'motor'}],transactions:[{id:'T1',vehicleId:'A',servisLinkId:'S1'}],servisLogs:[{id:'S1',vehicleId:'A',txLinkId:'T1',serviceComponentId:'BUSA'}]},
    curVehicleId:'A',
    ServiceInputCatalog:{itemById:id=>id==='BUSA'?{item:{id:'BUSA',name:'Busi'},group:{masterCategoryId:'mesin'}}:null},
    getReminderCategoriesForVehicle:()=>[{id:'C1',vehicleId:'A',serviceComponentId:'BUSA'}]
  };
  sandbox.globalThis=sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(root,'modules/vehicle/vehicle-car-notes-sot-s2071.js'),'utf8'),sandbox);
  const r=sandbox.VehicleCarNotesSOT.auditFinanceHistoryReminder('A');
  assert.equal(r.ok,true);
  assert.equal(r.serviceCount,1);
  assert.equal(r.financeServiceCount,1);
  assert.equal(r.reminderCount,1);
});

test('S2080 runtime audit catches cross-vehicle Finance -> History leakage',()=>{
  const sandbox={
    D:{vehicles:[{id:'A',vehicleType:'motor'},{id:'B',vehicleType:'motor'}],transactions:[{id:'T1',vehicleId:'B',servisLinkId:'S1'}],servisLogs:[{id:'S1',vehicleId:'A',txLinkId:'T1',serviceComponentId:'BUSA'}]},
    curVehicleId:'A',
    ServiceInputCatalog:{itemById:id=>({item:{id},group:{masterCategoryId:'mesin'}})},
    getReminderCategoriesForVehicle:()=>[]
  };
  sandbox.globalThis=sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(root,'modules/vehicle/vehicle-car-notes-sot-s2071.js'),'utf8'),sandbox);
  const r=sandbox.VehicleCarNotesSOT.auditFinanceHistoryReminder('A');
  assert.equal(r.ok,false);
  assert.ok(r.issues.some(x=>x.code==='SERVICE_FINANCE_CROSS_VEHICLE'));
});

test('S2080 reminder migration makes vehicle SOT the source after first legacy read',()=>{
  const src=fs.readFileSync(path.join(root,'app-bundle-b.min.js'),'utf8');
  const pos=src.indexOf('function getReminderCategoriesForVehicle(vehicleId)');
  assert.ok(pos>=0);
  const block=src.slice(pos,pos+1800);
  assert.match(block,/getServiceCategories\(vehicleId\)/);
  assert.match(block,/upsertServiceCategory\(vehicleId,c\)/);
  assert.doesNotMatch(block,/const legacyCats=\(D\.sparepartCats\|\|\[\]\)\.filter/);
});
