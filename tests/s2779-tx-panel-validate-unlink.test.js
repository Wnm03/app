'use strict';
// S2779 — Pola A (validasi sebelum simpan: BBM, Penjualan Shop) dan Pola B (lepas tautan: BBM, Renovasi).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function env({ bbmChecked = true, renovChecked = false, km = '', liter = '', bbmLogs = [], renovProjects = [], panelDisplay = 'block' } = {}) {
  const els = {};
  const el = (id, p = {}) => (els[id] = Object.assign({ id, value: '', checked: false, style: { display: panelDisplay } }, p));
  el('txSyncBbm', { checked: bbmChecked }); el('txBbmPanel'); el('txBbmKm', { value: km }); el('txBbmLiter', { value: liter });
  el('txAddRenov', { checked: renovChecked }); el('txRenovPanel');
  const document = { getElementById: (id) => els[id] || null };
  const D = { bbmLogs, renovProjects, vehicles: [] };
  const reconciled = [];
  const ctx = loadSource(['modules/finance/tx-bbm.js', 'modules/finance/tx-renov.js'],
    { D, document, toast() {}, sameId: (a, b) => String(a) === String(b), Renov: undefined },
    ['validateTxBbmBeforeSave', 'txBbmUnlinkRequested', 'unlinkTxBbmFromTx', 'txRenovUnlinkRequested', 'unlinkTxRenovFromTx', 'reconcileFuelStateFromLogs']);
  // tx-bbm.js mendefinisikan reconcileFuelStateFromLogs sendiri; pasang mata-mata SETELAH load (dipanggil via global).
  ctx.reconcileFuelStateFromLogs = (v) => reconciled.push(v);
  return { ctx, els, D, reconciled };
}

test('S2779 A: BBM dicentang tapi KM/Liter kosong -> pesan; terisi -> lolos; tak dicentang/panel tersembunyi -> lolos', () => {
  assert.match(env({ km: '', liter: '10' }).ctx.validateTxBbmBeforeSave(), /KM & Liter/);
  assert.match(env({ km: '1200', liter: '' }).ctx.validateTxBbmBeforeSave(), /KM & Liter/);
  assert.match(env({ km: '0', liter: '5' }).ctx.validateTxBbmBeforeSave(), /KM & Liter/);
  assert.equal(env({ km: '1200', liter: '5.5' }).ctx.validateTxBbmBeforeSave(), null);
  assert.equal(env({ bbmChecked: false }).ctx.validateTxBbmBeforeSave(), null);
  assert.equal(env({ panelDisplay: 'none' }).ctx.validateTxBbmBeforeSave(), null);
});

test('S2779 B: BBM tertaut + centang dimatikan -> permintaan lepas; dicentang/tak tertaut/log hilang -> tidak', () => {
  const tx = { id: 't1', bbmLinkId: 'b1' };
  assert.equal(env({ bbmChecked: false, bbmLogs: [{ id: 'b1', vehicleId: 'v1' }] }).ctx.txBbmUnlinkRequested(tx), true);
  assert.equal(env({ bbmChecked: true, bbmLogs: [{ id: 'b1' }] }).ctx.txBbmUnlinkRequested(tx), false);
  assert.equal(env({ bbmChecked: false, bbmLogs: [{ id: 'b1' }] }).ctx.txBbmUnlinkRequested({ id: 't2' }), false);
  assert.equal(env({ bbmChecked: false, bbmLogs: [] }).ctx.txBbmUnlinkRequested(tx), false);
  assert.equal(env({ bbmChecked: false, bbmLogs: [{ id: 'b1' }], panelDisplay: 'none' }).ctx.txBbmUnlinkRequested(tx), false);
});

test('S2779 B: unlink BBM menghapus log, merekonsiliasi fuelState kendaraan, melepas tautan, transaksi tetap', () => {
  const tx = { id: 't1', bbmLinkId: 'b1', amount: 50000 };
  const e = env({ bbmChecked: false, bbmLogs: [{ id: 'b1', vehicleId: 'v1' }, { id: 'b2', vehicleId: 'v1' }] });
  e.ctx.unlinkTxBbmFromTx(tx);
  assert.deepEqual(e.D.bbmLogs.map((b) => b.id), ['b2']);
  assert.deepEqual(e.reconciled, ['v1']);
  assert.equal(tx.bbmLinkId, undefined);
  assert.equal(tx.amount, 50000);
});

test('S2779 B: Renovasi tertaut + centang dimatikan -> permintaan lepas; item kembali belum lunas, bukan dihapus', () => {
  const projects = () => [{ id: 7, items: [{ id: 9, name: 'Cat', paid: true, txId: 't1', paidDate: '2026-11-01' }] }];
  const mk = () => ({ id: 't1', renovProjectLinkId: '7', renovItemLinkId: '9', amount: 100 });
  const off = env({ renovChecked: false, renovProjects: projects() });
  assert.equal(off.ctx.txRenovUnlinkRequested(mk()), true);
  assert.equal(env({ renovChecked: true, renovProjects: projects() }).ctx.txRenovUnlinkRequested(mk()), false);
  assert.equal(env({ renovChecked: false, renovProjects: [] }).ctx.txRenovUnlinkRequested(mk()), false, 'proyek hilang');
  const tx = mk();
  off.ctx.unlinkTxRenovFromTx(tx);
  const it = off.D.renovProjects[0].items[0];
  assert.equal(off.D.renovProjects[0].items.length, 1);
  assert.deepEqual([it.paid, it.txId, it.paidDate], [false, null, null]);
  assert.equal(tx.renovItemLinkId, undefined);
  assert.equal(tx.renovProjectLinkId, undefined);
});

test('S2779 A: Penjualan Shop dengan daftar kosong ditolak SEBELUM persist (eksekusi nyata)', () => {
  const vm = require('node:vm');
  const cart = read('modules/shop/cobek-tx-cart.js');
  const body = cart.slice(cart.indexOf('function txShopSalePrecheck'), cart.indexOf('function applyTxShopSaleFromTx'));
  const els = { txAddShopSale: { checked: true, style: { display: 'block' } }, txShopSalePanel: { checked: false, style: { display: 'block' } } };
  const ctx = { document: { getElementById: (id) => els[id] || null }, curTxShopSaleCart: [], D: { products: [], cobek: [] } };
  vm.createContext(ctx);
  vm.runInContext(body + ';this.fn=txShopSalePrecheck;', ctx);
  const r = ctx.fn(null);
  assert.equal(r.ok, false);
  assert.match(r.message, /Belum ada produk/);
  els.txAddShopSale.checked = false;
  assert.equal(ctx.fn(null).ok, true, 'centang mati tidak diblokir');
  els.txAddShopSale.checked = true; els.txShopSalePanel.style.display = 'none';
  assert.equal(ctx.fn(null).ok, true, 'panel tersembunyi tidak diblokir');
});

test('S2779 sumber: validasi BBM sebelum mutasi; unlink BBM/Renov sebelum sinkron dasar; konfirmasi memuat dua baris baru', () => {
  const src = read('modules/finance/transaksi-b.js');
  const iVal = src.indexOf('validateTxBbmBeforeSave');
  const iConfirm = src.indexOf("askConfirm('Centang dimatikan");
  const iUnlink = src.indexOf('unlinkTxBbmFromTx(existingTx)');
  const iBbmSync = src.indexOf('if(existingTx.bbmLinkId&&D.bbmLogs)');
  const iRenovSync = src.indexOf('Renov.onLinkedTxEdited(existingTx)');
  const iApply = src.indexOf('applyTxStockFromTx(note,savedTxId');
  assert.ok(iVal > 0 && iVal < iConfirm && iConfirm < iApply, 'validasi + konfirmasi sebelum mutasi');
  assert.ok(iUnlink > 0 && iUnlink < iBbmSync && iUnlink < iRenovSync, 'unlink sebelum sinkron dasar');
  assert.ok(src.indexOf('unlinkTxRenovFromTx(existingTx)') < iRenovSync);
  assert.match(src, /_undo\.push\('Catatan BBM tertaut/);
  assert.match(src, /_undo\.push\('Item Renovasi tertaut/);
  assert.match(src, /_txGenericLinkPath=curPayMethod==='tunai'&&!existingBill/);
});

test('S2779 sumber: rollback edit memulihkan bbmLogs & renovProjects bila unlink lalu simpan gagal', () => {
  const src = read('modules/finance/transaksi-b.js');
  assert.match(src, /D\.bbmLogs=JSON\.parse\(_serviceEditSnapshot\.bbmLogs\)/);
  assert.match(src, /D\.renovProjects=JSON\.parse\(_serviceEditSnapshot\.renovProjects\)/);
  assert.match(src, /_serviceMutationTouched=!!\([^;]*_txBbmUnlink\|\|_txRenovUnlink\)/);
});
