#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const serviceOutbox=read('modules/vehicle/service-event-adapter.js');
const financeOutbox=read('modules/finance/finance-event-outbox.js');
const lifecycle=read('modules/vehicle/service-event-lifecycle.js');
const serviceSot=read('modules/vehicle/service-event-sot.js');
const servis=read('modules/vehicle/servis.js');
const tx=read('modules/finance/transaksi-b.js');
const checks=[];
const ok=(name,pass)=>checks.push([name,!!pass]);
// Durable queue exists before post-commit projection handlers are invoked.
ok('service-outbox-persists-before-recovery', /localStorage\.setItem\(STORAGE_KEY,JSON\.stringify\(q\)\)/.test(serviceOutbox));
ok('service-outbox-keeps-failed-head-for-retry', /catch\(err\)\{\s*q\[index\]=\{\.\.\.q\[index\],attempts:/.test(serviceOutbox));
ok('service-outbox-preserves-causal-order', /const index=0/.test(serviceOutbox));
ok('finance-outbox-durable-journal', /IDBStore\.get\(KEY\)/.test(financeOutbox)&&/IDBStore\.set/.test(financeOutbox));
ok('finance-outbox-replay-preserves-event-id', /eventId:item\.eventId\|\|item\.id/.test(financeOutbox));
ok('finance-outbox-replay-does-not-clear-new-staged-events', /replayStagedIds/.test(financeOutbox)&&/staged=staged\.filter/.test(financeOutbox));
ok('service-lifecycle-reconciles-through-canonical-sot', /ServiceEventSOT\.normalize/.test(lifecycle));
ok('service-sot-audit-detects-orphan-finance-link', /ORPHAN_TRANSACTION/.test(serviceSot)&&/txLinkId/.test(serviceSot));
ok('service-post-commit-failure-enqueues-recovery', /post-commit service .*failed; reconciliation required/.test(servis)&&/ServiceEventOutbox\.enqueue/.test(servis));
ok('finance-post-commit-failure-enqueues-recovery', /finance event failed after commit; queued for reconciliation/.test(tx)&&/ServiceEventOutbox\.enqueue/.test(tx));
let pass=0; for(const [n,p] of checks){console.log(`${p?'PASS':'FAIL'} ${n}`);if(p)pass++;}
console.log(`S2293: ${pass}/${checks.length} PASS`); if(pass!==checks.length)process.exit(1);
