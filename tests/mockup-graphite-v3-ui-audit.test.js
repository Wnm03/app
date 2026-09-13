'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'modern-ui-layer.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const prod = fs.readFileSync(path.join(root, 'app_production.html'), 'utf8');

test('graphite mockup system defines all four card archetypes and neutral hierarchy', () => {
  for (const token of ['HERO metric', 'METRIC pair/grid', 'LIST: rows', 'INSIGHT: quiet informational']) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(css, /\[data-theme="graphite"\] \.card-title[\s\S]*text-transform: none/);
  assert.match(css, /\[data-theme="graphite"\] \.nav-item\.active[\s\S]*background: var\(--surface3\)/);
});

test('graphite mockup system covers controls, modal, empty state and ledger density', () => {
  for (const selector of ['\.chip-btn', '\.btn-primary', '\.modal', '\.empty', '\.tx-tbl', '\.nav']) {
    assert.match(css, new RegExp(`\\[data-theme="graphite"\\] ${selector}`));
  }
  assert.doesNotMatch(css, /\[data-theme="graphite"\][^{]*\{[^}]*--accent3:\s*#[0-9a-f]{6}/i);
});

test('graphite theme is registered in both HTML entry points', () => {
  assert.match(index, /data-args='\["graphite"\]'/);
  assert.match(prod, /data-args='\["graphite"\]'/);
  assert.equal((index.match(/data-args='\["graphite"\]'/g) || []).length, 1);
  assert.equal((prod.match(/data-args='\["graphite"\]'/g) || []).length, 1);
});
