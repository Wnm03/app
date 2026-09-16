#!/usr/bin/env node
'use strict';
const {execFileSync}=require('node:child_process');const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const gates=['architecture-integrity-gate.js','persistence-integrity-gate.js','pwa-recovery-integrity-gate.js','feature-regression-gate.js','sot-integrity-gate.js','verify-delete-manifest.js','verify-version-integrity.js','verify-runtime-lifecycle.js','verify-carnotes-integrity.js','verify-bundle-freshness.js'];
let failed=0;for(const g of gates){console.log(`\n=== ${g} ===`);try{execFileSync(process.execPath,[path.join(ROOT,'scripts',g)],{cwd:ROOT,stdio:'inherit'});}catch(e){failed++;}}
if(failed){console.error(`\nRELEASE-FIREWALL: FAIL — ${failed}/${gates.length} gate(s)`);process.exit(1)}
console.log(`\nRELEASE-FIREWALL: PASS — ${gates.length}/${gates.length} structural/runtime gates.`);
