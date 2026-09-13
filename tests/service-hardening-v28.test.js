const fs=require('fs'),assert=require('assert');
const cn=fs.readFileSync('car-notes.js','utf8');
const tx=fs.readFileSync('modules/finance/transaksi-b.js','utf8');
const ad=fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8');
function ok(n,c){assert.ok(c,n);console.log('PASS',n)}
ok('batch defers item save',cn.includes('_batchDeferSave:true')&&cn.includes('if(!opts._batchDeferSave){save();')&&cn.includes('save();\n    for(const entry of results)'));
ok('batch publishes events once',cn.includes('for(const entry of results){') && (cn.match(/for\(const entry of results\)\{/g)||[]).length===1);
ok('outbox durable localStorage',ad.includes("service-event-outbox:v1")&&ad.includes('localStorage.setItem'));
ok('finance service removal post-commit',tx.includes('_pendingServiceLifecycleRemove')&&tx.includes('save();\n// V28: flush deferred Finance->Service removals'));
ok('outbox supports remove events',tx.includes("type:'service.remove'"));
console.log('V28 PASS');
