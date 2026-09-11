'use strict';
// tests/tx-list-cashflow-deltx-aibus-emit-sesi-c.test.js — Sesi C
// (lanjutan AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md temuan #2):
// delTx() (modules/finance/tx-list-cashflow.js) SEBELUMNYA 0% emit AIBus
// sama sekali -- beda dari saveTx()/_saveTxInner() (transaksi-b.js) yang
// sudah emit `finance.updated` per-kind saat create/edit. Cascade besar di
// delTx() (transfer pair, titipan talangan/pinjam, tagihan, investasi, dst)
// berjalan sunyi tanpa event apa pun.
//
// Fix: 1 baris emit `AIBus.emit("finance.updated",{kind:"transaksi",
// action:"delete",deletedId,category,type})` -- pola payload SAMA PERSIS
// dgn delVehicle() (modules/vehicle/vehicle-core.js, Sesi C sebelumnya):
// {kind,action:"delete",deletedId}. 0 cascade baru, 0 logic lain diubah.
//
// Harness `makeCtx` load SOURCE ASLI (tx-list-cashflow.js) lewat
// loadSource() -- pola sama tests/tx-transfer-audit-s432.test.js -- bukan
// re-implement logic delTx() di test ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, overrides = {}) {
  const toastMessages = [];
  const aibusEvents = [];
  const ctx = loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      askConfirm: async () => true,
      renderDashboard: () => {},
      renderKeuangan: () => {},
      renderCnTab: () => {},
      renderProductList: () => {},
      renderStockList: () => {},
      renderShop: () => {},
      populateKeuFilters: () => {},
      getAllCats: () => [],
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
      ...overrides,
    },
    [],
  );
  ctx.toastMessages = toastMessages;
  ctx.__aibusEvents = aibusEvents;
  return ctx;
}

function makeD(transactions) {
  return { transactions, accounts: [], products: [], cobek: [] };
}

test('delTx(): hapus transaksi umum -> emit AIBus finance.updated {kind:"transaksi",action:"delete",deletedId}', async () => {
  const D = makeD([
    { id: 'tx1', type: 'expense', category: 'makan', amount: 15000 },
    { id: 'tx2', type: 'income', category: 'gaji', amount: 500000 },
  ]);
  const ctx = makeCtx(D);

  await ctx.delTx('tx1');

  assert.equal(D.transactions.length, 1, '0 regresi: transaksi tetap terhapus seperti sebelumnya');
  assert.equal(D.transactions[0].id, 'tx2');

  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil saat hapus transaksi');
  assert.equal(ev.payload.kind, 'transaksi');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.deletedId, 'tx1');
  assert.equal(ev.payload.category, 'makan');
  assert.equal(ev.payload.type, 'expense');
});

test('delTx(): item virtual tagihan (prefix vbill_) -> TIDAK emit apa pun (guard baris pertama tetap berlaku)', async () => {
  const D = makeD([{ id: 'tx1', type: 'expense', category: 'makan', amount: 15000 }]);
  const ctx = makeCtx(D);

  await ctx.delTx('vbill_abc123');

  assert.equal(D.transactions.length, 1, 'transaksi asli tidak boleh ikut terhapus');
  assert.equal(ctx.__aibusEvents.length, 0, 'guard vbill_ harus return sebelum emit apa pun');
  assert.match(ctx.toastMessages.join(' '), /belum dibayar/i);
});

test('delTx(): batal konfirmasi (askConfirm=false) -> TIDAK emit, TIDAK ada mutasi', async () => {
  const D = makeD([{ id: 'tx1', type: 'expense', category: 'makan', amount: 15000 }]);
  const ctx = makeCtx(D, { askConfirm: async () => false });

  await ctx.delTx('tx1');

  assert.equal(D.transactions.length, 1, 'batal konfirmasi -> 0 transaksi terhapus');
  assert.equal(ctx.__aibusEvents.length, 0, 'batal konfirmasi -> 0 emit');
});

test('delTx(): AIBus tidak ada (typeof AIBus==="undefined") -> tetap tidak throw (guard konsisten pola lama)', async () => {
  const D = makeD([{ id: 'tx1', type: 'expense', category: 'makan', amount: 15000 }]);
  const ctx = makeCtx(D, { AIBus: undefined });

  await assert.doesNotReject(() => ctx.delTx('tx1'));
  assert.equal(D.transactions.length, 0, 'penghapusan tetap berjalan normal walau AIBus tidak ada');
});
