'use strict';
// tests/session02-dana-titipan-pool-status.test.js — SESI 2 (Aggregation/
// Status). Target: DanaTitipanPoolAPI.poolMasukTotal()/sisaAlokasi()/
// status(), derived read-only, boleh baca D.titipanCommitments.
// Cakupan Test Matrix (MASTER_HANDOFF §18): A, B, F, G, L, M.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  let uidCounter = 0;
  return loadSource(
    ['modules/finance/dana-titipan-pool-api.js'],
    { D, uid: () => 'p' + (++uidCounter), save: () => {} },
    ['DanaTitipanPoolAPI'],
  );
}

function commitment(ownerId, principalAmount) {
  return { id: 'tc_' + ownerId, ownerId, ownerName: ownerId, principalAmount, committedDate: '', notes: '', createdAt: 1, updatedAt: 1 };
}

// --- A: pool kosong + commitment lama -> NOT_MIGRATED ------------------

test('A1. status() = NOT_MIGRATED kalau titipanPool belum pernah diisi, walau titipanCommitments sudah ada (data lama)', () => {
  const D = { titipanCommitments: [commitment('budi', 7000000), commitment('sari', 2500000)] };
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'NOT_MIGRATED');
});

test('A2. sisaAlokasi() = null (BUKAN 0) saat NOT_MIGRATED', () => {
  const D = { titipanCommitments: [commitment('budi', 7000000)] };
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPoolAPI.sisaAlokasi(), null);
});

test('A3. overAllocatedAmount() = 0 saat NOT_MIGRATED (bukan negatif/undefined)', () => {
  const D = { titipanCommitments: [commitment('budi', 7000000)] };
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaTitipanPoolAPI.overAllocatedAmount(), 0);
});

// --- B: set opening balance -> status berubah sesuai total -------------

test('B1. Setelah addOpeningBalance(10jt) dgn commitment lama 9,5jt -> status OK, sisa 500rb', () => {
  const D = { titipanCommitments: [commitment('budi', 7000000), commitment('sari', 2500000)] };
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 });
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'OK');
  assert.equal(ctx.DanaTitipanPoolAPI.sisaAlokasi(), 500000);
  assert.equal(ctx.DanaTitipanPoolAPI.poolMasukTotal(), 10000000);
});

test('B2. Opening balance pas-pasan (commitment == pool) -> OK, sisa 0', () => {
  const D = { titipanCommitments: [commitment('budi', 9500000)] };
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 9500000 });
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'OK');
  assert.equal(ctx.DanaTitipanPoolAPI.sisaAlokasi(), 0);
});

// --- F: delete commitment -> sisa otomatis bertambah, tanpa logic tambahan --

test('F1. Delete commitment (langsung di D.titipanCommitments) -> sisaAlokasi() otomatis naik, tidak perlu API call apa pun ke pool-api', () => {
  const D = { titipanCommitments: [commitment('budi', 7000000), commitment('sari', 2500000)] };
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 10000000 });
  assert.equal(ctx.DanaTitipanPoolAPI.sisaAlokasi(), 500000);
  D.titipanCommitments.splice(D.titipanCommitments.findIndex((c) => c.ownerId === 'sari'), 1); // simulasi deleteCommitment('sari')
  assert.equal(ctx.DanaTitipanPoolAPI.sisaAlokasi(), 3000000); // 10jt - 7jt
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'OK');
});

// --- G: delete pool entry -> bisa memicu OVER_ALLOCATED -----------------

test('G1. Delete pool entry mengurangi poolMasukTotal, bisa memicu OVER_ALLOCATED, commitment TIDAK berubah/direbalance', () => {
  const D = { titipanCommitments: [commitment('budi', 9000000)] };
  const ctx = makeCtx(D);
  const dep1 = ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 5000000 });
  ctx.DanaTitipanPoolAPI.addDeposit({ amount: 4000000 });
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'OK'); // 9jt pool, 9jt commitment
  ctx.DanaTitipanPoolAPI.deleteEntry(dep1.id); // pool jadi 4jt
  assert.equal(ctx.DanaTitipanPoolAPI.poolMasukTotal(), 4000000);
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'OVER_ALLOCATED');
  assert.equal(ctx.DanaTitipanPoolAPI.overAllocatedAmount(), 5000000); // 9jt - 4jt
  assert.equal(ctx.DanaTitipanPoolAPI.sisaAlokasi(), 0); // tidak pernah negatif
  assert.equal(D.titipanCommitments[0].principalAmount, 9000000, 'commitment TIDAK boleh berubah otomatis');
});

// --- L: poolStatus tidak merusak allocationStatus per-owner existing ---

test('L1. status() (poolStatus) tidak menulis/menyentuh field allocationStatus milik owner manapun', () => {
  const D = {
    titipanCommitments: [Object.assign(commitment('budi', 7000000), { allocationStatus: 'OK' })],
  };
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 1000 }); // sengaja bikin OVER_ALLOCATED
  ctx.DanaTitipanPoolAPI.status();
  assert.equal(D.titipanCommitments[0].allocationStatus, 'OK', 'allocationStatus per-owner existing tidak boleh berubah oleh poolStatus');
});

test('L2. Nilai string status() bisa sama dengan allocationStatus ("OK"/"OVER_ALLOCATED") tapi keduanya field terpisah, tidak saling timpa', () => {
  const D = { titipanCommitments: [commitment('budi', 100)] };
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 50 });
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'OVER_ALLOCATED');
  assert.equal(D.titipanCommitments[0].allocationStatus, undefined); // pool-api tidak pernah set field ini
});

// --- M: tidak ada angka negatif ditampilkan -----------------------------

test('M1. sisaAlokasi() tidak pernah negatif walau over-allocated jauh', () => {
  const D = { titipanCommitments: [commitment('budi', 100000000)] };
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 1000000 });
  assert.equal(ctx.DanaTitipanPoolAPI.sisaAlokasi(), 0);
  assert.ok(ctx.DanaTitipanPoolAPI.overAllocatedAmount() > 0);
});

test('M2. overAllocatedAmount() tidak pernah negatif walau pool jauh lebih besar dari commitment', () => {
  const D = { titipanCommitments: [commitment('budi', 100)] };
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 100000000 });
  assert.equal(ctx.DanaTitipanPoolAPI.overAllocatedAmount(), 0);
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'OK');
});

test('M3. Tidak ada commitment sama sekali + pool sudah diisi -> sisa = seluruh pool, tidak negatif/error', () => {
  const D = { titipanCommitments: [] };
  const ctx = makeCtx(D);
  ctx.DanaTitipanPoolAPI.addOpeningBalance({ amount: 5000000 });
  assert.equal(ctx.DanaTitipanPoolAPI.sisaAlokasi(), 5000000);
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'OK');
});
