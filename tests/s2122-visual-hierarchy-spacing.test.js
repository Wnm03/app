const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('S2122 — page title/settings row has width containment and controlled mobile wrapping', () => {
  assert.match(css, /\.page-settings-btn\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?gap:\s*var\(--sp-4\);/);
  assert.match(css, /\.page-title\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?overflow-wrap:\s*anywhere;/);
  assert.match(css, /@media \(max-width:\s*599px\)[\s\S]*?\.page-settings-btn\s*\{[\s\S]*?flex-wrap:\s*wrap;/);
});

test('S2122 — section headings remain readable without forcing overflow', () => {
  assert.match(css, /\.section-title,\s*\.section-head\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?overflow-wrap:\s*anywhere;/);
});

test('S2122 — common grids keep explicit narrow-screen spacing', () => {
  assert.match(css, /\.grid2\s*\{\s*gap:\s*10px;\s*\}/);
  assert.match(css, /\.grid3\s*\{\s*gap:\s*8px;\s*\}/);
  assert.match(css, /@media \(max-width:\s*359px\)[\s\S]*?\.grid2\s*\{\s*gap:\s*8px;\s*\}[\s\S]*?\.grid3\s*\{\s*gap:\s*6px;/);
});

test('S2122 — terminal cards/groups do not add trailing vertical whitespace', () => {
  assert.match(css, /\.card:last-child,\s*\.stg-group:last-child\s*\{\s*margin-bottom:\s*0;/);
});
