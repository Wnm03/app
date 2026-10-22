'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const persistence = read('modules/shared/features-helpers-global-security.js');
const outbox = read('modules/finance/finance-event-outbox.js');
const allocation = read('modules/finance/finance-allocation-api.js');

test('S2611: cross-tab writes are announced over storage and BroadcastChannel', () => {
  assert.match(persistence, /localStorage\.setItem\('kw_v4_writer'/);
  assert.match(persistence, /_crossTabChannel\.postMessage\(\{type:'kw-v4-write'/);
  assert.match(persistence, /e\.data\.source!==_crossTabInstance\)\s*_markCrossTabStale\(\)/);
  assert.match(persistence, /e\.key==='kw_v4_writer'[\s\S]{0,220}_markCrossTabStale\(\)/);
});

test('S2611: stale cross-tab state blocks save and flush instead of overwriting newer state', () => {
  const saveBody = persistence.slice(persistence.indexOf('function save(opts){'), persistence.indexOf('// saveFlush():')) ;
  assert.match(saveBody, /if\(_crossTabStateStale\)[\s\S]*?return false;/);
  assert.match(persistence, /function saveFlush\(\)[\s\S]{0,250}if\(_crossTabStateStale\)return _blockSaveFlushOnCrossTab\(\)/);
  assert.match(persistence, /setManyIfCurrent\(entries,_crossTabWriterGuardKey,_crossTabWriterToken,nextWriterToken\)/);
});

test('S2611: restore/import advances snapshot mutation clock and uses writer-token CAS', () => {
  assert.match(persistence, /function _markPersistenceStateChanged\(\)[\s\S]{0,180}_saveStateVersion\+\+/);
  assert.match(persistence, /_persistAtomicSnapshotWithAux\(snapshotJson,extraEntries\)[\s\S]{0,2400}setManyIfCurrent\(entries,_crossTabWriterGuardKey,_crossTabWriterToken,next\)/);
  assert.match(persistence, /CROSS_TAB_RESTORE_CONFLICT/);
});

test('S2611: required persistence recovery fails closed for writes and flushes', () => {
  assert.match(persistence, /window\.__kwPersistenceRecoveryRequired===true[\s\S]{0,350}return false;/);
  assert.match(persistence, /function saveFlush\(\)[\s\S]{0,180}__kwPersistenceRecoveryRequired===true\)return _blockSaveFlushOnRecovery\(\)/);
});

test('S2611: unreadable durable finance outbox is not treated as an empty queue', () => {
  assert.match(outbox, /durable journal read failed/);
  assert.match(outbox, /catch\(e\)\{[\s\S]{0,260}throw new Error\('FinanceEventOutbox: durable journal read failed'\)/);
});

test('S2611: outbox replay uses writer-token CAS before replacing or clearing durable queue', () => {
  assert.match(outbox, /setManyIfCurrent\(\[\[KEY,durableCache\]\],WRITER_GUARD_KEY,writerToken,writerToken\)/);
  assert.match(outbox, /setManyIfCurrent\(\[\[KEY,\[\]\]\],WRITER_GUARD_KEY,writerToken,writerToken\)/);
  assert.match(outbox, /eventId:String\(item\.eventId\|\|stableId\)/);
});

test('S2611: allocation stays locked until actual free cash is verified by canonical sources', () => {
  assert.match(allocation, /actualFreeCashVerified:\s*false/);
  assert.match(allocation, /safeInvestableAmount:\s*null/);
  assert.match(allocation, /investmentAllowed:\s*false/);
  assert.doesNotMatch(allocation, /localStorage\.(?:setItem|removeItem)|IDBStore\.(?:set|delete|setMany)/);
});
