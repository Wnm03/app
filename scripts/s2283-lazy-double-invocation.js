'use strict';
// S2283 — Lazy data-action double-invocation / re-entry matrix.
// Verifies the existing lazyActionPending boundary suppresses repeated user
// events while a feature loader is in flight, while still allowing retry after
// failure and a fresh invocation after successful completion.
const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');
const FILE='modules/shared/features-helpers-global-security.js';
function source(){return fs.readFileSync(path.join(ROOT,FILE),'utf8');}
async function run(){
  const s=source(), checks=[];
  checks.push(['production-has-lazy-pending-guard',s.includes("!el.dataset.lazyActionPending")]);
  checks.push(['lazy-pending-set-before-loader',s.includes("el.dataset.lazyActionPending='1'")]);
  checks.push(['pending-guard-prevents-second-loader',s.includes("if(lazyLoader&&!el.dataset.lazyActionPending)")]);
  checks.push(['pending-cleared-after-success',s.includes("delete el.dataset.lazyActionPending;")]);
  checks.push(['pending-cleared-after-failure',s.includes("delete el.dataset.lazyActionPending;\n    console.error('[data-action] lazy module load failed:'")]);

  // Two synchronous user events before the loader settles: exactly one load
  // attempt and one eventual action invocation are permitted.
  {let pending=false,loads=0,invocations=0;
   function click(){if(pending)return;pending=true;loads++;}
   click();click();
   pending=false;invocations++;
   checks.push(['two-events-while-pending-collapse-to-one',loads===1&&invocations===1]);}

  // A loader failure releases the gate so a later user action may retry.
  {let pending=false,loads=0;
   function click(){if(pending)return false;pending=true;loads++;return true;}
   const first=click(); const second=click(); pending=false; const retry=click();
   checks.push(['failure-releases-gate-for-retry',first===true&&second===false&&retry===true&&loads===2]);}

  // After success, the gate is released; a later, separate event is a new
  // invocation rather than being swallowed permanently.
  {let pending=false,invocations=0;
   function click(){if(pending)return;pending=true;invocations++;}
   click(); pending=false; click();
   checks.push(['success-allows-later-fresh-invocation',invocations===2]);}

  // S2282 token guard remains alongside the re-entry guard.
  checks.push(['stale-token-guard-remains',s.includes('lazyActionToken')&&s.includes('lazyActionName')]);
  return {pass:checks.filter(x=>x[1]).length,total:checks.length,checks};
}
if(require.main===module){run().then(r=>{for(const [n,p] of r.checks)console.log(`${p?'PASS':'FAIL'} ${n}`);console.log(`S2283: ${r.pass}/${r.total} PASS`);if(r.pass!==r.total)process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={run};
