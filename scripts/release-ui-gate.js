#!/usr/bin/env node
/* S1891 — single lightweight UI/PWA release gate. */
'use strict';
const {execFileSync}=require('child_process');
const path=require('path');
const root=path.join(__dirname,'..');
const commands=[
 ['domain-contract','node',['--test','tests/s1891-domain-redesign-contract.test.js','tests/s1891-pwa-performance-contract.test.js']],
 ['critical-ui','node',['--test','tests/pwa-ui-layer-contract.test.js','tests/pwa-ui-responsive-contract.test.js','tests/pwa-ui-accessibility-contract.test.js','tests/pwa-ui-performance-budget-contract.test.js','tests/pwa-domain-workspace-optimization-contract.test.js']],
 ['critical-integrity','node',['--test','tests/carnotes-permanent-integrity-gate.test.js','tests/fresh-install-cache-integrity.test.js']],
 ['bundle-freshness','node',['scripts/verify-bundle-freshness.js']],
 ['window-expose','node',['scripts/verify-window-expose.js']],
 ['patch-contamination','node',['scripts/verify-patch-contamination.js']],
 ['performance-budget','node',['scripts/performance-budget.js']],
];
let failed=false;
for(const [name,bin,args] of commands){
 console.log(`\n=== ${name} ===`);
 try{execFileSync(bin,args,{cwd:root,stdio:'inherit'});}catch(e){failed=true;console.error(`✗ ${name} FAILED (${e.status||1})`);break;}
}
if(failed)process.exit(1);
console.log('\n✓ S1891 release-ui-gate PASS');
