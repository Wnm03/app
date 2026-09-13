import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const css = fs.readFileSync(path.join(root, 'modern-ui-layer.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const production = fs.readFileSync(path.join(root, 'app_production.html'), 'utf8');

test('mockup layout v2 is present in UI layer', () => {
  assert.match(css, /MOCKUP LAYOUT V2/);
  assert.match(css, /#assetDashboard \.budget-summary-grid/);
  assert.match(css, /#page-dashboard-hub \.dashhub-hero-stats/);
  assert.match(css, /#page-dashboard-hub \.dashhub-search-wrap/);
  assert.match(css, /\.nav-item \{/);
});

test('mockup layout stays CSS-only and does not introduce a new palette', () => {
  assert.doesNotMatch(css, /--bg\s*:/);
  assert.doesNotMatch(css, /--surface\d*\s*:/);
  assert.doesNotMatch(css, /--accent\s*:/);
  assert.doesNotMatch(css, /<script[^>]+mockup-layout-v2/i);
});

test('both runtime HTML entry points load the same modern UI layer', () => {
  assert.match(index, /modern-ui-layer\.css\?v=/);
  assert.match(production, /modern-ui-layer\.css\?v=/);
});

test('mockup layout targets mobile only', () => {
  const blockStart = css.indexOf('MOCKUP LAYOUT V2');
  const block = css.slice(blockStart);
  assert.match(block, /@media \(max-width: 899px\)/);
  assert.doesNotMatch(block, /@media \(min-width: 900px\)[\s\S]*#assetDashboard/);
});
