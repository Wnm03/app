const assert=require('assert');
global.D={vehicles:[{id:'v1',modelId:'m1',sot:{serviceSchedules:[{catalogPartId:'p1'}]}}],kmLogs:[],servisLogs:[],transactions:[],spareparts:[],carNotes:[]};
global.VehicleCarNotesSOT={getServiceSchedules:()=>[{catalogPartId:'p1'}],read:()=>({catalogParts:[{id:'p1'}],serviceSchedules:[{catalogPartId:'p1'}],maintenanceState:{items:[]}})};
let reads=0;
global.VehicleCatalog={getAll:async()=>{reads++;return[{id:'p1',compatibleVehicleIds:['v1']}];}};
const S=require('../modules/vehicle/vehicle-sot-fleet-integrity');
(async()=>{
  reads=0; const h=await S.health(); assert(h.ok); assert.strictEqual(reads,1,'health should share one catalog snapshot');
  reads=0; const i=await S.isolationAudit(); assert(i.ok); assert.strictEqual(reads,1,'standalone isolationAudit must retain fresh read');
  reads=0; const r=await S.referenceAudit(); assert(r.ok); assert.strictEqual(reads,1,'standalone referenceAudit must retain fresh read');
  console.log('S2408 Fleet Integrity catalog snapshot reuse PASS');
})().catch(e=>{console.error(e);process.exit(1);});
