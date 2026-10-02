'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('S2331: ordinary page navigation does not invalidate finance caches', () => {
  const render = read('modules/shared/modules-render.js');
  const start = render.indexOf('function renderPageContent(name)');
  const end = render.indexOf('\nfunction renderAccGrid()', start);
  assert.ok(start >= 0 && end > start, 'renderPageContent boundary must exist');
  const body = render.slice(start, end);
  assert.doesNotMatch(body, /invalidateAccBalCache\s*\(/);
  assert.doesNotMatch(body, /invalidateCashflowForecastCache\s*\(/);
  assert.doesNotMatch(body, /FinanceIntelligence\.invalidateCache\s*\(/);
});

test('S2331: finance caches remain invalidated at the canonical save mutation boundary', () => {
  const source = read('modules/shared/features-helpers-global-security.js');
  const start = source.indexOf('function save(opts)');
  const end = source.indexOf('\nfunction ', start + 1);
  assert.ok(start >= 0 && end > start, 'save() boundary must exist');
  const body = source.slice(start, end);
  assert.match(body, /invalidateAccBalCache\s*\(/);
  assert.match(body, /invalidateCashflowForecastCache\s*\(/);
  assert.match(body, /FinanceIntelligence\.invalidateCache\s*\(/);
});
