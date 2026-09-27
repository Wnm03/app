const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('S2118 — form controls keep a 44px minimum touch target', () => {
  assert.match(css, /\.fi,[\s\S]*?\.fs,[\s\S]*?min-height:\s*44px;/);
});

test('S2118 — mobile text/date/number inputs keep readable 16px text', () => {
  assert.match(css, /input\.fi\[type="text"\][\s\S]*?input\.fi\[type="number"\][\s\S]*?font-size:\s*16px;/);
});

test('S2118 — segmented form controls cannot overflow or collapse below touch size', () => {
  assert.match(css, /\.type-toggle > \*,[\s\S]*?\.type-toggle3 > \*[\s\S]*?min-width:\s*0;[\s\S]*?min-height:\s*44px;/);
  assert.match(css, /overflow-wrap:\s*anywhere;/);
});

test('S2118 — narrow screens reduce spacing without hiding form content', () => {
  assert.match(css, /@media \(max-width:\s*359px\)[\s\S]*?\.fg \{ margin-bottom:\s*12px; \}/);
});
