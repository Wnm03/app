const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const src = fs.readFileSync('modules/shared/backup-restore.js','utf8');

test('S2474: backup snapshot includes durable AI recovery journal', () => {
  assert.match(src, /_backupAuxKeys=\[[^\]]*'ai:event-outbox:v1'/);
  assert.match(src, /backupD\._aiEventOutbox=_aux\['ai:event-outbox:v1'\]/);
});

test('S2474: restore snapshots and atomically restores AI recovery journal', () => {
  assert.match(src, /_prevAiEventOutbox=await IDBStore\.get\('ai:event-outbox:v1'\)/);
  assert.match(src, /const _restoredAiEventOutbox=imp\._aiEventOutbox/);
  assert.match(src, /_restoreAuxEntries\.push\(\['ai:event-outbox:v1',_restoredAiEventOutbox\]\)/);
});

test('S2474: restore rollback also restores prior AI recovery journal', () => {
  assert.match(src, /_rollbackAuxEntries\.push\(\['ai:event-outbox:v1',_prevAiEventOutbox\]\)/);
  assert.match(src, /delete D\._aiEventOutbox/);
});
