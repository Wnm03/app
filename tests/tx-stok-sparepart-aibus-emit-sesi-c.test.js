'use strict';
// tests/tx-stok-sparepart-aibus-emit-sesi-c.test.js — Sesi C (lanjutan
// AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md temuan #2): `tx-stok-sparepart.js`
// — applyStockPurchase()/revertStockPurchase() SEBELUMNYA 0% emit AIBus
// sama sekali. Kedua fungsi ini MURNI terhadap D (tidak memanggil save()
// sendiri, lihat komentar SoT di source), jadi dites langsung lewat
// loadSource() tanpa stub DOM -- pola sama
// tests/tx-stok-sparepart-catalog-link.test.js.
//
// kind:"stok-sparepart" dipakai di payload `finance.updated` yang sama
// (bukan event baru) -- konsisten dgn kind:"transaksi"/"target" di
// sesi-sesi sebelumnya (delTx/saveTransfer/tx-target).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, overrides = {}) {
  const aibusEvents = [];
  const ctx = loadSource(
    ['modules/finance/tx-stok-sparepart.js'],
    {
      D,
      codeFromName: (name) => (name || '').toString().trim().slice(0, 3).toUpperCase() || 'SP',
      toast: () => {},
      save: () => {},
      escapeHtml: (s) => s,
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
      ...overrides,
    },
    ['applyStockPurchase', 'revertStockPurchase'],
  );
  ctx.__aibusEvents = aibusEvents;
  return ctx;
}

function makePart(overrides = {}) {
  return { id: 'part1', name: 'Kampas Rem', qty: 5, price: 0, unit: 'pcs', ...overrides };
}

test('applyStockPurchase(): pembelian baru -> emit finance.updated {kind:"stok-sparepart",action:"purchase-apply",partId,qty,unitPrice,txId}', () => {
  const D = { partsStock: [] };
  const ctx = makeCtx(D);
  const p = makePart();

  ctx.applyStockPurchase(p, 10, 15000, '2026-08-01', 'tx1');

  assert.equal(p.qty, 15, '0 regresi: qty tetap bertambah seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'harus emit finance.updated saat pembelian stok diterapkan');
  assert.equal(ev.payload.kind, 'stok-sparepart');
  assert.equal(ev.payload.action, 'purchase-apply');
  assert.equal(ev.payload.partId, 'part1');
  assert.equal(ev.payload.qty, 10);
  assert.equal(ev.payload.unitPrice, 15000);
  assert.equal(ev.payload.txId, 'tx1');
});

test('applyStockPurchase(): dipanggil 2x txId sama (guard S713 anti-dobel) -> tetap emit tiap panggilan (emit bukan bagian dari guard priceHistory)', () => {
  const D = { partsStock: [] };
  const ctx = makeCtx(D);
  const p = makePart();

  ctx.applyStockPurchase(p, 5, 10000, '2026-08-01', 'tx1');
  ctx.applyStockPurchase(p, 5, 10000, '2026-08-01', 'tx1');

  assert.equal(p.priceHistory.length, 1, '0 regresi: guard anti-dobel priceHistory tetap berlaku');
  assert.equal(ctx.__aibusEvents.filter((e) => e.name === 'finance.updated').length, 2, 'emit tetap terpanggil di tiap invocation, terlepas dari guard priceHistory');
});

test('revertStockPurchase(): revert pembelian -> emit finance.updated {kind:"stok-sparepart",action:"purchase-revert",partId,qty,txId}', () => {
  const D = { partsStock: [] };
  const ctx = makeCtx(D);
  const p = makePart();
  ctx.applyStockPurchase(p, 10, 15000, '2026-08-01', 'tx1');
  D.partsStock.push(p);
  ctx.__aibusEvents.length = 0; // reset, fokus ke revert saja

  ctx.revertStockPurchase('part1', 10, 'tx1');

  assert.equal(p.qty, 5, '0 regresi: qty tetap direvert seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'harus emit finance.updated saat revert');
  assert.equal(ev.payload.kind, 'stok-sparepart');
  assert.equal(ev.payload.action, 'purchase-revert');
  assert.equal(ev.payload.partId, 'part1');
  assert.equal(ev.payload.qty, 10);
  assert.equal(ev.payload.txId, 'tx1');
});

test('revertStockPurchase(): partId tidak ditemukan -> TIDAK emit apa pun (guard awal tetap berlaku)', () => {
  const D = { partsStock: [makePart()] };
  const ctx = makeCtx(D);

  ctx.revertStockPurchase('PART_TIDAK_ADA', 5, 'tx1');

  assert.equal(ctx.__aibusEvents.length, 0, 'guard partId tidak ketemu -> 0 emit');
});

test('revertStockPurchase(): qty falsy (0/undefined) -> TIDAK emit apa pun (guard awal tetap berlaku)', () => {
  const D = { partsStock: [makePart()] };
  const ctx = makeCtx(D);

  ctx.revertStockPurchase('part1', 0, 'tx1');

  assert.equal(ctx.__aibusEvents.length, 0);
});

test('applyStockPurchase()/revertStockPurchase(): AIBus tidak ada -> tetap tidak throw (guard konsisten pola lama)', () => {
  const D = { partsStock: [] };
  const ctx = makeCtx(D, { AIBus: undefined });
  const p = makePart();

  assert.doesNotThrow(() => ctx.applyStockPurchase(p, 10, 15000, '2026-08-01', 'tx1'));
  D.partsStock.push(p);
  assert.doesNotThrow(() => ctx.revertStockPurchase('part1', 10, 'tx1'));
  assert.equal(p.qty, 5);
});
