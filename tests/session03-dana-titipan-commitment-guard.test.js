'use strict';
// tests/session03-dana-titipan-commitment-guard.test.js — SESI 3
// (Commitment Guard). Target: guard baru di `saveCommitment()`
// (`dana-titipan-commitment-return-api.js`), cross-call read-only ke
// `DanaTitipanPoolAPI` (§8/§9 MASTER_HANDOFF_DANA_TITIPAN_POOL_PORSI).
// Cakupan Test Matrix (§18): C, D, E, I, R.
//
// Pola harness SAMA PERSIS `tests/s485b-titipan-commitment-crud.test.js`
// (loadSource dgn source ASLI, bukan re-implement logic) -- ditambah
// `dana-titipan-pool-api.js` di urutan load (harus SEBELUM
// commitment-return-api.js, sama seperti urutan build.js sesungguhnya,
// §15) supaya `DanaTitipanPoolAPI` sudah terdefinisi saat guard baru
// dieksekusi.

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
      'modules/finance/dana-titipan-pool-api.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => { saveCalls++; }, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID') },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPoolAPI'],
  );
  ctx._saveCalls = () => saveCalls;
  return ctx;
}

// 3 owner (budi/sari/cici) via holding investasi, pola sama s485b/s514.
function threeOwnerD() {
  return {
    investments: [
      { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 50, ownerName: 'Budi', isSelf: false }, { ownerId: 'sari', porsi: 50, ownerName: 'Sari', isSelf: false }] },
      { id: 'h2', name: 'BBRI', unit: 100, avgPrice: 4000, currentPrice: 4500, owners: [{ ownerId: 'cici', porsi: 100, ownerName: 'Cici', isSelf: false }] },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [], accounts: [], transactions: [],
    titipanCommitments: [],
  };
}

function commitment(D, ownerId, ownerName, principalAmount) {
  D.titipanCommitments.push({ id: 'tc_' + ownerId, ownerId, ownerName, principalAmount, committedDate: '', notes: '', createdAt: 1, updatedAt: 1 });
}

// --- R: guard TIDAK aktif saat NOT_MIGRATED (pool belum pernah diisi) --

test('R1. Pool kosong (belum pernah addOpeningBalance/addDeposit) -> saveCommitment() tetap boleh berapa pun (perilaku existing, 0 guard)', () => {
  const D = threeOwnerD();
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPoolAPI.getEntries().length, 0);
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 999000000000 });
  assert.equal(rec.principalAmount, 999000000000);
  assert.equal(D.titipanCommitments.length, 1);
});

test('R2. Edit owner existing saat pool kosong (data lama) -> tetap bisa diedit tanpa terjebak guard', () => {
  const D = threeOwnerD();
  commitment(D, 'budi', 'Budi', 7000000);
  commitment(D, 'sari', 'Sari', 2500000);
  const ctx = makeCtx(D);
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 50000000 });
  assert.equal(rec.principalAmount, 50000000);
  assert.equal(D.titipanCommitments.find((c) => c.ownerId === 'budi').principalAmount, 50000000);
});

// --- D: commitment baru melebihi sisa -> ditolak, pesan persis, owner lain tidak berubah --

test('D1. Owner baru dgn principal > sisa -> throw pesan persis, D.titipanCommitments TIDAK berubah sama sekali', () => {
  const D = threeOwnerD();
  commitment(D, 'budi', 'Budi', 7000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 }); // sisa = 3.000.000
  const before = JSON.stringify(D.titipanCommitments);
  assert.throws(
    () => ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'sari', principalAmount: 5000000 }),
    /⚠️ Nominal melebihi dana yang tersedia\. Sisa dana hanya Rp 3\.000\.000\./,
  );
  assert.equal(JSON.stringify(D.titipanCommitments), before);
  assert.equal(D.titipanCommitments.length, 1);
});

test('D2. Owner lain (budi) tidak berubah sedikit pun setelah save owner lain (sari) ditolak', () => {
  const D = threeOwnerD();
  commitment(D, 'budi', 'Budi', 7000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 });
  assert.throws(() => ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'sari', principalAmount: 5000000 }));
  assert.equal(D.titipanCommitments.find((c) => c.ownerId === 'budi').principalAmount, 7000000);
});

test('D3. Tepat pas-pasan (sudahDialokasikanBaru === poolMasukTotal, bukan lebih) -> DITERIMA (guard pakai ">" bukan ">=")', () => {
  const D = threeOwnerD();
  commitment(D, 'budi', 'Budi', 7000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 }); // sisa = 3.000.000
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'sari', principalAmount: 3000000 });
  assert.equal(rec.principalAmount, 3000000);
  assert.equal(D.titipanCommitments.length, 2);
});

// --- E: edit owner existing -> guard pakai total BARU (bukan lama+baru) --

test('E1. Edit owner existing (budi: 7jt -> 7,5jt) dgn pool 8jt, budi satu-satunya owner -> DITERIMA (kalau salah tambah lama+baru = 14,5jt akan salah ditolak)', () => {
  const D = threeOwnerD();
  commitment(D, 'budi', 'Budi', 7000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 8000000 });
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 7500000 });
  assert.equal(rec.principalAmount, 7500000);
  assert.equal(D.titipanCommitments.length, 1);
  assert.equal(D.titipanCommitments[0].principalAmount, 7500000);
});

test('E2. Edit owner existing melebihi pool (budi: 7jt -> 9jt, pool 8jt) -> ditolak, nilai LAMA budi tetap 7jt (save gagal = tidak commit)', () => {
  const D = threeOwnerD();
  commitment(D, 'budi', 'Budi', 7000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 8000000 }); // sisa = 1.000.000
  assert.throws(
    () => ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 9000000 }),
    /Sisa dana hanya Rp 1\.000\.000\./,
  );
  assert.equal(D.titipanCommitments[0].principalAmount, 7000000);
});

test('E3. Edit salah satu dari 2 owner (budi naik) tidak memicu perhitungan ganda dari owner lain (sari) yang tidak diedit', () => {
  const D = threeOwnerD();
  commitment(D, 'budi', 'Budi', 3000000);
  commitment(D, 'sari', 'Sari', 2000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 }); // total 5jt, sisa 5jt
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 8000000 }); // budi 8jt + sari 2jt = 10jt, pas
  assert.equal(rec.principalAmount, 8000000);
  assert.equal(D.titipanCommitments.find((c) => c.ownerId === 'sari').principalAmount, 2000000);
});

// --- I: manual commitment lebih kecil dari sisa -> diterima ------------

test('I1. Manual input lebih kecil dari sisa (bukan pakai tombol Isi dari Sisa) -> diterima, sisa berkurang sesuai input manual', () => {
  const D = threeOwnerD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 });
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 1000000 }); // jauh di bawah sisa 10jt
  assert.equal(rec.principalAmount, 1000000);
  assert.equal(ctx.DanaTitipanPoolAPI.sisaAlokasi(), 9000000);
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'OK');
});

// --- C: commitment baru pakai "Isi dari Sisa" (live) -> tersimpan sesuai sisa --
// (UI tombolnya sendiri baru Sesi 5 -- di sini diuji dari sisi data layer:
// hasil DanaTitipanPoolAPI.sisaAlokasi() yang "diisikan" ke form dijamin
// LOLOS guard saveCommitment() persis pas-pasan, 0 sisa negatif setelahnya)

test('C1. Nilai persis dari sisaAlokasi() (simulasi "Isi dari Sisa") lolos guard & menghabiskan sisa jadi 0', () => {
  const D = threeOwnerD();
  commitment(D, 'budi', 'Budi', 6000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 });
  const sisaLive = ctx.DanaTitipanPoolAPI.sisaAlokasi(); // 4.000.000
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'sari', principalAmount: sisaLive });
  assert.equal(rec.principalAmount, 4000000);
  assert.equal(ctx.DanaTitipanPoolAPI.sisaAlokasi(), 0);
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'OK');
});

test('C2. "Isi dari Sisa" dibaca LIVE (bukan angka lama): pool entry baru ditambah SEBELUM save -> guard pakai sisa terbaru', () => {
  const D = threeOwnerD();
  commitment(D, 'budi', 'Budi', 6000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 }); // sisa awal 4jt
  ctx.DanaTitipanPoolAPI.addDeposit({ amount: 2000000 }); // sisa jadi 6jt sebelum submit
  const sisaLive = ctx.DanaTitipanPoolAPI.sisaAlokasi();
  assert.equal(sisaLive, 6000000);
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'cici', principalAmount: sisaLive });
  assert.equal(rec.principalAmount, 6000000);
});

// --- Regression: isolasi total tetap terjaga, guard tidak sentuh D.titipanPool --

test('Z1. Guard TIDAK PERNAH menulis ke D.titipanPool (read-only cross-call, §14)', () => {
  const D = threeOwnerD();
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 });
  const poolBefore = JSON.stringify(D.titipanPool);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 1000000 });
  assert.equal(JSON.stringify(D.titipanPool), poolBefore);
});

test('Z2. Guard OVER_ALLOCATED existing (pool sudah over sebelum save ini) -> commitment lain yg TIDAK melebihi batas tambahan tetap ditolak kalau total makin lebih', () => {
  const D = threeOwnerD();
  commitment(D, 'budi', 'Budi', 9000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 8000000 }); // sudah OVER_ALLOCATED, sisa=0
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'OVER_ALLOCATED');
  assert.throws(
    () => ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'sari', principalAmount: 1 }),
    /Sisa dana hanya Rp 0\./,
  );
});
