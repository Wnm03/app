const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

test('S2129 service history actions use a single content column on narrow phones', () => {
  assert.match(css, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.servis-history-item\s*\{[\s\S]*?grid-template-columns:\s*28px\s+32px\s+minmax\(0,\s*1fr\)/);
  assert.match(css, /@media\s*\(max-width:\s*430px\)[\s\S]*?grid-template-areas:\s*"select icon info"\s*"select icon amount"\s*"select icon edit"\s*"select icon del"/);
});

test('S2129 session summary removes the narrow action column on narrow phones', () => {
  assert.match(css, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.servis-history-session-summary\s*\{[\s\S]*?grid-template-columns:\s*36px\s+minmax\(0,\s*1fr\)/);
  assert.match(css, /@media\s*\(max-width:\s*430px\)[\s\S]*?grid-template-areas:\s*"icon info"\s*"icon amount"\s*"icon edit"\s*"icon add"\s*"icon del"/);
});

test('S2129 service history action controls cannot visually overflow their grid track', () => {
  assert.match(css, /\.servis-history-item\s*>\s*\.servis-history-edit[\s\S]*?box-sizing:\s*border-box/);
  assert.match(css, /\.servis-history-session-summary\s*>\s*\.servis-history-edit-session[\s\S]*?overflow:\s*hidden/);
});
