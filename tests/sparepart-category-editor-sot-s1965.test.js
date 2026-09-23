const fs=require('fs');const vm=require('vm');const assert=require('assert');
const base=__dirname.replace(/\/tests$/,'');
function load(file,ctx){vm.runInContext(fs.readFileSync(base+'/'+file,'utf8'),ctx,{filename:file});}
function makeCtx(){
 const nodes={};
 const mk=(id)=>nodes[id]||(nodes[id]={id,value:'',checked:false,dataset:{},classList:{add(){},remove(){},toggle(){}},style:{},querySelector(){return null},closest(){return null}});
 const ctx={console,Date,JSON,Math,Number,String,Array,Object,Map,Set,Promise,
  D:{sparepartCats:[{id:'cat-a',name:'Oli Mesin',code:'OLI',intervalKm:1500,showInReminder:true,vehicleId:'v1'},{id:'cat-b',name:'Servis CVT',code:'CVT',intervalKm:8000,showInReminder:true,vehicleId:'v1'}],vehicles:[{id:'v1',name:'Vario 125'}],partsStock:[]},curVehicleId:'v1',
  document:{getElementById:id=>mk(id),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{},classList:{add(){},remove(){},toggle(){}},appendChild(){},setAttribute(){}})},
  escapeHtml:s=>String(s),toast:()=>{},codeFromName:s=>String(s).toUpperCase(),catVisibleForVehicle:()=>true,
  ServiceInputCatalog:{groups:()=>[],infer:()=>null,itemById:()=>null},
  closeModal:()=>{},openModal:()=>{},renderServisList:()=>{},renderDashboardServisReminder:()=>{},save:()=>{},
  _renderSuggestBox:()=>{},collectKnownGroups:()=>[],iconForGroupName:()=>'',resolveServiceCategoryComponent:(a,b)=>({masterCategoryId:a,serviceComponentId:b}),
  ServiceInputCatalog:{groups:()=>[],infer:()=>null,itemById:()=>null},
 };
 ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);return ctx;
}
{
 const c=makeCtx();load('modules/vehicle/sparepart-servis.js',c);
 // capture the canonical function before loading the extracted UI layer.
 c.Sparepart.ensureIntervalBulanField=()=>null;c.Sparepart.populateVehicleSelect=()=>{};c.Sparepart.populateGroupSelect=()=>{};c.Sparepart.populateServiceComponentSelect=()=>{};c.Sparepart.updateMasterCatBadge=()=>{};c.Sparepart.autoSuggestInterval=()=>{};
 let opened=null;c.openModal=id=>{opened=id};
 c.Sparepart.openCatModalById('cat-b');
 assert.strictEqual(c.Sparepart.catEditId,'cat-b');
 assert.strictEqual(c.Sparepart.catEditIdx,1);
 assert.strictEqual(opened,'sparepartModal');
 c.D.sparepartCats.unshift({id:'cat-x',name:'X',intervalKm:1,vehicleId:'v1'});
 assert.strictEqual(c.Sparepart.catEditId,'cat-b');
 assert.strictEqual(c.D.sparepartCats.findIndex(x=>x.id===c.Sparepart.catEditId),2);
 console.log('PASS canonical category editor keeps ID across array reorder');
}
{
 const src=fs.readFileSync(base+'/modules/vehicle/servis-b.js','utf8');
 assert(src.includes('Sparepart.openCatModalById(catId)'));
 assert(src.includes("closeModal('servisModal',{instant:true})"));
 const wrap=fs.readFileSync(base+'/modules/vehicle/sparepart-servis-b.js','utf8');
 assert(wrap.includes('function openSparepartModalById(catId)'));
 console.log('PASS reminder and list routes expose canonical ID editor');
}
{
 const src=fs.readFileSync(base+'/modules/shared/modal-navigasi.js','utf8');
 assert(src.includes('if(opts.instant){finish();return;}'));
 console.log('PASS modal instant-close lifecycle exists');
}
{
 const src=fs.readFileSync(base+'/modules/vehicle/sparepart-servis.js','utf8');
 assert(src.includes('data-action="openSparepartModalById"'));
 assert(src.includes('openCatModalById(catId)'));
 console.log('PASS category list uses canonical ID route');
}
console.log('S1965 4/4 PASS');
