'use strict';
// tests/tx-bbm-finance-integration.test.js — cakupan TASK-152 (Fuel Finance
// Integration). Fokus SEMPIT: BBM._saveInner (car-notes.js, modal "Catat
// Isi BBM") + recordBbmLog (modules/finance/tx-bbm.js) — jalur SATU-nya
// tempat fuel transaction disimpan lewat Car Notes (beda dari jalur form
// Transaksi umum + centang "Sinkron BBM" yang sudah dites lewat
// applyTxBbmFromTx/transaksi.js sendiri, di luar scope file ini).
//
// Yang dites di sini (regression suite TASK-152, lihat task spec):
//  - Single fuel transaction: 1x simpan -> persis 1 D.transactions + 1
//    D.bbmLogs, saling terhubung txLinkId/bbmLinkId (Do NOT create a
//    second fuel transaction).
//  - Multiple fuel transactions: 2x simpan (catatan baru) -> 2 transaksi,
//    2 log BBM, tidak ada yang bertukar/duplikat silang.
//  - Finance edit (edit catatan BBM existing) -> transaksi LAMA di-update
//    di tempat (Object.assign), TIDAK menambah baris baru di D.transactions
//    (Duplicate prevention / Do NOT duplicate finance history).
//  - AI Daily Brief refresh / Dashboard refresh: renderCnTab()/
//    renderDashboard()/renderKeuangan() (sudah ada sebelumnya) tetap
//    terpanggil tiap simpan sukses -- inilah yang membuat Fuel Dashboard
//    (FuelCard, dipanggil dari renderCnTab)/AI Daily Briefing
//    (VehicleDailyBrief, TASK-151B, juga dipanggil dari renderCnTab)
//    ter-refresh tanpa reload halaman.
//  - GAP yang ditutup TASK-152: sebelum sesi ini, jalur BBM._saveInner
//    TIDAK PERNAH memancarkan AIBus "finance.updated" (beda dari
//    _saveTxInner() di transaksi.js yang SUDAH emit event itu tiap
//    transaksi tersimpan) -- padahal keduanya sama-sama "fuel transaction
//    tersimpan". Sekarang keduanya konsisten memancarkan event yang sama
//    (payload {txId,category,type,amount,kind}), supaya AIDecision/
//    AIService (modules/ai/ai-service.js wireEvents(), SUDAH ADA, TIDAK
//    disentuh sesi ini) selalu tahu ada transaksi baru terlepas dari
//    kendaraan disimpan lewat form mana.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(values) {
  const els = {};
  Object.keys(values).forEach((id) => {
    const v = values[id];
    els[id] = (typeof v === 'boolean') ? { checked: v } : { value: v };
  });
  return {
    doc: { getElementById: (id) => els[id] || null },
    els,
  };
}

function makeCtx({ document, D, curVehicleId, calls, aibusEvents } = {}) {
  return loadSource(
    ['modules/finance/tx-bbm.js', 'car-notes.js'],
    {
      document,
      D,
      curVehicleId,
      uid: (() => { let n = 1000; return () => (n += 1); })(),
      escapeHtml: (s) => String(s),
      resolveVehicleTxCategory: () => 'Transportasi',
      save: () => calls.push('save'),
      closeModal: (id) => calls.push('closeModal:' + id),
      toast: (msg) => calls.push('toast:' + msg),
      renderCnTab: () => calls.push('renderCnTab'),
      renderDashboard: () => calls.push('renderDashboard'),
      renderKeuangan: () => calls.push('renderKeuangan'),
      askConfirm: async () => true,
      withSaveGuard: (key, modalId, fn) => fn(),
      AIBus: { emit: (evt, payload) => aibusEvents.push({ evt, payload }) },
    },
    ['BBM'],
  );
}

function baseD() {
  return {
    vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }],
    accounts: [{ id: 'a1', name: 'Cash' }],
    bbmLogs: [],
    transactions: [],
  };
}

function baseFields(overrides = {}) {
  return Object.assign({
    bbmKm: '10000',
    bbmLiter: '5',
    bbmCost: '50000',
    bbmHarga: '10000',
    bbmSpbu: 'Pertamina',
    bbmFull: true,
    bbmDate: '2026-07-22',
    bbmNote: '',
    bbmAcc: 'a1',
  }, overrides);
}

test('single fuel transaction — 1x simpan -> tepat 1 transaksi + 1 log BBM, saling terhubung', () => {
  const D = baseD();
  const calls = [];
  const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls, aibusEvents });

  ctx.BBM.editId = null;
  ctx.BBM._saveInner();

  assert.equal(D.transactions.length, 1, 'tidak boleh ada transaksi ganda');
  assert.equal(D.bbmLogs.length, 1, 'tidak boleh ada log BBM ganda');
  const tx = D.transactions[0];
  const log = D.bbmLogs[0];
  assert.equal(tx.bbmLinkId, log.id);
  assert.equal(log.txLinkId, tx.id);
  assert.equal(tx.amount, 50000);
  assert.equal(tx.type, 'expense');
});

test('multiple fuel transactions — 2x simpan catatan baru -> 2 transaksi + 2 log BBM, tidak silang', () => {
  const D = baseD();
  const calls = [];
  const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls, aibusEvents });

  ctx.BBM.editId = null;
  ctx.BBM._saveInner();
  ctx.BBM.editId = null;
  ctx.BBM._saveInner();

  assert.equal(D.transactions.length, 2);
  assert.equal(D.bbmLogs.length, 2);
  assert.notEqual(D.transactions[0].id, D.transactions[1].id);
  assert.equal(D.transactions[0].bbmLinkId, D.bbmLogs[0].id);
  assert.equal(D.transactions[1].bbmLinkId, D.bbmLogs[1].id);
});

test('finance edit — edit catatan BBM existing TIDAK menambah baris transaksi baru (duplicate prevention)', () => {
  const D = baseD();
  const calls = [];
  const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls, aibusEvents });

  ctx.BBM.editId = null;
  ctx.BBM._saveInner();
  assert.equal(D.transactions.length, 1);
  const savedLogId = D.bbmLogs[0].id;
  const savedTxId = D.transactions[0].id;

  // Edit log yang sama dgn jumlah baru.
  const { doc: doc2 } = makeFakeDoc(baseFields({ bbmCost: '75000', bbmHarga: '15000' }));
  const ctx2 = makeCtx({ document: doc2, D, curVehicleId: 'v1', calls, aibusEvents });
  ctx2.BBM.editId = savedLogId;
  ctx2.BBM._saveInner();

  assert.equal(D.transactions.length, 1, 'edit tidak boleh menambah transaksi baru');
  assert.equal(D.bbmLogs.length, 1, 'edit tidak boleh menambah log BBM baru');
  assert.equal(D.transactions[0].id, savedTxId, 'transaksi yang sama harus di-update di tempat');
  assert.equal(D.transactions[0].amount, 75000);
});

test('dashboard/AI daily brief refresh — renderCnTab/renderDashboard/renderKeuangan terpanggil tiap simpan sukses', () => {
  const D = baseD();
  const calls = [];
  const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls, aibusEvents });

  ctx.BBM.editId = null;
  ctx.BBM._saveInner();

  assert.ok(calls.includes('renderCnTab'), 'Fuel Dashboard/Fuel Card & AI Daily Brief (VehicleDailyBrief) direfresh via renderCnTab()');
  assert.ok(calls.includes('renderDashboard'));
  assert.ok(calls.includes('renderKeuangan'));
});

test('TASK-152: BBM._saveInner memancarkan AIBus "finance.updated" (gap yang ditutup sesi ini)', () => {
  const D = baseD();
  const calls = [];
  const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls, aibusEvents });

  ctx.BBM.editId = null;
  ctx.BBM._saveInner();

  assert.equal(aibusEvents.length, 1);
  assert.equal(aibusEvents[0].evt, 'finance.updated');
  assert.equal(aibusEvents[0].payload.amount, 50000);
  assert.equal(aibusEvents[0].payload.type, 'expense');
  assert.equal(aibusEvents[0].payload.kind, 'bbm');
  assert.equal(aibusEvents[0].payload.txId, D.transactions[0].id);
});

test('TASK-152: 2x simpan -> AIBus "finance.updated" terpanggil 2x, tidak digabung/di-debounce', () => {
  const D = baseD();
  const calls = [];
  const aibusEvents = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = makeCtx({ document: doc, D, curVehicleId: 'v1', calls, aibusEvents });

  ctx.BBM.editId = null;
  ctx.BBM._saveInner();
  ctx.BBM.editId = null;
  ctx.BBM._saveInner();

  assert.equal(aibusEvents.length, 2);
  assert.equal(aibusEvents[0].payload.txId, D.transactions[0].id);
  assert.equal(aibusEvents[1].payload.txId, D.transactions[1].id);
});

test('AIBus belum dimuat -> BBM._saveInner tetap jalan normal (guard typeof, tidak throw)', () => {
  const D = baseD();
  const calls = [];
  const { doc } = makeFakeDoc(baseFields());
  const ctx = loadSource(
    ['modules/finance/tx-bbm.js', 'car-notes.js'],
    {
      document: doc,
      D,
      curVehicleId: 'v1',
      uid: (() => { let n = 2000; return () => (n += 1); })(),
      escapeHtml: (s) => String(s),
      resolveVehicleTxCategory: () => 'Transportasi',
      save: () => calls.push('save'),
      closeModal: () => calls.push('closeModal'),
      toast: () => calls.push('toast'),
      renderCnTab: () => calls.push('renderCnTab'),
      renderDashboard: () => calls.push('renderDashboard'),
      renderKeuangan: () => calls.push('renderKeuangan'),
      // AIBus SENGAJA tidak disediakan.
    },
    ['BBM'],
  );

  ctx.BBM.editId = null;
  assert.doesNotThrow(() => ctx.BBM._saveInner());
  assert.equal(D.transactions.length, 1);
});
