const assert=require('assert');const path=require('path');
function fixture(){
  global.D={vehicles:[
    {id:'v1',name:'A',modelId:'m1',sot:{serviceSchedules:[{catalogPartId:'p1'}]}},
    {id:'v2',name:'B',modelId:'m2',sot:{serviceSchedules:[{catalogPartId:'p1'}]}}
  ],kmLogs:[],servisLogs:[],transactions:[{id:'t1',catalogPartId:'p1'},{id:'t2',catalogPartId:'missing'}],spareparts:[{id:'s1',catalogPartId:'p1'}],carNotes:[{id:'n1',catalogPartRefs:['p1','missing']}]};
  global.VehicleCarNotesSOT={getServiceSchedules:id=>D.vehicles.find(v=>v.id===id).sot.serviceSchedules,read:id=>D.vehicles.find(v=>v.id===id).sot};
  global.VehicleCatalog={getAll:async()=>[{id:'p1',compatibleVehicleIds:['v1']}]} ;
}
async function run(mod){
  fixture();
  delete require.cache[require.resolve(mod)];
  const S=require(mod); return JSON.parse(JSON.stringify(await S.health()));
}
(async()=>{
 const old=await run(path.resolve(__dirname,'fixtures/replay-reference/modules/vehicle/vehicle-sot-fleet-integrity.js'));
 const fresh=await run(path.resolve(__dirname,'../modules/vehicle/vehicle-sot-fleet-integrity.js'));
 assert.deepStrictEqual(fresh,old);
 console.log('S2408 health differential PASS');
})().catch(e=>{console.error(e);process.exit(1);});
