'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'modern-ui-layer.css'), 'utf8');

test('S256AD: tab rows and secondary controls reach 44px on mobile', () => {
  for (const c of ['.dhb-subtab', '.kel-subtab', '.cn-tab', '.tx-del', '.ai-q', '.vehicle-chip']) {
    assert.ok(css.includes('body[data-theme] ' + c), c);
  }
  assert.ok(/\.card-collapse-toggle\{display:inline-flex[^}]*min-width:44px;min-height:44px/.test(css));
});

test('S256AD: car page overrides repeat the 44px floor (more specific rules in styles.css)', () => {
  assert.ok(/#page-carnotes \.cnb-subtab\{min-height:44px\}/.test(css));
  assert.ok(/#page-carnotes \.btn-sm,\s*html body\[data-theme\] \.chip\{min-height:44px\}/.test(css));
});

test('S256AD: CSS adds no attribute-selector on data-action (S2103 contract)', () => {
  const i = css.indexOf('S256AC: touch targets');
  assert.ok(!/data-action=/.test(css.slice(i)));
});
