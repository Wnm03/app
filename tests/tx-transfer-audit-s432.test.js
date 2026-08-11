'use strict';
// tests/tx-transfer-audit-s432.test.js — Sesi 432: audit fitur "⇄ Transfer
// Antar Akun" (modules/finance/tx-transfer.js + delTx() di
// modules/finance/tx-list-cashflow.js). Lihat
// FIX-v1145-to-v1146-s432-audit-fitur-transfer.md utk detail temuan &
// perbaikan. Ringkas:
//   1. BUG KRITIS (fixed): delTx() cuma hapus 1 baris transaksi -- 2 kaki
//      transfer (transfer_out/transfer_in) sebelumnya TIDAK tertaut sama
//      sekali, jadi hapus 1 kaki bikin kaki satunya orphan & saldo akun
//      pincang permanen. Fix: `transferPairId` (baru) + delTx() hapus
//      pasangannya sekaligus.
//   2. BUG (fixed): saveTransfer() akses `.name` tanpa cek fromAcc/toAcc
//      ada -- kalau id akun tidak valid, crash (TypeError) tanpa pesan
//      jelas. Fix: guard eksplisit + toast.
//   3. UX (fixed): openTransferModal() bisa dibuka dgn <2 akun, error baru
//      kelihatan setelah user isi form. Fix: guard di awal + toast.
//   4. Minor (fixed): note isi spasi kosong lolos jadi note (bukan
//      fallback 'Transfer') krn '   '||'Transfer' tetap truthy. Fix:
//      .trim() dulu sebelum fallback.
//
// Pola DOM tiruan STATEFUL sama persis
// tests/asset-owners-nominal-sync-s429.test.js, harness `makeCtx` load
// SOURCE ASLI (tx-transfer.js, tx-list-cashflow.js, akun.js) lewat
// loadSource() -- bukan re-implement logic di test.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom(values) {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: values[id] !== undefined ? values[id] : '', textContent: '', innerHTML: '',
      className: '', placeholder: '', disabled: false, style: {}, selectedIndex: 0,
      classList: {
        _set: new Set(),
        toggle(cls, force) { const on = force !== undefined ? force : !this._set.has(cls); if (on) this._set.add(cls); else this._set.delete(cls); return on; },
        contains(cls) { return this._set.has(cls); },
        add(cls) { this._set.add(cls); },
        remove(cls) { this._set.delete(cls); },
      },
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeCtx(D, dom) {
  const toastMessages = [];
  const modalCalls = [];
  let uidCounter = 0;
  const ctx = loadSource(
    ['modules/finance/tx-transfer.js', 'modules/finance/tx-list-cashflow.js', 'modules/finance/akun.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      openModal: (name) => { modalCalls.push(name); },
      closeModal: () => {},
      uid: () => 'id_' + (uidCounter++),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      evalAmtExpr: () => {},
      askConfirm: async () => true,
      populateKeuFilters: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
      renderCnTab: () => {},
      renderProductList: () => {},
      renderStockList: () => {},
      renderShop: () => {},
      renderShopRecent: () => {},
      getAllCats: () => [],
      fmt: (n) => 'Rp ' + Math.round(n || 0),
    },
    [],
  );
  ctx.toastMessages = toastMessages;
  ctx.modalCalls = modalCalls;
  return ctx;
}

function makeD(accounts) {
  return { accounts, transactions: [], products: [], cobek: [] };
}

test('openTransferModal(): <2 akun -> ditolak dgn toast, modal TIDAK dibuka', () => {
  const D = makeD([{ id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 100000 }]);
  const dom = makeStatefulDom({});
  const ctx = makeCtx(D, dom);
  ctx.openTransferModal();
  assert.equal(ctx.modalCalls.length, 0, 'modal transfer tidak boleh terbuka kalau akun < 2');
  assert.match(ctx.toastMessages.join(' '), /minimal 2 akun/i);
});

test('openTransferModal(): >=2 akun -> modal terbuka normal', () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 100000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  const dom = makeStatefulDom({});
  const ctx = makeCtx(D, dom);
  ctx.openTransferModal();
  assert.deepEqual(ctx.modalCalls, ['transferModal']);
});

test('saveTransfer(): akun asal/tujuan tidak valid -> guard toast, TIDAK crash, TIDAK ada transaksi baru', () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 100000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  const dom = makeStatefulDom({ trFrom: 'a1', trTo: 'AKUN_TIDAK_ADA', trAmt: '50000', trNote: '', trDate: '2026-08-07' });
  const ctx = makeCtx(D, dom);
  assert.doesNotThrow(() => ctx.saveTransfer(), 'saveTransfer TIDAK boleh throw walau akun tujuan invalid');
  assert.equal(D.transactions.length, 0, 'tidak boleh ada transaksi tersimpan kalau akun invalid');
  assert.match(ctx.toastMessages.join(' '), /tidak valid/i);
});

test('saveTransfer(): sukses -> 2 baris transaksi berpasangan (transferPairId sama), amount & accountId benar', () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 100000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  const dom = makeStatefulDom({ trFrom: 'a1', trTo: 'a2', trAmt: '75000', trNote: 'Setor tabungan', trDate: '2026-08-07' });
  const ctx = makeCtx(D, dom);
  ctx.saveTransfer();
  assert.equal(D.transactions.length, 2, 'harus ada persis 2 baris transaksi (out & in)');
  const out = D.transactions.find((t) => t.type === 'transfer_out');
  const inn = D.transactions.find((t) => t.type === 'transfer_in');
  assert.ok(out && inn, 'harus ada 1 transfer_out & 1 transfer_in');
  assert.equal(out.accountId, 'a1');
  assert.equal(inn.accountId, 'a2');
  assert.equal(out.amount, 75000);
  assert.equal(inn.amount, 75000);
  assert.ok(out.transferPairId, 'transfer_out harus punya transferPairId');
  assert.equal(out.transferPairId, inn.transferPairId, 'transferPairId kedua baris harus SAMA (menandai 1 pasang)');
  assert.notEqual(out.id, inn.id, 'id kedua baris harus BEDA');
});

test('saveTransfer(): note kosong/spasi -> fallback "Transfer" (bukan spasi kosong)', () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 100000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  const dom = makeStatefulDom({ trFrom: 'a1', trTo: 'a2', trAmt: '10000', trNote: '   ', trDate: '2026-08-07' });
  const ctx = makeCtx(D, dom);
  ctx.saveTransfer();
  const out = D.transactions.find((t) => t.type === 'transfer_out');
  assert.match(out.note, /^Transfer/, 'note harus fallback ke "Transfer", bukan spasi kosong');
});

test('saveTransfer() + recalcAccBalance(): saldo akun asal berkurang & tujuan bertambah persis sebesar nominal transfer', () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 200000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  const dom = makeStatefulDom({ trFrom: 'a1', trTo: 'a2', trAmt: '80000', trNote: '', trDate: '2026-08-07' });
  const ctx = makeCtx(D, dom);
  ctx.saveTransfer();
  ctx.invalidateAccBalCache();
  assert.equal(ctx.recalcAccBalance('a1'), 120000, 'saldo akun asal harus berkurang 80000 (200000-80000)');
  assert.equal(ctx.recalcAccBalance('a2'), 580000, 'saldo akun tujuan harus bertambah 80000 (500000+80000)');
});

test('delTx(): hapus salah satu kaki transfer BARU (punya transferPairId) -> KEDUA kaki ikut terhapus', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 200000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  const dom = makeStatefulDom({ trFrom: 'a1', trTo: 'a2', trAmt: '80000', trNote: '', trDate: '2026-08-07' });
  const ctx = makeCtx(D, dom);
  ctx.saveTransfer();
  assert.equal(D.transactions.length, 2);
  const out = D.transactions.find((t) => t.type === 'transfer_out');
  await ctx.delTx(out.id);
  assert.equal(D.transactions.length, 0, 'KEDUA kaki transfer harus terhapus, bukan cuma yang diklik (fix bug orphan-leg)');
  assert.match(ctx.toastMessages.join(' '), /2 sisi/i);
});

test('delTx(): transfer LEGACY tanpa transferPairId -> hapus 1 sisi saja (backward compat, TIDAK crash)', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 200000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  D.transactions = [
    { id: 't1', type: 'transfer_out', amount: 50000, category: 'Transfer', note: 'Transfer lama', date: '2026-01-01', accountId: 'a1' },
    { id: 't2', type: 'transfer_in', amount: 50000, category: 'Transfer', note: 'Transfer lama', date: '2026-01-01', accountId: 'a2' },
  ];
  const dom = makeStatefulDom({});
  const ctx = makeCtx(D, dom);
  await ctx.delTx('t1');
  assert.equal(D.transactions.length, 1, 'transfer legacy (tanpa transferPairId) tetap hapus 1 sisi saja, 0 regresi utk data lama');
  assert.equal(D.transactions[0].id, 't2');
});

test('delTx(): transaksi biasa (bukan transfer) -> perilaku lama tidak berubah', async () => {
  const D = makeD([{ id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 200000 }]);
  D.transactions = [{ id: 'x1', type: 'expense', amount: 20000, category: 'Makan', date: '2026-08-07', accountId: 'a1' }];
  const dom = makeStatefulDom({});
  const ctx = makeCtx(D, dom);
  await ctx.delTx('x1');
  assert.equal(D.transactions.length, 0);
});
