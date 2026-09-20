const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');

test('SA-H/S1828: import idempotency dedupes against persisted and already accepted batch keys',()=>{
  const s=fs.readFileSync('modules/shared/backup-restore.js','utf8');
  assert.match(s,/const existingKeys=new Set\([\s\S]*?importIdempotencyKey[\s\S]*?\);/);
  assert.match(s,/const acceptedKeys=new Set\(\);/);
  assert.match(s,/if\(existingKeys\.has\(key\)\|\|acceptedKeys\.has\(key\)\)return false;/);
  assert.match(s,/acceptedKeys\.add\(key\);/);
});
