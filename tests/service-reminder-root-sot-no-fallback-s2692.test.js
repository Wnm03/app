'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules/vehicle/servis-b.js'), 'utf8');
test('S2692: reminder UI never reconstructs km countdown outside urgency SOT', () => {
  assert.match(source, /const _rawSisa=u&&u\.sisaKm!=null\?u\.sisaKm:null;/);
  assert.doesNotMatch(source, /effectiveIntervalKm-\(_lastKm===null\?_currentKm:_currentKm-_lastKm\)/);
  assert.match(source, /const rawStatus=u&&u\.status\?u\.status:'unknown';/);
});
test('S2692: unknown status is persisted as a filter and included in reconciliation counts', () => {
  assert.match(source, /validValues=\['lewat','segera','mendekati','aman','unknown'\]/);
  assert.match(source, /v:'unknown',label:'⚪ Belum diketahui'/);
  assert.match(source, /unknown:rows\.filter\(r=>!\['terlewat','jatuh_tempo','segera','mendekati','aman'\]\.includes\(r\.status\)\)\.length/);
  assert.match(source, /rfSeverity==='unknown'\?!\['terlewat','jatuh_tempo','segera','mendekati','aman'\]\.includes\(r\.status\)/);
});
test('S2692: condition-based states are not silently rendered as safe/unknown', () => {
  assert.match(source, /rawStatus==='rusak'\?'terlewat':rawStatus==='normal'\?'aman':rawStatus/);
  assert.match(source, /msg='⚪ Baseline servis belum diketahui'/);
});
