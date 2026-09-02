'use strict';
// tests/s714-titipan-pinjam-utang-linkage.test.js — Sesi 2/3 (S714, lanjutan
// rencana "arah dana eksplisit Piutang vs Utang" — lihat catatan status di
// titipan-expense-flow.js).
//
// Target: field opsional `titipanPinjamUtang` pada transaksi (transaksi.js,
// diset Sesi 1 lewat TitipanExpenseFlow) + lifecycle utang otomatis "Pinjam
// Dana Titipan" (piutang-utang.js: `maybeCreateTitipanPinjamUtang()`/
// `syncTitipanPinjamUtangOnEdit()`/`removeUnpaidTitipanPinjamUtangForTx()`)
// + DELETE cascade (`delTx()`, tx-list-cashflow.js).
//
// Pola SAMA PERSIS tests/s519-dana-titipan-transaksi-talangan-linkage.test.js
// (Piutang) tapi utk arah Utang (`D.debts` bukan `D.piutang`) — LAPIS 3 murni,
// 0 DOM.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  let saveCalls = 0;
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
      'modules/finance/piutang-utang.js',
      'modules/finance/transaksi.js',
      'modules/finance/tx-list-cashflow.js',
    ],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      todayStr: () => '2026-09-02',
      save: () => { saveCalls++; },
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      sameId: (a, b) => a === b,
      askConfirm: async () => true,
      toast: () => {},
      renderDashboard: () => {}, renderKeuangan: () => {}, renderCnTab: () => {}, renderProductList: () => {},
      renderShop: () => {}, renderShopRecent: () => {}, renderStockList: () => {},
    },
    [
      'DanaTitipanPortfolioAPI', 'resolveTxTitipanOwner', 'applyTxTitipanLinkageOnSave',
      'maybeCreateTitipanPinjamUtang', 'syncTitipanPinjamUtangOnEdit',
      'removeUnpaidTitipanPinjamUtangForTx', 'maybeCreateTitipanTalanganPiutang',
      'delTx', 'MultiOwnerEngine',
    ],
  );
  ctx._saveCalls = () => saveCalls;
  return ctx;
}

function baseD(overrides) {
  return Object.assign({
    investments: [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    investmentTx: [], investmentWatchlist: [], debts: [], accounts: [],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 1000000 }],
    titipanReturns: [], transactions: [], piutang: [], assets: [],
  }, overrides || {});
}

// ============================================================
// 1. create expense titipanPinjamUtang:true -> 1 utang otomatis
// ============================================================
test('1. create expense titipanPinjamUtang:true -> 1 utang otomatis, autoTxId+autoTitipanOwnerId benar', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 75000, note: 'pinjam buat servis motor', titipanLinkId: 'budi', titipanPinjamUtang: true };
  D.transactions.push(tx);
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  assert.equal(D.debts.length, 1);
  const d = D.debts[0];
  assert.equal(d.nilai, 75000);
  assert.equal(d.lunas, false);
  assert.equal(d.autoTxId, 'tx1');
  assert.equal(d.autoTitipanOwnerId, 'budi');
  assert.match(d.name, /Pinjam Dana Titipan: Budi/);
  assert.equal(D.piutang.length, 0, 'jalur utang tidak ikut membuat piutang');
});

// ============================================================
// 2. idempotency
// ============================================================
test('2. maybeCreateTitipanPinjamUtang() dipanggil 2x utk tx sama -> tetap 1 utang', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 75000, titipanLinkId: 'budi', titipanPinjamUtang: true };
  ctx.maybeCreateTitipanPinjamUtang(tx);
  ctx.maybeCreateTitipanPinjamUtang(tx);
  assert.equal(D.debts.length, 1);
});

// ============================================================
// 3. talangan/arahUtang saling eksklusif (defensif di piutang-utang.js)
// ============================================================
test('3. tx dgn titipanTalangan:true DAN titipanPinjamUtang:true -> maybeCreateTitipanPinjamUtang() no-op (talangan menang)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 75000, titipanLinkId: 'budi', titipanTalangan: true, titipanPinjamUtang: true };
  ctx.maybeCreateTitipanTalanganPiutang(tx);
  ctx.maybeCreateTitipanPinjamUtang(tx);
  assert.equal(D.piutang.length, 1);
  assert.equal(D.debts.length, 0);
});

// ============================================================
// 4. edit amount delta
// ============================================================
test('4. syncTitipanPinjamUtangOnEdit(): sisa utang disesuaikan pakai delta, bukan ditimpa nilai baru', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 100000, titipanLinkId: 'budi', titipanPinjamUtang: true };
  ctx.maybeCreateTitipanPinjamUtang(tx);
  const before = D.debts[0].nilai;
  const ok = ctx.syncTitipanPinjamUtangOnEdit('tx1', 100000, 130000);
  assert.equal(ok, true);
  assert.equal(D.debts[0].nilai, before - 30000);
});

test('4b. syncTitipanPinjamUtangOnEdit(): tidak pernah negatif', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 100000, titipanLinkId: 'budi', titipanPinjamUtang: true };
  ctx.maybeCreateTitipanPinjamUtang(tx);
  ctx.syncTitipanPinjamUtangOnEdit('tx1', 100000, 999999999);
  assert.equal(D.debts[0].nilai, 0);
});

// ============================================================
// 5. edit owner
// ============================================================
test('5. applyTxTitipanLinkageOnSave(): ganti owner -> utang lama (unpaid) dihapus, utang baru dibuat utk owner baru', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1, owners: [
      { ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false },
    ] }],
    titipanCommitments: [
      { id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 1000000 },
      { id: 'c2', ownerId: 'cici', ownerName: 'Cici', principalAmount: 500000 },
    ],
  });
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 90000, titipanLinkId: 'budi', titipanPinjamUtang: true };
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  assert.equal(D.debts.length, 1);
  assert.equal(D.debts[0].autoTitipanOwnerId, 'budi');
  D.investments.push({ id: 'h2', name: 'BBRI', unit: 1, avgPrice: 1, currentPrice: 1, owners: [
    { ownerId: 'cici', porsi: 100, ownerName: 'Cici', isSelf: false },
  ] });
  const prev = tx.titipanLinkId;
  tx.titipanLinkId = 'cici';
  ctx.applyTxTitipanLinkageOnSave(tx, prev);
  assert.equal(D.debts.length, 1, 'utang lama dihapus, hanya 1 utang baru yg tersisa');
  assert.equal(D.debts[0].autoTitipanOwnerId, 'cici');
  assert.equal(D.debts[0].autoTxId, 'tx1');
});

// ============================================================
// 6. unlink
// ============================================================
test('6. applyTxTitipanLinkageOnSave(): unlink (titipanLinkId dihapus) -> utang unpaid ikut terhapus, titipanPinjamUtang direset', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 60000, titipanLinkId: 'budi', titipanPinjamUtang: true };
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  assert.equal(D.debts.length, 1);
  const prev = tx.titipanLinkId;
  delete tx.titipanLinkId;
  ctx.applyTxTitipanLinkageOnSave(tx, prev);
  assert.equal(D.debts.length, 0);
  assert.equal(tx.titipanPinjamUtang, false);
});

// ============================================================
// 7. delete unpaid utang dipertahankan/dihapus
// ============================================================
test('7. removeUnpaidTitipanPinjamUtangForTx(): hapus utang autoTxId cocok & belum lunas', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  D.debts.push({ id: 'd1', autoTxId: 'tx1', lunas: false, nilai: 1000 });
  const removed = ctx.removeUnpaidTitipanPinjamUtangForTx('tx1');
  assert.equal(removed, true);
  assert.equal(D.debts.length, 0);
});

test('8. removeUnpaidTitipanPinjamUtangForTx(): utang autoTxId cocok TAPI sudah lunas -> dipertahankan', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  D.debts.push({ id: 'd1', autoTxId: 'tx1', lunas: true, nilai: 1000 });
  const removed = ctx.removeUnpaidTitipanPinjamUtangForTx('tx1');
  assert.equal(removed, false);
  assert.equal(D.debts.length, 1);
});

// ============================================================
// 9. principal immutable
// ============================================================
test('9. principal immutable terhadap CREATE/EDIT/DELETE pinjam utang', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const before = D.titipanCommitments[0].principalAmount;
  const tx = { id: 'tx1', type: 'expense', amount: 90000, titipanLinkId: 'budi', titipanPinjamUtang: true };
  D.transactions.push(tx);
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  ctx.syncTitipanPinjamUtangOnEdit('tx1', 90000, 120000);
  ctx.removeUnpaidTitipanPinjamUtangForTx('tx1');
  assert.equal(D.titipanCommitments[0].principalAmount, before);
});

// ============================================================
// 10. guard existing-owner-only juga mereset titipanPinjamUtang
// ============================================================
test('10. resolveTxTitipanOwner(): ownerId tidak dikenal -> titipanLinkId & titipanPinjamUtang dibuang otomatis', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 90000, titipanLinkId: 'hantu', titipanPinjamUtang: true };
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  assert.equal(tx.titipanLinkId, undefined);
  assert.equal(tx.titipanPinjamUtang, false);
  assert.equal(D.debts.length, 0);
});

// ============================================================
// 11. DELETE PATH — delTx() end-to-end
// ============================================================
test('11. delTx(): unpaid auto-utang pinjam titipan ikut terhapus, paid dipertahankan, principal tidak tersentuh', async () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const txUnpaid = { id: 'tx1', type: 'expense', amount: 90000, titipanLinkId: 'budi', titipanPinjamUtang: true };
  const txPaid = { id: 'tx2', type: 'expense', amount: 40000, titipanLinkId: 'budi', titipanPinjamUtang: true };
  D.transactions.push(txUnpaid, txPaid);
  ctx.applyTxTitipanLinkageOnSave(txUnpaid, null);
  ctx.applyTxTitipanLinkageOnSave(txPaid, null);
  assert.equal(D.debts.length, 2);
  D.debts.find((d) => d.autoTxId === 'tx2').lunas = true;
  await ctx.delTx('tx1');
  assert.equal(D.transactions.find((t) => t.id === 'tx1'), undefined);
  assert.equal(D.debts.find((d) => d.autoTxId === 'tx1'), undefined, 'unpaid auto-utang tx1 harus hilang');
  assert.ok(D.debts.find((d) => d.autoTxId === 'tx2'), 'paid auto-utang tx2 dipertahankan');
  assert.equal(D.titipanCommitments[0].principalAmount, 1000000, 'principal tidak berubah');
});

// ============================================================
// 12. backward compatibility — transaksi lama tanpa field titipanPinjamUtang
// ============================================================
test('12. transaksi lama tanpa titipanPinjamUtang tetap valid di applyTxTitipanLinkageOnSave()/delTx()', async () => {
  const D = baseD({ transactions: [{ id: 't_old', type: 'expense', amount: 50000, category: 'Makan' }] });
  const ctx = makeCtx(D);
  await ctx.delTx('t_old');
  assert.equal(D.transactions.length, 0);
  assert.equal(D.debts.length, 0);
});
