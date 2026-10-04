const assert=require('assert');
global.D={vehicles:[
  {id:'v2',modelId:'m2',sot:{serviceSchedules:[{catalogPartId:'p2'},{catalogPartId:'p1'},{catalogPartId:'p1'}]}},
  {id:'v1',modelId:'m1',sot:{serviceSchedules:[{catalogPartId:'p1'}]}},
  {id:'v3',modelId:'m3',sot:{serviceSchedules:[{catalogPartId:'p2'}]}}
],kmLogs:[],servisLogs:[],transactions:[],spareparts:[],carNotes:[]};
global.VehicleCarNotesSOT={getServiceSchedules:id=>D.vehicles.find(v=>v.id===id).sot.serviceSchedules};
let catalogReads=0;
global.VehicleCatalog={getAll:async()=>{catalogReads++;return [
  {id:'p1',compatibleVehicleIds:['v1']},
  {id:'p2',compatibleModelIds:['m3']}
];}};
const S=require('../modules/vehicle/vehicle-sot-fleet-integrity');
(async()=>{
  const r=await S.isolationAudit();
  assert.deepStrictEqual(r.issues,[
    {code:'service_projection_scope_mismatch',vehicleId:'v2',catalogPartId:'p1'},
    {code:'service_projection_scope_mismatch',vehicleId:'v2',catalogPartId:'p1'},
    {code:'service_projection_scope_mismatch',vehicleId:'v2',catalogPartId:'p2'}
  ]);
  assert.strictEqual(catalogReads,1);
  console.log('S2407 isolation index PASS');
})().catch(e=>{console.error(e);process.exit(1);});
