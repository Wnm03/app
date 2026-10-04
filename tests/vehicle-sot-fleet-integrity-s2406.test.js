const assert=require('assert');
let catalogReads=0;
global.D={vehicles:[{id:'v1',name:'Vario',modelId:'m1',sot:{serviceSchedules:[{catalogPartId:'p1'}],maintenanceState:{items:[]}}}],servisLogs:[],transactions:[{id:'t1',catalogPartId:'p1'}],spareparts:[],carNotes:[]};
global.VehicleCarNotesSOT={getServiceSchedules:()=>D.vehicles[0].sot.serviceSchedules,read:id=>D.vehicles[0].sot};
global.VehicleCatalog={getAll:async()=>{catalogReads++;return [{id:'p1',compatibleVehicleIds:['v1']}];}};
const S=require('../modules/vehicle/vehicle-sot-fleet-integrity');
(async()=>{
  const before=catalogReads; const h=await S.health();
  assert(h.ok); assert.strictEqual(h.references.catalogCount,1);
  assert.strictEqual(catalogReads-before,1);
  catalogReads=0; const r=await S.referenceAudit(); assert(r.ok); assert.strictEqual(catalogReads,1);
  console.log('S2406 health catalog snapshot PASS');
})().catch(e=>{console.error(e);process.exit(1);});
