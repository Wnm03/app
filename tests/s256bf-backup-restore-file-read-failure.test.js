'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('modules/shared/backup-restore.js', 'utf8');
const start = source.indexOf('async function importData(e){');
const end = source.indexOf('let _autoBackupTriggered=false;', start);
assert.ok(start >= 0 && end > start, 'importData() must exist in backup-restore.js');
const functionSource = source.slice(start, end) + '\nglobalThis.__testImportData = importData;';

function harness(readMode = 'manual') {
  let reader;
  const events = { toasts: [], busy: 0, idle: 0, restored: 0, errors: [] };
  const ctx = {
    console: { error: (...args) => events.errors.push(args), warn() {}, log() {} },
    PWAProductionHardening: { validateImportFile: () => ({ ok: true }) },
    _scanBtnBusy: () => { events.busy++; },
    _scanBtnIdle: () => { events.idle++; },
    _sanitizeBackupError: (e) => String(e && e.message || e || '').slice(0, 120),
    toast: (m) => events.toasts.push(m),
    applyRestoredData: async () => { events.restored++; return true; },
    FileReader: class {
      constructor() { reader = this; this.error = null; }
      readAsText() { if (readMode === 'throw') throw new Error('read denied'); }
    }
  };
  ctx.globalThis = ctx;
  vm.runInNewContext(functionSource, ctx, { filename: 'backup-restore.js#importData' });
  const label = {};
  const input = { files: [{ name: 'backup.json', size: 10, type: 'application/json' }], labels: [label], value: 'selected', disabled: false };
  return { ctx, events, input, get reader() { return reader; } };
}

for (const [name, trigger] of [
  ['FileReader error', (r) => r.onerror()],
  ['FileReader abort', (r) => r.onabort()],
  ['synchronous readAsText throw', (_r, h) => { throw new Error('handled by readAsText harness'); }]
]) {
  test(`S256BF restore input is unlocked after ${name}`, async () => {
    const h = harness(name === 'synchronous readAsText throw' ? 'throw' : 'manual');
    await h.ctx.__testImportData({ target: h.input });
    if (name === 'synchronous readAsText throw') {
      // readAsText throws before a callback can be invoked; cleanup must already have run.
    } else {
      trigger(h.reader, h);
    }
    assert.equal(h.input.disabled, false);
    assert.equal(h.input.value, '');
    assert.equal(h.events.busy, 1);
    assert.equal(h.events.idle, 1);
    assert.equal(h.events.restored, 0);
  });
}

test('S256BF malformed JSON releases the restore input without mutating data', async () => {
  const h = harness();
  await h.ctx.__testImportData({ target: h.input });
  await h.reader.onload({ target: { result: '{broken json' } });
  assert.equal(h.input.disabled, false);
  assert.equal(h.input.value, '');
  assert.equal(h.events.restored, 0);
  assert.ok(h.events.toasts.some((m) => /File tidak valid/.test(m)));
});

test('S256BF successful restore releases input and reports success once', async () => {
  const h = harness();
  await h.ctx.__testImportData({ target: h.input });
  await h.reader.onload({ target: { result: JSON.stringify({ transactions: [] }) } });
  assert.equal(h.input.disabled, false);
  assert.equal(h.input.value, '');
  assert.equal(h.events.restored, 1);
  assert.equal(h.events.toasts.filter((m) => /Data di-restore/.test(m)).length, 1);
});

test('S256BF backup UI records success only when local download can start', () => {
  const full = source.slice(source.indexOf('async function runFullBackup()'), source.indexOf('let backupModules=', source.indexOf('async function runFullBackup()')));
  const exportOne = source.slice(source.indexOf('async function exportData()'), source.indexOf('async function runFullBackup()'));
  const custom = source.slice(source.indexOf('function runBackup()'), source.indexOf('// P23 — Service import/restore odometer integrity.'));
  assert.match(full, /if\(!_downloadBackupBlob\([^\n]+\)\)throw new Error\('Browser tidak dapat memulai unduhan backup lokal\.'/);
  assert.match(exportOne, /if\(!_downloadBackupBlob\([^\n]+\)\)\{/);
  assert.match(custom, /if\(!_downloadBackupBlob\([^\n]+\)\)\{toast\('❌ Browser tidak dapat memulai unduhan backup\.'/);
});
