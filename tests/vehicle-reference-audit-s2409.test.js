const assert=require('assert');
global.D={
  vehicles:[],kmLogs:[],
  servisLogs:[{id:'s1',catalogPartId:'p1'},{id:'s2',catalogPartId:'missing-s'}],
  transactions:[{id:'t1',catalogPartId:'p1'},{id:'t2',catalogPartId:'missing-t'}],
  spareparts:[{id:'sp1',catalogPartId:'p1'},{id:'sp2',catalogPartId:'missing-sp'}],
  carNotes:[{id:'n1',catalogPartRefs:['p1','missing-note',{catalogPartId:'missing-object'}]}]
};
global.VehicleCatalog={getAll:async()=>[{id:'p1'}]};
const S=require('../modules/vehicle/vehicle-sot-fleet-integrity');
(async()=>{
 const r=await S.referenceAudit();
 assert.strictEqual(r.referenceCount,6);
 assert.strictEqual(r.catalogCount,1);
 assert.strictEqual(r.ok,false);
 assert.deepStrictEqual(r.issues.map(x=>[x.domain,x.rowId,x.catalogPartId]),[
  ['service','s2','missing-s'],['transaction','t2','missing-t'],['stock','sp2','missing-sp'],
  ['car-notes','n1','missing-note'],['car-notes','n1','missing-object']
 ]);
 const supplied=await S.referenceAudit([{id:'p1'},{id:'missing-s'}]);
 assert.strictEqual(supplied.referenceCount,6);
 assert.strictEqual(supplied.catalogCount,2);
 assert.deepStrictEqual(supplied.issues.map(x=>[x.domain,x.rowId,x.catalogPartId]),[
  ['transaction','t2','missing-t'],['stock','sp2','missing-sp'],['car-notes','n1','missing-note'],['car-notes','n1','missing-object']
 ]);
 console.log('S2409 reference audit PASS');
})().catch(e=>{console.error(e);process.exit(1)});
