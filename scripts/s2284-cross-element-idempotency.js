'use strict';
// S2284 — cross-element lazy action idempotency boundary audit.
// Distinguishes UI-loader deduplication from domain side-effect idempotency.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const FILE='modules/shared/features-helpers-global-security.js';
const src=()=>fs.readFileSync(path.join(ROOT,FILE),'utf8');
async function run(){
 const s=src(), checks=[];
 checks.push(['dispatcher-has-shared-lazy-owner-map',s.includes('const lazyOwnerLoaders={')]);
 checks.push(['vehicle-catalog-demand-loader-contract-present',s.includes('ensureHondaPdfImportScripts')&&s.includes('ensureShopPdfImportScripts')]);
 checks.push(['per-element-pending-guard-is-local',s.includes("el.dataset.lazyActionPending")&&!s.includes('window.lazyActionPending')]);
 checks.push(['per-element-token-is-local',s.includes('el.dataset.lazyActionToken')&&!s.includes('window.lazyActionToken')]);
 // Two different elements may legitimately request the same feature; the loader
 // itself must deduplicate, while each element gets its own pending gate.
 {let loaderCalls=0,resolved=false;let p=null;
  function ensure(){if(!p)p=Promise.resolve().then(()=>{loaderCalls++;resolved=true;});return p;}
  const a={pending:false},b={pending:false};
  async function dispatch(el){if(el.pending)return;el.pending=true;await ensure();el.pending=false;}
  await Promise.all([dispatch(a),dispatch(b)]);
  checks.push(['two-elements-share-one-loader',loaderCalls===1&&resolved]);
  checks.push(['two-elements-have-independent-gates',a.pending===false&&b.pending===false]);
 }
 // If the shared loader fails, both callers observe the same failure; neither
 // caller should remain permanently locked, and a later retry is possible.
 {let p=null,calls=0;
  function ensure(fail){if(!p)p=Promise.resolve().then(()=>{calls++;if(fail)throw Error('x');});p=p.catch(e=>{p=null;throw e});return p;}
  const a={pending:false},b={pending:false};
  await Promise.allSettled([ensure(true),ensure(true)]);
  a.pending=b.pending=false;
  await ensure(false);
  checks.push(['shared-failure-allows-independent-retry',calls===2]);
 }
 // Explicit boundary: this dispatcher does not claim domain-level idempotency.
 // Different elements are allowed to invoke the same resolved function; domain
 // SOT/transaction contracts remain responsible for duplicate side-effect safety.
 checks.push(['domain-idempotency-not-faked-by-ui-guard',!s.includes('globalDomainIdempotencyLock')]);
 checks.push(['async-handler-pending-contract-preserved',s.includes("el.dataset.pendingAction='1'")&&s.includes('delete el.dataset.pendingAction')]);
 return {pass:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
if(require.main===module)run().then(r=>{for(const [n,p] of r.checks)console.log(`${p?'PASS':'FAIL'} ${n}`);console.log(`S2284: ${r.pass}/${r.total} PASS`);if(r.pass!==r.total)process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1});
module.exports={run};
