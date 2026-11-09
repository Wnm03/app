'use strict';
// S2778 — O-1 (lepas servis), O-2 (batalkan belanja), O-3 (kendaraan stok ikut panel Servis).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function env({ servisChecked = false, stockChecked = false, cat = 'Kendaraan', sub = 'Ban', tx, logs = [], parts = [], curVehicleId = 'v1', servisVeh = 'v2' } = {}) {
  const els = {};
  const el = (id, p = {}) => (els[id] = Object.assign({ id, value: '', checked: false, style: { display: 'block' } }, p));
  el('txCat', { value: cat }); el('txSubCat', { value: sub });
  el('txSyncServis', { checked: servisChecked }); el('txServisPanel'); el('txServisVehicle', { value: servisVeh });
  el('txAddStock', { checked: stockChecked }); el('txStockPanel'); el('txStockQty', { value: '2' });
  const document = { getElementById: (id) => els[id] || null, addEventListener() {} };
  const D = { vehicles: [{ id: 'v1', name: 'A' }, { id: 'v2', name: 'B' }], servisLogs: logs, partsStock: parts, transactions: tx ? [tx] : [], categories: { income: [], expense: [] } };
  const reverted = [];
  const StockCommandSOT = {
    find: (id) => D.partsStock.find((p) => p.id === id),
    setQty: (id, q) => { StockCommandSOT.find(id).qty = q; return { ok: true }; },
    revertPurchaseForTransaction: (txId) => { const t = D.transactions.find((x) => x.id === txId); const p = StockCommandSOT.find(t.partStockId); p.qty -= t.partStockQty; reverted.push(txId); return { ok: true }; },
  };
  const ctx = loadSource(['modules/finance/tx-servis.js', 'modules/finance/tx-stok-sparepart.js'],
    { D, document, curTxType: 'expense', txEditId: tx ? tx.id : null, curVehicleId, StockCommandSOT, toast() {}, renderStockList() {}, revertStockUsage(id, q) { StockCommandSOT.find(id).qty += q; },
      isKendaraanCatName: (c) => /kendaraan/i.test(c), isServisSubName: (s) => /servis/i.test(s) },
    ['txServisUnlinkRequested', 'unlinkTxServisFromTx', 'txStockUnlinkRequested', 'unlinkTxStockFromTx', 'validateTxStockBeforeSave', 'txStockVehicleId']);
  return { ctx, els, D, reverted };
}

test('S2778 O-1: servis tertaut + centang dimatikan -> permintaan lepas; dicentang -> tidak', () => {
  const tx = { id: 't1', servisLinkId: 's1' };
  const a = env({ tx, logs: [{ id: 's1' }] });
  assert.equal(a.ctx.txServisUnlinkRequested(tx), true);
  const b = env({ tx, logs: [{ id: 's1' }], servisChecked: true });
  assert.equal(b.ctx.txServisUnlinkRequested(tx), false);
  const c = env({ tx: { id: 't1' }, logs: [] });
  assert.equal(c.ctx.txServisUnlinkRequested(c.D.transactions[0]), false, 'tak tertaut');
});

test('S2778 O-1: unlink menghapus log, mengembalikan stok pemakaian, menunda event lifecycle', () => {
  const tx = { id: 't1', servisLinkId: 's1' };
  const e = env({ tx, logs: [{ id: 's1', usedPartId: 'p1', usedPartQty: 2 }], parts: [{ id: 'p1', qty: 3 }] });
  e.ctx.unlinkTxServisFromTx(tx);
  assert.equal(e.D.servisLogs.length, 0);
  assert.equal(e.D.partsStock[0].qty, 5);
  assert.equal(tx.servisLinkId, undefined);
  assert.equal(tx._pendingServiceLifecycleRemove.service.id, 's1');
});

test('S2778 O-2: stok tertaut + centang dimatikan -> permintaan batal; unlink mengurangi stok & menghapus tautan', () => {
  const tx = { id: 't1', partStockId: 'p1', partStockQty: 2, partStockUnit: 'pcs' };
  const e = env({ tx, parts: [{ id: 'p1', qty: 5 }] });
  assert.equal(e.ctx.txStockUnlinkRequested(tx), true);
  assert.equal(e.ctx.validateTxStockBeforeSave(tx), null);
  e.ctx.unlinkTxStockFromTx(tx);
  assert.equal(e.D.partsStock[0].qty, 3);
  assert.equal(tx.partStockId, undefined);
});

test('S2778 O-2: stok sudah terpakai -> pembatalan ditolak dgn pesan; auto-link dilepas dulu sehingga lolos', () => {
  const tx = { id: 't1', partStockId: 'p1', partStockQty: 2, servisLinkId: 's1' };
  const manual = env({ tx, parts: [{ id: 'p1', name: 'Kampas', qty: 0 }], logs: [{ id: 's1', usedPartId: 'p1', usedPartQty: 2 }], servisChecked: true });
  assert.match(manual.ctx.validateTxStockBeforeSave(tx), /tidak cukup/);
  const tx2 = { id: 't1', partStockId: 'p1', partStockQty: 2, servisLinkId: 's1' };
  const auto = env({ tx: tx2, parts: [{ id: 'p1', name: 'Kampas', qty: 0 }], logs: [{ id: 's1', usedPartId: 'p1', usedPartQty: 2, autoLinkedPartStock: true }], servisChecked: true });
  assert.equal(auto.ctx.validateTxStockBeforeSave(tx2), null);
  auto.ctx.unlinkTxStockFromTx(tx2);
  assert.equal(auto.D.partsStock[0].qty, 0, 'net: +2 (lepas pakai) -2 (batal beli)');
  assert.equal(auto.D.servisLogs[0].usedPartId, null);
});

test('S2778 O-3: kendaraan stok mengikuti panel Servis bila dicentang, selain itu kendaraan aktif', () => {
  assert.equal(env({ servisChecked: true, servisVeh: 'v2' }).ctx.txStockVehicleId(), 'v2');
  assert.equal(env({ servisChecked: false, servisVeh: 'v2' }).ctx.txStockVehicleId(), 'v1');
});

test('S2778 sumber: konfirmasi lepas-tautan sebelum mutasi di _saveTxInner', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'modules/finance/transaksi-b.js'), 'utf8');
  assert.ok(src.indexOf("askConfirm('Centang dimatikan") > 0 && src.indexOf("askConfirm('Centang dimatikan") < src.indexOf('applyTxStockFromTx(note,savedTxId'));
});
