'use strict';
/**
 * S1860 — one-stage app-wide hardening contract gate.
 *
 * This is intentionally a static contract gate: it verifies that the
 * persistence race, test-isolation, lifecycle, async-stale, listener,
 * error-path and release-gate hardening contracts remain present without
 * running the full 7k+ regression suite.
 */
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const failures=[];
const pass=[];
function check(name,fn){try{fn();pass.push(name);}catch(e){failures.push(`${name}: ${e.message}`);}}
function must(s,re,msg){if(!re.test(s))throw new Error(msg);}
function extractNamedSelfTest(src,name){
  const marker=`{name:'${name}'`;
  const start=src.indexOf(marker);
  if(start<0)throw new Error(`missing self-test: ${name}`);
  const next=src.indexOf("{name:'",start+marker.length);
  return src.slice(start,next<0?src.length:next);
}

const persistenceFiles=[
 'modules/shared/features-helpers-global-security.js',
 'modules/asset/features-helpers-global-security.js',
 'modules/finance/features-helpers-global-security.js',
 'modules/shop/features-helpers-global-security.js'
];

check('P0 persistence race / stale-write ordering',()=>{
  for(const f of persistenceFiles){
    const s=read(f);
    must(s,/(?:let|var) _savePersistChain=Promise\.resolve\(\)/,`${f}: persistence queue missing`);
    must(s,/(?:let|var) _savePersistSeq=0/,`${f}: persistence sequence missing`);
    must(s,/if\(_saveQueuedVersion===version\)return _saveQueuedStamp/,`${f}: duplicate snapshot guard missing`);
    const flush=s.slice(s.indexOf('function saveFlush(){'),s.indexOf('function saveFlush(){')+2500);
    must(flush,/clearTimeout\(_saveDebounceTimer\)/,`${f}: saveFlush must cancel debounce`);
    must(flush,/_saveImmediate\(json\)/,`${f}: saveFlush must hard-flush immediately`);
  }
});

check('P0 self-test isolation / no cross-test stale leakage',()=>{
  for(const f of ['modules/shared/self-test-cases-b.js','tests/self-test.js']){
    const s=read(f);
    for(const name of [
      'save() di-debounce (PERFORMA): beberapa panggilan berturutan cuma menulis ke disk SATU KALI',
      'saveFlush() (PERFORMA): menulis ke disk SEKARANG & membatalkan jeda debounce yang masih tertunda'
    ]){
      const body=extractNamedSelfTest(s,name);
      must(body,/const staleBefore=typeof _crossTabStateStale/ ,`${f}: ${name} stale snapshot missing`);
      must(body,/const warnBefore=typeof _crossTabWarnShown/ ,`${f}: ${name} warning snapshot missing`);
      must(body,/if\(typeof _crossTabStateStale!=='undefined'\)_crossTabStateStale=false/,`${f}: ${name} stale isolation missing`);
      must(body,/if\(typeof _crossTabStateStale!=='undefined'\)_crossTabStateStale=staleBefore/,`${f}: ${name} stale restore missing`);
      must(body,/if\(typeof _crossTabWarnShown!=='undefined'\)_crossTabWarnShown=warnBefore/,`${f}: ${name} warning restore missing`);
      must(body,/if\(_saveDebounceTimer\)\{clearTimeout\(_saveDebounceTimer\);_saveDebounceTimer=null;\}/,`${f}: ${name} timer cleanup missing`);
    }
  }
});

check('P1 lifecycle singleton / cleanup',()=>{
  const runtime=read('modules/shared/app-init-runtime.js');
  const aiService=read('modules/ai/ai-service.js');
  const aiCore=read('modules/ai/ai-core.js');
  must(runtime,/__kwRuntimeMaintenanceTimer/,'runtime maintenance singleton missing');
  must(aiService,/if\s*\(this\._wired\)\s*return;/,'AI service double-wire guard missing');
  must(aiService,/unwireEvents/,'AI service cleanup missing');
  must(aiCore,/includes\(handler\)/,'AIBus subscription dedupe missing');
  must(aiCore,/delete this\._listeners\[eventName\]/,'AIBus empty-list cleanup missing');
});

check('P1 event-listener lifecycle',()=>{
  const runtime=read('modules/shared/app-init-runtime.js');
  const vehicle=read('modules/vehicle/vehicle-core.js');
  must(runtime,/__kwRuntimeMaintenanceTimer/,'runtime maintenance singleton anchor missing');
  must(vehicle,/__cnOfflineStatus1747/,'vehicle offline listener singleton guard missing');
  const scanner=read('modules/shared/scanner-session.js');
  must(scanner,/scannerSessionIsActive/,'scanner session lifecycle self-heal missing');
});

check('P1 async stale-result protection',()=>{
  const modal=read('modules/shared/modal-navigasi.js');
  const ocr=read('modules/shared/scan-ocr.js');
  must(modal,/window\._modalEpoch=\(window\._modalEpoch\|\|0\)\+1/,'modal epoch not advanced on open');
  must(ocr,/_scanEpochNow\(\)/,'OCR epoch capture missing');
  must(ocr,/_scanEpochStale\(epoch\)/,'OCR stale-result guard missing');
  must(ocr,/if\(_scanEpochStale\(_scanEpoch\)\)/,'OCR result is not blocked after stale check');
});

check('P1 camera async timeout recovery',()=>{
  for(const f of ['modules/vehicle/vehicle-scanner.js','modules/vehicle/sparepart-scanner.js']){
    const s=read(f);
    must(s,/WithCameraTimeout|withCameraTimeout/i,`${f}: camera timeout helper missing`);
    must(s,/setTimeout\(/,`${f}: camera timeout timer missing`);
  }
});

check('P1 error-path hygiene',()=>{
  const files=[];
  function walk(dir){
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      if(ent.name==='node_modules'||ent.name==='.git'||ent.name==='backups')continue;
      const p=path.join(dir,ent.name);
      if(ent.isDirectory())walk(p); else if(ent.name.endsWith('.js'))files.push(p);
    }
  }
  walk(path.join(ROOT,'modules'));
  for(const p of files){
    const s=fs.readFileSync(p,'utf8');
    if(/catch\s*\([^)]*\)\s*\{\s*\}/.test(s))throw new Error(`empty catch in ${path.relative(ROOT,p)}`);
  }
});

check('P2 release-gate dependency graph / no recursion',()=>{
  const sot=read('scripts/service-sot-integrity-gate.js');
  const release=read('scripts/verify-release-ready.js');
  if(/verify-release-ready\.js/.test(sot))throw new Error('service SoT gate must not invoke release gate');
  must(release,/SERVICE_SOT_SKIP_FULL_REGRESSION/,'release gate must use nested service-gate skip contract');
  must(sot,/SERVICE_SOT_SKIP_FULL_REGRESSION/,'service gate nested/full-regression guard missing');
});

check('P2 source-size / bundle syntax contract',()=>{
  for(const f of ['app-bundle-a.min.js','app-bundle-b.min.js']){
    const s=read(f);
    if(!s.trim())throw new Error(`${f} empty`);
  }
  for(const f of ['modules/shared/self-test-cases-b.js','tests/self-test.js']){
    if(!read(f).includes('saveFlush()'))throw new Error(`${f} saveFlush contract missing`);
  }
});

console.log(`S1860 APP-WIDE HARDENING: ${pass.length} contracts pass, ${failures.length} fail`);
for(const x of pass)console.log(`✓ ${x}`);
for(const x of failures)console.error(`✗ ${x}`);
if(failures.length)process.exit(1);
