const assert=require('assert');const fs=require('fs');const vm=require('vm');
async function load(){
 const code=fs.readFileSync('modules/vehicle/vehicle-maintenance-template-engine.js','utf8');
 const components=[
  {componentId:'oli-mesin',componentName:'Oli Mesin',masterCategoryId:'servis-mesin',masterCategory:'Servis Mesin',intervalKm:4000,intervalTimeMonths:null,intervalLabel:'Ganti tiap 4.000 km',needsReview:false},
  {componentId:'busi',componentName:'Busi',masterCategoryId:'servis-mesin',masterCategory:'Servis Mesin',intervalKm:8000,intervalTimeMonths:null,intervalLabel:'',needsReview:false},
  {componentId:'kampas-rem-depan',componentName:'Kampas Rem Depan',masterCategoryId:'sistem-pengereman',masterCategory:'Sistem Pengereman',intervalKm:null,intervalTimeMonths:null,intervalLabel:'',needsReview:true},
  {componentId:'v-belt',componentName:'V-Belt CVT',masterCategoryId:'servis-cvt',masterCategory:'Servis CVT',intervalKm:null,intervalTimeMonths:null,intervalLabel:'',needsReview:true}
 ];
 const cats=[{masterCategoryId:'servis-mesin',masterCategory:'Servis Mesin',icon:'🔧'},{masterCategoryId:'servis-cvt',masterCategory:'Servis CVT',icon:'🔗'},{masterCategoryId:'sistem-pengereman',masterCategory:'Sistem Pengereman',icon:'🛑'}];
 const sandbox={console,window:{},DatabaseAPI:{master:{getGenericRecommendNames:()=>({motor:['Oli Mesin','Busi','Kampas Rem Depan','V-Belt CVT'],mobil:['Oli Mesin']})}},ServiceMasterDB:{getAllComponents:async()=>components,getAllCategories:async()=>cats},PartsCatalogDB:{getCatalog:async()=>({catalogCode:'K61',parts:[{partNumber:'123',componentIds:['v-belt']} ]})},VehicleModelResolverSOT:{resolve:()=>({status:'unknown',model:null})}};
 vm.createContext(sandbox);vm.runInContext(code,sandbox);return sandbox.window.VehicleMaintenanceTemplateEngine;
}
(async()=>{
 const E=await load();let t=await E.build({vehicleType:'motor'});assert(t.componentCount===4);assert(t.components.some(x=>x.componentId==='oli-mesin'));assert(t.components.every(x=>x.intervalKm===null||Number.isFinite(x.intervalKm)));
 const selected=t.components.filter(x=>x.componentId!=='v-belt').map(x=>x.componentId);const t2=E.applySelection(t,selected);assert(!t2.selectedComponentIds.includes('v-belt'));assert(t2.customized===true);
 const t3=await E.build({vehicleType:'motor',catalogId:'K61'});assert(t3.components.find(x=>x.componentId==='v-belt').source==='catalog');
 console.log('S1868 vehicle maintenance template tests: 3/3 PASS');
})().catch(e=>{console.error(e);process.exit(1)});
