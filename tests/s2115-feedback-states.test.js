const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const block = css.slice(css.lastIndexOf('S2115 — Empty/loading/error feedback states'));

test('S2115: empty states are width-contained and wrap safely', () => {
  assert.match(block, /\.empty,[\s\S]*?max-width:\s*100%/);
  assert.match(block, /overflow-wrap:\s*anywhere/);
});

test('S2115: rendered busy controls expose a consistent progress cursor', () => {
  assert.match(block, /\[aria-busy="true"\][\s\S]*?cursor:\s*progress/);
});

test('S2115: status and alert feedback cannot force horizontal overflow', () => {
  assert.match(block, /\[role="alert"\][\s\S]*?max-width:\s*100%/);
  assert.match(block, /\[role="status"\][\s\S]*?line-height:\s*1\.45/);
});

test('S2115: narrow empty states remain compact', () => {
  assert.match(block, /@media \(max-width:\s*599px\)[\s\S]*?padding-inline:\s*12px/);
  assert.match(block, /@media \(max-width:\s*359px\)[\s\S]*?padding-inline:\s*8px/);
});

test('S2115: presentation-only', () => {
  assert.doesNotMatch(block, /localStorage|indexedDB|fetch\s*\(|addEventListener|data-theme/);
});
