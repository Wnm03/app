'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'modules/shared/a11y-action-controls.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'modern-ui-layer.css'), 'utf8');

function load() {
  const sel = src.match(/const _A11Y_ACTION_SELECTOR='[^']+';/);
  const fn = src.match(/function _a11yEnhanceActionControls\(root\)\{[\s\S]*?(?=\nfunction _installActionControlA11y)/);
  assert.ok(sel && fn, 'enhancer present');
  return new Function(sel[0] + fn[0] + '; return {fn:_a11yEnhanceActionControls, sel:_A11Y_ACTION_SELECTOR};')();
}
function node(tag, attrs, nestedInButton) {
  const a = Object.assign({}, attrs);
  return {
    tagName: tag, attrs: a,
    hasAttribute: k => k in a, setAttribute(k, v) { a[k] = v; },
    parentElement: { closest: () => (nestedInButton ? {} : null) },
  };
}

test('S256AG: whitelist covers leaf controls and excludes container rows', () => {
  const { sel } = load();
  for (const c of ['.chip', '.ai-q', '.vehicle-chip', '.theme-card', '.card-collapse-toggle', '.stat-box.clickable', '.sv-tap']) assert.ok(sel.includes(c), c);
  for (const c of ['.tx-item', '.cat-bar']) assert.ok(!sel.includes(c), c + ' must stay out');
});

test('S256AG: sets role=button + tabindex=0 only when missing, skips native and nested controls', () => {
  const { fn } = load();
  const a = node('DIV', {}), b = node('DIV', { role: 'tab' }), c = node('BUTTON', {}), d = node('SPAN', {}, true), e = node('DIV', { tabindex: '0' });
  const n = fn({ querySelectorAll: () => [a, b, c, d, e] });
  assert.strictEqual(n, 1);
  assert.strictEqual(a.attrs.role, 'button'); assert.strictEqual(a.attrs.tabindex, '0');
  assert.ok(!('role' in c.attrs) && !('tabindex' in d.attrs));
  assert.strictEqual(b.attrs.role, 'tab'); assert.strictEqual(e.attrs.role, undefined);
});

test('S256AG: observer is childList-only (no attribute loop) and focus ring CSS exists', () => {
  assert.ok(/observe\(document\.body,\{childList:true,subtree:true\}\)/.test(src));
  assert.ok(css.includes('S256AG: visible keyboard focus'));
  assert.ok(/\[role="button"\]\[data-action\]:focus-visible\{outline:2px solid var\(--accent\)/.test(css));
});

test('S256AG: module is registered in scripts/build.js GROUP_A and present in bundle A', () => {
  const b = fs.readFileSync(path.join(root, 'scripts', 'build.js'), 'utf8');
  const a = b.slice(b.indexOf('const GROUP_A'), b.indexOf('const GROUP_B'));
  assert.ok(a.includes("'modules/shared/a11y-action-controls.js'"));
  assert.ok(fs.readFileSync(path.join(root, 'app-bundle-a.min.js'), 'utf8').includes('_A11Y_ACTION_SELECTOR'));
});
