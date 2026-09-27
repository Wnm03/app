const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('S2121 — suggest box stays width-contained and scrollable', () => {
  assert.match(css, /\.suggest-box\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;[\s\S]*?overflow-x:\s*hidden;[\s\S]*?overflow-y:\s*auto;/);
});

test('S2121 — suggest content wraps instead of forcing horizontal overflow', () => {
  assert.match(css, /\.suggest-item, \.suggest-empty\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
});

test('S2121 — narrow suggest list uses dynamic viewport height', () => {
  assert.match(css, /@media \(max-width:\s*430px\)[\s\S]*?\.suggest-box\s*\{[\s\S]*?max-height:\s*min\(220px, 36dvh, 220px\);/);
});

test('S2121 — FAB action buttons retain touch target and wrap long labels', () => {
  assert.match(css, /\.keu-fab-action\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?white-space:\s*normal;/);
});

test('S2121 — floating FAB respects mobile safe area', () => {
  assert.match(css, /\.keu-fab\s*\{[\s\S]*?bottom:\s*calc\(84px \+ env\(safe-area-inset-bottom, 0px\)\);/);
});
