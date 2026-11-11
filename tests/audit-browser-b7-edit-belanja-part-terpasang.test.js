'use strict';
// AUDIT-BROWSER B7 (sinkron Keuangan <-> Servis/Sparepart): EDIT transaksi "beli part + langsung dipasang" (auto-link servis).
// Dulu applyTxStockFromTx() membatalkan pembelian lama SEBELUM auto-link servis dilepas -> stok (sudah habis terpakai) < qty lama ->
// INSUFFICIENT_STOCK_FOR_PURCHASE_REVERT -> setiap edit transaksi ditolak. Kini auto-link dilepas dulu bila servis memasang ulang,
// dan edit belanja yang sebagian terpakai (tanpa pasang ulang) ditolak lebih awal dgn pesan jelas.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function mk({ servis = true, extraStock = 0 } = {}) {
  const els = { txAddStock: { checked: true }, txStockPanel: { style: { display: 'block' } }, txStockItem: { value: 'st1' }, txStockQty: { value: '5' }, txStockUnit: { value: 'pcs' } };
  if (servis) { els.txSyncServis = { checked: true }; els.txServisPanel = { style: { display: 'block' } }; }
  const ctx = {
    console, toast() {}, renderStockList() {}, escapeHtml: (s) => s, todayStr: () => '2026-11-11', window: {},
    document: { getElementById: (id) => els[id] || null },
    D: { partsStock: [{ id: 'st1', name: 'Filter', qty: extraStock, priceHistory: [] }], transactions: [], servisLogs: [], sparepartCats: [], vehicles: [] },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  ['modules/vehicle/stock-command-sot.js', 'modules/finance/tx-stok-sparepart.js', 'modules/finance/tx-servis.js'].forEach((s) => vm.runInContext(R(s), ctx, { filename: s }));
  ctx.els = els;
  const tx = { id: 't1', type: 'expense', amount: 500, servisLinkId: 'sv1' };
  ctx.D.transactions.push(tx);
  ctx.applyTxStockFromTx('beli', tx.id, '2026-11-11', 500, null);
  const log = { id: 'sv1', autoLinkedPartStock: false };
  ctx.D.servisLogs.push(log);
  ctx._syncServisUsedPartFromPurchase(log, 'st1', 5);
  ctx.tx = tx; ctx.log = log; ctx.qty = () => ctx.D.partsStock[0].qty;
  return ctx;
}

test('B7: edit qty 5 -> 6 saat stok habis terpakai auto-link: lolos & stok akhir benar setelah servis memasang ulang', () => {
  const c = mk();
  assert.strictEqual(c.qty(), 0);
  c.els.txStockQty.value = '6';
  assert.strictEqual(c.validateTxStockBeforeSave(c.tx), null);
  c.applyTxStockFromTx('beli', c.tx.id, '2026-11-11', 600, c.tx);
  assert.strictEqual(c.log.usedPartId, null, 'auto-link lama dilepas');
  assert.strictEqual(c.qty(), 6);
  c._syncServisUsedPartFromPurchase(c.log, 'st1', 6); // langkah servis di _saveTxInner
  assert.strictEqual(c.qty(), 0);
  assert.strictEqual(c.log.usedPartQty, 6);
});

test('B7: edit tanpa ubah qty (hanya nominal/catatan) tidak lagi ditolak', () => {
  const c = mk();
  c.applyTxStockFromTx('beli', c.tx.id, '2026-11-11', 700, c.tx);
  c._syncServisUsedPartFromPurchase(c.log, 'st1', 5);
  assert.strictEqual(c.qty(), 0);
  assert.strictEqual(c.log.usedPartQty, 5);
});

test('B7: servis tidak akan memasang ulang & stok habis terpakai -> ditolak di awal dgn pesan jelas (bukan exception)', () => {
  const c = mk({ servis: false });
  const msg = c.validateTxStockBeforeSave(c.tx);
  assert.match(msg, /tinggal 0/);
  assert.match(msg, /belanja lama \+5/);
});

test('B7: stok cukup (ada stok lain) & tanpa auto-link -> edit tetap lolos seperti sebelumnya', () => {
  const c = mk({ servis: false, extraStock: 10 });
  assert.strictEqual(c.qty(), 10);
  assert.strictEqual(c.validateTxStockBeforeSave(c.tx), null);
});

test('B7: transaksi baru (tanpa existingTx) tidak terpengaruh precheck', () => {
  const c = mk();
  assert.strictEqual(c.validateTxStockBeforeSave(null), null);
  assert.strictEqual(c.validateTxStockBeforeSave(undefined), null);
});
