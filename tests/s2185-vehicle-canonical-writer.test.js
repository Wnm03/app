const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function load(){return loadSource(['modules/vehicle/vehicle-canonical-writer.js'],{D:{vehicles:[]},sameId:(a,b)=>String(a)===String(b)},['VehicleCanonicalWriter']);}
test('S2185 writer create mutates D.vehicles only through canonical boundary',()=>{const c=load();const v={id:'v1',name:'A'};c.VehicleCanonicalWriter.create(v);assert.equal(c.D.vehicles.length,1);assert.equal(c.D.vehicles[0],v);});
test('S2185 writer rejects duplicate ids',()=>{const c=load();c.VehicleCanonicalWriter.create({id:'v1'});assert.throws(()=>c.VehicleCanonicalWriter.create({id:'v1'}),/duplicate vehicle id/);});
test('S2185 writer updateByIndex applies mutation and preserves row identity',()=>{const c=load();const v={id:'v1',name:'A'};c.VehicleCanonicalWriter.create(v);const out=c.VehicleCanonicalWriter.updateByIndex(0,x=>{x.name='B';return x});assert.equal(out,v);assert.equal(c.D.vehicles[0].name,'B');});
test('S2185 writer removeAt removes exact row',()=>{const c=load();c.VehicleCanonicalWriter.create({id:'v1'});c.VehicleCanonicalWriter.create({id:'v2'});const out=c.VehicleCanonicalWriter.removeAt(0);assert.equal(out.id,'v1');assert.deepEqual(c.D.vehicles.map(v=>v.id),['v2']);});
test('S2185 writer rejects invalid update index',()=>{const c=load();assert.throws(()=>c.VehicleCanonicalWriter.updateByIndex(0,()=>{}),/index not found/);});
test('S2185 writer rejects invalid remove index',()=>{const c=load();assert.throws(()=>c.VehicleCanonicalWriter.removeAt(0),/index not found/);});
test('S2185 snapshot is read-only copy of array membership',()=>{const c=load();const v={id:'v1'};c.VehicleCanonicalWriter.create(v);const snap=c.VehicleCanonicalWriter.snapshot();assert.notEqual(snap,c.D.vehicles);assert.equal(snap[0],v);});
