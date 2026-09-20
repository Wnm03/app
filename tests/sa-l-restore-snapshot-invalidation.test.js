const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');

test('SA-L: restore must invalidate cached persistence snapshot before saveFlush()',()=>{
  const s=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
  assert.match(s,/function _markPersistenceStateChanged\(\)\{[\s\S]*?_saveStateVersion\+\+;[\s\S]*?_saveSnapshotVersion=-1;[\s\S]*?_saveSnapshotJson=null;/);
  assert.match(s,/function save\(opts\)\{[\s\S]*?_markPersistenceStateChanged\(\);/);
});

test('SA-L: backup restore marks both commit and rollback as persistence mutations',()=>{
  const s=fs.readFileSync('modules/shared/backup-restore.js','utf8');
  const matches=s.match(/if\(typeof _saveStateVersion!=='undefined'\)\{_saveStateVersion\+\+;_saveSnapshotVersion=-1;_saveSnapshotJson=null;\}\s*saveFlush\(\);/g)||[];
  assert.equal(matches.length,2,'restore commit + rollback harus sama-sama invalidasi snapshot');
});
