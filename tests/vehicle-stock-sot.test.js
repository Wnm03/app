'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');
function makeD(){return {vehicles:[{id:'veh_1'},{id:'veh_2'}],partsStock:[],sparepartCats:[]};}
function ctx(D,items,extra){
 return loadSource(['modules/vehicle/vehicle-stock-sot.js'],Object.assign({D,VehicleCatalog:{ensureLoaded:async()=>{},isLoaded:()=>true,getStore:()=>({items})},save:()=>{}},extra||{}),['VehicleStockSOT']);
}
test('stock SOT — catalogPartId adalah identitas utama dan legacy catalogId tetap alias',async()=>{
 const D=makeD();D.partsStock.push({id:'s1',name:'Busi Lama',catalogId:'cat1',qty:4});
 const c=ctx(D,[{id:'cat1',partName:'Busi',category:'Mesin',subcategory:'Pengapian',oemCode:'98056-KZR-600',compatibleVehicleIds:['veh_1']}]);
 const r=await c.VehicleStockSOT.ensureReady('veh_1');
 assert.equal(r.linked,1);assert.equal(D.partsStock[0].catalogPartId,'cat1');assert.equal(D.partsStock[0].catalogId,'cat1');assert.equal(D.partsStock[0].catalogPartName,'Busi');assert.equal(D.partsStock[0].catalogCategory,'Mesin');assert.equal(D.partsStock[0].qty,4);
});
test('stock SOT — legacy row dapat dimigrasikan by OEM/name hanya jika match tunggal',async()=>{
 const D=makeD();D.partsStock.push({id:'s1',name:'Busi',code:'98056KZR600',qty:2});
 const c=ctx(D,[{id:'cat1',partName:'Busi',category:'Mesin',oemCode:'98056-KZR-600',compatibleVehicleIds:['veh_1']}]);
 await c.VehicleStockSOT.ensureReady('veh_1');assert.equal(D.partsStock[0].catalogPartId,'cat1');
});
test('stock SOT — tidak cross-vehicle saat fallback identitas',async()=>{
 const D=makeD();D.partsStock.push({id:'s1',name:'Busi',code:'98056KZR600',qty:2});
 const c=ctx(D,[{id:'cat2',partName:'Busi',category:'Mesin',oemCode:'98056-KZR-600',compatibleVehicleIds:['veh_2']}]);
 await c.VehicleStockSOT.ensureReady('veh_1');assert.equal(D.partsStock[0].catalogPartId,undefined);
});
test('stock SOT — match ambigu tidak ditebak',async()=>{
 const D=makeD();D.partsStock.push({id:'s1',name:'Busi',qty:2});
 const c=ctx(D,[{id:'cat1',partName:'Busi',category:'Mesin',compatibleVehicleIds:['veh_1']},{id:'cat2',partName:'Busi',category:'PGM-FI',compatibleVehicleIds:['veh_1']}]);
 const r=await c.VehicleStockSOT.ensureReady('veh_1');assert.equal(r.ambiguous,1);assert.equal(D.partsStock[0].catalogPartId,undefined);
});
test('stock SOT — direct catalogPartId tidak berubah walau nama stock lama berbeda',()=>{
 const D=makeD();D.partsStock.push({id:'s1',name:'Nama Lama',catalogPartId:'cat1',qty:7});
 const c=ctx(D,[{id:'cat1',partName:'Nama Canonical',category:'CVT',subcategory:'Roller',oemCode:'X',compatibleVehicleIds:['veh_1']}]);
 const hit=c.VehicleStockSOT.findCatalog(D.partsStock[0],'veh_1');assert.equal(hit.partName,'Nama Canonical');
});
test('stock SOT — apply mengisi snapshot taxonomy tanpa mengubah ledger qty/harga',()=>{
 const D=makeD();const c=ctx(D,[]);const p={id:'s1',qty:5,price:12000};const changed=c.VehicleStockSOT.apply(p,{id:'cat1',partName:'Roller',category:'CVT',subcategory:'Roller',oemCode:'22123-KZR-600'});assert.equal(changed,true);assert.equal(p.catalogPartId,'cat1');assert.equal(p.catalogCategory,'CVT');assert.equal(p.catalogSubcategory,'Roller');assert.equal(p.qty,5);assert.equal(p.price,12000);
});
