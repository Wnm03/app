'use strict';
// S2281 — Lazy loader multi-failure / recovery isolation matrix.
// Verifies that independent feature promises fail/recover independently while
// shared Vehicle Catalog dependency failures remain correctly shared.
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ROOT=path.join(__dirname,'..');
const LOADER='modules/shared/feature-lazy-loader.js';
function makeCtx(initialFailures){
  const failSet=new Set(initialFailures);
  const events=[];
  const sandbox={console,Date,Math,JSON,Number,String,Boolean,Array,Object,RegExp,Map,Set,Promise,setTimeout,clearTimeout,window:{},document:{},navigator:{},
    _loadScriptOnce:async src=>{events.push(src); if(failSet.has(src)) throw new Error('synthetic-'+src);}
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT,LOADER),'utf8'),sandbox,{filename:LOADER});
  return {ctx:sandbox,events,failSet};
}
async function settled(p){return Promise.allSettled(p);}
async function run(){
 const checks=[];
 // 1: Honda-specific failure must not poison Shop after shared dependency succeeds.
 { const {ctx,events}=makeCtx(['modules/vehicle/honda-pdf-import.js']);
   const [h,s]=await settled([ctx.ensureHondaPdfImportScripts(),ctx.ensureShopPdfImportScripts()]);
   checks.push(['honda-feature-failure-does-not-poison-shop',h.status==='rejected'&&s.status==='fulfilled']);
   const vehicle=events.filter(x=>x.startsWith('modules/vehicle/')&&!x.includes('honda-pdf-'));
   checks.push(['shared-vehicle-chain-loaded-once',new Set(vehicle).size===vehicle.length]);
 }
 // 2: Shop-specific failure must not poison Honda.
 { const {ctx}=makeCtx(['modules/business/shop-pdf-import-ui.js']);
   const [h,s]=await settled([ctx.ensureHondaPdfImportScripts(),ctx.ensureShopPdfImportScripts()]);
   checks.push(['shop-feature-failure-does-not-poison-honda',h.status==='fulfilled'&&s.status==='rejected']);
 }
 // 3: Independent single-file features fail/recover independently.
 { const {ctx,failSet}=makeCtx(['data-health-check.js','laporan-export.js']);
   const [d,l]=await settled([ctx.ensureDataHealthScripts(),ctx.ensureLaporanExportScripts()]);
   checks.push(['health-and-laporan-fail-independently',d.status==='rejected'&&l.status==='rejected']);
   failSet.clear();
   const [d2,l2]=await settled([ctx.ensureDataHealthScripts(),ctx.ensureLaporanExportScripts()]);
   checks.push(['health-and-laporan-both-recover',d2.status==='fulfilled'&&l2.status==='fulfilled']);
 }
 // 4: Shared dependency failure is shared; once fixed, both consumers recover.
 { const {ctx,events,failSet}=makeCtx(['modules/vehicle/vehicle-scanner.js']);
   const [h,s]=await settled([ctx.ensureHondaPdfImportScripts(),ctx.ensureShopPdfImportScripts()]);
   checks.push(['shared-vehicle-failure-rejects-both-dependent-features',h.status==='rejected'&&s.status==='rejected']);
   failSet.clear(); events.length=0;
   const [h2,s2]=await settled([ctx.ensureHondaPdfImportScripts(),ctx.ensureShopPdfImportScripts()]);
   checks.push(['shared-vehicle-recovery-allows-both-features',h2.status==='fulfilled'&&s2.status==='fulfilled']);
   const vehicleLoads=events.filter(x=>x.startsWith('modules/vehicle/')&&!x.startsWith('modules/vehicle/honda-pdf-'));
   checks.push(['recovery-shares-single-vehicle-load-chain',new Set(vehicleLoads).size===vehicleLoads.length]);
 }
 // 5: Promise identities remain isolated after one feature fails.
 { const {ctx}=makeCtx(['modules/vehicle/honda-pdf-import.js']);
   const hp=ctx.ensureHondaPdfImportScripts(); const sp=ctx.ensureShopPdfImportScripts();
   checks.push(['honda-and-shop-promises-are-distinct',hp!==sp]);
   await settled([hp,sp]);
   const hp2=ctx.ensureHondaPdfImportScripts(); const sp2=ctx.ensureShopPdfImportScripts();
   checks.push(['failed-feature-promise-reset-does-not-reset-sibling',hp2!==sp2]);
   await settled([hp2,sp2]);
 }
 // 6: Concurrent independent feature recovery remains deduplicated per feature.
 { const {ctx,failSet,events}=makeCtx(['data-health-check.js','laporan-export.js']);
   await settled([ctx.ensureDataHealthScripts(),ctx.ensureLaporanExportScripts()]);
   failSet.clear(); events.length=0;
   const [a,b,c,d]=await settled([ctx.ensureDataHealthScripts(),ctx.ensureDataHealthScripts(),ctx.ensureLaporanExportScripts(),ctx.ensureLaporanExportScripts()]);
   checks.push(['post-failure-concurrent-retry-all-callers-fulfill',[a,b,c,d].every(x=>x.status==='fulfilled')]);
   checks.push(['post-failure-concurrent-retry-deduplicated-per-feature',events.filter(x=>x==='data-health-check.js').length===1&&events.filter(x=>x==='laporan-export.js').length===1]);
 }
 return {pass:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
if(require.main===module){run().then(r=>{for(const [n,p] of r.checks) console.log(`${p?'PASS':'FAIL'} ${n}`); console.log(`S2281: ${r.pass}/${r.total} PASS`); if(r.pass!==r.total) process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={run};
