'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const br=fs.readFileSync('modules/shared/backup-restore.js','utf8');
const fg=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
const so=fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8');

const must=(src,needle,msg)=>assert.ok(src.includes(needle),msg||needle);

test('S2476 backup captures service + finance durable outbox generations',()=>{
  must(br,"'service-event-outbox:v1'");
  must(br,"'kw_finance_event_outbox_v1'");
  must(br,'FinanceEventOutbox.prepareAtomicPersistence');
  must(br,'ServiceEventOutbox.prepareAtomicPersistence');
  must(br,'ServiceEventOutbox.flushPersistence');
  must(br,'backupD._serviceEventOutbox');
  must(br,'backupD._financeEventOutbox');
});

test('S2476 restore snapshots and atomically restores both cross-domain outboxes',()=>{
  must(br,"_prevServiceEventOutbox=await IDBStore.get('service-event-outbox:v1')");
  must(br,"_prevFinanceEventOutbox=await IDBStore.get('kw_finance_event_outbox_v1')");
  must(br,"_restoredServiceEventOutbox=imp._serviceEventOutbox");
  must(br,"_restoredFinanceEventOutbox=imp._financeEventOutbox");
  must(br,"_restoreAuxEntries.push(['service-event-outbox:v1',_restoredServiceEventOutbox])");
  must(br,"_restoreAuxEntries.push(['kw_finance_event_outbox_v1',_restoredFinanceEventOutbox])");
  must(br,"_rollbackAuxEntries.push(['service-event-outbox:v1',_prevServiceEventOutbox])");
  must(br,"_rollbackAuxEntries.push(['kw_finance_event_outbox_v1',_prevFinanceEventOutbox])");
});

test('S2476 ordinary atomic saves include the service outbox in the same CAS commit',()=>{
  const idx=fg.indexOf('async function _persistAtomicSnapshotWithAux');
  const end=fg.indexOf('function _saveImmediate',idx);
  const block=fg.slice(idx,end);
  must(block,'ServiceEventOutbox.prepareAtomicPersistence');
  must(block,'ServiceEventOutbox.key');
  must(block,'ServiceEventOutbox.markAtomicPersisted');
  must(block,'IDBStore.setManyIfCurrent');
});

test('S2476 service outbox has durable IDB prepare/adopt boundary',()=>{
  must(so,"const STORAGE_KEY='service-event-outbox:v1'");
  must(so,'persistDurable');
  must(so,'prepareAtomicPersistence');
  must(so,'markAtomicPersisted');
  must(so,'adoptSnapshot');
  must(so,'IDBStore.set');
});

test('S2476 save path carries service outbox before persistence metadata is advanced',()=>{
  const idx=fg.indexOf('const persist=async()=>{');
  const end=fg.indexOf('_markSavePersistMeta',idx);
  const block=fg.slice(idx,end);
  const queueAt=block.indexOf('ServiceEventOutbox.prepareAtomicPersistence');
  const entryAt=block.indexOf('ServiceEventOutbox.key');
  const commitAt=block.indexOf('IDBStore.setManyIfCurrent');
  const markAt=block.indexOf('ServiceEventOutbox.markAtomicPersisted');
  assert(queueAt>=0&&entryAt>queueAt&&commitAt>entryAt&&markAt>commitAt);
});

console.log('S2476 5/5 PASS');
