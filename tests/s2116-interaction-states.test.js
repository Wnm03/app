const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const block = css.slice(css.lastIndexOf('S2116 — Interaction-state consistency'));

test('S2116: hover and active states are defined for existing controls', () => {
  assert.match(block, /:hover[\s\S]*filter:\s*brightness\(0\.98\)/);
  assert.match(block, /:active[\s\S]*transform:\s*translateY\(1px\)/);
});

test('S2116: disabled controls expose a consistent non-interactive state', () => {
  assert.match(block, /:disabled[\s\S]*cursor:\s*not-allowed/);
  assert.match(block, /\[aria-disabled="true"\][\s\S]*opacity:\s*0\.62/);
});

test('S2116: selected and pressed states are visibly distinguishable', () => {
  assert.match(block, /\[aria-pressed="true"\]/);
  assert.match(block, /\[aria-selected="true"\]/);
  assert.match(block, /box-shadow:\s*inset 0 0 0 1px currentColor/);
});

test('S2116: reduced-motion and touch-pointer behavior are respected', () => {
  assert.match(block, /prefers-reduced-motion:\s*reduce/);
  assert.match(block, /@media \(hover:\s*none\)/);
});

test('S2116: presentation-only', () => {
  assert.doesNotMatch(block, /localStorage|indexedDB|fetch\s*\(|addEventListener|data-theme/);
});
