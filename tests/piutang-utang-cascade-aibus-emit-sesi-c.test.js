'use strict';
// tests/piutang-utang-cascade-aibus-emit-sesi-c.test.js — Sesi C (lanjutan
// #9, AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md temuan Prioritas Tinggi #3):
// piutang-utang.js — bagian "cascade besar" yang belum tersentuh sesi #7
// (Piutang CRUD) & #8 (Debt CRUD): 11 fungsi sync/cascade otomatis antara
// tagihan "Ditanggung Bersama", pembayaran cicilan, dan talangan/pinjam
// Dana Titipan. Fungsi-fungsi ini TIDAK dipanggil langsung dari UI (beda
// dari _saveInner()/delete() di sesi #7/#8) -- mereka dipanggil dari
// caller lain (tagihan-kalender.js markBillPaid()/_saveBillInner(),
// transaksi.js edit/delete, tx-list-cashflow.js delTx()) sebagai efek
// samping. 0% emit sebelumnya walau caller-nya (delTx, _saveTxInner, dst)
// sudah emit finance.updated versi sendiri -- konsumen yang cuma
// mendengarkan event caller tidak akan tahu ADA piutang/utang otomatis
// yang ikut berubah/dibuat/dihapus sebagai efek samping.
//
// Fix: 11 titik emit AIBus.emit("finance.updated",{kind:"piutang"|"utang",
// action:"create"|"edit"|"delete",...}) -- REUSE event & kind yang sama
// dengan CRUD manual (sesi #7/#8), TAMBAH 2 field baru yang tidak ada di
// emit CRUD manual: `auto:true` (menandai ini perubahan OTOMATIS dari
// cascade, bukan input user langsung) + `source` (string pendek nama asal
// cascade-nya, mis. "bill-shared"/"titipan-talangan"/"payment-edit-sync")
// -- supaya konsumen bisa filter/beda-kan tanpa perlu event/kind baru.
// 0 field lama diubah, 0 logic cascade lain disentuh (murni tambah 1 baris
// emit per fungsi, di titik SUKSES sebelum/di titik `return true`/count).
//
// Fungsi yang TIDAK diubah di sesi ini (bukan bagian cascade sync,
// murni helper/lookup, 0 mutasi D): getAutoPiutangIdForBill() (fungsi
// murni, tidak menulis D sama sekali).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, overrides = {}) {
  const aibusEvents = [];
  const ctx = loadSource(
    ['modules/finance/piutang-utang.js'],
    {
      D,
      uid: (() => { let n = 0; return () => `auto${++n}`; })(),
      todayStr: () => '2026-09-11',
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
      ...overrides,
    },
    [],
  );
  ctx.__aibusEvents = aibusEvents;
  return ctx;
}

function findEmit(ctx) {
  return ctx.__aibusEvents.find((e) => e.name === 'finance.updated');
}

// 1. maybeCreateSharedPiutangFromBill(b, txId)
test('maybeCreateSharedPiutangFromBill(): shared+sharedAutoPiutang -> emit {kind:"piutang",action:"create",auto:true,source:"bill-shared"}', () => {
  const D = { piutang: [] };
  const ctx = makeCtx(D);
  const bill = { id: 'bill1', shared: true, sharedAutoPiutang: true, totalAmount: 100000, amount: 40000, name: 'Listrik' };

  ctx.maybeCreateSharedPiutangFromBill(bill, 'tx1');

  assert.equal(D.piutang.length, 1, '0 regresi: piutang otomatis tetap dibuat');
  const ev = findEmit(ctx);
  assert.ok(ev, 'harus emit finance.updated');
  assert.equal(ev.payload.kind, 'piutang');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.piutangId, D.piutang[0].id);
  assert.equal(ev.payload.amount, 60000);
  assert.equal(ev.payload.auto, true);
  assert.equal(ev.payload.source, 'bill-shared');
});

test('maybeCreateSharedPiutangFromBill(): bill bukan shared -> 0 emit, 0 mutasi (guard tidak berubah)', () => {
  const D = { piutang: [] };
  const ctx = makeCtx(D);
  ctx.maybeCreateSharedPiutangFromBill({ id: 'bill1', shared: false, totalAmount: 100000, amount: 40000 }, 'tx1');
  assert.equal(D.piutang.length, 0);
  assert.equal(ctx.__aibusEvents.length, 0);
});

test('maybeCreateSharedPiutangFromBill(): idempotency (txId sudah pernah punya entri) -> 0 emit, 0 mutasi', () => {
  const D = { piutang: [{ id: 'p_old', autoTxId: 'tx1' }] };
  const ctx = makeCtx(D);
  ctx.maybeCreateSharedPiutangFromBill({ id: 'bill1', shared: true, sharedAutoPiutang: true, totalAmount: 100000, amount: 40000 }, 'tx1');
  assert.equal(D.piutang.length, 1, 'tidak ada entri baru');
  assert.equal(ctx.__aibusEvents.length, 0);
});

// 2. removeOrphanedAutoPiutangForBill(billId)
test('removeOrphanedAutoPiutangForBill(): ada piutang orphan -> emit {kind:"piutang",action:"delete",auto:true,source:"bill-removed"}', () => {
  const D = { piutang: [{ id: 'p1', autoBillId: 'bill1' }, { id: 'p2', autoBillId: 'bill2' }] };
  const ctx = makeCtx(D);

  const res = ctx.removeOrphanedAutoPiutangForBill('bill1');

  assert.equal(res, true);
  assert.equal(D.piutang.length, 1, '0 regresi: piutang orphan tetap terhapus');
  const ev = findEmit(ctx);
  assert.ok(ev);
  assert.equal(ev.payload.kind, 'piutang');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.auto, true);
  assert.equal(ev.payload.source, 'bill-removed');
  assert.equal(ev.payload.billId, 'bill1');
  assert.equal(ev.payload.deletedCount, 1);
});

test('removeOrphanedAutoPiutangForBill(): tidak ada yang cocok -> 0 emit', () => {
  const D = { piutang: [{ id: 'p1', autoBillId: 'bill2' }] };
  const ctx = makeCtx(D);
  const res = ctx.removeOrphanedAutoPiutangForBill('bill1');
  assert.equal(res, false);
  assert.equal(ctx.__aibusEvents.length, 0);
});

// 3. syncOutstandingSharedPiutang(billId, newSisa)
test('syncOutstandingSharedPiutang(): ada piutang belum lunas -> emit {kind:"piutang",action:"edit",auto:true,source:"bill-edit-sync"}', () => {
  const D = { piutang: [{ id: 'p1', autoBillId: 'bill1', autoTxId: 5, lunas: false, nilai: 60000 }] };
  const ctx = makeCtx(D);

  const res = ctx.syncOutstandingSharedPiutang('bill1', 75000);

  assert.equal(res, 1);
  assert.equal(D.piutang[0].nilai, 75000, '0 regresi: nilai tetap disesuaikan');
  const ev = findEmit(ctx);
  assert.ok(ev);
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.piutangId, 'p1');
  assert.equal(ev.payload.amount, 75000);
  assert.equal(ev.payload.auto, true);
  assert.equal(ev.payload.source, 'bill-edit-sync');
});

test('syncOutstandingSharedPiutang(): semua sudah lunas -> 0 emit, 0 mutasi', () => {
  const D = { piutang: [{ id: 'p1', autoBillId: 'bill1', lunas: true, nilai: 60000 }] };
  const ctx = makeCtx(D);
  const res = ctx.syncOutstandingSharedPiutang('bill1', 75000);
  assert.equal(res, 0);
  assert.equal(D.piutang[0].nilai, 60000);
  assert.equal(ctx.__aibusEvents.length, 0);
});

// 4. syncSharedPiutangOnPaymentEdit(txId, oldAmount, newAmount)
test('syncSharedPiutangOnPaymentEdit(): piutang belum lunas ditemukan -> emit {action:"edit",source:"payment-edit-sync"}', () => {
  const D = { piutang: [{ id: 'p1', autoTxId: 'tx1', lunas: false, nilai: 60000 }] };
  const ctx = makeCtx(D);

  const res = ctx.syncSharedPiutangOnPaymentEdit('tx1', 40000, 50000);

  assert.equal(res, true);
  assert.equal(D.piutang[0].nilai, 50000, '0 regresi: nilai=60000+40000-50000');
  const ev = findEmit(ctx);
  assert.ok(ev);
  assert.equal(ev.payload.kind, 'piutang');
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.piutangId, 'p1');
  assert.equal(ev.payload.amount, 50000);
  assert.equal(ev.payload.auto, true);
  assert.equal(ev.payload.source, 'payment-edit-sync');
});

test('syncSharedPiutangOnPaymentEdit(): tidak ketemu -> 0 emit', () => {
  const D = { piutang: [] };
  const ctx = makeCtx(D);
  const res = ctx.syncSharedPiutangOnPaymentEdit('tx1', 40000, 50000);
  assert.equal(res, false);
  assert.equal(ctx.__aibusEvents.length, 0);
});

// 5. syncDebtBalanceOnPaymentEdit(bill, oldAmount, newAmount)
test('syncDebtBalanceOnPaymentEdit(): bill kind utang valid -> emit {kind:"utang",action:"edit",source:"payment-edit-sync"}', () => {
  const D = { debts: [{ id: 'd1', nilai: 2000000 }] };
  const ctx = makeCtx(D);

  const res = ctx.syncDebtBalanceOnPaymentEdit({ kind: 'utang', debtId: 'd1' }, 500000, 600000);

  assert.equal(res, true);
  assert.equal(D.debts[0].nilai, 1900000, '0 regresi: nilai=2000000+500000-600000');
  const ev = findEmit(ctx);
  assert.ok(ev);
  assert.equal(ev.payload.kind, 'utang');
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.debtId, 'd1');
  assert.equal(ev.payload.amount, 1900000);
  assert.equal(ev.payload.auto, true);
  assert.equal(ev.payload.source, 'payment-edit-sync');
});

test('syncDebtBalanceOnPaymentEdit(): bill bukan kind utang -> 0 emit (guard tidak berubah)', () => {
  const D = { debts: [{ id: 'd1', nilai: 2000000 }] };
  const ctx = makeCtx(D);
  const res = ctx.syncDebtBalanceOnPaymentEdit({ kind: 'lain', debtId: 'd1' }, 500000, 600000);
  assert.equal(res, false);
  assert.equal(ctx.__aibusEvents.length, 0);
});

// 6. maybeCreateTitipanTalanganPiutang(tx)
test('maybeCreateTitipanTalanganPiutang(): tx talangan valid -> emit {kind:"piutang",action:"create",source:"titipan-talangan"}', () => {
  const D = { piutang: [] };
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', titipanLinkId: 'owner1', titipanTalangan: true, amount: 150000, note: 'Bayar listrik' };

  ctx.maybeCreateTitipanTalanganPiutang(tx);

  assert.equal(D.piutang.length, 1);
  const ev = findEmit(ctx);
  assert.ok(ev);
  assert.equal(ev.payload.kind, 'piutang');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.piutangId, D.piutang[0].id);
  assert.equal(ev.payload.amount, 150000);
  assert.equal(ev.payload.auto, true);
  assert.equal(ev.payload.source, 'titipan-talangan');
});

test('maybeCreateTitipanTalanganPiutang(): tx bukan talangan -> 0 emit, 0 mutasi', () => {
  const D = { piutang: [] };
  const ctx = makeCtx(D);
  ctx.maybeCreateTitipanTalanganPiutang({ id: 'tx1', type: 'expense', titipanLinkId: 'owner1', titipanTalangan: false, amount: 150000 });
  assert.equal(D.piutang.length, 0);
  assert.equal(ctx.__aibusEvents.length, 0);
});

// 7. syncTitipanTalanganPiutangOnEdit(txId, oldAmount, newAmount)
test('syncTitipanTalanganPiutangOnEdit(): piutang belum lunas ditemukan -> emit {action:"edit",source:"titipan-talangan-edit"}', () => {
  const D = { piutang: [{ id: 'p1', autoTxId: 'tx1', lunas: false, nilai: 150000 }] };
  const ctx = makeCtx(D);

  const res = ctx.syncTitipanTalanganPiutangOnEdit('tx1', 150000, 200000);

  assert.equal(res, true);
  assert.equal(D.piutang[0].nilai, 100000);
  const ev = findEmit(ctx);
  assert.ok(ev);
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.piutangId, 'p1');
  assert.equal(ev.payload.amount, 100000);
  assert.equal(ev.payload.source, 'titipan-talangan-edit');
});

test('syncTitipanTalanganPiutangOnEdit(): piutang sudah lunas -> 0 emit (Hard Invariant #14 tidak disentuh)', () => {
  const D = { piutang: [{ id: 'p1', autoTxId: 'tx1', lunas: true, nilai: 150000 }] };
  const ctx = makeCtx(D);
  const res = ctx.syncTitipanTalanganPiutangOnEdit('tx1', 150000, 200000);
  assert.equal(res, false);
  assert.equal(D.piutang[0].nilai, 150000);
  assert.equal(ctx.__aibusEvents.length, 0);
});

// 8. removeUnpaidTitipanTalanganPiutangForTx(txId)
test('removeUnpaidTitipanTalanganPiutangForTx(): piutang belum lunas -> emit {action:"delete",source:"titipan-talangan-removed"}', () => {
  const D = { piutang: [{ id: 'p1', autoTxId: 'tx1', lunas: false }] };
  const ctx = makeCtx(D);

  const res = ctx.removeUnpaidTitipanTalanganPiutangForTx('tx1');

  assert.equal(res, true);
  assert.equal(D.piutang.length, 0);
  const ev = findEmit(ctx);
  assert.ok(ev);
  assert.equal(ev.payload.kind, 'piutang');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.auto, true);
  assert.equal(ev.payload.source, 'titipan-talangan-removed');
  assert.equal(ev.payload.deletedTxId, 'tx1');
});

test('removeUnpaidTitipanTalanganPiutangForTx(): piutang sudah lunas -> TIDAK terhapus, 0 emit (histori dipertahankan)', () => {
  const D = { piutang: [{ id: 'p1', autoTxId: 'tx1', lunas: true }] };
  const ctx = makeCtx(D);
  const res = ctx.removeUnpaidTitipanTalanganPiutangForTx('tx1');
  assert.equal(res, false);
  assert.equal(D.piutang.length, 1);
  assert.equal(ctx.__aibusEvents.length, 0);
});

// 9. maybeCreateTitipanPinjamUtang(tx)
test('maybeCreateTitipanPinjamUtang(): tx pinjam valid -> emit {kind:"utang",action:"create",source:"titipan-pinjam"}', () => {
  const D = { debts: [] };
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', titipanLinkId: 'owner1', titipanPinjamUtang: true, amount: 300000, note: 'Modal' };

  ctx.maybeCreateTitipanPinjamUtang(tx);

  assert.equal(D.debts.length, 1);
  const ev = findEmit(ctx);
  assert.ok(ev);
  assert.equal(ev.payload.kind, 'utang');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.debtId, D.debts[0].id);
  assert.equal(ev.payload.amount, 300000);
  assert.equal(ev.payload.auto, true);
  assert.equal(ev.payload.source, 'titipan-pinjam');
});

test('maybeCreateTitipanPinjamUtang(): titipanTalangan juga true -> talangan menang, 0 utang dibuat, 0 emit', () => {
  const D = { debts: [] };
  const ctx = makeCtx(D);
  ctx.maybeCreateTitipanPinjamUtang({ id: 'tx1', type: 'expense', titipanLinkId: 'owner1', titipanPinjamUtang: true, titipanTalangan: true, amount: 300000 });
  assert.equal(D.debts.length, 0);
  assert.equal(ctx.__aibusEvents.length, 0);
});

// 10. syncTitipanPinjamUtangOnEdit(txId, oldAmount, newAmount)
test('syncTitipanPinjamUtangOnEdit(): utang belum lunas ditemukan -> emit {kind:"utang",action:"edit",source:"titipan-pinjam-edit"}', () => {
  const D = { debts: [{ id: 'd1', autoTxId: 'tx1', lunas: false, nilai: 300000 }] };
  const ctx = makeCtx(D);

  const res = ctx.syncTitipanPinjamUtangOnEdit('tx1', 300000, 250000);

  assert.equal(res, true);
  assert.equal(D.debts[0].nilai, 350000);
  const ev = findEmit(ctx);
  assert.ok(ev);
  assert.equal(ev.payload.kind, 'utang');
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.debtId, 'd1');
  assert.equal(ev.payload.amount, 350000);
  assert.equal(ev.payload.source, 'titipan-pinjam-edit');
});

test('syncTitipanPinjamUtangOnEdit(): utang sudah lunas -> 0 emit', () => {
  const D = { debts: [{ id: 'd1', autoTxId: 'tx1', lunas: true, nilai: 300000 }] };
  const ctx = makeCtx(D);
  const res = ctx.syncTitipanPinjamUtangOnEdit('tx1', 300000, 250000);
  assert.equal(res, false);
  assert.equal(ctx.__aibusEvents.length, 0);
});

// 11. removeUnpaidTitipanPinjamUtangForTx(txId)
test('removeUnpaidTitipanPinjamUtangForTx(): utang belum lunas -> emit {kind:"utang",action:"delete",source:"titipan-pinjam-removed"}', () => {
  const D = { debts: [{ id: 'd1', autoTxId: 'tx1', lunas: false }] };
  const ctx = makeCtx(D);

  const res = ctx.removeUnpaidTitipanPinjamUtangForTx('tx1');

  assert.equal(res, true);
  assert.equal(D.debts.length, 0);
  const ev = findEmit(ctx);
  assert.ok(ev);
  assert.equal(ev.payload.kind, 'utang');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.auto, true);
  assert.equal(ev.payload.source, 'titipan-pinjam-removed');
  assert.equal(ev.payload.deletedTxId, 'tx1');
});

test('removeUnpaidTitipanPinjamUtangForTx(): utang sudah lunas -> TIDAK terhapus, 0 emit', () => {
  const D = { debts: [{ id: 'd1', autoTxId: 'tx1', lunas: true }] };
  const ctx = makeCtx(D);
  const res = ctx.removeUnpaidTitipanPinjamUtangForTx('tx1');
  assert.equal(res, false);
  assert.equal(D.debts.length, 1);
  assert.equal(ctx.__aibusEvents.length, 0);
});

// AIBus tidak ada sama sekali -> semua fungsi tetap tidak throw
test('AIBus tidak ada (typeof AIBus==="undefined") -> semua 11 fungsi cascade tetap tidak throw, mutasi tetap jalan normal', () => {
  const D = { piutang: [], debts: [] };
  const ctx = makeCtx(D, { AIBus: undefined });

  assert.doesNotThrow(() => ctx.maybeCreateSharedPiutangFromBill({ id: 'b1', shared: true, sharedAutoPiutang: true, totalAmount: 100000, amount: 40000 }, 'tx1'));
  assert.doesNotThrow(() => ctx.removeOrphanedAutoPiutangForBill('b1'));

  D.piutang.push({ id: 'p1', autoBillId: 'bx', autoTxId: 1, lunas: false, nilai: 1000 });
  assert.doesNotThrow(() => ctx.syncOutstandingSharedPiutang('bx', 2000));

  D.piutang.push({ id: 'p2', autoTxId: 'tx2', lunas: false, nilai: 1000 });
  assert.doesNotThrow(() => ctx.syncSharedPiutangOnPaymentEdit('tx2', 500, 800));

  D.debts.push({ id: 'd1', nilai: 5000 });
  assert.doesNotThrow(() => ctx.syncDebtBalanceOnPaymentEdit({ kind: 'utang', debtId: 'd1' }, 100, 200));

  assert.doesNotThrow(() => ctx.maybeCreateTitipanTalanganPiutang({ id: 'tx3', type: 'expense', titipanLinkId: 'o1', titipanTalangan: true, amount: 1000 }));

  D.piutang.push({ id: 'p3', autoTxId: 'tx4', lunas: false, nilai: 1000 });
  assert.doesNotThrow(() => ctx.syncTitipanTalanganPiutangOnEdit('tx4', 500, 800));
  assert.doesNotThrow(() => ctx.removeUnpaidTitipanTalanganPiutangForTx('tx4'));

  assert.doesNotThrow(() => ctx.maybeCreateTitipanPinjamUtang({ id: 'tx5', type: 'expense', titipanLinkId: 'o1', titipanPinjamUtang: true, amount: 1000 }));

  D.debts.push({ id: 'd2', autoTxId: 'tx6', lunas: false, nilai: 1000 });
  assert.doesNotThrow(() => ctx.syncTitipanPinjamUtangOnEdit('tx6', 500, 800));
  assert.doesNotThrow(() => ctx.removeUnpaidTitipanPinjamUtangForTx('tx6'));
});
