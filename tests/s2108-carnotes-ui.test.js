const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const s2108Start = css.lastIndexOf('S2108');
const s2109Start = css.lastIndexOf('S2109');
const s2108 = css.slice(s2108Start, s2109Start > s2108Start ? s2109Start : undefined);

test('S2108 Car Notes UI is fully scoped to the Car Notes page', () => {
  assert.match(s2108, /#page-carnotes/);
  assert.doesNotMatch(s2108, /(^|\n)\s*\.tx-name\b/);
  assert.doesNotMatch(s2108, /\[data-theme=/);
});

test('S2108 protects Car Notes summary and cards from narrow-screen overflow', () => {
  assert.match(s2108, /\.cn-summary-metrics\s*\{[\s\S]*?grid-template-columns/);
  assert.match(s2108, /\.cn-summary-link\s*\{[\s\S]*?text-overflow:\s*ellipsis/);
  assert.match(s2108, /\.dashhub-wrap,\s*\n#page-carnotes \.card\s*\{[\s\S]*?min-width:\s*0/);
});

test('S2108 keeps primary Car Notes tabs horizontally usable on mobile', () => {
  assert.match(s2108, /\.cn-tabs[^\{]*\{[^\}]*overflow-x:\s*auto/);
  assert.match(s2108, /\.cn-tab\s*\{[^\}]*flex:\s*0 0 auto/);
});

test('S2108 keeps BBM cards readable and progressively compact below 380px', () => {
  assert.match(s2108, /\.bbm-stat-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3/);
  assert.match(s2108, /@media \(max-width:\s*379px\)[\s\S]*?\.bbm-stat-grid/);
  assert.match(s2108, /@media \(max-width:\s*319px\)[\s\S]*?\.bbm-stat-grid\s*\{\s*grid-template-columns:\s*1fr/);
});
