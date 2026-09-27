const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

function blockAfter(cssText, marker) {
  const i = cssText.indexOf(marker);
  assert.notEqual(i, -1, `missing marker: ${marker}`);
  return cssText.slice(i);
}

test('S2104 scopes transaction wrapping to finance list containers', () => {
  const block = blockAfter(css, '/* S2104: transaction/list responsive polish');
  assert.match(block, /#allTx \.tx-name/);
  assert.match(block, /#filterTxList \.tx-name/);
  assert.match(block, /white-space:\s*normal/);
  assert.match(block, /-webkit-line-clamp:\s*2/);
  assert.match(block, /overflow-wrap:\s*anywhere/);
});

test('S2104 keeps amounts/actions visible and usable on narrow screens', () => {
  const block = blockAfter(css, '/* S2104: transaction/list responsive polish');
  assert.match(block, /#allTx \.tx-amount,[\s\S]*#filterTxList \.tx-amount/);
  assert.match(block, /flex:\s*0 0 auto/);
  assert.match(block, /#allTx \.tx-del,[\s\S]*#filterTxList \.tx-del/);
  assert.match(block, /min-width:\s*32px/);
});

test('S2104 does not alter the global tx-name nowrap contract', () => {
  const globalRule = css.match(/\.tx-name\s*\{[^}]*\}/)?.[0] || '';
  assert.match(globalRule, /white-space:\s*nowrap/);
  assert.match(globalRule, /text-overflow:\s*ellipsis/);
});

test('S2104 preserves table overflow instead of hiding transaction columns', () => {
  const block = blockAfter(css, '/* S2104: transaction/list responsive polish');
  assert.match(block, /#filterTxList \.tx-tbl-wrap[\s\S]*overflow-x:\s*auto/);
  assert.doesNotMatch(block, /display:\s*none[^}]*\.tx-tbl/);
});
