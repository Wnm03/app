const assert=require('assert');
let kmCalls=0;
global.D={
  vehicles:[{id:'v1',name:'Vario',modelId:'vario-125',sot:{serviceSchedules:[
    {catalogPartId:'p1',partName:'Oli',intervalKm:2000,intervalBulan:null,showInReminder:true},
    {catalogPartId:'p2',partName:'Busi',intervalKm:8000,intervalBulan:null,showInReminder:true},
    {catalogPartId:'p3',partName:'Filter',intervalKm:5000,intervalBulan:null,showInReminder:true}
  ]}}],
  kmLogs:[{vehicleId:'v1',km:5000}],
  servisLogs:[
    {id:'old-p1',vehicleId:'v1',catalogPartId:'p1',km:3000,date:'2026-08-01'},
    {id:'low-p1-same-date',vehicleId:'v1',catalogPartId:'p1',km:4500,date:'2026-09-01'},
    {id:'latest-p1',vehicleId:'v1',catalogPartId:'p1',km:4800,date:'2026-09-01'},
    {id:'p2',vehicleId:'v1',catalogPartId:'p2',km:4000,date:'2026-07-01'}
  ],transactions:[],spareparts:[],carNotes:[]
};
global.VehicleServiceReminderSOT={getSchedules:async()=>D.vehicles[0].sot.serviceSchedules};
global.VehicleCatalog={getAll:async()=>[{id:'p1',compatibleVehicleIds:['v1']},{id:'p2',compatibleVehicleIds:['v1']},{id:'p3',compatibleVehicleIds:['v1']}]};
global.getVehicleKm=id=>{kmCalls++;return 5000;};
const S=require('../modules/vehicle/vehicle-sot-fleet-integrity');
(async()=>{
  const r=await S.serviceState('v1',{now:'2026-09-18T00:00:00Z'});
  assert(r.ok);
  assert.strictEqual(kmCalls,1,'current vehicle KM should be resolved once per serviceState run');
  assert.strictEqual(r.projection.currentKm,5000);
  assert.strictEqual(r.projection.items.length,3);
  assert.strictEqual(r.projection.items[0].lastService.id,'latest-p1','same-date service should retain highest km as latest');
  assert.strictEqual(r.projection.items[0].nextDueKm,6800);
  assert.strictEqual(r.projection.items[1].lastService.id,'p2');
  assert.strictEqual(r.projection.items[1].nextDueKm,12000);
  assert.strictEqual(r.projection.items[2].lastService,null);
  assert.strictEqual(r.projection.items[2].status,'belum_pernah');
  console.log('S2405 service-log/km index + semantics PASS');
})().catch(e=>{console.error(e);process.exit(1)});
