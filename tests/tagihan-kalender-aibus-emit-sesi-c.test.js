'use strict';
// tests/tagihan-kalender-aibus-emit-sesi-c.test.js — Sesi C (lanjutan
// AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md temuan #2): `tagihan-kalender.js`
// — `_saveBillInner()` (dibungkus `saveBill()`) dan `delBill(id)` SEBELUMNYA
// 0% emit AIBus sama sekali (CRUD tagihan penuh berjalan sunyi).
//
// kind:"tagihan" dipakai di payload `finance.updated` yang sama (bukan
// event baru) -- konsisten dgn kind:"transaksi"/"target"/"stok-sparepart"
// di sesi-sesi sebelumnya. `billKind` (field TERPISAH dari `kind` payload)
// menyimpan jenis tagihan (utang/tagihan/cicilan/langganan).
//
// Harness `makeCtx`/`fakeDom` disederhanakan dari tests/
// tagihan-kalender-negative-amt-guard-s403.test.js -- fakeDom minimal +
// implicit-global assignment (curBillType/billEditId/billEditFromArchive),
// load SOURCE ASLI lewat loadSource(), bukan re-implement logic.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function fakeDom(overrides) {
  const els = Object.assign(
    {
      billName: { value: 'Listrik' },
      billAmt: { value: '150000' },
      billDue: { value: '2026-09-01' },
      billShared: { checked: false },
      billSharedPct: { value: '50' },
      billFreq: { value: 'bulanan' },
      billCat: { value: 'Tagihan' },
      billSubCat: null,
      billAcc: { value: 'acc1' },
      billNote: { value: '' },
    },
    overrides,
  );
  return { getElementById: (id) => (id in els ? els[id] : null), _els: els };
}

function makeCtx(D, document, overrides = {}) {
  const aibusEvents = [];
  const ctx = loadSource(
    ['modules/finance/tagihan-kalender.js'],
    {
      D,
      document,
      uid: (() => { let n = 9000; return () => 'newbill_' + (++n); })(),
      sameId: (a, b) => String(a) === String(b),
      toast: () => {},
      save: () => {},
      closeModal: () => {},
      openModal: () => {},
      askConfirm: async () => true,
      renderBillList: () => {},
      renderSettings: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
      checkBills: () => {},
      renderBillHistory: () => {},
      renderBillArchive: () => {},
      renderDebtList: () => {},
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
      ...overrides,
    },
  );
  ctx.curBillType = 'tagihan';
  ctx.billEditId = null;
  ctx.billEditFromArchive = false;
  ctx.__aibusEvents = aibusEvents;
  return ctx;
}

function baseD(overrides = {}) {
  return { bills: [], billsArchive: [], transactions: [], accounts: [{ id: 'acc1' }], debts: [], ...overrides };
}

test('_saveBillInner(): tambah tagihan baru -> emit finance.updated {kind:"tagihan",action:"create",billId,billKind,amount}', () => {
  const D = baseD();
  const ctx = makeCtx(D, fakeDom());

  ctx._saveBillInner();

  assert.equal(D.bills.length, 1, '0 regresi: tagihan tetap tersimpan seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'harus emit finance.updated saat tambah tagihan');
  assert.equal(ev.payload.kind, 'tagihan');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.billId, D.bills[0].id);
  assert.equal(ev.payload.billKind, 'tagihan');
  assert.equal(ev.payload.amount, 150000);
});

test('_saveBillInner(): edit tagihan aktif -> emit finance.updated {kind:"tagihan",action:"edit",billId}', () => {
  const D = baseD({ bills: [{ id: 'b1', name: 'Listrik', amount: 100000, nextDue: '2026-08-01', freq: 'bulanan', kind: 'tagihan' }] });
  const ctx = makeCtx(D, fakeDom({ billAmt: { value: '175000' } }));
  ctx.billEditId = 'b1';

  ctx._saveBillInner();

  assert.equal(D.bills[0].amount, 175000, '0 regresi: field tagihan tetap ter-update seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'harus emit finance.updated saat edit tagihan');
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.billId, 'b1');
});

test('_saveBillInner(): edit tagihan dari arsip (billEditFromArchive) -> emit action "edit-archive"', () => {
  const D = baseD({ billsArchive: [{ id: 'b1', name: 'Listrik', amount: 100000, kind: 'tagihan', completedAt: '2026-08-01' }] });
  const ctx = makeCtx(D, fakeDom({ billDue: { value: '2026-08-05' } }));
  ctx.billEditId = 'b1';
  ctx.billEditFromArchive = true;

  ctx._saveBillInner();

  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'harus emit finance.updated saat edit dari arsip');
  assert.equal(ev.payload.action, 'edit-archive');
  assert.equal(ev.payload.billId, 'b1');
});

test('_saveBillInner(): guard nama/jumlah/tanggal kosong -> TIDAK emit apa pun', () => {
  const D = baseD();
  const ctx = makeCtx(D, fakeDom({ billName: { value: '' } }));

  ctx._saveBillInner();

  assert.equal(D.bills.length, 0);
  assert.equal(ctx.__aibusEvents.length, 0, 'guard gagal -> 0 emit');
});

test('_saveBillInner(): rawAmt negatif -> guard tolak (BUG-FIN-002), TIDAK emit apa pun', () => {
  const D = baseD();
  const ctx = makeCtx(D, fakeDom({ billAmt: { value: '-150000' } }));

  ctx._saveBillInner();

  assert.equal(D.bills.length, 0);
  assert.equal(ctx.__aibusEvents.length, 0);
});

test('delBill(id): hapus tagihan -> emit finance.updated {kind:"tagihan",action:"delete",deletedId,billKind}', async () => {
  const D = baseD({ bills: [{ id: 'b1', name: 'Listrik', amount: 100000, kind: 'tagihan' }] });
  const ctx = makeCtx(D, fakeDom());

  await ctx.delBill('b1');

  assert.equal(D.bills.length, 0, '0 regresi: tagihan tetap terhapus seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'harus emit finance.updated saat hapus tagihan');
  assert.equal(ev.payload.kind, 'tagihan');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.deletedId, 'b1');
  assert.equal(ev.payload.billKind, 'tagihan');
});

test('delBill(id): batal konfirmasi -> TIDAK emit, TIDAK ada mutasi', async () => {
  const D = baseD({ bills: [{ id: 'b1', name: 'Listrik', amount: 100000, kind: 'tagihan' }] });
  const ctx = makeCtx(D, fakeDom(), { askConfirm: async () => false });

  await ctx.delBill('b1');

  assert.equal(D.bills.length, 1);
  assert.equal(ctx.__aibusEvents.length, 0);
});

test('AIBus tidak ada (typeof AIBus==="undefined") -> _saveBillInner()/delBill() tetap tidak throw (guard konsisten pola lama)', async () => {
  const D = baseD({ bills: [{ id: 'b1', name: 'Listrik', amount: 100000, kind: 'tagihan' }] });
  const ctx = makeCtx(D, fakeDom({ billAmt: { value: '99000' } }), { AIBus: undefined });
  ctx.billEditId = 'b1';

  assert.doesNotThrow(() => ctx._saveBillInner());
  assert.equal(D.bills[0].amount, 99000);
  await assert.doesNotReject(() => ctx.delBill('b1'));
  assert.equal(D.bills.length, 0);
});
