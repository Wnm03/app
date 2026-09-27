const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const block = css.slice(css.indexOf('/* S2106: Modal/Form UI hierarchy'));

test('S2106: modal content and controls cannot force horizontal overflow', () => {
  assert.match(block, /\.modal > \*,[\s\S]*?min-width:\s*0/);
  assert.match(block, /\.modal \.fi,[\s\S]*?max-width:\s*100%/);
  assert.match(block, /\.modal \.fi,[\s\S]*?min-height:\s*44px/);
});

test('S2106: modal title has a protected readable hierarchy', () => {
  assert.match(block, /\.modal-title\s*\{[\s\S]*?min-width:\s*0[\s\S]*?gap:\s*10px/);
  assert.match(block, /\.modal-title > :first-child\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
});

test('S2106: modal action buttons remain usable on mobile', () => {
  assert.match(block, /\.modal \.btn-row > \.btn,[\s\S]*?min-height:\s*44px/);
  assert.match(block, /@media \(max-width: 600px\)[\s\S]*?\.modal \.btn-row3\s*\{[\s\S]*?repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

test('S2106: very small screens reduce modal density without changing business logic', () => {
  assert.match(block, /@media \(max-width: 360px\)[\s\S]*?\.modal\s*\{[\s\S]*?padding-left:\s*12px/);
  assert.match(block, /@media \(max-width: 360px\)[\s\S]*?\.modal \.type-toggle3\s*\{[\s\S]*?repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});
