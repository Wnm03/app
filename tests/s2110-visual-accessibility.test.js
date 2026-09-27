const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const s2110 = css.slice(css.lastIndexOf('S2110'));

test('S2110 provides a visible keyboard focus contract', () => {
  assert.match(s2110, /focus-visible[\s\S]*?outline:\s*2px/);
  assert.match(s2110, /outline-offset:\s*2px/);
});

test('S2110 respects reduced-motion preferences without adding runtime listeners', () => {
  assert.match(s2110, /prefers-reduced-motion:\s*reduce/);
  assert.match(s2110, /transition-duration:\s*0\.01ms/);
  assert.match(s2110, /animation-duration:\s*0\.01ms/);
  assert.doesNotMatch(s2110, /addEventListener|setInterval|requestAnimationFrame/);
});

test('S2110 hardens narrow layouts against text-zoom overflow', () => {
  assert.match(s2110, /max-width:\s*100%/);
  assert.match(s2110, /overflow-wrap:\s*anywhere/);
  assert.match(s2110, /@media \(max-width:\s*320px\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test('S2110 remains presentation-only and does not introduce theme/data/storage hooks', () => {
  assert.doesNotMatch(s2110, /\[data-theme=/);
  assert.doesNotMatch(s2110, /localStorage|indexedDB|fetch\s*\(|addEventListener/);
});
