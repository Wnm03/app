const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const ROOT=process.cwd();
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
function sliceFunction(src,name){
  const start=src.indexOf(`function ${name}`);
  if(start<0)return '';
  let i=src.indexOf('{',start),depth=0;
  for(;i<src.length;i++){
    if(src[i]==='{')depth++;
    else if(src[i]==='}'&&--depth===0)return src.slice(start,i+1);
  }
  return src.slice(start);
}

test('S2277: data-action lazy owners map to canonical demand loaders',()=>{
 const src=read('modules/shared/features-helpers-global-security.js');
 const pairs=[
  ['HondaPdfImportUI','ensureHondaPdfImportScripts'],
  ['runDataHealthCheck','ensureDataHealthScripts'],
  ['DataHealth','ensureDataHealthScripts'],
  ['exportLaporanPDF','ensureLaporanExportScripts'],
  ['exportLaporanImage','ensureLaporanExportScripts'],
  ['ShopPdfImportUI','ensureShopPdfImportScripts']
 ];
 for(const [api,loader] of pairs) assert.match(src,new RegExp(`${api}\\s*:\\s*typeof ${loader}===['"]function['"]\\?${loader}:null`),`${api} -> ${loader}`);
});

test('S2277: eager finance scanner consumer demand-loads before SparepartScanner',()=>{
 const fn=sliceFunction(read('modules/finance/tx-stok-sparepart.js'),'txStockScanPartVia').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
 assert.ok(fn);
 const loader=fn.indexOf('ensureVehicleCatalogFeatureScripts');
 const scanner=fn.indexOf('SparepartScanner');
 assert.ok(loader>=0);
 assert.ok(scanner>loader);
 assert.match(fn,/await ensureVehicleCatalogFeatureScripts\(\)/);
});

test('S2277: laporan FAB demand-loads export module before export call',()=>{
 const fn=sliceFunction(read('modules/shared/action-wrappers.js'),'laporanFabExportPDF');
 assert.ok(fn);
 assert.match(fn,/ensureLaporanExportScripts\(\)\.then\(\(\)=>exportLaporanPDF\(\)\)/);
 assert.ok(fn.indexOf('ensureLaporanExportScripts')<fn.indexOf('exportLaporanPDF'));
});

test('S2277: lazy feature loaders remain resettable after rejection',()=>{
 const loader=read('modules/shared/feature-lazy-loader.js');
 const vars={VehicleCatalogFeature:'_vehicleCatalogFeatureLoadPromise',HondaPdfImport:'_hondaPdfFeatureLoadPromise',DataHealth:'_dataHealthFeatureLoadPromise',LaporanExport:'_laporanExportFeatureLoadPromise',ShopPdfImport:'_shopPdfImportFeatureLoadPromise'};
 for(const [name,varName] of Object.entries(vars)){
  assert.match(loader,new RegExp(varName+'\\s*=\\s*null'),`${name} loader must reset promise on failure`);
 }
});
