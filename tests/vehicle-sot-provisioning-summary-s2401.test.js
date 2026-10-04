const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(){
 const code=fs.readFileSync('modules/vehicle/vehicle-sot-provisioning.js','utf8');
 const model={id:'m1',name:'Model 1',manufacturerId:'honda',torsi:{cats:[{cat:'A',items:[{name:'x'},{name:'y'}]},{cat:'A',items:[{name:'z'}]},{cat:'B',items:[]}]}};
 const sandbox={window:{},console,D:{vehicles:[]},DatabaseAPI:{vehicle:{modelGetAll:()=>[model]}},VehicleModelRegistrySOT:{find:()=>({model,profile:{id:'m1',name:'Model 1'},confidence:'exact',source:'modelId'}),profile:()=>({id:'m1',name:'Model 1'}),taxonomy:()=>[]},VehicleCatalog:null};
 vm.createContext(sandbox);vm.runInContext(code,sandbox);return sandbox.window.VehicleSOTProvisioning;
}
const api=load();
test('componentSummary preserves category de-duplication and item count',()=>{
 const model={id:'m1',name:'Model 1',torsi:{cats:[{cat:'A',items:[1,2]},{cat:'A',items:[3]},{cat:'B',items:[4]}]}};
 const cats=api.categoriesForModel(model);
 const a=api.componentSummary(model);
 const b=api.componentSummary(model,null,cats);
 assert.equal(JSON.stringify(b),JSON.stringify(a));
 assert.equal(JSON.stringify(b),JSON.stringify({categoryCount:2,categoryNames:['A','B'],vehicleDatabaseItems:4}));
});
