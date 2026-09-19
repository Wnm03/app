#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
function check(){const errors=[];const s=read('modules/shared/features-helpers-global-security.js');
 if(!/function save\(/.test(s)||!/function saveFlush\(\)/.test(s))errors.push('save/saveFlush canonical API hilang');
 if(!/IDBStore\.set\('kw_v4_mirror',json\)/.test(s))errors.push('IndexedDB kw_v4_mirror bukan persistence primary');
 if(!/localStorage\.setItem\('kw_v4',json\)/.test(s))errors.push('localStorage critical snapshot fallback hilang');
 if(!/_savePersistChain=Promise\.resolve\(\)/.test(s))errors.push('persistence write queue hilang');
 if(!/_lifecycleFlushInstalled=false/.test(s)||!/_installPersistenceLifecycleFlush\(\)/.test(s))errors.push('lifecycle flush singleton hilang');
 if(!/BroadcastChannel\('kw_v4_persistence'\)/.test(s)||!/_markCrossTabStale/.test(s))errors.push('cross-tab stale protection hilang');
 if(!/schemaVersion=v/.test(s))errors.push('migration schema checkpoint guard hilang');
 return {ok:!errors.length,errors};}
function main(){const r=check();if(!r.ok){console.error('PERSISTENCE-INTEGRITY: FAIL');r.errors.forEach(e=>console.error(' - '+e));process.exit(1)}console.log('PERSISTENCE-INTEGRITY: PASS — IDB primary, LS critical fallback, queued writes, lifecycle flush, cross-tab guard, migration checkpoint.')}
if(require.main===module)main();module.exports={check};
