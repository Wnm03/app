'use strict';
// S2278 — deterministic runtime invocation matrix.
// This is a VM-level invocation contract, not browser E2E: the real lazy
// loader is executed, while _loadScriptOnce is stubbed to register the
// representative globals that each loaded script owns. This catches a class
// of failures that static ordering tests cannot: loader resolves but the
// consumer API is still unavailable/uninvokable.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ROOT=path.join(__dirname,'..');
function loadSource(files, extraGlobals={}, expose=[]){
  const sandbox={console,Date,Math,JSON,Number,String,Boolean,Array,Object,RegExp,Map,Set,Promise,setTimeout:()=>0,clearTimeout:()=>{},window:{},document:{},navigator:{},...extraGlobals};
  vm.createContext(sandbox);
  for(const f of files){ vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),sandbox,{filename:f}); }
  for(const name of expose) if(!(name in sandbox)){ sandbox[name]=undefined; }
  return sandbox;
}

const LOADER='modules/shared/feature-lazy-loader.js';

function runtimeFor(loaderName){
  const calls=[];
  const ctx=loadSource([LOADER],{
    _loadScriptOnce:async(src)=>{
      calls.push(src);
      if(src==='modules/vehicle/sparepart-scanner.js'){
        ctx.SparepartScanner={scan:async(adapter)=>({item:{id:'P1',barcode:'X1'},adapter})};
      }
      if(src==='modules/vehicle/honda-pdf-import-ui.js'){
        ctx.HondaPdfImportUI={open:()=>true};
      }
      if(src==='data-health-check.js'){
        ctx.DataHealth={run:()=>true};
        ctx.runDataHealthCheck=()=>true;
      }
      if(src==='laporan-export.js'){
        ctx.exportLaporanPDF=()=>true;
        ctx.exportLaporanImage=()=>true;
      }
      if(src==='modules/business/shop-pdf-import-ui.js'){
        ctx.ShopPdfImportUI={open:()=>true};
      }
    }
  },[
    'VEHICLE_CATALOG_FEATURE_SCRIPTS','HONDA_PDF_FEATURE_SCRIPTS',
    'DATA_HEALTH_FEATURE_SCRIPTS','LAPORAN_EXPORT_FEATURE_SCRIPTS',
    'SHOP_PDF_IMPORT_FEATURE_SCRIPTS'
  ]);
  return {ctx,calls,loader:ctx[loaderName]};
}

test('S2278 runtime invocation: Vehicle Catalog exposes scanner after demand load',async()=>{
  const {ctx,calls,loader}=runtimeFor('ensureVehicleCatalogFeatureScripts');
  await loader();
  assert.ok(calls.includes('modules/vehicle/sparepart-scanner.js'));
  assert.equal(typeof ctx.SparepartScanner.scan,'function');
  const result=await ctx.SparepartScanner.scan('camera');
  assert.equal(result.item.id,'P1');
});

test('S2278 runtime invocation: Honda PDF exposes UI after dependency chain',async()=>{
  const {ctx,calls,loader}=runtimeFor('ensureHondaPdfImportScripts');
  await loader();
  assert.ok(calls.indexOf('modules/vehicle/vehicle-catalog-import.js')>=0);
  assert.equal(typeof ctx.HondaPdfImportUI.open,'function');
  assert.equal(ctx.HondaPdfImportUI.open(),true);
});

test('S2278 runtime invocation: Data Health API is callable after demand load',async()=>{
  const {ctx,loader}=runtimeFor('ensureDataHealthScripts');
  await loader();
  assert.equal(typeof ctx.runDataHealthCheck,'function');
  assert.equal(ctx.runDataHealthCheck(),true);
  assert.equal(typeof ctx.DataHealth.run,'function');
});

test('S2278 runtime invocation: Laporan export API is callable after demand load',async()=>{
  const {ctx,loader}=runtimeFor('ensureLaporanExportScripts');
  await loader();
  assert.equal(typeof ctx.exportLaporanPDF,'function');
  assert.equal(typeof ctx.exportLaporanImage,'function');
  assert.equal(ctx.exportLaporanPDF(),true);
});

test('S2278 runtime invocation: Shop PDF UI is callable after Vehicle Catalog dependency',async()=>{
  const {ctx,calls,loader}=runtimeFor('ensureShopPdfImportScripts');
  await loader();
  assert.ok(calls.indexOf('modules/vehicle/vehicle-catalog-import.js')>=0);
  assert.equal(typeof ctx.ShopPdfImportUI.open,'function');
  assert.equal(ctx.ShopPdfImportUI.open(),true);
});

test('S2278 runtime invocation: loader rejection does not leave a falsely-ready API',async()=>{
  let attempts=0;
  let ctx;
  ctx=loadSource([LOADER],{
    _loadScriptOnce:async(src)=>{
      attempts++;
      if(src==='data-health-check.js') throw new Error('synthetic invocation load failure');
    }
  });
  await assert.rejects(ctx.ensureDataHealthScripts(),/synthetic invocation load failure/);
  assert.equal(typeof ctx.runDataHealthCheck,'undefined');
  await assert.rejects(ctx.ensureDataHealthScripts(),/synthetic invocation load failure/);
  assert.ok(attempts>=2,'failed loader must be retryable, not falsely cached as ready');
});
