#!/usr/bin/env node
'use strict';
/**
 * S2285 — deploy/data continuity gate.
 *
 * Prevents a common production incident: source files are patched but the
 * bundles actually served by the app are stale, or the release changes the
 * persistence namespace/schema contract accidentally. This gate is read-only.
 */
const fs=require('node:fs');
const path=require('node:path');
const {checkBundleFreshness}=require('./verify-bundle-freshness');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const issues=[];
const pass=[];

function requireFile(f){if(!fs.existsSync(path.join(root,f))){issues.push(`file missing: ${f}`);return false;}return true;}

// 1) Bundle source freshness.
try{
 const r=checkBundleFreshness();
 r.forEach(x=>x.status==='fresh'?pass.push(`bundle fresh: ${x.file}`):issues.push(`bundle ${x.status}: ${x.file}`));
}catch(e){issues.push(`bundle freshness check failed: ${e.message||e}`);}

// 2) Persistence namespace/schema must remain stable unless the gate is
// intentionally updated together with a migration plan.
if(requireFile('modules/shared/features-helpers-global-security.js')){
 const src=read('modules/shared/features-helpers-global-security.js');
 const schema=(src.match(/const SCHEMA_VERSION\s*=\s*(\d+)/)||[])[1];
 if(schema)pass.push(`schemaVersion=${schema}`); else issues.push('SCHEMA_VERSION missing');
 if(!/localStorage\.setItem\(['"]kw_v4['"]/.test(src))issues.push('localStorage persistence key kw_v4 missing');
 else pass.push('localStorage key kw_v4 preserved');
 if(!/kw_v4_mirror/.test(src))issues.push('IndexedDB mirror key kw_v4_mirror missing');
 else pass.push('IndexedDB mirror key kw_v4_mirror preserved');
}
if(requireFile('modules/asset/aset-misc.js')){
 const src=read('modules/asset/aset-misc.js');
 if(/DB_NAME:\s*['"]kw_idb_v1['"]/.test(src))pass.push('IndexedDB database name kw_idb_v1 preserved');
 else issues.push('IndexedDB database name kw_idb_v1 changed/missing — DATA MIGRATION REQUIRED');
}

// 3) The release build must keep HTML and service-worker cache versions aligned.
try{
 const idx=read('index.html'), sw=read('sw.js');
 const hv=[...idx.matchAll(/[?&]v=(\d+)/g)].map(m=>m[1]);
 const sv=(sw.match(/CACHE_NAME\s*=\s*['"]kw-cache-v(\d+)['"]/ )||[])[1];
 if(hv.length&&new Set(hv).size===1&&sv&&hv[0]===sv)pass.push(`HTML/SW release version=${hv[0]}`);
 else issues.push(`HTML/SW version mismatch: HTML=${[...new Set(hv)].join(',')||'<none>'} SW=${sv||'<none>'}`);
}catch(e){issues.push(`HTML/SW version check failed: ${e.message||e}`);}

console.log('S2285 DEPLOY DATA CONTINUITY GATE');
pass.forEach(x=>console.log('✓ '+x));
issues.forEach(x=>console.error('✗ '+x));
if(issues.length){console.error('\nBLOCK: jangan deploy. Rebuild + release verification wajib dilakukan lebih dulu.');process.exit(1);}
console.log('\nPASS: release tidak menunjukkan drift persistence/bundle yang dapat menyebabkan data continuity regression.');
