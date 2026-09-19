const fs=require('fs');
const s=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
function ok(c,m){if(!c)throw new Error(m)}
ok(s.includes('let _saveStateVersion=0;'),'S1850: mutation version missing');
ok(s.includes('function _getSaveSnapshotForVersion(version){'),'S1850: snapshot cache helper missing');
ok(s.includes('if(_saveSnapshotVersion===version&&_saveSnapshotJson!==null)return _saveSnapshotJson;'),'S1850: same-version snapshot reuse missing');
ok(s.includes('_saveStateVersion++;'),'S1850: save mutation clock missing');
ok(s.includes('if(_saveQueuedVersion===version)return;'),'S1850: duplicate persistence queue guard missing');
ok(s.includes('_savePersistChain=_savePersistChain.then(()=>IDBStore.set(\'kw_v4_mirror\',json))'),'S1850: serialized persistence queue missing');
ok(s.includes('_saveImmediate(json)'),'S1850: flush must hand the prepared snapshot to _saveImmediate');
console.log('S1850 persistence tests: 6/6 pass');
