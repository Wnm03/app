'use strict';
// tests/tx-renov-aibus-emit-sesi-c.test.js — Sesi C (lanjutan #6,
// AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md temuan Prioritas Tinggi #2):
// tx-renov.js — applyTxRenovFromTx()/handleTxRenovBelumDibeli() SEBELUMNYA
// 0% emit AIBus sama sekali.
//
// Fix: 1 emit AIBus.emit("finance.updated",{kind:"renov",...}) di tiap
// fungsi -- event yang sama (finance.updated) dgn `kind` baru ("renov"),
// konsisten dgn kind:"transaksi"/"target"/"stok-sparepart"/"tagihan" dari
// sesi-sesi sebelumnya (bukan event baru).
// - applyTxRenovFromTx() (jalur "✅ Sudah Dibeli", item otomatis ter-link
//   ke transaksi Keuangan yg sudah tersimpan): emit setelah save() + blok
//   Renov.render(), SEBELUM return pesan sukses ->
//   {kind:"renov",action:"link-paid",projectId,itemId,txId,amount}.
//   Early-return (panel nonaktif/status "belum"/proyek belum dipilih) TIDAK
//   emit apa pun (0 mutasi di jalur itu).
// - handleTxRenovBelumDibeli() (jalur "🛒 Belum Dibeli", transaksi Keuangan
//   SENGAJA tidak dicatat): emit setelah save()+closeModal()+renderDashboard()
//   + blok Renov.render(), SEBELUM toast() ->
//   {kind:"renov",action:"belum-dibeli",projectId,itemId,amount}. Guard
//   proyek belum dipilih/amount tidak valid -> TIDAK emit (early-return
//   return false sebelum sampai baris save()).
//
// Harness: load SOURCE ASLI (tx-renov.js) lewat loadSource(), pola sama
// tests/s452-tx-renov-edit-checkbox-restore.test.js (fakeDom minimal utk
// getElementById, karena kedua fungsi ini baca DOM langsung) + stub AIBus
// utk menangkap event. 0 logic Renov lain diubah.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(overrides = {}) {
  return Object.assign({
    value: '', checked: false, textContent: '', innerHTML: '', disabled: false,
    style: {}, classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    options: [],
  }, overrides);
}

function makeFakeDoc(overrideEls = {}) {
  const els = { ...overrideEls };
  const doc = { getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; } };
  return { doc, els };
}

function makeCtx({ document, D, AIBus }) {
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/finance/tx-renov.js'],
    {
      document, D,
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      uid: (() => { let n = 0; return () => `it${++n}`; })(),
      save: () => {},
      closeModal: () => {},
      renderDashboard: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      evalAmtExpr: () => {},
      todayStr: () => '2026-09-11',
      AIBus,
    },
  );
  ctx.__toastMessages = toastMessages;
  return ctx;
}

function baseD(overrides = {}) {
  return Object.assign({
    renovProjects: [{ id: 'p1', name: 'Renov Kamar Mandi', items: [] }],
    transactions: [{ id: 'tx1', renovProjectLinkId: null, renovItemLinkId: null }],
  }, overrides);
}

test('applyTxRenovFromTx(): status "sudah dibeli" -> emit finance.updated {kind:"renov",action:"link-paid",projectId,itemId,txId,amount}', () => {
  const aibusEvents = [];
  const D = baseD();
  const { doc } = makeFakeDoc({
    txAddRenov: makeEl({ checked: true }),
    txRenovPanel: makeEl({ style: { display: 'block' } }),
    txRenovProject: makeEl({ value: 'p1', options: [{ value: 'p1' }] }),
  });
  const ctx = makeCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  const msg = ctx.applyTxRenovFromTx('Beli closet', 'tx1', '2026-09-11', 150000, 'Renov', 'a1');

  assert.match(msg, /otomatis dicatat & lunas/);
  assert.equal(D.renovProjects[0].items.length, 1, '0 regresi: item Renov tetap tercatat');
  const ev = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil');
  assert.equal(ev.payload.kind, 'renov');
  assert.equal(ev.payload.action, 'link-paid');
  assert.equal(ev.payload.projectId, 'p1');
  assert.equal(ev.payload.itemId, 'it1');
  assert.equal(ev.payload.txId, 'tx1');
  assert.equal(ev.payload.amount, 150000);
});

test('applyTxRenovFromTx(): panel tidak dicentang -> 0 emit, 0 mutasi (early-return)', () => {
  const aibusEvents = [];
  const D = baseD();
  const { doc } = makeFakeDoc({ txAddRenov: makeEl({ checked: false }) });
  const ctx = makeCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  const msg = ctx.applyTxRenovFromTx('Beli closet', 'tx1', '2026-09-11', 150000, 'Renov', 'a1');

  assert.equal(msg, undefined);
  assert.equal(D.renovProjects[0].items.length, 0);
  assert.equal(aibusEvents.length, 0, 'panel nonaktif -> 0 emit');
});

test('applyTxRenovFromTx(): status "belum dibeli" -> 0 emit dari fungsi ini (ditangani handleTxRenovBelumDibeli, bukan di sini)', () => {
  const aibusEvents = [];
  const D = baseD();
  const { doc } = makeFakeDoc({
    txAddRenov: makeEl({ checked: true }),
    txRenovPanel: makeEl({ style: { display: 'block' } }),
  });
  const ctx = makeCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });
  ctx.setTxRenovStatus('belum');

  const msg = ctx.applyTxRenovFromTx('Beli closet', 'tx1', '2026-09-11', 150000, 'Renov', 'a1');

  assert.equal(msg, undefined);
  assert.equal(aibusEvents.length, 0);
});

test('applyTxRenovFromTx(): belum pilih proyek -> return pesan peringatan, 0 emit, 0 mutasi', () => {
  const aibusEvents = [];
  const D = baseD({ renovProjects: [] });
  const { doc } = makeFakeDoc({
    txAddRenov: makeEl({ checked: true }),
    txRenovPanel: makeEl({ style: { display: 'block' } }),
    txRenovProject: makeEl({ value: '', options: [] }),
  });
  const ctx = makeCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  const msg = ctx.applyTxRenovFromTx('Beli closet', 'tx1', '2026-09-11', 150000, 'Renov', 'a1');

  assert.match(msg, /Pilih dulu Proyek Renovasi/);
  assert.equal(aibusEvents.length, 0, 'guard proyek kosong -> 0 emit');
});

test('handleTxRenovBelumDibeli(): status "belum dibeli" -> emit finance.updated {kind:"renov",action:"belum-dibeli",projectId,itemId,amount}', () => {
  const aibusEvents = [];
  const D = baseD();
  const { doc } = makeFakeDoc({
    txAddRenov: makeEl({ checked: true }),
    txRenovPanel: makeEl({ style: { display: 'block' } }),
    txRenovProject: makeEl({ value: 'p1', options: [{ value: 'p1' }] }),
    txAmt: makeEl({ value: '200000' }),
    txDate: makeEl({ value: '2026-09-11' }),
    txAcc: makeEl({ value: 'a1' }),
  });
  const ctx = makeCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });
  ctx.setTxRenovStatus('belum');

  const handled = ctx.handleTxRenovBelumDibeli('Beli keramik', 'Renov');

  assert.equal(handled, true);
  assert.equal(D.renovProjects[0].items.length, 1, '0 regresi: item tetap masuk daftar belanja proyek');
  assert.equal(D.renovProjects[0].items[0].paid, false);
  const ev = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil');
  assert.equal(ev.payload.kind, 'renov');
  assert.equal(ev.payload.action, 'belum-dibeli');
  assert.equal(ev.payload.projectId, 'p1');
  assert.equal(ev.payload.itemId, 'it1');
  assert.equal(ev.payload.amount, 200000);
  assert.match(ctx.__toastMessages.join(' '), /belum lunas/);
});

test('handleTxRenovBelumDibeli(): status default "sudah" (panel tidak toggle ke belum) -> return false, 0 emit', () => {
  const aibusEvents = [];
  const D = baseD();
  const { doc } = makeFakeDoc({
    txAddRenov: makeEl({ checked: true }),
    txRenovPanel: makeEl({ style: { display: 'block' } }),
  });
  const ctx = makeCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  const handled = ctx.handleTxRenovBelumDibeli('Beli keramik', 'Renov');

  assert.equal(handled, false);
  assert.equal(aibusEvents.length, 0);
});

test('handleTxRenovBelumDibeli(): belum pilih proyek -> toast peringatan, return false, 0 emit, 0 mutasi', () => {
  const aibusEvents = [];
  const D = baseD({ renovProjects: [] });
  const { doc } = makeFakeDoc({
    txAddRenov: makeEl({ checked: true }),
    txRenovPanel: makeEl({ style: { display: 'block' } }),
    txRenovProject: makeEl({ value: '', options: [] }),
  });
  const ctx = makeCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });
  ctx.setTxRenovStatus('belum');

  const handled = ctx.handleTxRenovBelumDibeli('Beli keramik', 'Renov');

  assert.equal(handled, false);
  assert.equal(aibusEvents.length, 0);
  assert.match(ctx.__toastMessages.join(' '), /Pilih dulu Proyek Renovasi/);
});

test('handleTxRenovBelumDibeli(): jumlah tidak valid (0) -> toast peringatan, return false, 0 emit', () => {
  const aibusEvents = [];
  const D = baseD();
  const { doc } = makeFakeDoc({
    txAddRenov: makeEl({ checked: true }),
    txRenovPanel: makeEl({ style: { display: 'block' } }),
    txRenovProject: makeEl({ value: 'p1', options: [{ value: 'p1' }] }),
    txAmt: makeEl({ value: '0' }),
  });
  const ctx = makeCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });
  ctx.setTxRenovStatus('belum');

  const handled = ctx.handleTxRenovBelumDibeli('Beli keramik', 'Renov');

  assert.equal(handled, false);
  assert.equal(aibusEvents.length, 0);
  assert.match(ctx.__toastMessages.join(' '), /jumlah valid/);
});

test('AIBus tidak ada (typeof AIBus==="undefined") -> kedua fungsi tetap tidak throw, mutasi tetap jalan normal', () => {
  const D1 = baseD();
  const { doc: doc1 } = makeFakeDoc({
    txAddRenov: makeEl({ checked: true }),
    txRenovPanel: makeEl({ style: { display: 'block' } }),
    txRenovProject: makeEl({ value: 'p1', options: [{ value: 'p1' }] }),
  });
  const ctx1 = makeCtx({ document: doc1, D: D1, AIBus: undefined });
  assert.doesNotThrow(() => ctx1.applyTxRenovFromTx('Beli closet', 'tx1', '2026-09-11', 150000, 'Renov', 'a1'));
  assert.equal(D1.renovProjects[0].items.length, 1);

  const D2 = baseD();
  const { doc: doc2 } = makeFakeDoc({
    txAddRenov: makeEl({ checked: true }),
    txRenovPanel: makeEl({ style: { display: 'block' } }),
    txRenovProject: makeEl({ value: 'p1', options: [{ value: 'p1' }] }),
    txAmt: makeEl({ value: '200000' }),
    txDate: makeEl({ value: '2026-09-11' }),
    txAcc: makeEl({ value: 'a1' }),
  });
  const ctx2 = makeCtx({ document: doc2, D: D2, AIBus: undefined });
  ctx2.setTxRenovStatus('belum');
  assert.doesNotThrow(() => ctx2.handleTxRenovBelumDibeli('Beli keramik', 'Renov'));
  assert.equal(D2.renovProjects[0].items.length, 1);
});
