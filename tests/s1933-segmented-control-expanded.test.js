const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html');
const css = read('styles.css');
const modals = read('modules/shared/modals.js');

test('S1934 reusable segmented control supports audited field/card groups', () => {
  for (const id of ['aaRiskChips','sStatusKawinPicker','sTanggunganPicker','sPekerjaanPicker','kasirViewToggle']) {
    assert.match(html, new RegExp(`[^>]*class="[^"]*segmented-control[^"]*"[^>]*id="${id}"|[^>]*id="${id}"[^>]*class="[^"]*segmented-control`), id);
  }
  assert.match(html, /id="billTabBayarBtn"/);
  assert.match(html, /type-toggle[^>]*segmented-control[^>]*bill-tabs/);
  assert.ok(modals.includes('data-segmented-control=\\"tx-type\\"'));
  assert.ok(modals.includes('data-segmented-control=\\"pay-method\\"'));
  assert.ok(modals.includes('data-segmented-control=\\"titipan-expense-direction\\"'));
  assert.match(html, /data-segmented-control="advisor-tabs"/);
});

test('S1934 ownership rebalance controls preserve click handlers and values', () => {
  for (const [file, handler] of [
    ['modules/asset/aset-owners.js','Aset.setRebalanceMethod'],
    ['modules/finance/akun.js','AccOwners.setRebalanceMethod'],
    ['modules/asset/investasi-view.js','InvestmentUI.setRebalanceMethod'],
  ]) {
    const s = read(file);
    assert.match(s, /segmented-control is-grid seg-3/);
    assert.ok(s.includes(handler), handler);
    assert.match(s, /segmented-choice[^\n]*data-action=/);
    assert.ok(s.includes('proporsional'), 'proporsional');
    assert.ok(s.includes('largest'), 'largest');
    assert.ok(s.includes('manual'), 'manual');
    assert.doesNotMatch(s, /segmented-choice[^\n]*data-onchange=/);
  }
});

test('S1934 does not convert long/dynamic selectors into segmented controls', () => {
  for (const id of ['txListPeriodeChips','periodeChips','shopPeriodeChips','lapPeriodeChips','cnPeriodeChips']) {
    const i = html.indexOf(`id="${id}"`);
    if (i >= 0) assert.doesNotMatch(html.slice(Math.max(0,i-200), i+600), /segmented-control/);
  }
  assert.doesNotMatch(html, /id="txCat"[^>]*segmented-control/);
});

test('S1934 grid variant keeps touch-safe minimum and reduced-motion contract', () => {
  assert.match(css, /\.segmented-control\.is-grid\{display:grid/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
