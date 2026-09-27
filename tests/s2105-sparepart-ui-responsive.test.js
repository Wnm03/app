const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

const block = css.slice(css.indexOf('/* S2105: Sparepart UI compact/mobile polish'));

test('S2105: sparepart dashboard uses a readable 2-column mobile stat grid', () => {
  assert.match(block, /#sparepartDashboard \.bbm-stat-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(block, /#sparepartDashboard \.bbm-stat\s*\{[\s\S]*?min-width:\s*0/);
});

test('S2105: sparepart service filters cannot force horizontal overflow on mobile', () => {
  assert.match(block, /#stockServiceFilterWrap\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)/);
  assert.match(block, /#stockServiceFilterWrap \.fs\s*\{[\s\S]*?min-width:\s*0 !important/);
  assert.match(block, /@media \(max-width: 360px\)[\s\S]*?#stockServiceFilterWrap\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
});

test('S2105: sparepart stock rows wrap names/meta and keep action targets usable', () => {
  assert.match(block, /#stockList \.tx-name\s*\{[\s\S]*?white-space:\s*normal[\s\S]*?-webkit-line-clamp:\s*2/);
  assert.match(block, /#stockList \.tx-meta\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(block, /#stockList \.tx-del\s*\{[\s\S]*?min-width:\s*32px[\s\S]*?min-height:\s*32px/);
});

test('S2105: changes stay scoped; no global tx-name contract is redefined by this stage', () => {
  assert.doesNotMatch(block, /(^|\n)\s*\.tx-name\s*\{/);
  assert.match(block, /#stockList \.tx-name/);
  assert.match(block, /#sparepartDashboard \.bbm-stat/);
});
