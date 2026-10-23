'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('S2724: history summary does not invent a replacement action for missing legacy actionType', () => {
  const src = read('modules/vehicle/service-maintenance-guidance.js');
  assert.match(src, /String\(s\.actionType\s*\|\|\s*''\)===type/);
  assert.doesNotMatch(src, /String\(s\.actionType\s*\|\|\s*'ganti'\)===type/);
});

test('S2724: reminder history fallback does not classify missing actionType as ganti', () => {
  const src = read('modules/vehicle/servis.js');
  assert.match(src, /!resetFilter\|\|String\(log\s*&&\s*log\.actionType\s*\|\|\s*''\)===resetFilter/);
  assert.doesNotMatch(src, /\(log\.actionType\s*\|\|\s*'ganti'\)===resetFilter/);
});
