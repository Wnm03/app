'use strict';
// tests/tx-transfer-savetransfer-aibus-emit-sesi-c.test.js — Sesi C
// (lanjutan AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md temuan #2):
// saveTransfer() (modules/finance/tx-transfer.js) SEBELUMNYA 0% emit AIBus
// sama sekali -- beda dari saveTx()/_saveTxInner() (transaksi-b.js) yang
// sudah emit `finance.updated` per-kind saat create/edit transaksi umum.
//
// Fix: 1 baris emit `AIBus.emit("finance.updated",{kind:"transaksi",
// action:"create",transferPairId,fromAccountId,toAccountId,amount})` --
// pola payload konsisten dgn delTx() (sesi sebelumnya, event yg sama),
// tapi pakai `transferPairId` (bukan `deletedId`) krn transfer selalu
// berpasangan (2 baris D.transactions), bukan 1 baris tunggal. 0 logic
// transfer lain diubah.
//
// Harness `makeCtx` diambil (disederhanakan) dari tests/
// tx-transfer-audit-s432.test.js -- load SOURCE ASLI (tx-transfer.js)
// lewat loadSource(), pakai DOM tiruan stateful yg sama, bukan
// re-implement logic saveTransfer() di test ini.

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

function makeCtx(D, dom, overrides = {}) {
  const toastMessages = [];
  const aibusEvents = [];
  let uidCounter = 0;
  const ctx = loadSource(
    ['modules/finance/tx-transfer.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      uid: () => 'id_' + (uidCounter++),
      save: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      openModal: () => {},
      closeModal: () => {},
      evalAmtExpr: () => {},
      populateAccFilters: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
      ...overrides,
    },
    [],
  );
  ctx.toastMessages = toastMessages;
  ctx.__aibusEvents = aibusEvents;
  return ctx;
}

function makeD(accounts) {
  return { accounts, transactions: [] };
}

test('saveTransfer(): sukses -> emit AIBus finance.updated {kind:"transaksi",action:"create",transferPairId,fromAccountId,toAccountId,amount}', () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 100000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  const dom = makeStatefulDom({ trFrom: 'a1', trTo: 'a2', trAmt: '75000', trNote: 'Setor tabungan', trDate: '2026-08-07' });
  const ctx = makeCtx(D, dom);

  ctx.saveTransfer();

  assert.equal(D.transactions.length, 2, '0 regresi: tetap 2 baris transaksi berpasangan seperti sebelumnya');
  const out = D.transactions.find((t) => t.type === 'transfer_out');

  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil saat transfer sukses');
  assert.equal(ev.payload.kind, 'transaksi');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.transferPairId, out.transferPairId);
  assert.equal(ev.payload.fromAccountId, 'a1');
  assert.equal(ev.payload.toAccountId, 'a2');
  assert.equal(ev.payload.amount, 75000);
});

test('saveTransfer(): akun asal/tujuan tidak valid -> guard toast, TIDAK emit apa pun', () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 100000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  const dom = makeStatefulDom({ trFrom: 'a1', trTo: 'AKUN_TIDAK_ADA', trAmt: '50000', trNote: '', trDate: '2026-08-07' });
  const ctx = makeCtx(D, dom);

  ctx.saveTransfer();

  assert.equal(D.transactions.length, 0, 'tidak boleh ada transaksi tersimpan kalau akun invalid');
  assert.equal(ctx.__aibusEvents.length, 0, 'guard gagal -> 0 emit');
});

test('saveTransfer(): jumlah tidak valid (0/kosong) -> guard toast, TIDAK emit apa pun', () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 100000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  const dom = makeStatefulDom({ trFrom: 'a1', trTo: 'a2', trAmt: '0', trNote: '', trDate: '2026-08-07' });
  const ctx = makeCtx(D, dom);

  ctx.saveTransfer();

  assert.equal(D.transactions.length, 0);
  assert.equal(ctx.__aibusEvents.length, 0);
});

test('saveTransfer(): AIBus tidak ada (typeof AIBus==="undefined") -> tetap tidak throw, transfer tetap tersimpan (guard konsisten pola lama)', () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵', baseBalance: 100000 },
    { id: 'a2', name: 'Bank', emoji: '🏦', baseBalance: 500000 },
  ]);
  const dom = makeStatefulDom({ trFrom: 'a1', trTo: 'a2', trAmt: '25000', trNote: '', trDate: '2026-08-07' });
  const ctx = makeCtx(D, dom, { AIBus: undefined });

  assert.doesNotThrow(() => ctx.saveTransfer());
  assert.equal(D.transactions.length, 2, 'transfer tetap berjalan normal walau AIBus tidak ada');
});
