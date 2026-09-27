const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('S2126 — fixed feedback layers are viewport-contained', () => {
  assert.match(css, /\.toast,\s*\.kasir-floatbar,\s*\.keu-fab,\s*\.keu-fab-action[\s\S]*?max-inline-size:\s*calc\(100vw - 24px\);/);
});

test('S2126 — toast and kasir floating bar account for safe-area bottom', () => {
  assert.match(css, /\.toast\s*\{[\s\S]*?padding-bottom:\s*calc\(10px \+ env\(safe-area-inset-bottom, 0px\)\);/);
  assert.match(css, /\.kasir-floatbar\s*\{[\s\S]*?padding-bottom:\s*calc\(13px \+ env\(safe-area-inset-bottom, 0px\)\);/);
});

test('S2126 — floating action remains touch-safe and wraps long labels', () => {
  assert.match(css, /\.keu-fab-action\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;[\s\S]*?overflow-wrap:\s*anywhere;/);
});

test('S2126 — dashboard floating search results cannot create horizontal overflow', () => {
  assert.match(css, /\.dashhub-search-results\s*\{[\s\S]*?max-inline-size:\s*100%;[\s\S]*?overflow-x:\s*hidden;[\s\S]*?overflow-wrap:\s*anywhere;/);
});

test('S2126 — narrow viewport contracts exist for 430px and 359px', () => {
  assert.match(css, /@media \(max-width:\s*430px\)[\s\S]*?\.kasir-floatbar[\s\S]*?left:\s*12px;[\s\S]*?right:\s*12px;/);
  assert.match(css, /@media \(max-width:\s*359px\)[\s\S]*?\.kasir-floatbar[\s\S]*?left:\s*10px;[\s\S]*?right:\s*10px;/);
});
