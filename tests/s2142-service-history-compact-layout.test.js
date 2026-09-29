const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

test('S2142 mobile service history clamps long note and metadata height', () => {
  assert.match(css, /S2142[\s\S]*?\.servis-history-note[\s\S]*?-webkit-line-clamp:\s*2/);
  assert.match(css, /S2142[\s\S]*?\.servis-history-primary[\s\S]*?white-space:\s*nowrap/);
  assert.match(css, /S2142[\s\S]*?\.servis-history-cost[\s\S]*?-webkit-line-clamp:\s*2/);
});

test('S2142 mobile service history keeps status chips in a horizontally scrollable row', () => {
  assert.match(css, /S2142[\s\S]*?\.servis-history-badges[\s\S]*?flex-wrap:\s*nowrap/);
  assert.match(css, /S2142[\s\S]*?\.servis-history-badges[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /S2142[\s\S]*?\.servis-history-badges\s*>\s*\.servis-history-badge[\s\S]*?flex:\s*0 0 auto/);
});
