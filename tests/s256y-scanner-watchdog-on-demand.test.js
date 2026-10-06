'use strict';
// S256Y — scanner recovery watchdog harus on-demand, bukan timer permanen.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'modules/shared/scanner-session.js'), 'utf8');

test('S256Y: ScannerSession recovery tidak memakai setInterval permanen', () => {
  assert.doesNotMatch(SRC, /setInterval\s*\(/, 'recovery watchdog tidak boleh memasang setInterval permanen');
  assert.match(SRC, /_scannerSessionScheduleRecovery\s*\(/);
  assert.match(SRC, /_scannerSessionCancelRecovery\s*\(/);
  assert.match(SRC, /window\.setTimeout\(_scannerSessionRecoveryTick,\s*RECOVERY_POLL_MS\)/);
});

test('S256Y: exit() membatalkan timer recovery sebelum UI scanner dipulihkan', () => {
  const exitBlock = SRC.match(/function scannerSessionExit\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(exitBlock, 'scannerSessionExit() harus tetap ada');
  assert.ok(exitBlock[1].indexOf('_scannerSessionCancelRecovery();') >= 0, 'exit() harus membatalkan recovery timer');
  assert.ok(exitBlock[1].indexOf('_scannerSessionCancelRecovery();') < exitBlock[1].indexOf('scannerSessionResumeUI();'), 'cancel harus terjadi sebelum resume UI');
});
