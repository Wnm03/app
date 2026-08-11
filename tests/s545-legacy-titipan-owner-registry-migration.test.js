'use strict';
// tests/s545-legacy-titipan-owner-registry-migration.test.js — Sesi 545.
//
// GAP3-AUD-001 (docs/BUG_REGISTRY.md, ditutup dokumentasi-only di s485f/
// PATCH-README-s485f-gap3-audit-closeout.md, status OPEN/OUT OF SCOPE saat
// itu): Investment.getOwners() cabang legacy fundSource==='titipan' SELALU
// balik ownerId literal 'titipan_investor' apa pun nama titipanOwner-nya —
// 2 holding titipan beda orang collapse jadi 1 identitas kalau dibandingkan
// lintas holding/domain, padahal Aset (S490) & baris baru Investasi (S491)
// sudah pakai OwnerRegistry per-nama sejak lama.
//
// Sesi ini menambah Investment.migrateLegacyTitipanOwners() (implementasi
// fix, sesi terpisah dari audit s485f sesuai rencana). 0 modifikasi ke
// getOwners() sendiri — fallback sintesis literal TETAP ADA sebagai jaring
// pengaman utk holding yang belum/tidak dimigrasi (tests/s485a-*,
// tests/s484-*, tests/multi-owner-engine.test.js, tests/asset-titipan.test.js
// yang mengunci perilaku literal itu SENGAJA tidak disentuh — masih menguji
// fungsi sintesis mentah pada holding TANPA h.owners, yang tetap valid).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => { D._saved = (D._saved || 0) + 1; }, escapeHtml: (s) => String(s) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry'],
  );
}

function baseD(investments, debts) {
  return {
    investments: investments || [], investmentTx: [], investmentWatchlist: [],
    debts: debts || [], accounts: [], transactions: [], ownerRegistry: [],
  };
}

test('1. migrateLegacyTitipanOwners() derive ownerId registry per NAMA (bukan literal titipan_investor lagi)', () => {
  const D = baseD([
    { id: 'h1', name: 'Reksadana A', fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const { Investment, OwnerRegistry } = makeCtx(D);
  const res = Investment.migrateLegacyTitipanOwners();
  assert.equal(res.migrated, 1);
  const h = Investment.getHolding('h1');
  assert.ok(Array.isArray(h.owners));
  assert.equal(h.owners[0].ownerId, OwnerRegistry.findOrCreate('Budi'));
  assert.notEqual(h.owners[0].ownerId, 'titipan_investor');
  const owners = Investment.getOwners(h);
  assert.equal(owners[0].ownerId, OwnerRegistry.findOrCreate('Budi'));
});

test('2. 2 holding titipan beda nama -> 2 ownerId registry BEDA (fix inti GAP3-AUD-001)', () => {
  const D = baseD([
    { id: 'h1', name: 'Reksadana A', fundSource: 'titipan', titipanOwner: 'Budi' },
    { id: 'h2', name: 'Emas B', fundSource: 'titipan', titipanOwner: 'Siti' },
  ]);
  const { Investment } = makeCtx(D);
  Investment.migrateLegacyTitipanOwners();
  const h1 = Investment.getHolding('h1');
  const h2 = Investment.getHolding('h2');
  assert.notEqual(h1.owners[0].ownerId, h2.owners[0].ownerId);
});

test('3. nama sama di 2 holding beda -> collapse jadi 1 ownerId registry yang sama (dedup by nama, by design OwnerRegistry)', () => {
  const D = baseD([
    { id: 'h1', name: 'Reksadana A', fundSource: 'titipan', titipanOwner: 'Budi' },
    { id: 'h2', name: 'Emas B', fundSource: 'titipan', titipanOwner: 'budi' },
  ]);
  const { Investment } = makeCtx(D);
  Investment.migrateLegacyTitipanOwners();
  const h1 = Investment.getHolding('h1');
  const h2 = Investment.getHolding('h2');
  assert.equal(h1.owners[0].ownerId, h2.owners[0].ownerId);
});

test('4. idempotent: jalan 2x -> migrated kedua = 0, owners tidak berubah lagi', () => {
  const D = baseD([
    { id: 'h1', name: 'Reksadana A', fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const { Investment } = makeCtx(D);
  Investment.migrateLegacyTitipanOwners();
  const ownerIdAfterFirst = Investment.getHolding('h1').owners[0].ownerId;
  const res2 = Investment.migrateLegacyTitipanOwners();
  assert.equal(res2.migrated, 0);
  assert.equal(Investment.getHolding('h1').owners[0].ownerId, ownerIdAfterFirst);
});

test('5. holding sudah punya owners[] eksplisit (sudah pernah setOwners()) -> di-skip, tidak disentuh migrasi', () => {
  const D = baseD([
    { id: 'h1', name: 'Reksadana A', fundSource: 'titipan', owners: [{ ownerId: 'owner_manual', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const { Investment } = makeCtx(D);
  const res = Investment.migrateLegacyTitipanOwners();
  assert.equal(res.migrated, 0);
  assert.equal(res.skipped, 1);
  assert.equal(Investment.getHolding('h1').owners[0].ownerId, 'owner_manual');
});

test('6. holding fundSource sendiri (bukan titipan) -> di-skip', () => {
  const D = baseD([
    { id: 'h1', name: 'Saham C', fundSource: 'sendiri' },
  ]);
  const { Investment } = makeCtx(D);
  const res = Investment.migrateLegacyTitipanOwners();
  assert.equal(res.migrated, 0);
  assert.equal(res.skipped, 1);
});

test('7. KONTINUITAS UTANG: entri D.debts existing (linkedOwnerId literal titipan_investor) di-UPDATE in place, bukan hapus+buat baru', () => {
  const D = baseD(
    [{ id: 'h1', name: 'Reksadana A', fundSource: 'titipan', titipanOwner: 'Budi' }],
    [{ id: 'debt_old_1', name: 'Budi', nilai: 5000000, bunga: 0, cicilanBulanan: 0, tanggal: '2026-01-01', jatuhTempo: '', catatan: 'Dana titipan investasi: Reksadana A', lunas: false, linkedInvestmentId: 'h1', linkedOwnerId: 'titipan_investor' }],
  );
  const { Investment } = makeCtx(D);
  Investment.migrateLegacyTitipanOwners();
  const linked = D.debts.filter((d) => d.linkedInvestmentId === 'h1');
  assert.equal(linked.length, 1);
  assert.equal(linked[0].id, 'debt_old_1', 'id utang lama harus tetap sama (bukan dihapus+dibuat ulang)');
  assert.notEqual(linked[0].linkedOwnerId, 'titipan_investor');
  const h1 = Investment.getHolding('h1');
  assert.equal(linked[0].linkedOwnerId, h1.owners[0].ownerId);
});

test('8. holding titipan TANPA riwayat utang existing -> migrasi tetap jalan, _syncTitipanDebt() buat 1 entri baru dgn ownerId registry', () => {
  const D = baseD([
    { id: 'h1', name: 'Reksadana A', fundSource: 'titipan', titipanOwner: 'Budi' },
  ]);
  const { Investment } = makeCtx(D);
  Investment.migrateLegacyTitipanOwners();
  const linked = D.debts.filter((d) => d.linkedInvestmentId === 'h1');
  assert.equal(linked.length, 1);
  const h1 = Investment.getHolding('h1');
  assert.equal(linked[0].linkedOwnerId, h1.owners[0].ownerId);
});

test('9. regresi-guard: getOwners() pada holding TANPA owners[] (belum dimigrasi) MASIH balik literal titipan_investor (0 perubahan ke fallback sintesis)', () => {
  const D = baseD([]);
  const { Investment } = makeCtx(D);
  const h = { fundSource: 'titipan', titipanOwner: 'Budi' };
  const owners = Investment.getOwners(h);
  assert.equal(owners[0].ownerId, 'titipan_investor');
});
