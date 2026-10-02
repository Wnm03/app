#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
const lifecycle=fs.readFileSync(path.join(root,'modules/vehicle/service-event-lifecycle.js'),'utf8');
const adapter=fs.readFileSync(path.join(root,'modules/vehicle/service-event-adapter.js'),'utf8');
const finance=fs.readFileSync(path.join(root,'modules/finance/finance-event-outbox.js'),'utf8');
const checks=[];
const pass=(name,ok,detail='')=>{checks.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${detail?` — ${detail}`:''}`);};
function idx(h,n){return h.indexOf(n);}
const entry=idx(servis,'const entry={');
const dup=idx(servis,'findServiceEventByIdempotencyKey(D.servisLogs||[],entry.idempotencyKey,entry.vehicleId)');
const tx=idx(servis,'FinanceTxSOT.create(_reminderTx)');
pass('service-reminder-idempotency-lookup-present',dup>=0);
pass('service-reminder-idempotency-before-finance-write',dup>=0&&tx>=0&&dup<tx,`lookup=${dup}, financeWrite=${tx}`);
pass('duplicate-return-prevents-finance-side-effect',dup>=0&&servis.indexOf('if(_dup){_clearMarkGuard();return _dup;}',dup)>dup&&servis.indexOf('if(_dup){_clearMarkGuard();return _dup;}',dup)<tx);
pass('duplicate-check-before-service-persist',dup>=0&&servis.indexOf('D.servisLogs.push(entry)',dup)>dup);
pass('service-event-lifecycle-does-not-create-second-store',/D\.servisLogs/.test(lifecycle)&&!(/localStorage|indexedDB/i.test(lifecycle)));
pass('service-outbox-has-stable-service-idempotency-path',adapter.includes('findServiceEventByIdempotencyKey')&&adapter.includes('ServiceEventLifecycle.create'));
pass('finance-outbox-preserves-event-id',finance.includes('eventId:String(item.eventId||stableId)'));
pass('no-ui-only-global-lock-used-as-domain-idempotency',!servis.includes('window.__globalIdempotencyLock'));
pass('retry-path-retains-idempotency-key',servis.includes('idempotencyKey:opts.idempotencyKey||(`reminder:'));
pass('stock-side-effect-after-duplicate-check',dup>=0&&servis.indexOf('StockCommandSOT.consume',dup)>dup);
const failed=checks.filter(x=>!x.ok);
console.log(`S2290: ${checks.length-failed.length}/${checks.length} PASS`);
process.exitCode=failed.length?1:0;
