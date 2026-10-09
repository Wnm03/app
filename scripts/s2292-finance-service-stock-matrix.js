'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const servis=read('modules/vehicle/servis.js');
const tx=read('modules/finance/transaksi-b.js');
const session=read('modules/vehicle/service-session-mutation-s2047.js');
const outbox=read('modules/vehicle/service-event-adapter.js');
const financeOutbox=read('modules/finance/finance-event-outbox.js');
const sot=read('modules/vehicle/service-event-idempotency-sot.js');
const checks=[];
function ok(name,cond,detail=''){checks.push({name,ok:!!cond,detail});}
const mark=servis.indexOf('async markServiced('), markBody=mark>=0?servis.slice(mark,servis.indexOf('async markServicedBatch',mark)) : '';
ok('single-service-durable-idempotency-before-finance',markBody.indexOf('findServiceEventByIdempotencyKey')>=0 && markBody.indexOf('findServiceEventByIdempotencyKey')<markBody.indexOf('FinanceTxSOT.create'),'duplicate lookup precedes finance side effect');
ok('single-service-stock-after-duplicate-boundary',markBody.indexOf('findServiceEventByIdempotencyKey')<markBody.indexOf('StockCommandSOT.consume'),'stock mutation follows durable duplicate check');
ok('single-service-finance-links-service',/servisLinkId:servisId/.test(markBody));
ok('single-service-rollback-removes-finance-by-service',/_restoreMarkDomain[\s\S]*?removeWhere\(x=>x&&x\.servisLinkId===servisId/.test(markBody));
ok('single-service-stock-rollback-captures-before-state',/_markStockBefore/.test(markBody)&&/setQtyMap\(_markStockBefore/.test(markBody));
const batch=servis.slice(servis.indexOf('async markServicedBatch('));
ok('batch-shares-one-batch-id',/const batchId=uid\(\)/.test(batch)&&/batchId,_batchOwnedLock/.test(batch));
ok('batch-defers-save-until-all-domain-effects',batch.indexOf('save({domain:\'servis\'')>batch.indexOf('for(const it of items)'));
ok('batch-rollback-service-finance-stock',/restoreBatch\(batchId\)/.test(batch)&&/batchIds/.test(batch)&&/setQtyMap\(batchStockBefore/.test(batch));
ok('service-edit-rollback-restores-finance-stock',/restoreState\(journal\)/.test(session)&&/FinanceTxSOT\.replaceSnapshot/.test(session)&&/StockCommandSOT\.replaceSnapshot/.test(session));
ok('finance-service-link-post-commit-lifecycle',/applyTxServisFromTx\(savedTxId/.test(tx)&&/ServiceEventLifecycle\.(create|update)/.test(tx));
ok('service-outbox-dedup-key-present',/queueKey|dedup|idempot/.test(outbox));
ok('finance-event-stable-event-id',/eventId:String\(item\.eventId\|\|stableId\)/.test(financeOutbox));
ok('service-idempotency-key-is-operation-specific',/service:\$\{v\}:\$\{c\}:.*\$\{d\}.*\$\{a\}:\$\{b\}/.test(sot));
let pass=0;for(const c of checks){console.log(`${c.ok?'PASS':'FAIL'} ${c.name}${c.detail?' — '+c.detail:''}`);if(c.ok)pass++;}
console.log(`S2292: ${pass}/${checks.length} PASS`);if(pass!==checks.length)process.exit(1);
