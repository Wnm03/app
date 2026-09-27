const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const s2111 = css.slice(css.lastIndexOf('S2111'));

test('S2111 establishes a consistent primary button touch target while preserving compact btn-sm', () => {
  assert.match(s2111, /\.btn:not\(\.btn-sm\)\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(s2111, /\.btn:not\(\.btn-sm\)/);
  assert.match(s2111, /Compact \.btn-sm remains intentionally smaller/);
});

test('S2111 normalizes the global modal close control without theme-specific selectors', () => {
  assert.match(s2111, /\.modal-close\s*\{[\s\S]*?width:\s*44px[\s\S]*?height:\s*44px/);
  assert.doesNotMatch(s2111, /\[data-theme=/);
});

test('S2111 protects shared cards and transaction rows from cross-module overflow', () => {
  assert.match(s2111, /\.card,\s*\n\.tx-item,\s*\n\.modal,\s*\n\.pwa-domain-page\s*\{[\s\S]*?min-width:\s*0/);
  assert.match(s2111, /\.tx-item \.tx-info\s*\{[\s\S]*?min-width:\s*0/);
  assert.match(s2111, /\.tx-item \.tx-name,\s*\n\.tx-item \.tx-meta[\s\S]*?overflow-wrap:\s*anywhere/);
});

test('S2111 remains presentation-only', () => {
  assert.doesNotMatch(s2111, /addEventListener|localStorage|indexedDB|fetch\s*\(|setInterval|requestAnimationFrame/);
});
