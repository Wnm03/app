'use strict';
// S2645 — source-level guards for transaction-link UI hints; save/SOT functions stay untouched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const modals = read('modules/shared/modals.js');
const ux = read('modules/shared/pwa-ux-performance.js');
const css = read('modern-ui-layer.css');

test('P0-1: Shop stock and sale have inline empty-cart warnings', () => {
  assert.match(modals, /id=\\"txShopStockLinkWarn\\"[^>]*hidden/);
  assert.match(modals, /id=\\"txShopSaleLinkWarn\\"[^>]*hidden/);
  assert.match(ux, /txAddShopStock/);
  assert.match(ux, /txAddShopSale/);
  assert.match(modals, /Belum ada produk di daftar/);
  assert.match(css, /\.tx-link-warn/);
});

test('P0-2: amount source hint explains calculated total and previous amount', () => {
  assert.match(modals, /id=\\"txAmtSourceHint\\"/);
  assert.match(ux, /Dihitung dari daftar produk/);
  assert.match(ux, /sebelumnya/);
  assert.match(ux, /Nominal diisi manual/);
  assert.match(ux, /txDelBtn/);
  assert.match(ux, /txShopStockCartList/);
});

test('P0-3: Renovation create-project action uses existing lazy loader and modal', () => {
  assert.match(modals, /data-action=\\"txRenovCreateProject\\"/);
  assert.match(ux, /window\.txRenovCreateProject=function/);
  assert.match(ux, /ensureRenov\(\)/);
  assert.match(ux, /openProjectModal/);
  assert.match(ux, /populateTxRenovSelect/);
});

test('P0 helper remains separate from save and SOT functions', () => {
  const helper = ux.slice(ux.indexOf('PWAUX.installTxLinkHints=function'), ux.indexOf('PWAUX.installStatus();'));
  assert.ok(!/saveTx\s*\(|applyTx\w*FromTx\s*\(|updateTxVehiclePanels\s*\(/.test(helper));
});
