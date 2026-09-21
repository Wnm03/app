#!/usr/bin/env node
'use strict';
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const jobs=[
 ['ui-regression','node',['--test','tests/s1891-domain-redesign-contract.test.js','tests/s1891-pwa-performance-contract.test.js','tests/s1892-mobile-layout-integrity.test.js','tests/s1893-mobile-visual-integrity.test.js','tests/s1894-pwa-final-hardening.test.js','tests/s1900-production-readiness.test.js','tests/s1900-recovery-security.test.js','tests/s1900-device-matrix.test.js','tests/s1900-performance-memory.test.js','tests/s1900-service-worker-update.test.js']],
 ['production-readiness','node',['scripts/audit-production-readiness.js']],
 ['backup-integrity','node',['tests/s1901-backup-integrity-and-error-safety.test.js']],
 ['critical-integrity','node',['--test','tests/carnotes-permanent-integrity-gate.test.js','tests/fresh-install-cache-integrity.test.js']],
 ['sot','node',['scripts/sot-integrity-gate.js']],
 ['architecture','node',['scripts/architecture-integrity-gate.js']],
 ['persistence','node',['scripts/persistence-integrity-gate.js']],
 ['pwa-recovery','node',['scripts/pwa-recovery-integrity-gate.js']],
 ['features','node',['scripts/feature-regression-gate.js']],
 ['release-firewall','node',['scripts/release-firewall.js']],
 ['bundle-freshness','node',['scripts/verify-bundle-freshness.js']],
 ['window-expose','node',['scripts/verify-window-expose.js']],
 ['runtime-io','node',['scripts/audit-runtime-io.js']],
 ['event-listeners','node',['scripts/audit-event-listeners.js']],
 ['app-wide','node',['scripts/s1860-app-wide-hardening-gate.js']],
 ['performance-budget','node',['scripts/performance-budget.js']],
 ['patch-contamination','node',['scripts/verify-patch-contamination.js']],
 ['reproducible-build','node',['scripts/verify-reproducible-build.js']],
];
for(const [name,bin,args] of jobs){console.log(`\n=== ${name} ===`);try{execFileSync(bin,args,{cwd:root,stdio:'inherit'});}catch(e){console.error(`✗ ${name} FAILED (${e.status||1})`);process.exit(e.status||1);}}
console.log('\n✓ RELEASE FINAL GATE PASS');
