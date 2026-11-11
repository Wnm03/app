'use strict';
// AUDIT-BROWSER B9 (carnotes <-> Keuangan <-> Sparepart): HAPUS catatan/sesi servis yang punya transaksi "beli part + langsung dipasang".
// Servis.del()/delSession() menghapus transaksi tertaut lewat FinanceTxSOT.removeById() (tidak menyentuh stok) dan mengembalikan
// pemakaian part, tetapi belanja part (tx.partStockId) tidak dibatalkan -> stok hantu (+qty) padahal pengeluaran sudah terhapus.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function mk({ extraStock = 0, usedElsewhere = 0 } = {}) {
  const els = { txStockItem: 'st1', txStockQty: '5', txStockUnit: 'pcs' };
  const ctx = {
    console, toast() {}, renderStockList() {}, escapeHtml: (s) => s, todayStr: () => '2026-11-11', window: {},
    askConfirm: async () => true, save() {}, refreshCarNotesAfterMutation() {},
    document: { getElementById: (id) => ({ checked: true, style: { display: 'block' }, value: els[id] || '' }) },
    D: { partsStock: [{ id: 'st1', name: 'Filter', qty: extraStock, priceHistory: [] }], transactions: [], servisLogs: [], sparepartCats: [], vehicles: [] },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  ['modules/vehicle/stock-command-sot.js', 'modules/finance/finance-tx-sot.js', 'modules/finance/tx-stok-sparepart.js', 'modules/finance/tx-servis.js', 'modules/vehicle/servis.js']
    .forEach((s) => vm.runInContext(R(s), ctx, { filename: s }));
  const tx = { id: 't1', type: 'expense', amount: 500, accountId: 'a1', servisLinkId: 'sv1' };
  ctx.D.transactions.push(tx);
  ctx.applyTxStockFromTx('beli', tx.id, 'd', 500, null);
  const log = { id: 'sv1', vehicleId: 'v', txLinkId: 't1', sessionId: 'ses1', autoLinkedPartStock: false };
  ctx.D.servisLogs.push(log);
  ctx._syncServisUsedPartFromPurchase(log, 'st1', 5);
  if (usedElsewhere) ctx.D.partsStock[0].qty -= usedElsewhere; // pemakaian lain (mis. servis lain)
  ctx.qty = () => ctx.D.partsStock[0].qty;
  ctx.Servis = vm.runInContext('Servis', ctx);
  return ctx;
}

test('B9: Servis.del servis beli+pasang (stok habis terpakai) -> stok kembali 0, transaksi & log hilang', async () => {
  const c = mk();
  assert.strictEqual(c.qty(), 0);
  await c.Servis.del('sv1');
  assert.strictEqual(c.qty(), 0, 'tanpa stok hantu');
  assert.strictEqual(c.D.servisLogs.length, 0);
  assert.strictEqual(c.D.transactions.length, 0);
});

test('B9: Servis.del dgn stok lain 10 -> stok tetap 10', async () => {
  const c = mk({ extraStock: 10 });
  await c.Servis.del('sv1');
  assert.strictEqual(c.qty(), 10);
});

test('B9: Servis.delSession sesi beli+pasang -> stok kembali 0', async () => {
  const c = mk();
  await c.Servis.delSession('ses1');
  assert.strictEqual(c.qty(), 0);
  assert.strictEqual(c.D.servisLogs.length, 0);
  assert.strictEqual(c.D.transactions.length, 0);
});

test('B9: belanja 5, servis ini hanya memakai 3, 2 sisanya sudah terpakai di tempat lain -> penghapusan dibatalkan (rollback), data utuh', async () => {
  const c = mk();
  c.D.servisLogs[0].usedPartQty = 3; // servis ini memakai 3 dari 5 yang dibeli
  c.D.partsStock[0].qty = 0; // 5 beli - 3 servis ini - 2 terpakai tempat lain
  await c.Servis.del('sv1');
  assert.strictEqual(c.D.servisLogs.length, 1, 'log tidak terhapus');
  assert.strictEqual(c.D.transactions.length, 1, 'transaksi tidak terhapus');
  assert.strictEqual(c.qty(), 0, 'stok dipulihkan ke kondisi sebelum hapus');
});

test('B9: belanja 5, servis ini memakai 3, stok sisa 2 (cukup utk membatalkan) -> terhapus & stok 0', async () => {
  const c = mk();
  c.D.servisLogs[0].usedPartQty = 3;
  c.D.partsStock[0].qty = 2; // 5 - 3 = 2 utuh
  await c.Servis.del('sv1');
  assert.strictEqual(c.D.servisLogs.length, 0);
  assert.strictEqual(c.qty(), 0);
});
