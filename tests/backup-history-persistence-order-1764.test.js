const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'modules/shared/backup-restore.js'), 'utf8');

function assertRecordBeforeSave(fragment, label) {
  const recordAt = src.indexOf(fragment);
  assert.notEqual(recordAt, -1, `${label}: recordEntry harus ada`);
  const saveAt = src.indexOf('save();', recordAt);
  assert.notEqual(saveAt, -1, `${label}: save() setelah recordEntry harus ada`);
  assert.ok(recordAt < saveAt, `${label}: histori backup harus dicatat sebelum save()`);
}

test('backup history: successful local export persists history after recording', () => {
  assertRecordBeforeSave("BackupHistoryAPI.recordEntry({type:'local',status:'success'", 'local export');
});

test('backup history: full backup persists history after final status is recorded', () => {
  const block = src.slice(src.indexOf('if(typeof BackupHistoryAPI!==\'undefined\'){\nconst status=errors.length'));
  assert.match(block, /BackupHistoryAPI\.recordEntry\(\{type:'full',status,done,skipped,errors\}\);/);
  assert.match(block, /BackupHistoryAPI\.recordEntry\(\{type:'full',status,done,skipped,errors\}\);[\s\S]*?save\(\);/);
});

test('backup history: custom backup persists history after recording', () => {
  assertRecordBeforeSave("BackupHistoryAPI.recordEntry({type:'custom',status:'success'", 'custom backup');
  assert.match(src, /out\.lastBackup=D\.lastBackup\|\|null;/);
  assert.match(src, /out\.backupHistory=D\.backupHistory\|\|\[\];/);
});
