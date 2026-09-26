'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(file,ctx){const code=fs.readFileSync(file,'utf8');vm.runInNewContext(code,ctx,{filename:file});}
function ctx(){const c={console,setTimeout,clearTimeout,Date,JSON,Math,Promise};c.globalThis=c;c.window=c;c.D={vehicles:[{id:'A',name:'Motor A',vehicleType:'motor',modelId:'m1',sot:{serviceSchedules:[{catalogPartId:'p1',serviceComponentId:'busi',intervalKm:8000}]}},{id:'B',name:'Mobil B',vehicleType:'mobil',modelId:'m2',sot:{serviceSchedules:[{catalogPartId:'p2',serviceComponentId:'busi',intervalKm:10000}]}}]};c.curVehicleId='A';return c;}

test('S2071 creates exactly one canonical vehicle SOT per vehicle',()=>{const c=ctx();load('modules/vehicle/vehicle-car-notes-sot-s2071.js',c);const a=c.VehicleCarNotesSOT.read('A'),b=c.VehicleCarNotesSOT.read('B');assert.equal(a.owner,'VehicleCarNotesSOT');assert.equal(a.vehicleId,'A');assert.equal(b.vehicleId,'B');assert.notDeepEqual(a.serviceSchedules,b.serviceSchedules);});

test('S2071 service schedule writes are vehicle scoped',()=>{const c=ctx();load('modules/vehicle/vehicle-car-notes-sot-s2071.js',c);c.VehicleCarNotesSOT.setServiceSchedules('A',[{catalogPartId:'pa',serviceComponentId:'busi',intervalKm:4000}]);assert.equal(c.VehicleCarNotesSOT.getServiceSchedules('A')[0].intervalKm,4000);assert.equal(c.VehicleCarNotesSOT.getServiceSchedules('B')[0].intervalKm,10000);});

test('S2071 rejects cross-vehicle record identity',()=>{const c=ctx();load('modules/vehicle/vehicle-car-notes-sot-s2071.js',c);assert.equal(c.VehicleCarNotesSOT.assertRecord({vehicleId:'B'},'A'),false);assert.equal(c.VehicleCarNotesSOT.assertRecord({vehicleId:'A'},'A'),true);});

test('S2071 audit catches vehicle type drift and duplicate service rules',()=>{const c=ctx();load('modules/vehicle/vehicle-car-notes-sot-s2071.js',c);c.D.vehicles[0].sot.serviceSchedules.push({catalogPartId:'p1',serviceComponentId:'busi',intervalKm:9000});c.D.vehicles[0].sot.vehicleType='mobil';const r=c.VehicleCarNotesSOT.audit('A');assert.equal(r.ok,false);assert.ok(r.issues.some(x=>x.code==='SOT_VEHICLE_TYPE_MISMATCH'));assert.ok(r.issues.some(x=>x.code==='DUPLICATE_SERVICE_RULE'));});

test('S2071 known legacy SOT writers delegate to VehicleCarNotesSOT',()=>{for(const f of ['modules/vehicle/vehicle-service-reminder-sot.js','modules/vehicle/vehicle-sot-provisioning.js','modules/vehicle/vehicle-sot-fleet-integrity.js','modules/vehicle/vehicle-service-sot.js']){const s=fs.readFileSync(f,'utf8');if(f.endsWith('vehicle-service-reminder-sot.js')){assert.match(s,/VehicleCarNotesSOT\.setServiceSchedules/);assert.match(s,/VehicleCarNotesSOT\.getServiceSchedules/);}if(f.endsWith('vehicle-sot-provisioning.js'))assert.match(s,/VehicleCarNotesSOT\.setProvisioning/);if(f.endsWith('vehicle-sot-fleet-integrity.js'))assert.match(s,/VehicleCarNotesSOT\.setMaintenanceState/);if(f.endsWith('vehicle-service-sot.js'))assert.match(s,/VehicleCarNotesSOT\.getServiceSchedules/);}});

test('S2071 canonical VehicleCarNotesSOT is loaded before service SOT adapters',()=>{const b=fs.readFileSync('scripts/build.js','utf8');const i=b.indexOf('modules/vehicle/vehicle-car-notes-sot-s2071.js');const a=b.indexOf('modules/vehicle/vehicle-active-sot-s2061.js');const r=b.indexOf('modules/vehicle/vehicle-service-reminder-sot.js');assert.ok(i>=0&&a>i&&r>i);});
