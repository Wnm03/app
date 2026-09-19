const fs=require('fs');
const {readCarNotesSource}=require('./helpers/carNotesSource');
const fs2=require('fs'),assert=require('assert');
const cn=readCarNotesSource();
const tx=fs.readFileSync('modules/finance/transaksi-b.js','utf8');
const ad=fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8');
function ok(n,c){assert.ok(c,n);console.log('PASS',n)}
// S1857: save() now takes a scoped-mutation options object instead of being called bare.
ok('batch defers item save',cn.includes('_batchDeferSave:true')&&/if\(!opts\._batchDeferSave\)\{save\(\{/.test(cn)&&/save\(\{[^)]*\}\);\n\s*for\(const entry of results\)/.test(cn));
ok('batch publishes events once',cn.includes('for(const entry of results){') && (cn.match(/for\(const entry of results\)\{/g)||[]).length===1);
ok('outbox durable localStorage',ad.includes("service-event-outbox:v1")&&ad.includes('localStorage.setItem'));
ok('finance service removal post-commit',tx.includes('_pendingServiceLifecycleRemove')&&tx.includes('save();\n// V28: flush deferred Finance->Service removals'));
ok('outbox supports remove events',tx.includes("type:'service.remove'"));
console.log('V28 PASS');
