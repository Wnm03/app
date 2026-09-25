#!/usr/bin/env node
'use strict';
const {spawnSync}=require('node:child_process');
const gates=[
  'sot-integrity-gate.js',
  'architecture-integrity-gate.js',
  'persistence-integrity-gate.js',
  'pwa-recovery-integrity-gate.js',
  'feature-regression-gate.js',
  'verify-patch-integrity.js',
  'verify-patch-contamination.js'
];
let failed=0;
for(const gate of gates){
  const r=spawnSync(process.execPath,[require('node:path').join(__dirname,gate)],{stdio:'inherit'});
  if(r.status!==0){failed++;}
}
if(failed){console.error(`SYSTEM-INTEGRITY: FAIL — ${failed} gate(s) failed.`);process.exit(1);}
console.log(`SYSTEM-INTEGRITY: PASS — ${gates.length} gates.`);
