'use strict';
// S2280 — Lazy loader failure-recovery / partial-load matrix.
// Deterministic VM audit of the production loader. Each scenario fails at a
// dependency boundary, then retries in the same loader context after the
// rejected promise has been reset.
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ROOT=path.join(__dirname,'..');
const LOADER='modules/shared/feature-lazy-loader.js';
function ctxFor(loadScript){
  const sandbox={console,Date,Math,JSON,Number,String,Boolean,Array,Object,RegExp,Map,Set,Promise,setTimeout,clearTimeout,window:{},document:{},navigator:{},_loadScriptOnce:loadScript};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT,LOADER),'utf8'),sandbox,{filename:LOADER});
  vm.runInContext(`this.__lazyArrays={VEHICLE_CATALOG_FEATURE_SCRIPTS, HONDA_PDF_FEATURE_SCRIPTS, DATA_HEALTH_FEATURE_SCRIPTS, LAPORAN_EXPORT_FEATURE_SCRIPTS, SHOP_PDF_IMPORT_FEATURE_SCRIPTS};`,sandbox);
  return sandbox;
}
function expectedFor(ctx,arrayName){
  const a=ctx.__lazyArrays;
  if(arrayName==='HONDA_PDF_FEATURE_SCRIPTS') return [...a.VEHICLE_CATALOG_FEATURE_SCRIPTS,...a.HONDA_PDF_FEATURE_SCRIPTS];
  if(arrayName==='SHOP_PDF_IMPORT_FEATURE_SCRIPTS') return [...a.VEHICLE_CATALOG_FEATURE_SCRIPTS,...a.SHOP_PDF_IMPORT_FEATURE_SCRIPTS];
  return [...a[arrayName]];
}
async function assertReject(p){
  const r=await Promise.allSettled([p]);
  return r[0].status==='rejected';
}
async function run(){
  const checks=[];
  const cases=[
    ['vehicle','ensureVehicleCatalogFeatureScripts','VEHICLE_CATALOG_FEATURE_SCRIPTS'],
    ['honda','ensureHondaPdfImportScripts','HONDA_PDF_FEATURE_SCRIPTS'],
    ['health','ensureDataHealthScripts','DATA_HEALTH_FEATURE_SCRIPTS'],
    ['laporan','ensureLaporanExportScripts','LAPORAN_EXPORT_FEATURE_SCRIPTS'],
    ['shop','ensureShopPdfImportScripts','SHOP_PDF_IMPORT_FEATURE_SCRIPTS']
  ];
  for(const [name,loader,arrayName] of cases){
    const probe=ctxFor(async()=>{});
    const expected=expectedFor(probe,arrayName);
    const points=[1,Math.ceil(expected.length/2),expected.length];
    for(const point of points){
      const loaded=[];
      let failSrc=expected[point-1];
      let fail=true;
      const ctx=ctxFor(async src=>{loaded.push(src); if(fail && src===failSrc) throw new Error(`synthetic-${name}-${point}`);});
      const first=await Promise.allSettled([ctx[loader](),ctx[loader]()]);
      checks.push([`${name}-failure-at-${point}-rejects-all-callers`,first.every(r=>r.status==='rejected')]);
      const partial=loaded.slice();
      fail=false; loaded.length=0;
      await ctx[loader]();
      const vehicleLen=ctx.__lazyArrays.VEHICLE_CATALOG_FEATURE_SCRIPTS.length;
      const retryExpected=(arrayName==='HONDA_PDF_FEATURE_SCRIPTS'||arrayName==='SHOP_PDF_IMPORT_FEATURE_SCRIPTS') && point>vehicleLen ? ctx.__lazyArrays[arrayName] : expected;
      checks.push([`${name}-retry-after-${point}-loads-valid-recovery-chain`,loaded.length===retryExpected.length&&loaded.every((x,i)=>x===retryExpected[i])]);
      checks.push([`${name}-retry-after-${point}-restarts-at-first-dependency`,partial.length===point&&partial.every((x,i)=>x===expected[i])]);
    }
  }
  let fail=true, attempts=0;
  const ctx=ctxFor(async src=>{attempts++; if(fail && src==='modules/vehicle/vehicle-scanner.js') throw new Error('synthetic-stale-promise');});
  await assertReject(ctx.ensureVehicleCatalogFeatureScripts());
  fail=false;
  await ctx.ensureVehicleCatalogFeatureScripts();
  checks.push(['vehicle-promise-recoverable-after-first-dependency-failure',attempts===15]);
  return {pass:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
if(require.main===module){run().then(r=>{for(const [n,p] of r.checks) console.log(`${p?'PASS':'FAIL'} ${n}`); console.log(`S2280: ${r.pass}/${r.total} PASS`); if(r.pass!==r.total) process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={run};
