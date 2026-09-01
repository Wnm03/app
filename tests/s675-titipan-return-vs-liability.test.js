// tests/s675-titipan-return-vs-liability.test.js — SESI S675 (audit lanjutan
// "Total Titipan vs Utang/Aset/Akun"). recordReturn() (dana-titipan-
// commitment-return-api.js) SENGAJA "ISOLASI TOTAL" -- mencatat riwayat
// pengembalian TIDAK PERNAH ikut mengecilkan porsi owner di Aset/Investasi
// (keputusan desain sengaja, sama alasan checkPoolCommitment() dibuat
// informational). checkReturnVsLiability() (titipan-reconcile.js) menutup
// GAP KETAHUAN-nya: kalau owner tercatat sudah mengembalikan sebagian/
// seluruh pokok TAPI porsi aktualnya di Aset/Investasi (allocatedPrincipal,
// = nilai baris Buku Utang) belum ikut dikecilkan, itu diflag -- 100% reuse
// DanaTitipanPortfolioAPI.build(), 0 rumus baru.
const test = require('node:test');
const assert = require('node:assert');
const TitipanReconcile = require('../modules/finance/titipan-reconcile.js');

test('checkReturnVsLiability() ok=true kalau DanaTitipanPortfolioAPI belum dimuat (guard, 0 false-positive)', () => {
  delete global.DanaTitipanPortfolioAPI;
  const res = TitipanReconcile.checkReturnVsLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
});

test('checkReturnVsLiability() ok=true kalau belum ada owner yang tercatat mengembalikan apa pun (returnedTotal=0)', () => {
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', principalAmount: 1000000, returnedTotal: 0, allocatedPrincipal: 1000000, outstandingPrincipal: 1000000 }] }),
  };
  const res = TitipanReconcile.checkReturnVsLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
});

test('checkReturnVsLiability() ok=true kalau owner sudah mengembalikan sebagian DAN porsinya SUDAH ikut dikecilkan (allocatedPrincipal <= outstandingPrincipal)', () => {
  // Budi commit 1jt, kembalikan 400rb (outstanding seharusnya 600rb) --
  // porsinya di Aset SUDAH ikut dikecilkan jadi 600rb persis, 0 gap.
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', principalAmount: 1000000, returnedTotal: 400000, allocatedPrincipal: 600000, outstandingPrincipal: 600000 }] }),
  };
  const res = TitipanReconcile.checkReturnVsLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
});

test('checkReturnVsLiability() deteksi gap: owner sudah mengembalikan sebagian TAPI porsi di Aset/Investasi belum dikecilkan sama sekali', () => {
  // Budi commit 1jt, kembalikan 400rb (outstanding seharusnya 600rb) --
  // TAPI allocatedPrincipal (porsi real di Aset) MASIH 1jt penuh, persis
  // gap "recordReturn() dicatat, porsi lupa dikecilkan manual".
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', principalAmount: 1000000, returnedTotal: 400000, allocatedPrincipal: 1000000, outstandingPrincipal: 600000 }] }),
  };
  const res = TitipanReconcile.checkReturnVsLiability();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.flagged.length, 1);
  assert.strictEqual(res.flagged[0].ownerId, 'o1');
  assert.strictEqual(res.flagged[0].returnedTotal, 400000);
  assert.strictEqual(res.flagged[0].allocatedPrincipal, 1000000);
  assert.strictEqual(res.flagged[0].outstandingPrincipal, 600000);
  assert.strictEqual(res.flagged[0].unreducedAmount, 400000);
  delete global.DanaTitipanPortfolioAPI;
});

test('checkReturnVsLiability() deteksi gap: owner mengembalikan SELURUH pokok (full return) TAPI porsi masih ada di Aset/Investasi', () => {
  // Siti commit 500rb, kembalikan semuanya (outstanding=0) -- tapi
  // porsinya di holding investasi TIDAK PERNAH dihapus/dinolkan.
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o2', ownerName: 'Siti', principalAmount: 500000, returnedTotal: 500000, allocatedPrincipal: 500000, outstandingPrincipal: 0 }] }),
  };
  const res = TitipanReconcile.checkReturnVsLiability();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.flagged.length, 1);
  assert.strictEqual(res.flagged[0].unreducedAmount, 500000);
  delete global.DanaTitipanPortfolioAPI;
});

test('checkReturnVsLiability() abaikan owner tanpa commitment (principalAmount null) walau ada baris D.titipanReturns', () => {
  // Owner ber-returnedTotal>0 tapi principalAmount null (belum pernah
  // saveCommitment()) -- di luar scope check ini, 0 basis pembanding yang
  // valid (outstandingPrincipal sendiri tidak derivable tanpa principal).
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o3', ownerName: 'Ayah', principalAmount: null, returnedTotal: 200000, allocatedPrincipal: 300000, outstandingPrincipal: null }] }),
  };
  const res = TitipanReconcile.checkReturnVsLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
});

test('checkReturnVsLiability() toleransi Rp1 (residu pembulatan float) -- tidak false-positive', () => {
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', principalAmount: 1000000, returnedTotal: 400000, allocatedPrincipal: 600000.5, outstandingPrincipal: 600000 }] }),
  };
  const res = TitipanReconcile.checkReturnVsLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
});

test('checkReturnVsLiability() TIDAK crash kalau build() melempar error (guard try/catch)', () => {
  global.DanaTitipanPortfolioAPI = { build: () => { throw new Error('boom'); } };
  const res = TitipanReconcile.checkReturnVsLiability();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
  delete global.DanaTitipanPortfolioAPI;
});

test('checkAll() menyertakan returnVsLiability sbg sub-check ke-8, ok keseluruhan AND dari semua sub-check', () => {
  global.D = { assets: [], debts: [], investments: [] };
  global.MultiOwnerEngine = { getOwners: () => ({ ok: true, owners: [] }) };
  global.Investment = { getOwners: () => [], holdingCost: () => 0 };
  global.DanaTitipanPortfolioAPI = {
    build: () => ({ owners: [{ ownerId: 'o1', ownerName: 'Budi', principalAmount: 1000000, returnedTotal: 400000, allocatedPrincipal: 1000000, outstandingPrincipal: 600000 }] }),
  };
  const r = TitipanReconcile.checkAll();
  assert.ok('returnVsLiability' in r, 'checkAll() harus menyertakan field returnVsLiability');
  assert.strictEqual(r.returnVsLiability.ok, false);
  assert.strictEqual(r.ok, false, 'ok keseluruhan harus false krn returnVsLiability gagal, walau 7 sub-check lain ok');
  delete global.D;
  delete global.MultiOwnerEngine;
  delete global.Investment;
  delete global.DanaTitipanPortfolioAPI;
});

test('checkAll() returnVsLiability.ok=true & tidak mempengaruhi ok keseluruhan kalau tidak ada gap return', () => {
  global.D = { assets: [], debts: [], investments: [] };
  global.MultiOwnerEngine = { getOwners: () => ({ ok: true, owners: [] }) };
  global.Investment = { getOwners: () => [], holdingCost: () => 0 };
  delete global.DanaTitipanPortfolioAPI;
  const r = TitipanReconcile.checkAll();
  assert.strictEqual(r.returnVsLiability.ok, true);
  assert.strictEqual(r.ok, true);
  delete global.D;
  delete global.MultiOwnerEngine;
  delete global.Investment;
});
