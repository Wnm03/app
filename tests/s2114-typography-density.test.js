const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const block = css.slice(css.lastIndexOf('S2114 — Typography & density consistency'));

test('S2114: headings and card titles have stable wrapping/line-height', () => {
  assert.match(block, /line-height:\s*1\.3/);
  assert.match(block, /overflow-wrap:\s*anywhere/);
});

test('S2114: secondary text has readable line-height', () => {
  assert.match(block, /\.section-subtitle[\s\S]*?line-height:\s*1\.45/);
});

test('S2114: mobile density is intentionally compact', () => {
  assert.match(block, /@media \(max-width:\s*599px\)[\s\S]*?\.card\s*\{\s*padding:\s*16px/);
  assert.match(block, /@media \(max-width:\s*359px\)[\s\S]*?\.card\s*\{\s*padding:\s*14px/);
});

test('S2114: presentation-only', () => {
  assert.doesNotMatch(block, /localStorage|indexedDB|fetch\s*\(|addEventListener|data-theme/);
});
