'use strict';
// S2777 — Transaksi Keuangan: simpan "Belanja saja" / "Servis saja" / "Keduanya" harus bisa dipilih.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEnv({ cat = 'Kendaraan', sub = 'Servis & Oli', txEditId = null, txs = [] } = {}) {
  const els = {};
  const el = (id, props = {}) => (els[id] = Object.assign({ id, value: '', checked: false, style: { display: 'block' } }, props));
  el('txCat', { value: cat }); el('txSubCat', { value: sub });
  el('txSyncServis'); el('txServisPanel'); el('txServisVehicle', { value: 'v1' });
  el('txServisItem', { value: '' }); el('txServisKm', { value: '' });
  el('txAddStock'); el('txStockPanel'); el('txStockQty', { value: '1' });
  const listeners = {};
  const document = {
    getElementById: (id) => els[id] || null,
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
  };
  const D = { vehicles: [{ id: 'v1', name: 'Supra' }], servisLogs: [], transactions: txs, categories: { income: [], expense: [] } };
  const ctx = loadSource(
    ['modules/finance/tx-servis.js', 'modules/finance/tx-stok-sparepart.js'],
    { D, document, curTxType: 'expense', txEditId, isKendaraanCatName: (c) => /kendaraan/i.test(c), isServisSubName: (s) => /servis|service/i.test(s) },
    ['_txServisAutoActive', '_txServisSyncContext', '_txServisResetAutoChoice', 'validateTxServisBeforeSave', 'validateTxStockBeforeSave']
  );
  const fire = (id, checked) => { els[id].checked = checked; (listeners.change || []).forEach((fn) => fn({ target: els[id] })); };
  return { els, ctx, fire, D };
}

test('S2777 sub servis: auto aktif sbg default untuk transaksi baru', () => {
  const { ctx } = makeEnv();
  assert.equal(ctx._txServisAutoActive(), true);
});

test('S2777 user mematikan centang Servis -> auto tidak memaksa lagi (belanja saja)', () => {
  const { ctx, fire } = makeEnv();
  fire('txSyncServis', false);
  assert.equal(ctx._txServisAutoActive(), false);
});

test('S2777 opt-out hilang saat konteks kategori/sub berubah atau modal dibuka lagi', () => {
  const { ctx, fire } = makeEnv();
  ctx._txServisSyncContext('new|Kendaraan|Servis & Oli');
  fire('txSyncServis', false);
  ctx._txServisSyncContext('new|Kendaraan|Servis & Oli');
  assert.equal(ctx._txServisAutoActive(), false, 'konteks sama -> pilihan user bertahan');
  ctx._txServisSyncContext('new|Kendaraan|Ban');
  assert.equal(ctx._txServisAutoActive(), true, 'konteks beda -> default kembali');
  fire('txSyncServis', false);
  ctx._txServisResetAutoChoice();
  assert.equal(ctx._txServisAutoActive(), true, 'modal baru -> default kembali');
});

test('S2777 edit transaksi belanja-saja (belum tertaut servis) tidak dipaksa membuat servis', () => {
  const { ctx } = makeEnv({ txEditId: 't1', txs: [{ id: 't1', partStockId: 'p1' }] });
  assert.equal(ctx._txServisAutoActive(), false);
});

test('S2777 edit transaksi yang sudah tertaut servis tetap auto', () => {
  const { ctx } = makeEnv({ txEditId: 't1', txs: [{ id: 't1', servisLinkId: 's1' }] });
  assert.equal(ctx._txServisAutoActive(), true);
});

test('S2777 servis dimatikan -> validasi servis lolos walau item kosong (belanja saja)', () => {
  const { ctx, fire } = makeEnv({ sub: 'Servis & Oli' });
  fire('txSyncServis', false);
  assert.equal(ctx.validateTxServisBeforeSave('2026-11-09', null), null);
});

test('S2777 servis dicentang manual tapi item kosong -> simpan dibatalkan dgn pesan (bukan hilang diam-diam)', () => {
  const { ctx, els } = makeEnv({ sub: 'Ban' });
  els.txSyncServis.checked = true;
  assert.match(ctx.validateTxServisBeforeSave('2026-11-09', null), /Jenis Servis/);
  els.txServisItem.value = 'Ganti ban';
  assert.equal(ctx.validateTxServisBeforeSave('2026-11-09', null), null);
});

test('S2777 kendaraan servis beda dgn kendaraan transaksi -> ditolak sebelum mutasi', () => {
  const { ctx, els } = makeEnv({ sub: 'Ban' });
  els.txSyncServis.checked = true; els.txServisItem.value = 'x';
  assert.match(ctx.validateTxServisBeforeSave('2026-11-09', { vehicleId: 'v9' }), /berbeda/);
});

test('S2777 panel servis tersembunyi -> validasi diabaikan', () => {
  const { ctx, els } = makeEnv({ sub: 'Ban' });
  els.txSyncServis.checked = true; els.txServisPanel.style.display = 'none';
  assert.equal(ctx.validateTxServisBeforeSave('2026-11-09', null), null);
});

test('S2777 stok dicentang qty<=0 -> dibatalkan; stok tidak dicentang -> servis saja lolos', () => {
  const { ctx, els } = makeEnv();
  assert.equal(ctx.validateTxStockBeforeSave(), null, 'tidak dicentang');
  els.txAddStock.checked = true; els.txStockQty.value = '0';
  assert.match(ctx.validateTxStockBeforeSave(), /lebih dari 0/);
  els.txStockQty.value = '2';
  assert.equal(ctx.validateTxStockBeforeSave(), null);
});

test('S2777 _saveTxInner memvalidasi sebelum mutasi (urutan sumber)', () => {
  const fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'modules/finance/transaksi-b.js'), 'utf8');
  const iVal = src.indexOf('validateTxServisBeforeSave(date,existingTx)');
  const iMut = src.indexOf('applyTxStockFromTx(note,savedTxId');
  assert.ok(iVal > 0 && iMut > iVal, 'validasi harus sebelum applyTxStockFromTx');
});
