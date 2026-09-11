'use strict';
// tests/debt-crud-aibus-emit-sesi-c.test.js — Sesi C (lanjutan #8,
// AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md temuan Prioritas Tinggi #3):
// piutang-utang.js — lanjutan sesi #7 (`Piutang` CRUD). Sesi ini
// mengerjakan pasangannya: `Debt` CRUD (`Debt._saveInner()` dibungkus
// `Debt.save()` via `withSaveGuard`, dan `Debt.delete(id)`) — pola
// PERSIS SAMA dgn sesi #7 (`Piutang`), file yang sama, fungsi terpisah.
//
// BUKAN cakupan sesi ini (tetap di backlog): `Debt.syncBill(d)` (dipanggil
// DARI DALAM `_saveInner()`, membuat/update/hapus tagihan cicilan auto
// terpisah di D.bills) TIDAK dapat emit sendiri sesi ini -- efek sampingnya
// (perubahan tagihan) tercakup implisit lewat emit `_saveInner()` sesi ini,
// tapi kalau ada konsumen yang butuh tahu SPESIFIK "tagihan cicilan
// utang ini berubah" (beda dari "utang ini berubah"), itu emit terpisah
// yang belum diputuskan -- di luar cakupan sesi ini. Fungsi sync cascade
// lain (`syncOutstandingSharedPiutang`, `syncDebtBalanceOnPaymentEdit`,
// `syncSharedPiutangOnPaymentEdit`, `maybeCreateTitipanTalanganPiutang`,
// `maybeCreateTitipanPinjamUtang`, dst) juga masih tetap backlog, sama
// seperti dicatat di sesi #7.
//
// Fix: 2 emit AIBus.emit("finance.updated",{kind:"utang",...}) -- event
// yang sama (finance.updated), kind BARU "utang" (pasangan "piutang" dari
// sesi #7), konsisten dgn kind:"transaksi"/"target"/"stok-sparepart"/
// "tagihan"/"renov"/"piutang" sesi-sesi sebelumnya:
// - Debt._saveInner(): 1 emit setelah Debt.syncBill(d)+save()+closeModal()+
//   Debt.renderList()/renderKekayaanBersih()/hitungZakatMaal()/
//   renderBillList()/checkBills(), SEBELUM toast() final, menutupi jalur
//   create & edit lewat ternary `action:(Debt.editId?"edit":"create")` ->
//   {kind:"utang",action,debtId:d.id,amount:nilai}. Beda dgn
//   Piutang._saveInner() (butuh variabel bantu `_savedPiutangIdSesiC`
//   krn `newP`/`p` block-scoped terpisah), di sini `d` sudah 1 variabel
//   yang sama dipakai di KEDUA cabang if/else (`let d;` di scope fungsi)
//   -- `d.id` langsung bisa dipakai tanpa variabel bantu tambahan.
// - Debt.delete(id): emit setelah save()+Debt.renderList()/
//   renderKekayaanBersih()/hitungZakatMaal()/renderBillList()/
//   checkBills() -> {kind:"utang",action:"delete",deletedId:id,
//   amount:d&&d.nilai}. Guard baris "🔒 Titipan"
//   (linkedAssetId/linkedInvestmentId/linkedAccountId), guard linkedTxId
//   (§5.4), & batal konfirmasi TETAP return lebih awal -> 0 emit, 0
//   mutasi (guard-guard ini tidak disentuh sama sekali).
//
// Harness: pola gabungan tests/bug-del-titipan-debt-guard.test.js
// (delete, expose ['Debt']) + fakeDom minimal (pola sesi #7/Piutang) utk
// _saveInner. 0 logic Debt lain diubah.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(overrides = {}) {
  return Object.assign({
    value: '', checked: false, textContent: '', innerHTML: '', disabled: false,
    style: {}, classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    matches() { return false; },
  }, overrides);
}

function makeFakeDoc(overrideEls = {}) {
  const els = { ...overrideEls };
  const doc = {
    getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; },
    // Debt.renderList() -> DebtStrategy.render() panggil querySelectorAll()
    // utk chip method avalanche/snowball -- di luar cakupan CRUD yang
    // dites di sini, cukup stub kosong biar tidak throw.
    querySelectorAll() { return []; },
  };
  return { doc, els };
}

function makeSaveCtx({ document, D, AIBus, editId = null }) {
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/finance/piutang-utang.js'],
    {
      document, D,
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      uid: (() => { let n = 0; return () => `dbt${++n}`; })(),
      parsePzNum: (s) => parseFloat(String(s).replace(/[^0-9.-]/g, '')) || 0,
      todayStr: () => '2026-09-11',
      save: () => {},
      closeModal: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
      renderBillList: () => {},
      checkBills: () => {},
      askConfirm: async () => true,
      resolveEntryAssetSelfPorsi: () => 100,
      isDebtOwnershipSelf: () => true,
      AIBus,
    },
    ['Debt'],
  );
  ctx.Debt.editId = editId;
  ctx.Debt._lunasState = false;
  ctx.__toastMessages = toastMessages;
  return ctx;
}

function makeDeleteCtx({ D, AIBus }) {
  const ctx = loadSource(
    ['modules/finance/piutang-utang.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      save: () => {},
      sameId: (a, b) => String(a) === String(b),
      askConfirm: async () => true,
      toast: () => {},
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
      renderBillList: () => {},
      checkBills: () => {},
      AIBus,
    },
    ['Debt'],
  );
  return ctx;
}

test('Debt._saveInner(): utang BARU -> emit finance.updated {kind:"utang",action:"create",debtId,amount}', () => {
  const aibusEvents = [];
  const D = { debts: [], bills: [] };
  const { doc } = makeFakeDoc({
    debtName: makeEl({ value: 'Bank X' }),
    debtJenis: makeEl({ value: 'kta' }),
    debtNilai: makeEl({ value: '3000000' }),
    debtBunga: makeEl({ value: '10' }),
    debtCicilan: makeEl({ value: '' }),
    debtTanggal: makeEl({ value: '2026-09-11' }),
  });
  const ctx = makeSaveCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  ctx.Debt._saveInner();

  assert.equal(D.debts.length, 1, '0 regresi: utang tetap tersimpan');
  const ev = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil');
  assert.equal(ev.payload.kind, 'utang');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.debtId, D.debts[0].id);
  assert.equal(ev.payload.amount, 3000000);
});

test('Debt._saveInner(): edit utang lama -> emit action:"edit" dengan debtId sama persis id yang diedit', () => {
  const aibusEvents = [];
  const D = { debts: [{ id: 'd1', name: 'Bank X', nilai: 3000000, lunas: false, bunga: 10, cicilanBulanan: 0 }], bills: [] };
  const { doc } = makeFakeDoc({
    debtName: makeEl({ value: 'Bank X Updated' }),
    debtJenis: makeEl({ value: 'kta' }),
    debtNilai: makeEl({ value: '3500000' }),
    debtBunga: makeEl({ value: '10' }),
    debtCicilan: makeEl({ value: '' }),
    debtTanggal: makeEl({ value: '2026-09-11' }),
  });
  const ctx = makeSaveCtx({ document: doc, D, editId: 'd1', AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  ctx.Debt._saveInner();

  assert.equal(D.debts[0].nilai, 3500000, '0 regresi: nilai utang tetap ter-update');
  const ev = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev);
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.debtId, 'd1');
  assert.equal(ev.payload.amount, 3500000);
});

test('Debt._saveInner(): guard nama kosong -> toast peringatan, 0 emit, 0 mutasi', () => {
  const aibusEvents = [];
  const D = { debts: [], bills: [] };
  const { doc } = makeFakeDoc({ debtName: makeEl({ value: '' }) });
  const ctx = makeSaveCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  ctx.Debt._saveInner();

  assert.equal(D.debts.length, 0);
  assert.equal(aibusEvents.length, 0, 'guard nama kosong -> 0 emit');
  assert.match(ctx.__toastMessages.join(' '), /Nama pemberi pinjaman wajib diisi/);
});

test('Debt._saveInner(): guard nilai<=0 (BUG-FIN-001) -> toast peringatan, 0 emit, 0 mutasi', () => {
  const aibusEvents = [];
  const D = { debts: [], bills: [] };
  const { doc } = makeFakeDoc({
    debtName: makeEl({ value: 'Bank X' }),
    debtNilai: makeEl({ value: '0' }),
  });
  const ctx = makeSaveCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  ctx.Debt._saveInner();

  assert.equal(D.debts.length, 0);
  assert.equal(aibusEvents.length, 0, 'guard nilai<=0 -> 0 emit');
  assert.match(ctx.__toastMessages.join(' '), /Nilai utang harus lebih dari 0/);
});

test('Debt.delete(): utang manual -> emit finance.updated {kind:"utang",action:"delete",deletedId,amount}', async () => {
  const aibusEvents = [];
  const D = { debts: [{ id: 'manual1', name: 'KTA Bank X', nilai: 3000000, lunas: false, bunga: 10, cicilanBulanan: 250000 }], bills: [] };
  const ctx = makeDeleteCtx({ D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  await ctx.Debt.delete('manual1');

  assert.equal(D.debts.length, 0, '0 regresi: utang manual tetap terhapus');
  const ev = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil');
  assert.equal(ev.payload.kind, 'utang');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.deletedId, 'manual1');
  assert.equal(ev.payload.amount, 3000000);
});

test('Debt.delete(): baris titipan (linkedAssetId) DITOLAK guard -> 0 emit, 0 mutasi (guard lama tidak berubah)', async () => {
  const aibusEvents = [];
  const D = { debts: [{ id: 'titipanAset', name: 'Investor A', nilai: 4000000, lunas: false, linkedAssetId: 'a1' }], bills: [] };
  const ctx = makeDeleteCtx({ D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  await ctx.Debt.delete('titipanAset');

  assert.equal(D.debts.length, 1, 'guard: baris titipan tidak boleh terhapus');
  assert.equal(aibusEvents.length, 0, 'guard menolak sebelum proses hapus -> 0 emit');
});

test('Debt.delete(): utang bertaut transaksi arus kas (linkedTxId, §5.4) DITOLAK guard -> 0 emit', async () => {
  const aibusEvents = [];
  const D = { debts: [{ id: 'd1', name: 'Bank X', nilai: 1000000, lunas: false, linkedTxId: 'tx1' }], bills: [] };
  const ctx = makeDeleteCtx({ D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  await ctx.Debt.delete('d1');

  assert.equal(D.debts.length, 1, 'guard linkedTxId: baris tidak boleh terhapus');
  assert.equal(aibusEvents.length, 0);
});

test('Debt.delete(): batal konfirmasi -> 0 emit, 0 mutasi', async () => {
  const aibusEvents = [];
  const D = { debts: [{ id: 'manual1', name: 'KTA Bank X', nilai: 3000000, lunas: false }], bills: [] };
  const ctx = loadSource(
    ['modules/finance/piutang-utang.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      save: () => {},
      sameId: (a, b) => String(a) === String(b),
      askConfirm: async () => false,
      toast: () => {},
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
      renderBillList: () => {},
      checkBills: () => {},
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
    },
    ['Debt'],
  );

  await ctx.Debt.delete('manual1');

  assert.equal(D.debts.length, 1, 'batal konfirmasi -> 0 utang terhapus');
  assert.equal(aibusEvents.length, 0, 'batal konfirmasi -> 0 emit');
});

test('AIBus tidak ada (typeof AIBus==="undefined") -> save & delete tetap tidak throw, mutasi tetap jalan normal', async () => {
  const D1 = { debts: [], bills: [] };
  const { doc: doc1 } = makeFakeDoc({
    debtName: makeEl({ value: 'Bank X' }),
    debtJenis: makeEl({ value: 'kta' }),
    debtNilai: makeEl({ value: '3000000' }),
    debtBunga: makeEl({ value: '10' }),
    debtCicilan: makeEl({ value: '' }),
    debtTanggal: makeEl({ value: '2026-09-11' }),
  });
  const ctx1 = makeSaveCtx({ document: doc1, D: D1, AIBus: undefined });
  assert.doesNotThrow(() => ctx1.Debt._saveInner());
  assert.equal(D1.debts.length, 1);

  const D2 = { debts: [{ id: 'manual1', name: 'KTA Bank X', nilai: 3000000, lunas: false }], bills: [] };
  const ctx2 = makeDeleteCtx({ D: D2, AIBus: undefined });
  await assert.doesNotReject(() => ctx2.Debt.delete('manual1'));
  assert.equal(D2.debts.length, 0);
});
