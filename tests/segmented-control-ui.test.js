const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

function block(id){
  const i = html.indexOf(`id="${id}"`);
  assert.notEqual(i, -1, `missing #${id}`);
  return html.slice(Math.max(0, i - 500), i + 1800);
}

test('segmented control base CSS is reusable and mobile-safe', () => {
  assert.match(css, /\.segmented-control\s*\{/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('audited short option groups use segmented control', () => {
  for (const id of ['catFilterChips','importChips','dsMethodChips','kasirPriceToggle']) {
    assert.match(html, new RegExp(`<[^>]*(?:id="${id}"[^>]*class="[^"]*segmented-control|class="[^"]*segmented-control[^"]*"[^>]*id="${id}")`), id);
  }
  for (const token of ['kel-subtabs','lap-subtabs','pjk-subtabs','cni-subtabs','budget-tabbar']) {
    assert.match(html, new RegExp(`<[^>]*class="[^"]*${token}[^\"]*segmented-control`), token);
  }
});

test('long period filters remain scroll chips, not segmented controls', () => {
  assert.doesNotMatch(block('txListPeriodeChips'), /segmented-control/);
  assert.doesNotMatch(block('periodeChips'), /segmented-control/);
  assert.doesNotMatch(block('shopPeriodeChips'), /segmented-control/);
  assert.doesNotMatch(block('lapPeriodeChips'), /segmented-control/);
});
