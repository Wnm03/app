'use strict';
// S2279 — Lazy loader concurrency/race matrix.
// Deterministic audit of the real feature-lazy-loader.js promise ownership.
// It verifies concurrent callers share one in-flight promise, dependency
// chains serialize correctly, and a failed shared load resets for retry.
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ROOT=path.join(__dirname,'..');
const LOADER='modules/shared/feature-lazy-loader.js';
function ctxFor(loadScript){
  const sandbox={console,Date,Math,JSON,Number,String,Boolean,Array,Object,RegExp,Map,Set,Promise,setTimeout,clearTimeout,window:{},document:{},navigator:{},_loadScriptOnce:loadScript};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT,LOADER),'utf8'),sandbox,{filename:LOADER});
  return sandbox;
}
function wait(ms){return new Promise(r=>setTimeout(r,ms));}
async function run(){
  const out=[];
  const scripts=[]; let active=0,maxActive=0;
  const ctx=ctxFor(async src=>{
    scripts.push(src); active++; maxActive=Math.max(maxActive,active);
    await wait(2);
    active--;
  });
  const [a,b,c]=await Promise.all([
    ctx.ensureVehicleCatalogFeatureScripts(),
    ctx.ensureVehicleCatalogFeatureScripts(),
    ctx.ensureVehicleCatalogFeatureScripts()
  ]);
  out.push(['vehicle-concurrent-same-promise',a===true&&b===true&&c===true]);
  out.push(['vehicle-no-duplicate-loads',new Set(scripts).size===scripts.length]);
  out.push(['vehicle-loads-serialized',maxActive===1]);

  const cross=[];
  const ctx2=ctxFor(async src=>{cross.push(src); await wait(2);});
  await Promise.all([
    ctx2.ensureHondaPdfImportScripts(),
    ctx2.ensureShopPdfImportScripts(),
    ctx2.ensureVehicleCatalogFeatureScripts()
  ]);
  const vehicleCount=cross.filter(x=>x.startsWith('modules/vehicle/') && !x.includes('honda-pdf')).length;
  out.push(['cross-feature-shared-vehicle-boundary-once',vehicleCount===14]);
  out.push(['cross-feature-honda-after-vehicle',cross.indexOf('modules/vehicle/vehicle-catalog-import.js')<cross.indexOf('modules/vehicle/honda-pdf-import-ui.js')]);
  out.push(['cross-feature-shop-after-vehicle',cross.indexOf('modules/vehicle/vehicle-catalog-import.js')<cross.indexOf('modules/business/shop-pdf-import-ui.js')]);

  let fail=true, attempts=0;
  const ctx3=ctxFor(async src=>{attempts++; await wait(1); if(fail && src==='data-health-check.js') throw new Error('synthetic race failure');});
  const results=await Promise.allSettled([ctx3.ensureDataHealthScripts(),ctx3.ensureDataHealthScripts(),ctx3.ensureDataHealthScripts()]);
  const failed=results.every(r=>r.status==='rejected');
  fail=false;
  await ctx3.ensureDataHealthScripts();
  out.push(['shared-failure-propagates-to-all-callers',failed]);
  out.push(['failure-resets-for-retry',attempts===2]);
  return {pass:out.filter(x=>x[1]).length,total:out.length,checks:out};
}
if(require.main===module){run().then(r=>{for(const [n,p] of r.checks) console.log(`${p?'PASS':'FAIL'} ${n}`); console.log(`S2279: ${r.pass}/${r.total} PASS`); if(r.pass!==r.total) process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={run};
