const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'pro-ui-layer.css'), 'utf8');

test('pro mockup batch2 remains presentation-only and covers screens 2-8 surfaces', () => {
  assert.match(css, /#servisModal \.modal/);
  assert.match(css, /#servisChecklistPanel \.sc-group/);
  assert.match(css, /#servisReminderCard/);
  assert.match(css, /\.servis-history-session/);
  assert.match(css, /#fuelIntelWrap/);
  assert.match(css, /#cnTab-jalan/);
  assert.match(css, /\[data-theme="pro"\]/);
  assert.doesNotMatch(css, /@import/i);
  assert.doesNotMatch(css, /<script/i);
});
