const test=require('node:test');
const assert=require('node:assert/strict');
function normalizeCode(v){return String(v||'').replace(/[\s-]/g,'').toUpperCase();}
function resolve(cats,items,cat,vehicleId){
 const pool=items.filter(x=>(x.compatibleVehicleIds||[]).map(String).includes(String(vehicleId)));
 if(cat.catalogPartId){const x=pool.find(i=>String(i.id)===String(cat.catalogPartId));if(x)return x;}
 const code=normalizeCode(cat.code);if(code){const x=pool.find(i=>normalizeCode(i.oemCode)===code);if(x)return x;}
 const name=String(cat.name||'').trim().toLowerCase();const xs=pool.filter(i=>String(i.partName||'').trim().toLowerCase()===name);return xs.length===1?xs[0]:null;
}
test('SOT-2C resolves service category to catalog part by explicit id/code/name',()=>{
 const items=[{id:'p1',partName:'Oli Mesin',oemCode:'ABC-123',category:'Fast Moving & Fluida',subcategory:'Oli',compatibleVehicleIds:['veh_1']}];
 assert.equal(resolve([],items,{catalogPartId:'p1',name:'x'},'veh_1').id,'p1');
 assert.equal(resolve([],items,{code:'ABC 123',name:'x'},'veh_1').id,'p1');
 assert.equal(resolve([],items,{name:'Oli Mesin'},'veh_1').id,'p1');
});
test('SOT-2C does not cross-link another vehicle',()=>{
 const items=[{id:'p1',partName:'Oli Mesin',oemCode:'ABC',category:'A',compatibleVehicleIds:['veh_2']}];
 assert.equal(resolve([],items,{name:'Oli Mesin'},'veh_1'),null);
});
