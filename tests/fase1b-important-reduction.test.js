const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'modern-ui-layer.css'), 'utf8');

test('Fase 1B: Shop import/export actions retain zero margin without !important', () => {
  const rule = css.match(/#page-shop\s+\.shop-import-export-actions\s*>\s*button\s*\{([^}]*)\}/);
  assert.ok(rule, 'Shop import/export button rule must remain');
  assert.match(rule[1], /(?:^|;)\s*margin\s*:\s*0\s*(?:;|$)/);
  assert.doesNotMatch(rule[1], /margin\s*:[^;]*!important/i);
});

test('Fase 1B: retired Shop FAB remains hidden without !important', () => {
  const rule = css.match(/#page-shop\s+\.shop-fab-retired\s*\{([^}]*)\}/);
  assert.ok(rule, 'retired Shop FAB rule must remain');
  assert.match(rule[1], /(?:^|;)\s*display\s*:\s*none\s*(?:;|$)/);
  assert.doesNotMatch(rule[1], /display\s*:[^;]*!important/i);
});
