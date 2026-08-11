'use strict';
// tests/s519-dana-titipan-transaksi-talangan-linkage.test.js — Sesi 519
// (LANJUTKAN-S519, scope expansion Opsi A disetujui, Design Lock S518 tetap
// SSOT desain — lihat LANJUTKAN-S519-APPROVE-SCOPE-EXPANSION-OPSI-A.md).
//
// Target: field opsional `titipanLinkId`/`titipanTalangan` pada transaksi
// (transaksi.js) + lifecycle piutang otomatis "Talangan Dana Titipan"
// (piutang-utang.js: `maybeCreateTitipanTalanganPiutang()`/
// `syncTitipanTalanganPiutangOnEdit()`/
// `removeUnpaidTitipanTalanganPiutangForTx()`) + derived `usedTotal`/
// `available`/`talanganTotal` per owner (`DanaTitipanPortfolioAPI.build()`)
// + DELETE cascade (`delTx()`, tx-list-cashflow.js).
//
// LAPIS 3 murni (tanpa DOM, pola sama tests/s485b-titipan-commitment-crud.test.js
// + tests/s485c-titipan-commitment-projection.test.js): `resolveTxTitipanOwner()`/
// `applyTxTitipanLinkageOnSave()` (transaksi.js) & `maybeCreateTitipanTalanganPiutang()`/
// dst (piutang-utang.js) 100% fungsi murni (0 baca DOM) — sesi ini SENGAJA
// belum menambah field form txModal (di luar scope resmi S519, lihat
// LANJUTKAN-S519 §13 "JANGAN SENTUH": modals.js/app_production.html), jadi
// dites langsung lewat pemanggilan fungsi (bukan lewat simulasi klik form).

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
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
      'modules/finance/piutang-utang.js',
      'modules/finance/transaksi.js',
      'modules/finance/tx-list-cashflow.js',
    ],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      todayStr: () => '2026-08-09',
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
      'maybeCreateTitipanTalanganPiutang', 'syncTitipanTalanganPiutangOnEdit',
      'removeUnpaidTitipanTalanganPiutangForTx', 'delTx', 'MultiOwnerEngine',
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
// 1. no linkage — transaksi biasa tanpa titipanLinkId sama sekali
// ============================================================
test('1. no linkage: applyTxTitipanLinkageOnSave() no-op total utk tx tanpa titipanLinkId', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 50000, note: 'jajan' };
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  assert.equal(tx.titipanLinkId, undefined);
  assert.equal(D.piutang.length, 0);
});

// ============================================================
// 2. create expense Dana Titipan (linkage tanpa talangan)
// ============================================================
test('2. create expense titipanLinkId valid, titipanTalangan bukan true -> 0 piutang dibuat', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 50000, titipanLinkId: 'budi' };
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  assert.equal(tx.titipanLinkId, 'budi');
  assert.equal(D.piutang.length, 0);
});

// ============================================================
// 3. create talangan -> 1 piutang otomatis
// ============================================================
test('3. create expense titipanTalangan:true -> 1 piutang otomatis, autoTxId+autoTitipanOwnerId benar', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 75000, note: 'talangan token listrik', titipanLinkId: 'budi', titipanTalangan: true };
  D.transactions.push(tx);
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  assert.equal(D.piutang.length, 1);
  const p = D.piutang[0];
  assert.equal(p.nilai, 75000);
  assert.equal(p.lunas, false);
  assert.equal(p.autoTxId, 'tx1');
  assert.equal(p.autoTitipanOwnerId, 'budi');
  assert.match(p.name, /Talangan Dana Titipan: Budi/);
});

// ============================================================
// 4. idempotency
// ============================================================
test('4. maybeCreateTitipanTalanganPiutang() dipanggil 2x utk tx sama -> tetap 1 piutang', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 75000, titipanLinkId: 'budi', titipanTalangan: true };
  ctx.maybeCreateTitipanTalanganPiutang(tx);
  ctx.maybeCreateTitipanTalanganPiutang(tx);
  assert.equal(D.piutang.length, 1);
});

// ============================================================
// 5. derived used (build())
// ============================================================
test('5. build(): usedTotal = SUM expense titipanLinkId===ownerId', () => {
  const D = baseD({ transactions: [
    { id: 't1', type: 'expense', amount: 100000, titipanLinkId: 'budi' },
    { id: 't2', type: 'expense', amount: 50000, titipanLinkId: 'budi' },
    { id: 't3', type: 'income', amount: 999999, titipanLinkId: 'budi' },
    { id: 't4', type: 'expense', amount: 30000, titipanLinkId: 'lain' },
  ] });
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.usedTotal, 150000);
});

// ============================================================
// 6. derived available
// ============================================================
test('6. build(): available = max(0, principal - usedTotal - returnedTotal)', () => {
  const D = baseD({
    transactions: [{ id: 't1', type: 'expense', amount: 300000, titipanLinkId: 'budi' }],
    titipanReturns: [{ id: 'r1', ownerId: 'budi', amount: 100000 }],
  });
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  // principal 1000000 - used 300000 - returned 100000 = 600000
  assert.equal(budi.available, 600000);
});

test('6b. build(): available tidak pernah negatif (over-used)', () => {
  const D = baseD({
    transactions: [{ id: 't1', type: 'expense', amount: 5000000, titipanLinkId: 'budi' }],
  });
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.available, 0);
});

test('6c. build(): available null kalau principalAmount null (PRINCIPAL_NOT_SET)', () => {
  const D = baseD({ titipanCommitments: [], transactions: [{ id: 't1', type: 'expense', amount: 1000, titipanLinkId: 'budi' }] });
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.principalAmount, null);
  assert.equal(budi.available, null);
});

// ============================================================
// 7. talanganTotal (subset usedTotal)
// ============================================================
test('7. build(): talanganTotal HANYA expense dgn titipanTalangan===true, subset usedTotal', () => {
  const D = baseD({ transactions: [
    { id: 't1', type: 'expense', amount: 100000, titipanLinkId: 'budi', titipanTalangan: true },
    { id: 't2', type: 'expense', amount: 200000, titipanLinkId: 'budi' },
  ] });
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.usedTotal, 300000);
  assert.equal(budi.talanganTotal, 100000);
  assert.ok(budi.talanganTotal <= budi.usedTotal);
});

// ============================================================
// 8. edit amount delta
// ============================================================
test('8. syncTitipanTalanganPiutangOnEdit(): sisa piutang disesuaikan pakai delta, bukan ditimpa nilai baru', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 100000, titipanLinkId: 'budi', titipanTalangan: true };
  ctx.maybeCreateTitipanTalanganPiutang(tx);
  const before = D.piutang[0].nilai;
  const ok = ctx.syncTitipanTalanganPiutangOnEdit('tx1', 100000, 130000);
  assert.equal(ok, true);
  assert.equal(D.piutang[0].nilai, before - 30000);
});

test('8b. syncTitipanTalanganPiutangOnEdit(): tidak pernah negatif', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 100000, titipanLinkId: 'budi', titipanTalangan: true };
  ctx.maybeCreateTitipanTalanganPiutang(tx);
  ctx.syncTitipanTalanganPiutangOnEdit('tx1', 100000, 999999999);
  assert.equal(D.piutang[0].nilai, 0);
});

// ============================================================
// 9. edit owner
// ============================================================
test('9. applyTxTitipanLinkageOnSave(): ganti owner -> piutang lama (unpaid) dihapus, piutang baru dibuat utk owner baru', () => {
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
  const tx = { id: 'tx1', type: 'expense', amount: 90000, titipanLinkId: 'budi', titipanTalangan: true };
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  assert.equal(D.piutang.length, 1);
  assert.equal(D.piutang[0].autoTitipanOwnerId, 'budi');
  // ganti owner ke cici (cici sudah punya commitment jadi resolveTxTitipanOwner
  // butuh listExistingOwners() -- yang bersumber dari union holding+registry,
  // BUKAN dari commitments; jadi tambahkan cici lewat holding terpisah).
  // CATATAN: TIDAK push ke D.investments[0].owners dgn porsi 0 -- porsi 0
  // ditolak MultiOwnerEngine.validateOwner() ("porsi harus lebih dari 0"),
  // yang bikin SELURUH array owners holding itu invalid & getOwners()
  // fallback ke sintesis SELF (budi pun ikut hilang dari
  // listExistingOwners()). Holding kedua (single-owner, porsi 100) adalah
  // cara valid utk menambahkan cici ke union tanpa merusak holding h1.
  D.investments.push({ id: 'h2', name: 'BBRI', unit: 1, avgPrice: 1, currentPrice: 1, owners: [
    { ownerId: 'cici', porsi: 100, ownerName: 'Cici', isSelf: false },
  ] });
  const prev = tx.titipanLinkId;
  tx.titipanLinkId = 'cici';
  ctx.applyTxTitipanLinkageOnSave(tx, prev);
  assert.equal(D.piutang.length, 1, 'piutang lama dihapus, hanya 1 piutang baru yg tersisa');
  assert.equal(D.piutang[0].autoTitipanOwnerId, 'cici');
  assert.equal(D.piutang[0].autoTxId, 'tx1');
});

// ============================================================
// 10. unlink
// ============================================================
test('10. applyTxTitipanLinkageOnSave(): unlink (titipanLinkId dihapus) -> piutang unpaid ikut terhapus, titipanTalangan direset', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 60000, titipanLinkId: 'budi', titipanTalangan: true };
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  assert.equal(D.piutang.length, 1);
  const prev = tx.titipanLinkId;
  delete tx.titipanLinkId;
  ctx.applyTxTitipanLinkageOnSave(tx, prev);
  assert.equal(D.piutang.length, 0);
  assert.equal(tx.titipanTalangan, false);
});

// ============================================================
// 11 & 19. delete unpaid piutang (removeUnpaidTitipanTalanganPiutangForTx + delTx())
// ============================================================
test('11. removeUnpaidTitipanTalanganPiutangForTx(): hapus piutang autoTxId cocok & belum lunas', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  D.piutang.push({ id: 'p1', autoTxId: 'tx1', lunas: false, nilai: 1000 });
  const removed = ctx.removeUnpaidTitipanTalanganPiutangForTx('tx1');
  assert.equal(removed, true);
  assert.equal(D.piutang.length, 0);
});

// ============================================================
// 12. delete paid piutang dipertahankan
// ============================================================
test('12. removeUnpaidTitipanTalanganPiutangForTx(): piutang autoTxId cocok TAPI sudah lunas -> dipertahankan', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  D.piutang.push({ id: 'p1', autoTxId: 'tx1', lunas: true, nilai: 1000 });
  const removed = ctx.removeUnpaidTitipanTalanganPiutangForTx('tx1');
  assert.equal(removed, false);
  assert.equal(D.piutang.length, 1);
});

// ============================================================
// 13. principal immutable (CREATE/EDIT/DELETE/repayment)
// ============================================================
test('13. principal immutable terhadap CREATE/EDIT/DELETE talangan', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const before = D.titipanCommitments[0].principalAmount;
  const tx = { id: 'tx1', type: 'expense', amount: 90000, titipanLinkId: 'budi', titipanTalangan: true };
  D.transactions.push(tx);
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  ctx.syncTitipanTalanganPiutangOnEdit('tx1', 90000, 120000);
  ctx.removeUnpaidTitipanTalanganPiutangForTx('tx1');
  assert.equal(D.titipanCommitments[0].principalAmount, before);
});

// ============================================================
// 14. returns interaction (returnedTotal tidak berubah krn talangan)
// ============================================================
test('14. returnedTotal tidak terpengaruh oleh usedTotal/talanganTotal (2 mekanisme independen)', () => {
  const D = baseD({
    transactions: [{ id: 't1', type: 'expense', amount: 200000, titipanLinkId: 'budi', titipanTalangan: true }],
    titipanReturns: [{ id: 'r1', ownerId: 'budi', amount: 50000 }],
  });
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.returnedTotal, 50000);
  assert.equal(budi.usedTotal, 200000);
  assert.equal(budi.available, 1000000 - 200000 - 50000);
});

// ============================================================
// 15. asset ownership isolation
// ============================================================
test('15. applyTxTitipanLinkageOnSave()/build() tidak menyentuh D.assets[].owners[] / a.nilai', () => {
  const D = baseD({ assets: [{ id: 'a1', name: 'Motor', nilai: 20000000, owners: [{ ownerId: 'budi', porsi: 50, ownerName: 'Budi', isSelf: false }, { ownerId: 'x', porsi: 50, ownerName: 'X', isSelf: false }] }] });
  const ctx = makeCtx(D);
  const snapshot = JSON.stringify(D.assets);
  const tx = { id: 'tx1', type: 'expense', amount: 90000, titipanLinkId: 'budi', titipanTalangan: true };
  D.transactions.push(tx);
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(JSON.stringify(D.assets), snapshot);
});

// ============================================================
// 16. backward compatibility — transaksi lama tanpa field baru
// ============================================================
test('16. transaksi lama tanpa titipanLinkId/titipanTalangan tetap valid di build()/delTx()', async () => {
  const D = baseD({ transactions: [{ id: 't_old', type: 'expense', amount: 50000, category: 'Makan' }] });
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.usedTotal, 0);
  assert.equal(budi.talanganTotal, 0);
  await ctx.delTx('t_old');
  assert.equal(D.transactions.length, 0);
});

// ============================================================
// 17. multi-owner split menggunakan splitByPorsi() — TIDAK disentuh
// ============================================================
test('17. MultiOwnerEngine.splitByPorsi() tidak diubah/dipakai ulang oleh linkage titipan (1 expense = 1 tx = 1 owner)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(typeof ctx.MultiOwnerEngine.splitByPorsi, 'function');
  const tx = { id: 'tx1', type: 'expense', amount: 90000, titipanLinkId: 'budi', titipanTalangan: true };
  D.transactions.push(tx);
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  assert.equal(D.piutang.length, 1);
  assert.equal(D.piutang[0].nilai, 90000);
});

// ============================================================
// 18/20. DELETE PATH — delTx() end-to-end (tx-list-cashflow.js)
// ============================================================
test('18/19/20. delTx(): unpaid auto-piutang talangan ikut terhapus, paid dipertahankan, principal/asset tidak tersentuh', async () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const txUnpaid = { id: 'tx1', type: 'expense', amount: 90000, titipanLinkId: 'budi', titipanTalangan: true };
  const txPaid = { id: 'tx2', type: 'expense', amount: 40000, titipanLinkId: 'budi', titipanTalangan: true };
  D.transactions.push(txUnpaid, txPaid);
  ctx.applyTxTitipanLinkageOnSave(txUnpaid, null);
  ctx.applyTxTitipanLinkageOnSave(txPaid, null);
  assert.equal(D.piutang.length, 2);
  D.piutang.find((p) => p.autoTxId === 'tx2').lunas = true;
  await ctx.delTx('tx1');
  assert.equal(D.transactions.find((t) => t.id === 'tx1'), undefined);
  assert.equal(D.piutang.find((p) => p.autoTxId === 'tx1'), undefined, 'unpaid auto-piutang tx1 harus hilang');
  assert.ok(D.piutang.find((p) => p.autoTxId === 'tx2'), 'paid auto-piutang tx2 dipertahankan');
  assert.equal(D.titipanCommitments[0].principalAmount, 1000000, 'principal tidak berubah');
  await ctx.delTx('tx2');
  assert.ok(D.piutang.find((p) => p.autoTxId === 'tx2'), 'delete tx sumber TIDAK menghapus piutang yg SUDAH lunas');
});

// ============================================================
// Guard existing-owner-only (Hard Invariant, saveCommitment()-style)
// ============================================================
test('resolveTxTitipanOwner(): ownerId tidak dikenal -> null, titipanLinkId dibuang otomatis oleh applyTxTitipanLinkageOnSave()', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(ctx.resolveTxTitipanOwner('hantu'), null);
  const tx = { id: 'tx1', type: 'expense', amount: 90000, titipanLinkId: 'hantu', titipanTalangan: true };
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  assert.equal(tx.titipanLinkId, undefined);
  assert.equal(tx.titipanTalangan, false);
  assert.equal(D.piutang.length, 0);
});

// ============================================================
// DELETE ordering — data-integrity, tidak ada counter manual
// ============================================================
test('DELETE: usedTotal pulih otomatis (derived) setelah delTx(), 0 counter manual', async () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const tx = { id: 'tx1', type: 'expense', amount: 250000, titipanLinkId: 'budi', titipanTalangan: true };
  D.transactions.push(tx);
  ctx.applyTxTitipanLinkageOnSave(tx, null);
  let p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.find((o) => o.ownerId === 'budi').usedTotal, 250000);
  await ctx.delTx('tx1');
  p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.find((o) => o.ownerId === 'budi').usedTotal, 0);
});
