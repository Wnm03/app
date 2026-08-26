'use strict';
// tests/tx-stok-sparepart-vehicleid-sot-audit.test.js — audit user (lihat
// chat): Stok Sparepart (D.partsStock) hasil SCAN (syncPartsStockFromCatalog)
// & jalur "__new__" ketik manual di panel Transaksi Keuangan
// (applyTxStockFromTx) dulu TIDAK PERNAH menyetel `vehicleId`, beda dengan
// Sparepart.saveStock() (⚙️ Kelola Stok Sparepart, S629) yang SELALU
// mengunci ke curVehicleId. Akibatnya part hasil scan/tx "bocor" tampil di
// SEMUA tab kendaraan -- bukan 1 SOT. Fix: stempel vehicleId=curVehicleId
// juga di 2 titik ini (kalau ada & valid), part existing (reuse) TIDAK
// disentuh vehicleId-nya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign(
    {
      vehicles: [{ id: 'veh1', name: 'Vario 125' }, { id: 'veh2', name: 'Beat FI' }],
      partsStock: [],
      sparepartCats: [],
    },
    overrides || {}
  );
}

function makeCtx(D, curVehicleId, extra) {
  return loadSource(
    ['modules/finance/tx-stok-sparepart.js'],
    Object.assign(
      {
        D,
        curVehicleId,
        codeFromName: (name) => (name || '').toString().trim().slice(0, 3).toUpperCase() || 'SP',
        toast: () => {},
        save: () => {},
        escapeHtml: (s) => s,
      },
      extra || {}
    ),
    ['syncPartsStockFromCatalog', 'applyTxStockFromTx']
  );
}

test('syncPartsStockFromCatalog() — part baru hasil scan distempel vehicleId=curVehicleId', () => {
  const D = makeD();
  const ctx = makeCtx(D, 'veh1');
  const p = ctx.syncPartsStockFromCatalog({ id: 'cat1', partName: 'Kampas Rem', category: 'Rem' });
  assert.equal(p.vehicleId, 'veh1');
});

test('syncPartsStockFromCatalog() — curVehicleId kosong/tidak valid -> vehicleId null (universal, fail-open)', () => {
  const D = makeD();
  const ctx = makeCtx(D, 'veh-tidak-ada');
  const p = ctx.syncPartsStockFromCatalog({ id: 'cat1', partName: 'Kampas Rem', category: 'Rem' });
  assert.equal(p.vehicleId, null);
});

test('syncPartsStockFromCatalog() — reuse part existing (catalogId sama) TIDAK mengubah vehicleId lama', () => {
  const D = makeD();
  const ctx = makeCtx(D, 'veh1');
  const p1 = ctx.syncPartsStockFromCatalog({ id: 'cat1', partName: 'Busi', category: 'Perawatan' });
  assert.equal(p1.vehicleId, 'veh1');
  const p2 = ctx.syncPartsStockFromCatalog({ id: 'cat1', partName: 'Busi', category: 'Perawatan' });
  assert.equal(p2.id, p1.id);
  assert.equal(p2.vehicleId, 'veh1'); // tidak berubah krn reuse, bukan create baru
});

test('syncPartsStockFromCatalog() — kategori BARU hasil scan distempel vehicleId=curVehicleId (pola sama saveCat() S629)', () => {
  const D = makeD();
  const ctx = makeCtx(D, 'veh1');
  const p = ctx.syncPartsStockFromCatalog({ id: 'cat1', partName: 'Kampas Rem', category: 'Rem' });
  const cat = D.sparepartCats.find((c) => c.id === p.catId);
  assert.equal(cat.vehicleId, 'veh1');
});

test('syncPartsStockFromCatalog() — TIDAK boleh reuse kategori PRIVAT milik kendaraan lain (bug sama persis resolveServisCatForVehicle)', () => {
  const D = makeD({
    sparepartCats: [{ id: 'sp_veh2', name: 'Ganti Oli', code: 'GAN', intervalKm: 2000, vehicleId: 'veh2' }],
  });
  const resolveServisCatForVehicle = (name, vehicleId) => {
    const n = (name || '').trim().toLowerCase();
    const cats = D.sparepartCats.filter((c) => c && c.name && c.name.toLowerCase() === n);
    if (!cats.length) return null;
    return cats.find((c) => c.vehicleId && c.vehicleId === vehicleId) || cats.find((c) => !c.vehicleId) || null;
  };
  const ctx = makeCtx(D, 'veh1', { resolveServisCatForVehicle });
  const p = ctx.syncPartsStockFromCatalog({ id: 'cat1', partName: 'Oli Mesin', category: 'Ganti Oli' });
  const cat = D.sparepartCats.find((c) => c.id === p.catId);
  // Kategori baru dibuat khusus veh1, BUKAN reuse kategori privat veh2.
  assert.notEqual(cat.id, 'sp_veh2');
  assert.equal(cat.vehicleId, 'veh1');
  assert.equal(D.sparepartCats.length, 2);
});

test('applyTxStockFromTx() — jalur "__new__" ketik manual distempel vehicleId=curVehicleId', () => {
  const D = makeD();
  const dom = {
    txAddStock: { checked: true },
    txStockPanel: { style: { display: 'block' } },
    txStockItem: { value: '__new__' },
    txStockQty: { value: '2' },
    txStockUnit: { value: 'pcs' },
    txStockNewName: { value: 'Filter Oli Baru' },
  };
  const document = { getElementById: (id) => dom[id] || null };
  const ctx = makeCtx(D, 'veh2', { document, renderStockList: () => {} });
  ctx.applyTxStockFromTx('Filter Oli Baru', 'tx1', '2026-08-26', 50000, null);
  assert.equal(D.partsStock.length, 1);
  assert.equal(D.partsStock[0].vehicleId, 'veh2');
});
