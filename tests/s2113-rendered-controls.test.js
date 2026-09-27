const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const block = css.slice(css.lastIndexOf('S2113 — Rendered control/icon consistency'));

test('S2113: nav interactive floor is not cancelled', () => {
  assert.match(block, /\.nav-item\s*\{[\s\S]*?min-inline-size:\s*44px/);
});

test('S2113: header and month controls have stable icon containers', () => {
  assert.match(block, /\.header-badge\s*\{[\s\S]*?min-width:\s*36px[\s\S]*?min-height:\s*36px/);
  assert.match(block, /\.month-nav-btn\s*\{[\s\S]*?width:\s*44px[\s\S]*?height:\s*44px/);
});

test('S2113: compact card controls remain visually consistent', () => {
  assert.match(block, /\.card-setting-btn\s*\{[\s\S]*?min-height:\s*36px/);
  assert.match(block, /\.card-collapse-toggle\s*\{[\s\S]*?width:\s*32px[\s\S]*?height:\s*32px/);
});

test('S2113: no icon library or runtime code added', () => {
  assert.doesNotMatch(block, /@import|url\(|script|addEventListener|fetch\(/i);
});
