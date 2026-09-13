const test=require('node:test');const assert=require('node:assert/strict');
const S=require('../modules/vehicle/car-notes-integrity-suite.js');
const F=require('../modules/vehicle/service-integrity-reconciler.js');
const Fuel=require('../modules/vehicle/fuel-integrity-reconciler.js');
const Tax=require('../modules/vehicle/vehicle-tax-integrity-reconciler.js');
global.ServiceIntegrityReconciler=F;global.FuelIntegrityReconciler=Fuel;global.VehicleTaxIntegrityReconciler=Tax;
test('aggregate suite reports clean state across domains',()=>{const r=S.run({services:[],bbmLogs:[],taxRecords:[],vehicles:[],transactions:[]});assert.equal(r.ok,true);assert.equal(r.issues.length,0);assert.equal(r.reports.length,3);});
test('aggregate suite preserves domain labels and issues',()=>{const r=S.run({services:[{id:'s1',txLinkId:'tx-missing'}],bbmLogs:[{id:'b1',txLinkId:'tx-missing'}],taxRecords:[],vehicles:[],transactions:[]});assert.equal(r.ok,false);assert.ok(r.issues.some(x=>x.domain==='service'));assert.ok(r.issues.some(x=>x.domain==='fuel'));});
