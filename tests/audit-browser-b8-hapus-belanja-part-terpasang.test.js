'use strict';
// AUDIT-BROWSER B8 (sinkron Keuangan <-> Servis/Sparepart): HAPUS transaksi "beli part + langsung dipasang".
// Dulu revert pembelian jalan sebelum pemakaian servis dilepas -> gagal diam-diam (stok < qty) lalu restore pemakaian
// menambah stok -> stok hantu (+qty) padahal transaksi & servis terhapus. Kini pemakaian dilepas lebih dulu, dan hapus belanja
// part yang sebagian terpakai servis lain ditolak (sejajar S2727 Shop).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const cf = R('modules/finance/tx-list-cashflow.js');
const fnCascade = cf.slice(cf.indexOf('function runTxDeleteCascades'), cf.indexOf('// S2727: kebijakan hapus pembelian stok'));
const fnBlock = cf.slice(cf.indexOf('function stockPurchaseDeleteBlockers'), cf.indexOf('async function delTx'));

function mk({ extraStock = 0, link = true } = {}) {
  const els = { txStockItem: 'st1', txStockQty: '5', txStockUnit: 'pcs' };
  const ctx = {
    console, toast() {}, renderStockList() {}, renderShop() {}, renderShopRecent() {}, escapeHtml: (s) => s, todayStr: () => '2026-11-11', window: {},
    document: { getElementById: (id) => ({ checked: true, style: { display: 'block' }, value: els[id] || '' }) },
    D: { partsStock: [{ id: 'st1', name: 'Filter', qty: extraStock, priceHistory: [] }], transactions: [], servisLogs: [], sparepartCats: [], vehicles: [], products: [], cobek: [] },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  ['modules/vehicle/stock-command-sot.js', 'modules/finance/tx-stok-sparepart.js', 'modules/finance/tx-servis.js'].forEach((s) => vm.runInContext(R(s), ctx, { filename: s }));
  vm.runInContext("function revertStockUsage(pid,q){const r=StockCommandSOT.adjustQty(pid,Number(q),{reason:'service-usage-revert',source:'servis',journal:false});if(!r.ok)throw new Error(r.code)}\n" + fnCascade + '\n' + fnBlock + ';this.run=runTxDeleteCascades;this.blockers=stockPurchaseDeleteBlockers;', ctx);
  const tx = { id: 't1', type: 'expense', servisLinkId: link ? 'sv1' : undefined };
  ctx.D.transactions.push(tx);
  ctx.applyTxStockFromTx('beli', tx.id, 'd', 500, null);
  const log = { id: 'sv1', autoLinkedPartStock: false, vehicleId: 'v' };
  if (link) { ctx.D.servisLogs.push(log); ctx._syncServisUsedPartFromPurchase(log, 'st1', 5); }
  ctx.tx = tx; ctx.qty = () => ctx.D.partsStock[0].qty;
  return ctx;
}

test('B8: hapus transaksi beli+pasang (stok habis terpakai) -> stok kembali 0, tanpa stok hantu', () => {
  const c = mk();
  assert.strictEqual(c.qty(), 0);
  assert.strictEqual(c.blockers(c.tx).length, 0);
  c.run(c.tx);
  assert.strictEqual(c.qty(), 0);
  assert.strictEqual(c.D.servisLogs.length, 0);
});

test('B8: hapus transaksi beli+pasang dgn stok lain 10 -> stok kembali 10', () => {
  const c = mk({ extraStock: 10 });
  assert.strictEqual(c.qty(), 10);
  c.run(c.tx);
  assert.strictEqual(c.qty(), 10);
});

test('B8: hapus belanja part murni (tanpa servis) saat stok cukup -> stok berkurang qty belanja', () => {
  const c = mk({ link: false });
  assert.strictEqual(c.qty(), 5);
  assert.strictEqual(c.blockers(c.tx).length, 0);
  c.run(c.tx);
  assert.strictEqual(c.qty(), 0);
});

test('B8: belanja part sebagian sudah dipakai servis lain -> diblokir dgn selisih', () => {
  const c = mk({ link: false });
  c.D.partsStock[0].qty = 2; // 3 sudah dipakai servis lain
  const b = c.blockers(c.tx);
  assert.strictEqual(b.length, 1);
  assert.strictEqual(b[0].short, 3);
});

test('B8: transaksi tanpa partStockId tidak terpengaruh blocker', () => {
  const c = mk({ link: false });
  assert.strictEqual(c.blockers({ id: 'x', type: 'expense' }).length, 0);
  assert.strictEqual(c.blockers(null).length, 0);
});
