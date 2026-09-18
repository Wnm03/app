const test=require('node:test'); const assert=require('node:assert/strict');
const sot=require('../modules/vehicle/vehicle-catalog-lifecycle-sot.js');
test('SOT-3H blocks deletion of referenced catalog part',()=>{
 const r=sot.guard(['p1'],{catalogItems:[{id:'p1'}],partsStock:[{catalogPartId:'p1'}]});
 assert.equal(r.ok,false); assert.deepEqual(r.blocked,['p1']);
});
test('SOT-3H allows deletion of unreferenced catalog part',()=>{
 const r=sot.guard(['p2'],{catalogItems:[{id:'p2'}],transactions:[]});
 assert.equal(r.ok,true); assert.deepEqual(r.blocked,[]);
});
test('SOT-3H sees Car Notes catalogPartRefs',()=>{
 const r=sot.guard(['p3'],{catalogItems:[{id:'p3'}],carNotes:[{catalogPartRefs:[{catalogId:'p3'}]}]});
 assert.equal(r.ok,false);
});
test('SOT-3H reports dangling references separately',()=>{
 const r=sot.audit({catalogItems:[],partsStock:[{catalogPartId:'gone'}]});
 assert.equal(r.ok,false); assert.deepEqual(r.missingReferences,['gone']);
});
test('SOT-3H does not treat snapshot-only rows as identity references',()=>{
 const r=sot.guard(['p4'],{catalogItems:[{id:'p4'}],partsStock:[{catalogPartName:'Old name',catalogPartOemCode:'OEM'}]});
 assert.equal(r.ok,true);
});
