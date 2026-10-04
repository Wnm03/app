const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ai = fs.readFileSync('modules/ai/ai-core.js','utf8');
const backup = fs.readFileSync('modules/shared/backup-restore.js','utf8');

test('S2475: AI recovery exposes an awaitable journal flush', () => {
  assert.match(ai, /globalThis\.aiEventOutboxFlush\s*=\s*\(\)\s*=>\s*_aiEventOutboxWrite/);
});

test('S2475: backup waits for pending AI journal writes before snapshot', () => {
  assert.match(backup, /async function buildBackupPayload\(\)\{\s*\/\/ S2475[\s\S]*?await aiEventOutboxFlush\(\)/);
});

test('S2475: restore waits for pending AI journal writes before taking rollback snapshot', () => {
  assert.match(backup, /snapshot-auxiliary-idb'[\s\S]*?await aiEventOutboxFlush\(\)/);
});
