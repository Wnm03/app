const assert=require('assert');
global.D={vehicles:[{id:'v1',name:'Vario',modelId:'vario-125',sot:{serviceSchedules:[{catalogPartId:'p1',partName:'Oli',intervalKm:2000,intervalBulan:null,showInReminder:true}]}}],kmLogs:[{vehicleId:'v1',km:5000}],servisLogs:[{id:'s1',vehicleId:'v1',catalogPartId:'p1',km:4000,date:'2026-08-01'}],transactions:[],spareparts:[],carNotes:[]};
global.VehicleServiceReminderSOT={getSchedules:async()=>D.vehicles[0].sot.serviceSchedules};
global.VehicleCatalog={getAll:async()=>[{id:'p1',compatibleVehicleIds:['v1']}]};
global.getVehicleKm=id=>5000;
const S=require('../modules/vehicle/vehicle-sot-fleet-integrity');
(async()=>{const r=await S.serviceState('v1',{now:'2026-09-18T00:00:00Z'});assert(r.ok);assert.strictEqual(r.projection.items[0].nextDueKm,6000);assert.strictEqual(r.projection.items[0].status,'aman');const a=await S.referenceAudit();assert(a.ok);const h=await S.health();assert(h.ok);console.log('SOT-4G..4K tests PASS');})().catch(e=>{console.error(e);process.exit(1);});
