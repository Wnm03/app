// tests/s676-titipan-return-vs-account-liability.test.js — SESI S676 (audit
// lanjutan Gap #2 dari SESSION-NOTE-S675.md: "checkReturnVsLiability() tidak
// cakup titipan yang pokoknya murni di Akun berdiri-sendiri"). LATAR:
// checkReturnVsLiability() (S675) 100% reuse DanaTitipanPortfolioAPI.build(),
// yang HANYA menghitung allocatedPrincipal dari cabang Aset+Investasi -- owner
// yang pokok titipannya MURNI disimpan di 1/lebih akun berdiri-sendiri (bukan
// aset/holding apa pun) selalu allocatedPrincipal=0 di mata build(), jadi
// checkReturnVsLiability() TIDAK PERNAH bisa mendeteksi gap "return dicatat
// tapi porsi akun belum dikecilkan" utk owner semacam itu.
// checkReturnVsAccountLiability() (titipan-reconcile.js) menutup gap KETAHUAN
// ini lewat sub-check TERPISAH: reuse returnedTotal/principalAmount/
// outstandingPrincipal dari build() (SAMA seperti checkReturnVsLiability())
// + _actualLinkedAccountDebtTotalsByOwner() (baru, total nominal D.debts
// ber-linkedAccountId per owner) -- 0 rumus baru di luar itu.
const test = require('node:test');
const assert = require('node:assert');
const TitipanReconcile = require('../modules/finance/titipan-reconcile.js');

test('checkReturnVsAccountLiability() ok=true kalau DanaTitipanPortfolioAPI belum dimuat (guard, 0 false-positive)', () => {
  delete global.DanaTitipanPortfolioAPI;
  delete global.D;
  const res = TitipanReconcile.checkReturnVsAccountLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
});

test('checkReturnVsAccountLiability() ok=true kalau belum ada owner yang tercatat mengembalikan apa pun (returnedTotal=0)', () => {
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', principalAmount: 1000000, returnedTotal: 0, allocatedPrincipal: 0, outstandingPrincipal: 1000000 }] }),
  };
  global.D = { debts: [{ id: 'd1', nilai: 1000000, linkedAccountId: 'acc1', linkedOwnerId: 'o1' }] };
  const res = TitipanReconcile.checkReturnVsAccountLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
  delete global.D;
});

test('checkReturnVsAccountLiability() ok=true kalau owner tidak punya liability Akun sama sekali (accountLiability=0, gap-nya urusan channel lain)', () => {
  // Budi kembalikan sebagian, allocatedPrincipal (Aset/Investasi) juga
  // belum dikecilkan -- TAPI itu tanggung jawab checkReturnVsLiability(),
  // bukan checkReturnVsAccountLiability() (0 baris linkedAccountId
  // sama sekali utk owner ini).
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', principalAmount: 1000000, returnedTotal: 400000, allocatedPrincipal: 1000000, outstandingPrincipal: 600000 }] }),
  };
  global.D = { debts: [] };
  const res = TitipanReconcile.checkReturnVsAccountLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
  delete global.D;
});

test('checkReturnVsAccountLiability() ok=true kalau owner sudah mengembalikan sebagian DAN liability akunnya SUDAH ikut dikecilkan', () => {
  // Adi commit 1jt murni di akun BRI, kembalikan 300rb (outstanding
  // seharusnya 700rb) -- baris Buku Utang linkedAccountId SUDAH turun jadi
  // 700rb persis, 0 gap.
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Adi', principalAmount: 1000000, returnedTotal: 300000, allocatedPrincipal: 0, outstandingPrincipal: 700000 }] }),
  };
  global.D = { debts: [{ id: 'd1', nilai: 700000, linkedAccountId: 'acc1', linkedOwnerId: 'o1' }] };
  const res = TitipanReconcile.checkReturnVsAccountLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
  delete global.D;
});

test('checkReturnVsAccountLiability() deteksi gap: owner sudah mengembalikan sebagian TAPI liability akun belum dikecilkan sama sekali (kasus pokok murni Akun)', () => {
  // Budi commit 1jt murni di akun berdiri-sendiri (0 aset/holding), kembalikan
  // 400rb (outstanding seharusnya 600rb) -- TAPI baris Buku Utang
  // linkedAccountId MASIH 1jt penuh (porsi akun belum ikut dikecilkan
  // manual), persis gap yang tidak terdeteksi checkReturnVsLiability().
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', principalAmount: 1000000, returnedTotal: 400000, allocatedPrincipal: 0, outstandingPrincipal: 600000 }] }),
  };
  global.D = { debts: [{ id: 'd1', nilai: 1000000, linkedAccountId: 'acc1', linkedOwnerId: 'o1' }] };
  const res = TitipanReconcile.checkReturnVsAccountLiability();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.flagged.length, 1);
  assert.strictEqual(res.flagged[0].ownerId, 'o1');
  assert.strictEqual(res.flagged[0].returnedTotal, 400000);
  assert.strictEqual(res.flagged[0].accountLiability, 1000000);
  assert.strictEqual(res.flagged[0].outstandingPrincipal, 600000);
  assert.strictEqual(res.flagged[0].unreducedAmount, 400000);
  delete global.DanaTitipanPortfolioAPI;
  delete global.D;
});

test('checkReturnVsAccountLiability() jumlahkan liability lintas >1 akun berdiri-sendiri milik owner yang sama', () => {
  // Siti punya porsi titipan di 2 akun berbeda (acc1 300rb, acc2 200rb =
  // total 500rb liability) -- kembalikan seluruhnya (outstanding=0), tapi
  // KEDUA baris masih penuh.
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o2', ownerName: 'Siti', principalAmount: 500000, returnedTotal: 500000, allocatedPrincipal: 0, outstandingPrincipal: 0 }] }),
  };
  global.D = {
    debts: [
      { id: 'd1', nilai: 300000, linkedAccountId: 'acc1', linkedOwnerId: 'o2' },
      { id: 'd2', nilai: 200000, linkedAccountId: 'acc2', linkedOwnerId: 'o2' },
    ],
  };
  const res = TitipanReconcile.checkReturnVsAccountLiability();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.flagged.length, 1);
  assert.strictEqual(res.flagged[0].accountLiability, 500000);
  assert.strictEqual(res.flagged[0].unreducedAmount, 500000);
  delete global.DanaTitipanPortfolioAPI;
  delete global.D;
});

test('checkReturnVsAccountLiability() abaikan owner tanpa commitment (principalAmount null) walau ada baris D.titipanReturns', () => {
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o3', ownerName: 'Ayah', principalAmount: null, returnedTotal: 200000, allocatedPrincipal: 0, outstandingPrincipal: null }] }),
  };
  global.D = { debts: [{ id: 'd1', nilai: 300000, linkedAccountId: 'acc1', linkedOwnerId: 'o3' }] };
  const res = TitipanReconcile.checkReturnVsAccountLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
  delete global.D;
});

test('checkReturnVsAccountLiability() toleransi Rp1 (residu pembulatan float) -- tidak false-positive', () => {
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', principalAmount: 1000000, returnedTotal: 400000, allocatedPrincipal: 0, outstandingPrincipal: 600000 }] }),
  };
  global.D = { debts: [{ id: 'd1', nilai: 600000.5, linkedAccountId: 'acc1', linkedOwnerId: 'o1' }] };
  const res = TitipanReconcile.checkReturnVsAccountLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
  delete global.D;
});

test('checkReturnVsAccountLiability() TIDAK crash kalau build() melempar error (guard try/catch)', () => {
  global.DanaTitipanPortfolioAPI = { build: () => { throw new Error('boom'); } };
  global.D = { debts: [] };
  const res = TitipanReconcile.checkReturnVsAccountLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
  delete global.D;
});

test('checkReturnVsAccountLiability() aman (tidak throw, 0 flagged) kalau D/D.debts belum ada', () => {
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', principalAmount: 1000000, returnedTotal: 400000, allocatedPrincipal: 0, outstandingPrincipal: 600000 }] }),
  };
  delete global.D;
  const res = TitipanReconcile.checkReturnVsAccountLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
});

test('_actualLinkedAccountDebtTotalsByOwner() menjumlah per ownerId, abaikan baris tanpa linkedAccountId/linkedOwnerId', () => {
  global.D = {
    debts: [
      { id: 'd1', nilai: 100000, linkedAccountId: 'acc1', linkedOwnerId: 'o1' },
      { id: 'd2', nilai: 50000, linkedAccountId: 'acc2', linkedOwnerId: 'o1' },
      { id: 'd3', nilai: 999999, linkedAssetId: 'a1', linkedOwnerId: 'o1' }, // cabang Aset, bukan Akun -- diabaikan
      { id: 'd4', nilai: 777777 }, // utang biasa, bukan titipan -- diabaikan
    ],
  };
  const out = TitipanReconcile._actualLinkedAccountDebtTotalsByOwner();
  assert.deepStrictEqual(out, { o1: 150000 });
  delete global.D;
});

test('checkAll() menyertakan returnVsAccountLiability sbg sub-check ke-9, ok keseluruhan AND dari semua sub-check', () => {
  global.D = { assets: [], debts: [{ id: 'd1', nilai: 1000000, linkedAccountId: 'acc1', linkedOwnerId: 'o1' }], investments: [] };
  global.MultiOwnerEngine = { getOwners: () => ({ ok: true, owners: [] }) };
  global.Investment = { getOwners: () => [], holdingCost: () => 0 };
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', principalAmount: 1000000, returnedTotal: 400000, allocatedPrincipal: 0, outstandingPrincipal: 600000 }] }),
  };
  const r = TitipanReconcile.checkAll();
  assert.ok('returnVsAccountLiability' in r, 'checkAll() harus menyertakan field returnVsAccountLiability');
  assert.strictEqual(r.returnVsAccountLiability.ok, false);
  assert.strictEqual(r.ok, false, 'ok keseluruhan harus false krn returnVsAccountLiability gagal, walau 8 sub-check lain ok');
  delete global.D;
  delete global.MultiOwnerEngine;
  delete global.Investment;
  delete global.DanaTitipanPortfolioAPI;
});

test('checkAll() returnVsAccountLiability.ok=true & tidak mempengaruhi ok keseluruhan kalau tidak ada gap return akun', () => {
  global.D = { assets: [], debts: [], investments: [] };
  global.MultiOwnerEngine = { getOwners: () => ({ ok: true, owners: [] }) };
  global.Investment = { getOwners: () => [], holdingCost: () => 0 };
  delete global.DanaTitipanPortfolioAPI;
  const r = TitipanReconcile.checkAll();
  assert.strictEqual(r.returnVsAccountLiability.ok, true);
  assert.strictEqual(r.ok, true);
  delete global.D;
  delete global.MultiOwnerEngine;
  delete global.Investment;
});
