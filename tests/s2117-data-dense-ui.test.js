const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('S2117 — table wrapper keeps data-dense UI horizontally contained', () => {
  assert.match(css, /\.tx-tbl-wrap\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?overflow-x:\s*auto;/);
});

test('S2117 — mobile tables preserve columns instead of hiding data', () => {
  assert.match(css, /@media \(max-width:\s*599px\)[\s\S]*?\.tx-tbl\s*\{[\s\S]*?min-width:\s*560px;/);
  assert.doesNotMatch(css, /@media \(max-width:\s*599px\)[\s\S]*?\.tx-tbl[^}]*display:\s*none/);
});

test('S2117 — long table descriptions can wrap safely', () => {
  assert.match(css, /\.tx-tbl-desc\s*\{[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?word-break:\s*break-word;/);
});

test('S2117 — numeric/date table cells remain readable', () => {
  assert.match(css, /\.tx-tbl \.tx-amount,[\s\S]*?white-space:\s*nowrap;/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums;/);
});
