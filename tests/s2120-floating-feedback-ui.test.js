const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('S2120 — toast feedback is viewport-contained and safe-area aware', () => {
  assert.match(css, /\.toast\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*min\(90vw,\s*520px\);/);
  assert.match(css, /margin-bottom:\s*env\(safe-area-inset-bottom,\s*0px\);/);
  assert.match(css, /overflow-wrap:\s*anywhere;/);
});

test('S2120 — action toast content can shrink and wrap without clipping', () => {
  assert.match(css, /\.toast--action\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:/);
  assert.match(css, /\.toast-msg\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?overflow-wrap:\s*anywhere;/);
  assert.match(css, /\.toast-undo-btn\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*36px;/);
});

test('S2120 — kasir floating bar remains contained on narrow viewports', () => {
  assert.match(css, /\.kasir-floatbar\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*calc\(100vw - 28px\);/);
  assert.match(css, /\.kasir-floatbar-info\s*\{[\s\S]*?min-width:\s*0;/);
});

test('S2120 — 430px and 359px feedback layouts have explicit mobile rules', () => {
  assert.match(css, /@media \(max-width:\s*430px\)[\s\S]*?\.toast\s*\{[\s\S]*?max-width:\s*calc\(100vw - 24px\);/);
  assert.match(css, /@media \(max-width:\s*359px\)[\s\S]*?\.toast--action\s*\{[\s\S]*?flex-wrap:\s*wrap;/);
  assert.match(css, /@media \(max-width:\s*359px\)[\s\S]*?\.kasir-floatbar-cta\s*\{[\s\S]*?max-width:\s*42%;/);
});
