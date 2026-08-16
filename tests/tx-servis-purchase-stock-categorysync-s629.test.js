'use strict';
// tests/tx-servis-purchase-stock-categorysync-s629.test.js — regresi utk 2
// bugfix (audit sesi ini, laporan user): checkbox "📦 Tambah ke Stok
// Sparepart juga?" DAN "🔧 Sinkron ke Catatan Servis juga?" dicentang
// BERSAMAAN (beli part sekaligus langsung dipasang) di 1 transaksi
// Keuangan yang sama.
//
// Pola sama tests/s626-stock-avgprice-revert-regression.test.js: load
// source ASLI modules/finance/tx-servis.js lewat loadSource() (fungsi2 di
// sini murni terhadap D + stub document.getElementById, tidak butuh
// browser/jsdom), jadi test ini benar2 menjalankan applyTxServisFromTx()/
// recordServisLog() yang sama dipakai app, bukan re-implementasi logic.
//
// BUG #1 — "sparepart yang sudah dibeli & masuk ke stok belum berkurang
// ketika sekalian dipasang": recordServisLog() DULU selalu hardcode
// usedPartId:null/usedPartQty:0, TIDAK PERNAH ditautkan ke part yang baru
// dibeli (tx.partStockId/tx.partStockQty) -> stok dobel (nambah dari
// pembelian, TIDAK berkurang dari pemakaian).
//
// BUG #2 — "servis kategori sparepart jg belum terisi otomatis": baris
// D.servisLogs yang dibuat dari sinkron Transaksi selalu categoryId:null,
// tidak pernah dicocokkan ke D.sparepartCats sama sekali (beda dgn
// Servis._saveInner() di car-notes.js yang selalu mencoba match by nama).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(values) {
  const els = {};
  Object.keys(values).forEach((id) => {
    const v = values[id];
    els[id] = (typeof v === 'boolean') ? { checked: v } : { value: v };
  });
  return { getElementById: (id) => els[id] || null };
}

function makeCtx({ D, fields, panelDisplay = 'block' }) {
  const els = makeFakeDoc(fields);
  const origGet = els.getElementById;
  const panelEl = { style: { display: panelDisplay } };
  const document = {
    getElementById: (id) => {
      if (id === 'txServisPanel') return panelEl;
      return origGet(id);
    },
  };
  const toasts = [];
  return loadSource(
    ['modules/finance/tx-servis.js'],
    {
      D, document,
      uid: (() => { let n = 1; return () => 'sv' + (n++); })(),
      escapeHtml: (s) => s,
      toast: (m) => toasts.push(m),
      curVehicleId: 'v1',
      renderCnTab: () => {},
    },
    ['applyTxServisFromTx', 'recordServisLog', '_resolveServisCategoryId'],
  ) && { toasts };
}

function freshD() {
  return {
    vehicles: [{ id: 'v1', name: 'Vario 125', emoji: '🏍️' }],
    transactions: [],
    servisLogs: [],
    partsStock: [{ id: 'st1', name: 'Ban depan 80/90', catId: 'sp_ban', qty: 4, unit: 'pcs' }],
    sparepartCats: [{ id: 'sp_ban', name: 'ban' }],
  };
}

test('BUG #1 — part dibeli & langsung disinkron ke Servis di tx yang sama -> stok net TIDAK dobel (berkurang sesuai pemakaian)', () => {
  const D = freshD();
  const tx = { id: 'tx1', partStockId: 'st1', partStockQty: 2 };
  D.transactions.push(tx);

  const ctx = loadSource(
    ['modules/finance/tx-servis.js'],
    {
      D,
      document: {
        getElementById: (id) => {
          const panel = { txServisPanel: { style: { display: 'block' } } };
          if (panel[id]) return panel[id];
          const fields = {
            txSyncServis: { checked: true },
            txServisVehicle: { value: 'v1' },
            txServisItem: { value: 'ban' },
            txServisKm: { value: '18470' },
          };
          return fields[id] || null;
        },
      },
      uid: (() => { let n = 1; return () => 'sv' + (n++); })(),
      toast: () => {},
      curVehicleId: 'v1',
      renderCnTab: () => {},
      escapeHtml: (s) => s,
    },
  );

  // Stok SUDAH ditambah +2 duluan oleh applyTxStockFromTx() (tx-stok-sparepart.js,
  // dipanggil SEBELUM applyTxServisFromTx() di _saveTxInner()) -- simulasikan di sini:
  const part = D.partsStock.find((p) => p.id === 'st1');
  part.qty += 2; // qty jadi 6 (4 awal + 2 dibeli), SEBELUM sinkron servis

  ctx.applyTxServisFromTx('tx1', 225000, '2026-08-16', 'a1', 'Ganti ban', tx, null);

  assert.equal(D.servisLogs.length, 1, 'baris Servis harus dibuat');
  const log = D.servisLogs[0];
  assert.equal(log.usedPartId, 'st1', 'usedPartId harus tertaut ke part yang baru dibeli');
  assert.equal(log.usedPartQty, 2, 'usedPartQty harus sama dgn qty yang dibeli/dipasang');
  assert.equal(log.autoLinkedPartStock, true);

  // Net efek stok: +2 (pembelian) - 2 (pemakaian auto-link) = tetap 4 (qty awal)
  assert.equal(part.qty, 4, 'BUG #1: stok TIDAK boleh dobel — net efek harus 0 (qty kembali ke sebelum transaksi)');
});

test('BUG #1 — EDIT transaksi (ganti qty pembelian) tidak dobel-potong / meninggalkan potongan basi (idempotent)', () => {
  const D = freshD();
  const existingTx = { id: 'tx1', partStockId: 'st1', partStockQty: 2, servisLinkId: 'sv1' };
  D.transactions.push(existingTx);
  D.servisLogs.push({ id: 'sv1', vehicleId: 'v1', date: '2026-08-16', item: 'ban', categoryId: 'sp_ban', km: 18470, cost: 225000, note: '', accountId: 'a1', txLinkId: 'tx1', usedPartId: 'st1', usedPartQty: 2, autoLinkedPartStock: true });

  const part = D.partsStock.find((p) => p.id === 'st1');
  part.qty = 4; // qty setelah pembelian awal (2) - pemakaian awal (2) = net 4 (qty awal, sudah "settled")

  const ctx = loadSource(
    ['modules/finance/tx-servis.js'],
    {
      D,
      document: {
        getElementById: (id) => {
          const panel = { txServisPanel: { style: { display: 'block' } } };
          if (panel[id]) return panel[id];
          const fields = {
            txSyncServis: { checked: true },
            txServisVehicle: { value: 'v1' },
            txServisItem: { value: 'ban' },
            txServisKm: { value: '18470' },
          };
          return fields[id] || null;
        },
      },
      uid: () => 'sv_new',
      toast: () => {},
      curVehicleId: 'v1',
      renderCnTab: () => {},
      escapeHtml: (s) => s,
    },
  );

  // Simulasi edit: qty pembelian dinaikkan jadi 3. applyTxStockFromTx()
  // (dipanggil SEBELUM applyTxServisFromTx() di _saveTxInner(), tidak
  // dipanggil lagi di sini) akan revert dulu pembelian lama (qty -2 ->
  // 4-2=2) baru apply pembelian baru (qty +3 -> 2+3=5) SEBELUM sinkron
  // servis di bawah ini jalan.
  existingTx.partStockQty = 3;
  part.qty = 5;

  ctx.applyTxServisFromTx('tx1', 300000, '2026-08-16', 'a1', 'Ganti ban', existingTx, existingTx);

  const log = D.servisLogs.find((s) => s.id === 'sv1');
  assert.equal(log.usedPartQty, 3, 'usedPartQty harus ikut update ke qty pembelian baru');
  assert.equal(part.qty, 4, 'net efek stok harus tetap kembali ke qty awal (4), tidak dobel-potong ataupun basi');
});

test('BUG #2 — item cocok nama kategori sparepart -> categoryId otomatis terisi (match by nama, sama seperti Servis modal)', () => {
  const D = freshD();
  const tx = { id: 'tx1' };
  D.transactions.push(tx);

  const ctx = loadSource(
    ['modules/finance/tx-servis.js'],
    {
      D,
      document: {
        getElementById: (id) => {
          const panel = { txServisPanel: { style: { display: 'block' } } };
          if (panel[id]) return panel[id];
          const fields = {
            txSyncServis: { checked: true },
            txServisVehicle: { value: 'v1' },
            txServisItem: { value: 'ban' }, // cocok D.sparepartCats "ban" (case-insensitive)
            txServisKm: { value: '' },
          };
          return fields[id] || null;
        },
      },
      uid: () => 'sv1',
      toast: () => {},
      curVehicleId: 'v1',
      renderCnTab: () => {},
      escapeHtml: (s) => s,
    },
  );

  ctx.applyTxServisFromTx('tx1', 225000, '2026-08-16', 'a1', '', tx, null);

  const log = D.servisLogs[0];
  assert.equal(log.categoryId, 'sp_ban', 'BUG #2: categoryId harus otomatis terisi dari match nama item <-> D.sparepartCats');
});

test('BUG #2 — item TIDAK cocok nama kategori manapun tapi part yang dibeli/dipakai punya catId -> fallback ke kategori part itu', () => {
  const D = freshD();
  const tx = { id: 'tx1', partStockId: 'st1', partStockQty: 1 };
  D.transactions.push(tx);
  D.partsStock[0].qty += 1; // simulasi applyTxStockFromTx sudah jalan duluan

  const ctx = loadSource(
    ['modules/finance/tx-servis.js'],
    {
      D,
      document: {
        getElementById: (id) => {
          const panel = { txServisPanel: { style: { display: 'block' } } };
          if (panel[id]) return panel[id];
          const fields = {
            txSyncServis: { checked: true },
            txServisVehicle: { value: 'v1' },
            txServisItem: { value: 'servis rutin' }, // TIDAK cocok kategori manapun
            txServisKm: { value: '' },
          };
          return fields[id] || null;
        },
      },
      uid: () => 'sv1',
      toast: () => {},
      curVehicleId: 'v1',
      renderCnTab: () => {},
      escapeHtml: (s) => s,
    },
  );

  ctx.applyTxServisFromTx('tx1', 225000, '2026-08-16', 'a1', '', tx, null);

  const log = D.servisLogs[0];
  assert.equal(log.categoryId, 'sp_ban', 'BUG #2: fallback ke catId part yang dibeli/dipakai (D.partsStock) kalau nama item tidak cocok kategori manapun');
});

test('_resolveServisCategoryId() murni — no match & tanpa purchasedPartId -> null (tidak menebak-nebak)', () => {
  const D = freshD();
  const ctx = loadSource(
    ['modules/finance/tx-servis.js'],
    { D, document: makeFakeDoc({}), toast: () => {}, escapeHtml: (s) => s },
    ['_resolveServisCategoryId'],
  );
  assert.equal(ctx._resolveServisCategoryId('servis rutin', null), null);
  assert.equal(ctx._resolveServisCategoryId('', null), null);
});

test('Manual override (usedPartId dipilih manual lewat Edit Detail Servis) tetap dihormati, tidak ditimpa sinkron berikutnya', () => {
  const D = freshD();
  D.partsStock.push({ id: 'st2', name: 'Ban belakang 90/90', catId: 'sp_ban', qty: 3, unit: 'pcs' });
  const existingTx = { id: 'tx1', partStockId: 'st1', partStockQty: 2, servisLinkId: 'sv1' };
  D.transactions.push(existingTx);
  // Baris ini SUDAH di-edit manual lewat modal Servis: usedPartId diganti ke st2, autoLinkedPartStock=false
  D.servisLogs.push({ id: 'sv1', vehicleId: 'v1', date: '2026-08-16', item: 'ban', categoryId: 'sp_ban', km: 18470, cost: 225000, note: '', accountId: 'a1', txLinkId: 'tx1', usedPartId: 'st2', usedPartQty: 1, autoLinkedPartStock: false });

  const ctx = loadSource(
    ['modules/finance/tx-servis.js'],
    {
      D,
      document: {
        getElementById: (id) => {
          const panel = { txServisPanel: { style: { display: 'block' } } };
          if (panel[id]) return panel[id];
          const fields = {
            txSyncServis: { checked: true },
            txServisVehicle: { value: 'v1' },
            txServisItem: { value: 'ban' },
            txServisKm: { value: '18470' },
          };
          return fields[id] || null;
        },
      },
      uid: () => 'sv_new',
      toast: () => {},
      curVehicleId: 'v1',
      renderCnTab: () => {},
      escapeHtml: (s) => s,
    },
  );

  ctx.applyTxServisFromTx('tx1', 225000, '2026-08-16', 'a1', 'Ganti ban', existingTx, existingTx);

  const log = D.servisLogs.find((s) => s.id === 'sv1');
  assert.equal(log.usedPartId, 'st2', 'pilihan manual usedPartId tidak boleh ditimpa oleh sinkron pembelian di tx yang sama');
  assert.equal(log.usedPartQty, 1);
  assert.equal(log.categoryId, 'sp_ban', 'categoryId tetap boleh disinkron ulang (match nama item, bukan bagian dari pilihan manual part)');
});
