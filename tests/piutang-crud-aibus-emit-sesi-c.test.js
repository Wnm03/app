'use strict';
// tests/piutang-crud-aibus-emit-sesi-c.test.js — Sesi C (lanjutan #7,
// AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md temuan Prioritas Tinggi #3):
// piutang-utang.js — SELURUH file 0% emit AIBus. Sesi ini SENGAJA
// dipersempit ke CRUD `Piutang` saja (`Piutang._saveInner()` dibungkus
// `Piutang.save()` via `withSaveGuard`, dan `Piutang.delete(id)`) --
// pola paling analog dgn `tagihan-kalender.js` (_saveBillInner/delBill)
// sesi sebelumnya, risiko paling rendah dari sisa domain ini.
//
// BUKAN cakupan sesi ini (tetap di backlog): `Debt._saveInner()`/
// `Debt.delete()` (CRUD Utang, file yang sama, fungsi terpisah), dan
// fungsi-fungsi sync cascade (`syncOutstandingSharedPiutang`,
// `syncDebtBalanceOnPaymentEdit`, `syncSharedPiutangOnPaymentEdit`,
// `maybeCreateTitipanTalanganPiutang`, `maybeCreateTitipanPinjamUtang`,
// dst) -- masing-masing butuh keputusan payload sendiri (cascade dana
// titipan/tagihan), di luar cakupan 1 sesi ini.
//
// Fix: 2 emit AIBus.emit("finance.updated",{kind:"piutang",...}) --
// event yang sama (finance.updated), kind BARU "piutang", konsisten dgn
// kind:"transaksi"/"target"/"stok-sparepart"/"tagihan"/"renov" sesi-sesi
// sebelumnya (bukan event baru):
// - Piutang._saveInner(): 1 emit setelah save()+closeModal()+
//   Piutang.renderList()/renderKekayaanBersih()/hitungZakatMaal(),
//   SEBELUM toast() final, menutupi jalur create & edit lewat ternary
//   `action:(Piutang.editId?"edit":"create")` ->
//   {kind:"piutang",action,piutangId,amount:nilai}. `piutangId` utk
//   jalur create diambil dari id baru yg di-generate (`newP.id`) lewat
//   variabel lokal `_savedPiutangIdSesiC`, pola sama persis
//   `_newBillIdSesiC` di tagihan-kalender.js sesi sebelumnya.
// - Piutang.delete(id): emit setelah save()+Piutang.renderList()/
//   renderKekayaanBersih()/hitungZakatMaal() ->
//   {kind:"piutang",action:"delete",deletedId:id,amount:p&&p.nilai}.
//   Guard piutang otomatis (autoBillId/autoTxId/autoTitipanOwnerId/
//   linkedTxId) & batal konfirmasi TETAP return lebih awal -> 0 emit,
//   0 mutasi (sama seperti sebelumnya, guard ini tidak disentuh).
//
// Harness: load SOURCE ASLI (piutang-utang.js) lewat loadSource(), pola
// gabungan tests/bug-del-titipan-piutang-guard.test.js (delete, expose
// ['Piutang']) + fakeDom minimal (pola s452/tx-renov) utk form
// _saveInner. 0 logic Piutang lain diubah.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(overrides = {}) {
  return Object.assign({
    value: '', checked: false, textContent: '', innerHTML: '', disabled: false,
    style: {}, classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
  }, overrides);
}

function makeFakeDoc(overrideEls = {}) {
  const els = { ...overrideEls };
  const doc = { getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; } };
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
      uid: (() => { let n = 0; return () => `piu${++n}`; })(),
      parsePzNum: (s) => parseFloat(String(s).replace(/[^0-9.-]/g, '')) || 0,
      todayStr: () => '2026-09-11',
      save: () => {},
      closeModal: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
      askConfirm: async () => true,
      resolveEntryAssetSelfPorsi: () => 100,
      isPiutangOwnershipSelf: () => true,
      AIBus,
    },
    ['Piutang'],
  );
  ctx.Piutang.editId = editId;
  ctx.Piutang._lunasState = false;
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
      AIBus,
    },
    ['Piutang'],
  );
  return ctx;
}

test('Piutang._saveInner(): piutang BARU -> emit finance.updated {kind:"piutang",action:"create",piutangId,amount}', () => {
  const aibusEvents = [];
  const D = { piutang: [] };
  const { doc } = makeFakeDoc({
    piutangName: makeEl({ value: 'Budi' }),
    piutangNilai: makeEl({ value: '500000' }),
    piutangTanggal: makeEl({ value: '2026-09-11' }),
  });
  const ctx = makeSaveCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  ctx.Piutang._saveInner();

  assert.equal(D.piutang.length, 1, '0 regresi: piutang tetap tersimpan');
  const ev = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil');
  assert.equal(ev.payload.kind, 'piutang');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.piutangId, D.piutang[0].id);
  assert.equal(ev.payload.amount, 500000);
});

test('Piutang._saveInner(): edit piutang lama -> emit action:"edit" dengan piutangId sama persis id yang diedit', () => {
  const aibusEvents = [];
  const D = { piutang: [{ id: 'p1', name: 'Budi', nilai: 300000, lunas: false }] };
  const { doc } = makeFakeDoc({
    piutangName: makeEl({ value: 'Budi Santoso' }),
    piutangNilai: makeEl({ value: '450000' }),
    piutangTanggal: makeEl({ value: '2026-09-11' }),
  });
  const ctx = makeSaveCtx({ document: doc, D, editId: 'p1', AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  ctx.Piutang._saveInner();

  assert.equal(D.piutang[0].nilai, 450000, '0 regresi: nilai piutang tetap ter-update');
  const ev = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev);
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.piutangId, 'p1');
  assert.equal(ev.payload.amount, 450000);
});

test('Piutang._saveInner(): guard nama kosong -> toast peringatan, 0 emit, 0 mutasi', () => {
  const aibusEvents = [];
  const D = { piutang: [] };
  const { doc } = makeFakeDoc({ piutangName: makeEl({ value: '' }) });
  const ctx = makeSaveCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  ctx.Piutang._saveInner();

  assert.equal(D.piutang.length, 0);
  assert.equal(aibusEvents.length, 0, 'guard nama kosong -> 0 emit');
  assert.match(ctx.__toastMessages.join(' '), /Nama peminjam wajib diisi/);
});

test('Piutang._saveInner(): guard nilai<=0 (BUG-FIN-001) -> toast peringatan, 0 emit, 0 mutasi', () => {
  const aibusEvents = [];
  const D = { piutang: [] };
  const { doc } = makeFakeDoc({
    piutangName: makeEl({ value: 'Budi' }),
    piutangNilai: makeEl({ value: '0' }),
  });
  const ctx = makeSaveCtx({ document: doc, D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  ctx.Piutang._saveInner();

  assert.equal(D.piutang.length, 0);
  assert.equal(aibusEvents.length, 0, 'guard nilai<=0 -> 0 emit');
  assert.match(ctx.__toastMessages.join(' '), /Nilai piutang harus lebih dari 0/);
});

test('Piutang.delete(): piutang manual -> emit finance.updated {kind:"piutang",action:"delete",deletedId,amount}', async () => {
  const aibusEvents = [];
  const D = { piutang: [{ id: 'manual1', name: 'Pinjam ke Budi', nilai: 500000, lunas: false }] };
  const ctx = makeDeleteCtx({ D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  await ctx.Piutang.delete('manual1');

  assert.equal(D.piutang.length, 0, '0 regresi: piutang manual tetap terhapus');
  const ev = aibusEvents.find((e) => e.name === 'finance.updated');
  assert.ok(ev, 'AIBus.emit("finance.updated", ...) harus terpanggil');
  assert.equal(ev.payload.kind, 'piutang');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.deletedId, 'manual1');
  assert.equal(ev.payload.amount, 500000);
});

test('Piutang.delete(): piutang otomatis (autoBillId) DITOLAK guard -> 0 emit, 0 mutasi (guard lama tidak berubah)', async () => {
  const aibusEvents = [];
  const D = { piutang: [{ id: 'sharedBill1', name: 'Porsi bersama: Listrik', nilai: 150000, lunas: false, autoBillId: 'bill1', autoTxId: 'tx1' }] };
  const ctx = makeDeleteCtx({ D, AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } } });

  await ctx.Piutang.delete('sharedBill1');

  assert.equal(D.piutang.length, 1, 'guard: piutang otomatis tidak boleh terhapus');
  assert.equal(aibusEvents.length, 0, 'guard menolak sebelum proses hapus -> 0 emit');
});

test('Piutang.delete(): batal konfirmasi -> 0 emit, 0 mutasi', async () => {
  const aibusEvents = [];
  const D = { piutang: [{ id: 'manual1', name: 'Pinjam ke Budi', nilai: 500000, lunas: false }] };
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
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
    },
    ['Piutang'],
  );

  await ctx.Piutang.delete('manual1');

  assert.equal(D.piutang.length, 1, 'batal konfirmasi -> 0 piutang terhapus');
  assert.equal(aibusEvents.length, 0, 'batal konfirmasi -> 0 emit');
});

test('AIBus tidak ada (typeof AIBus==="undefined") -> save & delete tetap tidak throw, mutasi tetap jalan normal', async () => {
  const D1 = { piutang: [] };
  const { doc: doc1 } = makeFakeDoc({
    piutangName: makeEl({ value: 'Budi' }),
    piutangNilai: makeEl({ value: '500000' }),
    piutangTanggal: makeEl({ value: '2026-09-11' }),
  });
  const ctx1 = makeSaveCtx({ document: doc1, D: D1, AIBus: undefined });
  assert.doesNotThrow(() => ctx1.Piutang._saveInner());
  assert.equal(D1.piutang.length, 1);

  const D2 = { piutang: [{ id: 'manual1', name: 'Pinjam ke Budi', nilai: 500000, lunas: false }] };
  const ctx2 = makeDeleteCtx({ D: D2, AIBus: undefined });
  await assert.doesNotReject(() => ctx2.Piutang.delete('manual1'));
  assert.equal(D2.piutang.length, 0);
});
