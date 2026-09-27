const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('S2125 — shared visual primitives have a zero minimum width and viewport bound', () => {
  assert.match(css, /\.page-title,[\s\S]*?\.cn-vehicle-summary\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-inline-size:\s*100%;/);
});

test('S2125 — long visual labels wrap instead of forcing horizontal layout', () => {
  assert.match(css, /\.page-title,[\s\S]*?\.cn-vehicle-summary\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
});

test('S2125 — child controls cannot exceed their shared row bounds', () => {
  assert.match(css, /\.form-row > \*,[\s\S]*?\.section-head > \*\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-inline-size:\s*100%;/);
});

test('S2125 — 430px and 359px viewport contracts are explicit', () => {
  assert.match(css, /@media \(max-width:\s*430px\)[\s\S]*?max-inline-size:\s*calc\(100vw - 24px\);/);
  assert.match(css, /@media \(max-width:\s*359px\)[\s\S]*?max-inline-size:\s*calc\(100vw - 20px\);/);
});
