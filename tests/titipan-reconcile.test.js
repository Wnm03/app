// tests/titipan-reconcile.test.js — test TitipanReconcile (modules/finance/titipan-reconcile.js).
// Pola sama dgn tests/*.test.js lain: node:test + assert, mock D/MultiOwnerEngine minimal.
const test = require('node:test');
const assert = require('node:assert');
const TitipanReconcile = require('../modules/finance/titipan-reconcile.js');

function setupGlobals({ assets = [], debts = [], ownersByAsset = {}, investments = [], ownersByHolding = {}, costByHolding = {}, ownerRegistry }) {
  global.D = { assets, debts, investments };
  if (ownerRegistry !== undefined) global.D.ownerRegistry = ownerRegistry;
  global.MultiOwnerEngine = {
    getOwners(a) {
      return { ok: true, owners: ownersByAsset[a.id] || [] };
    },
  };
  global.Investment = {
    getOwners(h) { return ownersByHolding[h.id] || []; },
    holdingCost(h) { return costByHolding[h.id] || 0; },
  };
}

test('check() ok=true kalau expected & actual sama persis', () => {
  const a = { id: 'a1', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [{ id: 'd1', nilai: 300000, linkedAssetId: 'a1', linkedOwnerId: 'o1' }],
    ownersByAsset: { a1: [{ ownerId: 'o1', isSelf: false, porsi: 30 }] },
  });
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.missing, []);
  assert.deepStrictEqual(res.orphan, []);
  assert.deepStrictEqual(res.mismatch, []);
});

test('check() deteksi missing (sync lupa dipanggil)', () => {
  const a = { id: 'a2', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [],
    ownersByAsset: { a2: [{ ownerId: 'o1', isSelf: false, porsi: 40 }] },
  });
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.missing.length, 1);
  assert.strictEqual(res.missing[0].key, 'a2::o1');
  assert.strictEqual(res.missing[0].expected, 400000);
});

test('check() deteksi orphan (owner sudah dicabut tapi utang nyangkut)', () => {
  const a = { id: 'a3', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [{ id: 'd1', nilai: 200000, linkedAssetId: 'a3', linkedOwnerId: 'o_lama' }],
    ownersByAsset: { a3: [] }, // owner sudah dihapus/porsi jadi 0
  });
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.orphan.length, 1);
  assert.strictEqual(res.orphan[0].key, 'a3::o_lama');
});

test('check() deteksi mismatch (nilai beda, lupa di-update ulang)', () => {
  const a = { id: 'a4', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [{ id: 'd1', nilai: 100000, linkedAssetId: 'a4', linkedOwnerId: 'o1' }],
    ownersByAsset: { a4: [{ ownerId: 'o1', isSelf: false, porsi: 50 }] }, // seharusnya 500000
  });
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.mismatch.length, 1);
  assert.strictEqual(res.mismatch[0].expected, 500000);
  assert.strictEqual(res.mismatch[0].actual, 100000);
});

test('check() toleransi Rp1 (residu pembulatan) tidak dianggap mismatch', () => {
  const a = { id: 'a5', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [{ id: 'd1', nilai: 333333.5, linkedAssetId: 'a5', linkedOwnerId: 'o1' }],
    ownersByAsset: { a5: [{ ownerId: 'o1', isSelf: false, porsi: 33.3334 }] },
  });
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, true);
});

// --- Cabang Investasi (S583 sesi-2) -------------------------------------

test('check() cabang investasi: ok=true kalau expected & actual sama persis', () => {
  const h = { id: 'h1' };
  setupGlobals({
    investments: [h],
    debts: [{ id: 'd1', nilai: 250000, linkedInvestmentId: 'h1', linkedOwnerId: 'o1' }],
    ownersByHolding: { h1: [{ ownerId: 'o1', isSelf: false, porsi: 25 }] },
    costByHolding: { h1: 1000000 },
  });
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, true);
});

test('check() cabang investasi: deteksi missing (sync lupa dipanggil)', () => {
  const h = { id: 'h2' };
  setupGlobals({
    investments: [h],
    debts: [],
    ownersByHolding: { h2: [{ ownerId: 'o1', isSelf: false, porsi: 50 }] },
    costByHolding: { h2: 2000000 },
  });
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.missing.length, 1);
  assert.strictEqual(res.missing[0].key, 'inv::h2::o1');
  assert.strictEqual(res.missing[0].expected, 1000000);
});

test('check() cabang investasi: deteksi orphan (owner sudah dicabut)', () => {
  const h = { id: 'h3' };
  setupGlobals({
    investments: [h],
    debts: [{ id: 'd1', nilai: 500000, linkedInvestmentId: 'h3', linkedOwnerId: 'titipan_investor' }],
    ownersByHolding: { h3: [] },
    costByHolding: { h3: 1000000 },
  });
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.orphan.length, 1);
  assert.strictEqual(res.orphan[0].key, 'inv::h3::titipan_investor');
});

test('check() cabang investasi: deteksi mismatch (nilai beda)', () => {
  const h = { id: 'h4' };
  setupGlobals({
    investments: [h],
    debts: [{ id: 'd1', nilai: 100000, linkedInvestmentId: 'h4', linkedOwnerId: 'o1' }],
    ownersByHolding: { h4: [{ ownerId: 'o1', isSelf: false, porsi: 50 }] }, // seharusnya 500000
    costByHolding: { h4: 1000000 },
  });
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.mismatch.length, 1);
  assert.strictEqual(res.mismatch[0].key, 'inv::h4::o1');
  assert.strictEqual(res.mismatch[0].expected, 500000);
  assert.strictEqual(res.mismatch[0].actual, 100000);
});

test('check() cabang aset & investasi digabung, key space tidak tabrakan walau id sama', () => {
  const a = { id: 'x1', nilai: 1000000 };
  const h = { id: 'x1' }; // sengaja id sama dgn asset -- harus tetap terpisah via prefix 'inv::'
  setupGlobals({
    assets: [a],
    investments: [h],
    debts: [
      { id: 'd1', nilai: 300000, linkedAssetId: 'x1', linkedOwnerId: 'o1' },
      { id: 'd2', nilai: 700000, linkedInvestmentId: 'x1', linkedOwnerId: 'o1' },
    ],
    ownersByAsset: { x1: [{ ownerId: 'o1', isSelf: false, porsi: 30 }] },
    ownersByHolding: { x1: [{ ownerId: 'o1', isSelf: false, porsi: 70 }] },
    costByHolding: { x1: 1000000 },
  });
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, true);
});

// --- checkOwnerIdConsistency() (S583 sesi-4, Rekomendasi #3 varian audit) ---

test('checkOwnerIdConsistency() ok=true kalau nama sama -> ownerId sama lintas Aset & Investasi', () => {
  const a = { id: 'a1' };
  const h = { id: 'h1' };
  setupGlobals({
    assets: [a],
    investments: [h],
    ownersByAsset: { a1: [{ ownerId: 'owner_budi', ownerName: 'Budi', isSelf: false, porsi: 30 }] },
    ownersByHolding: { h1: [{ ownerId: 'owner_budi', ownerName: 'Budi', isSelf: false, porsi: 70 }] },
  });
  const res = TitipanReconcile.checkOwnerIdConsistency();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.divergent, []);
});

test('checkOwnerIdConsistency() deteksi divergen: nama sama tapi ownerId beda antar domain', () => {
  const a = { id: 'a1' };
  const h = { id: 'h1' };
  setupGlobals({
    assets: [a],
    investments: [h],
    ownersByAsset: { a1: [{ ownerId: 'uid_old_1', ownerName: 'Budi', isSelf: false, porsi: 30 }] },
    ownersByHolding: { h1: [{ ownerId: 'owner_budi_registry', ownerName: 'Budi', isSelf: false, porsi: 70 }] },
  });
  const res = TitipanReconcile.checkOwnerIdConsistency();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.divergent.length, 1);
  assert.strictEqual(res.divergent[0].name, 'Budi');
  assert.deepStrictEqual(res.divergent[0].ids.sort(), ['owner_budi_registry', 'uid_old_1']);
});

test('checkOwnerIdConsistency() match nama case-insensitive & trim (bukan false-positive)', () => {
  const a = { id: 'a1' };
  const h = { id: 'h1' };
  setupGlobals({
    assets: [a],
    investments: [h],
    ownersByAsset: { a1: [{ ownerId: 'owner_budi', ownerName: '  Budi  ', isSelf: false, porsi: 30 }] },
    ownersByHolding: { h1: [{ ownerId: 'owner_budi', ownerName: 'budi', isSelf: false, porsi: 70 }] },
  });
  const res = TitipanReconcile.checkOwnerIdConsistency();
  assert.strictEqual(res.ok, true);
});

test('checkOwnerIdConsistency() owner SELF diabaikan (tidak masuk perbandingan)', () => {
  const a = { id: 'a1' };
  const h = { id: 'h1' };
  setupGlobals({
    assets: [a],
    investments: [h],
    ownersByAsset: { a1: [{ ownerId: 'SELF', ownerName: 'Milik Sendiri', isSelf: true, porsi: 100 }] },
    ownersByHolding: { h1: [{ ownerId: 'SELF', ownerName: 'Milik Sendiri', isSelf: true, porsi: 100 }] },
  });
  const res = TitipanReconcile.checkOwnerIdConsistency();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.divergent, []);
});

test('checkOwnerIdConsistency() nama beda tetap dianggap owner beda (tidak dipaksa gabung)', () => {
  const a = { id: 'a1' };
  const h = { id: 'h1' };
  setupGlobals({
    assets: [a],
    investments: [h],
    ownersByAsset: { a1: [{ ownerId: 'owner_budi', ownerName: 'Budi', isSelf: false, porsi: 30 }] },
    ownersByHolding: { h1: [{ ownerId: 'owner_siti', ownerName: 'Siti', isSelf: false, porsi: 70 }] },
  });
  const res = TitipanReconcile.checkOwnerIdConsistency();
  assert.strictEqual(res.ok, true);
});

test('checkOwnerIdConsistency() D belum ada -> ok=true, tidak throw', () => {
  delete global.D;
  const res = TitipanReconcile.checkOwnerIdConsistency();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.divergent, []);
});

// --- checkDebtNameStaleness() (S583 sesi-5, Rekomendasi #2 lanjutan) ---

test('checkDebtNameStaleness() ok=true kalau nama debt sudah sinkron dgn registry', () => {
  setupGlobals({
    debts: [{ id: 'd1', name: 'Budi', linkedOwnerId: 'owner_budi' }],
    ownerRegistry: [{ id: 'owner_budi', name: 'Budi' }],
  });
  const res = TitipanReconcile.checkDebtNameStaleness();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.stale, []);
});

test('checkDebtNameStaleness() deteksi stale: debt.name masih nama lama pasca rename() registry', () => {
  setupGlobals({
    debts: [{ id: 'd1', name: 'Budi', linkedOwnerId: 'owner_budi' }],
    ownerRegistry: [{ id: 'owner_budi', name: 'Budi Santoso' }], // sudah di-rename(), debt belum ke-resync
  });
  const res = TitipanReconcile.checkDebtNameStaleness();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.stale.length, 1);
  assert.deepStrictEqual(res.stale[0], { debtId: 'd1', linkedOwnerId: 'owner_budi', debtName: 'Budi', registryName: 'Budi Santoso' });
});

test('checkDebtNameStaleness() trim dibandingkan (bukan false-positive krn whitespace)', () => {
  setupGlobals({
    debts: [{ id: 'd1', name: '  Budi  ', linkedOwnerId: 'owner_budi' }],
    ownerRegistry: [{ id: 'owner_budi', name: 'Budi' }],
  });
  const res = TitipanReconcile.checkDebtNameStaleness();
  assert.strictEqual(res.ok, true);
});

test('checkDebtNameStaleness() lewati debt yg linkedOwnerId-nya tidak ada di registry (mis. belum migrasi/synth legacy)', () => {
  setupGlobals({
    debts: [{ id: 'd1', name: 'Investor Lama', linkedOwnerId: 'titipan_investor' }],
    ownerRegistry: [{ id: 'owner_budi', name: 'Budi' }],
  });
  const res = TitipanReconcile.checkDebtNameStaleness();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.stale, []);
});

test('checkDebtNameStaleness() owner SELF diabaikan', () => {
  setupGlobals({
    debts: [{ id: 'd1', name: 'Siapapun', linkedOwnerId: 'SELF' }],
    ownerRegistry: [],
  });
  const res = TitipanReconcile.checkDebtNameStaleness();
  assert.strictEqual(res.ok, true);
});

test('checkDebtNameStaleness() debt tanpa linkedOwnerId (utang biasa, bukan titipan) diabaikan', () => {
  setupGlobals({
    debts: [{ id: 'd1', name: 'Utang Biasa' }],
    ownerRegistry: [{ id: 'owner_budi', name: 'Budi' }],
  });
  const res = TitipanReconcile.checkDebtNameStaleness();
  assert.strictEqual(res.ok, true);
});

test('checkDebtNameStaleness() D.ownerRegistry belum ada -> ok=true, tidak throw', () => {
  global.D = { debts: [{ id: 'd1', name: 'Budi', linkedOwnerId: 'owner_budi' }] };
  const res = TitipanReconcile.checkDebtNameStaleness();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.stale, []);
});

test('checkDebtNameStaleness() D belum ada -> ok=true, tidak throw', () => {
  delete global.D;
  const res = TitipanReconcile.checkDebtNameStaleness();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.stale, []);
});

// --- checkOwnershipDualSource() (S636 Opsi C) ---

function setupOwnershipGlobals({ assets = [], ownersByAsset = {}, resolveType = {} }) {
  global.D = { assets };
  global.OwnershipEngine = {
    resolve(a) { return { type: (resolveType[a.id] !== undefined) ? resolveType[a.id] : 'SELF' }; },
  };
  global.MultiOwnerEngine = {
    getOwners(a) {
      const entry = ownersByAsset[a.id];
      if (entry === undefined) return { ok: true, isSynthesized: true, owners: [] };
      return { ok: true, isSynthesized: false, owners: entry };
    },
  };
}

test('checkOwnershipDualSource() flag aset kasus Majoris: ownership non-SELF + owners[] eksplisit non-SELF', () => {
  const a = { id: 'majoris', name: 'Majoris', nilai: 11750918 };
  setupOwnershipGlobals({
    assets: [a],
    resolveType: { majoris: 'INVESTOR' },
    ownersByAsset: {
      majoris: [
        { ownerId: 'renov', isSelf: false, porsi: 85.043 },
        { ownerId: 'mas_sihab', isSelf: false, porsi: 14.467 },
        { ownerId: 'aku', isSelf: false, porsi: 0.49 },
      ],
    },
  });
  const res = TitipanReconcile.checkOwnershipDualSource();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.flagged.length, 1);
  assert.strictEqual(res.flagged[0].assetId, 'majoris');
  assert.strictEqual(res.flagged[0].ownType, 'INVESTOR');
  assert.ok(Math.abs(res.flagged[0].nonSelfPorsi - 100) < 0.001);
});

test('checkOwnershipDualSource() TIDAK flag: cuma ownership non-SELF, owners[] disintesis (isSynthesized:true)', () => {
  const a = { id: 'a1', name: 'Aset 1' };
  setupOwnershipGlobals({ assets: [a], resolveType: { a1: 'INVESTOR' } });
  const res = TitipanReconcile.checkOwnershipDualSource();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
});

test('checkOwnershipDualSource() TIDAK flag: cuma owners[] eksplisit, ownership SELF', () => {
  const a = { id: 'a2', name: 'Aset 2' };
  setupOwnershipGlobals({
    assets: [a],
    resolveType: { a2: 'SELF' },
    ownersByAsset: { a2: [{ ownerId: 'budi', isSelf: false, porsi: 50 }] },
  });
  const res = TitipanReconcile.checkOwnershipDualSource();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
});

test('checkOwnershipDualSource() TIDAK flag: owners[] eksplisit tapi semua porsi SELF', () => {
  const a = { id: 'a3', name: 'Aset 3' };
  setupOwnershipGlobals({
    assets: [a],
    resolveType: { a3: 'FAMILY' },
    ownersByAsset: { a3: [{ ownerId: 'SELF', isSelf: true, porsi: 100 }] },
  });
  const res = TitipanReconcile.checkOwnershipDualSource();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
});

test('checkOwnershipDualSource() aman (0 crash, ok=true) kalau OwnershipEngine/MultiOwnerEngine belum dimuat', () => {
  delete global.OwnershipEngine;
  delete global.MultiOwnerEngine;
  global.D = { assets: [{ id: 'a4', name: 'Aset 4' }] };
  const res = TitipanReconcile.checkOwnershipDualSource();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
});

test('checkOwnershipDualSource() aman (0 crash, ok=true) kalau D belum ada', () => {
  delete global.D;
  const res = TitipanReconcile.checkOwnershipDualSource();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.flagged, []);
});

// --- checkAll() (S583 sesi-6) ---

test('checkAll() ok=true kalau ketiga sub-check ok', () => {
  const a = { id: 'a1', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [{ id: 'd1', name: 'Budi', nilai: 300000, linkedAssetId: 'a1', linkedOwnerId: 'owner_budi' }],
    ownersByAsset: { a1: [{ ownerId: 'owner_budi', ownerName: 'Budi', isSelf: false, porsi: 30 }] },
    ownerRegistry: [{ id: 'owner_budi', name: 'Budi' }],
  });
  const res = TitipanReconcile.checkAll();
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.sync.ok, true);
  assert.strictEqual(res.ownerIdConsistency.ok, true);
  assert.strictEqual(res.debtNameStaleness.ok, true);
});

test('checkAll() ok=false kalau HANYA sync gagal (owner konsisten & nama fresh)', () => {
  const a = { id: 'a2', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [],
    ownersByAsset: { a2: [{ ownerId: 'owner_budi', ownerName: 'Budi', isSelf: false, porsi: 40 }] },
    ownerRegistry: [{ id: 'owner_budi', name: 'Budi' }],
  });
  const res = TitipanReconcile.checkAll();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.sync.ok, false);
  assert.strictEqual(res.sync.missing.length, 1);
  assert.strictEqual(res.ownerIdConsistency.ok, true);
  assert.strictEqual(res.debtNameStaleness.ok, true);
});

test('checkAll() ok=false kalau HANYA ownerIdConsistency gagal', () => {
  const a = { id: 'a3', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [],
    ownersByAsset: { a3: [{ ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 0 }] },
    investments: [{ id: 'h1' }],
    ownersByHolding: { h1: [{ ownerId: 'o2', ownerName: 'Budi', isSelf: false, porsi: 0 }] },
    ownerRegistry: [],
  });
  const res = TitipanReconcile.checkAll();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.sync.ok, true);
  assert.strictEqual(res.ownerIdConsistency.ok, false);
  assert.strictEqual(res.ownerIdConsistency.divergent.length, 1);
  assert.strictEqual(res.debtNameStaleness.ok, true);
});

test('checkAll() ok=false kalau HANYA debtNameStaleness gagal (rename blm disync ke debt.name)', () => {
  setupGlobals({
    assets: [],
    debts: [{ id: 'd1', name: 'Budi', linkedOwnerId: 'owner_budi' }],
    ownerRegistry: [{ id: 'owner_budi', name: 'Budi Santoso' }],
  });
  const res = TitipanReconcile.checkAll();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.sync.ok, true);
  assert.strictEqual(res.ownerIdConsistency.ok, true);
  assert.strictEqual(res.debtNameStaleness.ok, false);
  assert.strictEqual(res.debtNameStaleness.stale.length, 1);
  assert.strictEqual(res.debtNameStaleness.stale[0].registryName, 'Budi Santoso');
});

test('checkAll() tidak throw kalau D/registry belum ada sama sekali', () => {
  delete global.D;
  const res = TitipanReconcile.checkAll();
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.sync.ok, true);
  assert.strictEqual(res.ownerIdConsistency.ok, true);
  assert.strictEqual(res.debtNameStaleness.ok, true);
});

// --- repairOrphans() (S595) --------------------------------------------

test('repairOrphans() menghapus baris orphan cabang Aset, sisa yang valid tidak tersentuh', () => {
  const a = { id: 'a10', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [
      { id: 'd1', nilai: 200000, linkedAssetId: 'a10', linkedOwnerId: 'o_lama' }, // orphan
      { id: 'd2', nilai: 300000, linkedAssetId: 'a10', linkedOwnerId: 'o1' }, // valid
    ],
    ownersByAsset: { a10: [{ ownerId: 'o1', isSelf: false, porsi: 30 }] },
  });
  const res = TitipanReconcile.repairOrphans();
  assert.strictEqual(res.removed, 1);
  assert.deepStrictEqual(res.keys, ['a10::o_lama']);
  assert.strictEqual(D.debts.length, 1);
  assert.strictEqual(D.debts[0].id, 'd2');
});

test('repairOrphans() menghapus baris orphan cabang Investasi (fallback titipan_investor)', () => {
  const h = { id: 'h1' };
  setupGlobals({
    investments: [h],
    debts: [{ id: 'd1', nilai: 500000, linkedInvestmentId: 'h1' }], // linkedOwnerId absen -> fallback
    ownersByHolding: { h1: [] }, // owner sudah dicabut
    costByHolding: { h1: 500000 },
  });
  const res = TitipanReconcile.repairOrphans();
  assert.strictEqual(res.removed, 1);
  assert.deepStrictEqual(res.keys, ['inv::h1::titipan_investor']);
  assert.strictEqual(D.debts.length, 0);
});

test('repairOrphans() tidak menghapus apa pun kalau tidak ada gap', () => {
  const a = { id: 'a11', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [{ id: 'd1', nilai: 300000, linkedAssetId: 'a11', linkedOwnerId: 'o1' }],
    ownersByAsset: { a11: [{ ownerId: 'o1', isSelf: false, porsi: 30 }] },
  });
  const res = TitipanReconcile.repairOrphans();
  assert.strictEqual(res.removed, 0);
  assert.deepStrictEqual(res.keys, []);
  assert.strictEqual(D.debts.length, 1);
});

test('repairOrphans() tidak menyentuh utang biasa (bukan titipan, tanpa linkedAssetId/linkedInvestmentId)', () => {
  setupGlobals({
    assets: [],
    debts: [{ id: 'd1', nilai: 100000, name: 'Utang pribadi' }],
  });
  const res = TitipanReconcile.repairOrphans();
  assert.strictEqual(res.removed, 0);
  assert.strictEqual(D.debts.length, 1);
});

test('repairOrphans() aman (tidak throw, 0 mutasi) kalau D belum ada', () => {
  delete global.D;
  const res = TitipanReconcile.repairOrphans();
  assert.strictEqual(res.removed, 0);
  assert.deepStrictEqual(res.keys, []);
});

// --- repairMissing() (S621) ---------------------------------------------
// Bugfix: tombol "Perbaiki Gap Dana Titipan" sebelumnya cuma pernah
// memanggil repairOrphans() (orphan-only) -- kalau gapnya `missing` murni
// (persis laporan nyata "sync.ok=false (missing:1 orphan:0 mismatch:0)"),
// tombol itu tidak berbuat apa-apa sama sekali. repairMissing() menutup
// separuh yang hilang itu dgn menelusuri key `missing` balik ke Aset/Holding
// sumbernya lalu memanggil ulang jalur sync yang SUDAH ADA (TitipanSync.
// reconcile()/Aset._syncOwnerDebts() cabang Aset, Investment._syncTitipanDebt()
// cabang Investasi) -- tes di sini mock fungsi sync itu spy yang benar-benar
// menulis baris debt (persis efek fungsi asli), supaya tesnya menguji
// "check() ok=true setelahnya", bukan cuma "fungsi sync dipanggil".

test('repairMissing() cabang Aset: membuat baris yang hilang lewat TitipanSync.reconcile(), check() jadi ok', () => {
  const a = { id: 'a20', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [],
    ownersByAsset: { a20: [{ ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 40 }] },
  });
  global.TitipanSync = {
    reconcile(asset) {
      D.debts.push({ id: 'd_new', nilai: asset.nilai * 0.4, linkedAssetId: asset.id, linkedOwnerId: 'o1' });
      return { ok: true, synced: true };
    },
  };
  const pre = TitipanReconcile.check();
  assert.strictEqual(pre.missing.length, 1);
  const res = TitipanReconcile.repairMissing();
  assert.strictEqual(res.synced, 1);
  assert.deepStrictEqual(res.unresolved, []);
  assert.strictEqual(TitipanReconcile.check().ok, true);
  delete global.TitipanSync;
});

test('repairMissing() cabang Aset: fallback ke Aset._syncOwnerDebts() kalau TitipanSync tidak ada', () => {
  const a = { id: 'a21', nilai: 500000 };
  setupGlobals({
    assets: [a],
    debts: [],
    ownersByAsset: { a21: [{ ownerId: 'o1', isSelf: false, porsi: 50 }] },
  });
  global.Aset = {
    _syncOwnerDebts(asset) {
      D.debts.push({ id: 'd_new2', nilai: asset.nilai * 0.5, linkedAssetId: asset.id, linkedOwnerId: 'o1' });
    },
  };
  const res = TitipanReconcile.repairMissing();
  assert.strictEqual(res.synced, 1);
  assert.strictEqual(TitipanReconcile.check().ok, true);
  delete global.Aset;
});

test('repairMissing() cabang Investasi: membuat baris yang hilang lewat Investment._syncTitipanDebt()', () => {
  const h = { id: 'h20' };
  setupGlobals({
    investments: [h],
    debts: [],
    ownersByHolding: { h20: [{ ownerId: 'o1', isSelf: false, porsi: 25 }] },
    costByHolding: { h20: 800000 },
  });
  global.Investment.getOwners = (hh) => [{ ownerId: 'o1', isSelf: false, porsi: 25 }];
  global.Investment.holdingCost = (hh) => 800000;
  global.Investment._syncTitipanDebt = (hh) => {
    D.debts.push({ id: 'd_new3', nilai: 200000, linkedInvestmentId: hh.id, linkedOwnerId: 'o1' });
  };
  const res = TitipanReconcile.repairMissing();
  assert.strictEqual(res.synced, 1);
  assert.strictEqual(TitipanReconcile.check().ok, true);
});

test('repairMissing() 1 aset dgn >1 owner missing cuma disinkron SEKALI (dedup by id)', () => {
  const a = { id: 'a22', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [],
    ownersByAsset: { a22: [
      { ownerId: 'o1', isSelf: false, porsi: 20 },
      { ownerId: 'o2', isSelf: false, porsi: 30 },
    ] },
  });
  let calls = 0;
  global.TitipanSync = {
    reconcile(asset) {
      calls++;
      D.debts.push({ id: 'd_o1', nilai: 200000, linkedAssetId: asset.id, linkedOwnerId: 'o1' });
      D.debts.push({ id: 'd_o2', nilai: 300000, linkedAssetId: asset.id, linkedOwnerId: 'o2' });
    },
  };
  assert.strictEqual(TitipanReconcile.check().missing.length, 2);
  const res = TitipanReconcile.repairMissing();
  assert.strictEqual(calls, 1);
  assert.strictEqual(res.synced, 1);
  assert.strictEqual(TitipanReconcile.check().ok, true);
  delete global.TitipanSync;
});

test('repairMissing() key yang sumbernya (aset/holding) sudah tidak ada masuk ke unresolved, tidak dibuang diam-diam', () => {
  setupGlobals({
    assets: [],
    debts: [],
  });
  // Simulasikan gap yang sumber asetnya sudah dihapus: mock check() langsung.
  const orig = TitipanReconcile.check;
  TitipanReconcile.check = () => ({ ok: false, missing: [{ key: 'a_hilang::o1', expected: 100 }], orphan: [], mismatch: [] });
  const res = TitipanReconcile.repairMissing();
  assert.strictEqual(res.synced, 0);
  assert.deepStrictEqual(res.unresolved, ['asset:a_hilang']);
  TitipanReconcile.check = orig;
});

test('repairMissing() tidak melakukan apa pun kalau tidak ada gap missing', () => {
  const a = { id: 'a23', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [{ id: 'd1', nilai: 300000, linkedAssetId: 'a23', linkedOwnerId: 'o1' }],
    ownersByAsset: { a23: [{ ownerId: 'o1', isSelf: false, porsi: 30 }] },
  });
  const res = TitipanReconcile.repairMissing();
  assert.strictEqual(res.synced, 0);
  assert.deepStrictEqual(res.unresolved, []);
});

test('repairMissing() aman (tidak throw, 0 mutasi) kalau D belum ada', () => {
  delete global.D;
  const res = TitipanReconcile.repairMissing();
  assert.strictEqual(res.synced, 0);
  assert.deepStrictEqual(res.unresolved, []);
});

// --- FIX S639: owner ber-status 'milik' harus dikecualikan dari expected(),
// sama persis _syncOwnerDebts()/_syncTitipanDebt() -- sebelum fix ini,
// check() SELALU melaporkan owner 'milik' sbg missing walau repairMissing()
// sudah dipanggil berkali-kali (expected & actual tidak akan pernah ketemu).

test('check() TIDAK menandai owner berstatus "milik" sbg missing (cabang Aset)', () => {
  const a = { id: 'aMilik', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [],
    ownersByAsset: { aMilik: [{ ownerId: 'o1', isSelf: false, porsi: 50 }] },
  });
  global.Aset = { getOwnerSettlement: (asset, ownerId) => (asset.id === 'aMilik' && ownerId === 'o1') ? 'milik' : 'titipan' };
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.missing, []);
  delete global.Aset;
});

test('check() TETAP menandai owner "titipan" sbg missing walau owner LAIN di aset yg sama "milik" (cabang Aset)', () => {
  const a = { id: 'aCampur', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [],
    ownersByAsset: { aCampur: [
      { ownerId: 'oMilik', isSelf: false, porsi: 30 },
      { ownerId: 'oTitipan', isSelf: false, porsi: 20 },
    ] },
  });
  global.Aset = { getOwnerSettlement: (asset, ownerId) => (ownerId === 'oMilik') ? 'milik' : 'titipan' };
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.missing.length, 1);
  assert.strictEqual(res.missing[0].key, 'aCampur::oTitipan');
  delete global.Aset;
});

test('check() toleran (anggap "titipan") kalau Aset/getOwnerSettlement belum termuat -- 0 regresi', () => {
  const a = { id: 'aNoAset', nilai: 1000000 };
  setupGlobals({
    assets: [a],
    debts: [{ id: 'd1', nilai: 500000, linkedAssetId: 'aNoAset', linkedOwnerId: 'o1' }],
    ownersByAsset: { aNoAset: [{ ownerId: 'o1', isSelf: false, porsi: 50 }] },
  });
  // global.Aset sengaja tidak diset di sini.
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, true);
});

test('check() TIDAK menandai owner berstatus "milik" sbg missing (cabang Investasi)', () => {
  const h = { id: 'hMilik' };
  setupGlobals({
    investments: [h],
    debts: [],
    ownersByHolding: { hMilik: [{ ownerId: 'o1', isSelf: false, porsi: 50 }] },
    costByHolding: { hMilik: 1000000 },
  });
  global.Investment.getOwnerSettlement = (holding, ownerId) => (holding.id === 'hMilik' && ownerId === 'o1') ? 'milik' : 'titipan';
  const res = TitipanReconcile.check();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.missing, []);
});

test('repairMissing() + check() ulang: owner "milik" tetap ok=true sesudah "diperbaiki" (regresi tombol "Perbaiki Gap" macet)', () => {
  const a = { id: 'aRepair', nilai: 2000000 };
  setupGlobals({
    assets: [a],
    debts: [],
    ownersByAsset: { aRepair: [{ ownerId: 'o1', isSelf: false, porsi: 50 }] },
  });
  global.Aset = {
    getOwnerSettlement: () => 'milik',
    // _syncOwnerDebts sengaja TIDAK didefinisikan di sini -- pola nyata:
    // owner 'milik' memang tidak pernah ditulis _syncOwnerDebts(), jadi
    // repairMissing() untuk key ini akan masuk unresolved (tidak ada yang
    // perlu direkonsiliasi), TAPI check() sesudahnya tetap harus ok=true
    // krn expected() sendiri sudah tidak lagi memintanya.
  };
  const pre = TitipanReconcile.check();
  assert.strictEqual(pre.ok, true, 'seharusnya sudah ok SEBELUM repair -- owner "milik" bukan gap');
  TitipanReconcile.repairMissing();
  const post = TitipanReconcile.check();
  assert.strictEqual(post.ok, true);
  delete global.Aset;
});

// --- repairOwnerIdConsistency() / repairDebtNameStaleness() /
// repairTransactionOwnerRefs() (SESI FIX-2026-09-01-lanjutan2, menutup
// jalur perbaikan checkOwnerIdConsistency()/checkDebtNameStaleness()/
// checkTransactionOwnerRefs() yang sebelumnya audit-only) ---

test('repairOwnerIdConsistency() satukan ownerId divergen ke id yang terdaftar di registry', () => {
  const a = { id: 'a1', owners: [{ ownerId: 'uid_old_1', ownerName: 'Budi', isSelf: false, porsi: 30 }] };
  const h = { id: 'h1', owners: [{ ownerId: 'owner_budi_registry', ownerName: 'Budi', isSelf: false, porsi: 70 }] };
  global.D = {
    assets: [a], investments: [h], debts: [
      { id: 'd1', linkedAssetId: 'a1', linkedOwnerId: 'uid_old_1', name: 'Budi', nilai: 300 },
    ],
    ownerRegistry: [{ id: 'owner_budi_registry', name: 'Budi' }],
  };
  global.MultiOwnerEngine = { getOwners(entity) { return { ok: true, owners: (entity.owners || []).slice() }; } };
  global.Investment = { getOwners(entity) { return (entity.owners || []).slice(); }, holdingCost: () => 0 };
  const pre = TitipanReconcile.checkOwnerIdConsistency();
  assert.strictEqual(pre.ok, false);
  const res = TitipanReconcile.repairOwnerIdConsistency();
  assert.strictEqual(res.conflicts.length, 0);
  assert.ok(res.unified > 0);
  assert.strictEqual(a.owners[0].ownerId, 'owner_budi_registry');
  assert.strictEqual(a.owners[0].ownerName, 'Budi');
  assert.strictEqual(D.debts[0].linkedOwnerId, 'owner_budi_registry');
  const post = TitipanReconcile.checkOwnerIdConsistency();
  assert.strictEqual(post.ok, true);
});

test('repairOwnerIdConsistency() skip UTUH grup yang tabrakan (1 entity sudah punya kedua id)', () => {
  const a = {
    id: 'a1',
    owners: [
      { ownerId: 'id_a', ownerName: 'Budi', isSelf: false, porsi: 30 },
      { ownerId: 'id_b', ownerName: 'Budi', isSelf: false, porsi: 20 },
    ],
  };
  global.D = { assets: [a], investments: [], debts: [], ownerRegistry: [{ id: 'id_a', name: 'Budi' }] };
  global.MultiOwnerEngine = { getOwners(entity) { return { ok: true, owners: (entity.owners || []).slice() }; } };
  const res = TitipanReconcile.repairOwnerIdConsistency();
  assert.strictEqual(res.unified, 0);
  assert.strictEqual(res.conflicts.length, 1);
  assert.strictEqual(a.owners[0].ownerId, 'id_a', 'tidak disentuh -- konflik, butuh review manual');
  assert.strictEqual(a.owners[1].ownerId, 'id_b', 'tidak disentuh -- konflik, butuh review manual');
});

test('repairOwnerIdConsistency() tidak melakukan apa pun kalau tidak ada divergensi', () => {
  const a = { id: 'a1', owners: [{ ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 30 }] };
  global.D = { assets: [a], investments: [], debts: [] };
  global.MultiOwnerEngine = { getOwners(entity) { return { ok: true, owners: (entity.owners || []).slice() }; } };
  const res = TitipanReconcile.repairOwnerIdConsistency();
  assert.deepStrictEqual(res, { unified: 0, conflicts: [] });
});

test('repairOwnerIdConsistency() aman (tidak throw, 0 mutasi) kalau D belum ada', () => {
  delete global.D;
  const res = TitipanReconcile.repairOwnerIdConsistency();
  assert.deepStrictEqual(res, { unified: 0, conflicts: [] });
});

test('repairDebtNameStaleness() sinkronkan D.debts[].name yang stale ke nama registry', () => {
  global.D = {
    ownerRegistry: [{ id: 'o1', name: 'Budi Santoso' }],
    debts: [
      { id: 'd1', linkedOwnerId: 'o1', name: 'Budi', nilai: 300 },
      { id: 'd2', linkedOwnerId: 'SELF', name: 'Utang biasa', nilai: 100 },
    ],
  };
  const pre = TitipanReconcile.checkDebtNameStaleness();
  assert.strictEqual(pre.ok, false);
  const res = TitipanReconcile.repairDebtNameStaleness();
  assert.strictEqual(res.synced, 1);
  assert.strictEqual(D.debts[0].name, 'Budi Santoso');
  assert.strictEqual(D.debts[1].name, 'Utang biasa', 'utang non-titipan tidak tersentuh');
  const post = TitipanReconcile.checkDebtNameStaleness();
  assert.strictEqual(post.ok, true);
});

test('repairDebtNameStaleness() tidak melakukan apa pun kalau tidak ada yang stale', () => {
  global.D = { ownerRegistry: [{ id: 'o1', name: 'Budi' }], debts: [{ id: 'd1', linkedOwnerId: 'o1', name: 'Budi' }] };
  const res = TitipanReconcile.repairDebtNameStaleness();
  assert.deepStrictEqual(res, { synced: 0 });
});

test('repairDebtNameStaleness() aman (tidak throw, 0 mutasi) kalau D belum ada', () => {
  delete global.D;
  const res = TitipanReconcile.repairDebtNameStaleness();
  assert.deepStrictEqual(res, { synced: 0 });
});

test('repairTransactionOwnerRefs() pindahkan deductionOwnerId basi ke 1 owner valid yang tidak ambigu', () => {
  global.D = { transactions: [{ id: 't1', accountId: 'acc1', deductionOwnerId: 'owner_lama' }] };
  global.resolveOwnerDefaultForAccount = (accId) => ({ ok: true, owners: [{ ownerId: 'owner_baru' }] });
  const pre = TitipanReconcile.checkTransactionOwnerRefs();
  assert.strictEqual(pre.ok, false);
  const res = TitipanReconcile.repairTransactionOwnerRefs();
  assert.strictEqual(res.fixed, 1);
  assert.strictEqual(res.cleared, 0);
  assert.strictEqual(D.transactions[0].deductionOwnerId, 'owner_baru');
  const post = TitipanReconcile.checkTransactionOwnerRefs();
  assert.strictEqual(post.ok, true);
  delete global.resolveOwnerDefaultForAccount;
});

test('repairTransactionOwnerRefs() kosongkan deductionOwnerId kalau ambigu (0 atau >1 owner valid)', () => {
  global.D = { transactions: [{ id: 't1', accountId: 'acc1', deductionOwnerId: 'owner_lama' }] };
  global.resolveOwnerDefaultForAccount = (accId) => ({ ok: true, owners: [{ ownerId: 'owner_x' }, { ownerId: 'owner_y' }] });
  const res = TitipanReconcile.repairTransactionOwnerRefs();
  assert.strictEqual(res.fixed, 0);
  assert.strictEqual(res.cleared, 1);
  assert.deepStrictEqual(res.unresolved, ['t1']);
  assert.strictEqual(D.transactions[0].deductionOwnerId, null);
  delete global.resolveOwnerDefaultForAccount;
});

test('repairTransactionOwnerRefs() tidak melakukan apa pun kalau tidak ada orphan', () => {
  global.D = { transactions: [{ id: 't1', accountId: 'acc1', deductionOwnerId: 'o1' }] };
  global.resolveOwnerDefaultForAccount = (accId) => ({ ok: true, owners: [{ ownerId: 'o1' }] });
  const res = TitipanReconcile.repairTransactionOwnerRefs();
  assert.deepStrictEqual(res, { fixed: 0, cleared: 0, unresolved: [] });
  delete global.resolveOwnerDefaultForAccount;
});

test('repairTransactionOwnerRefs() aman (tidak throw, 0 mutasi) kalau resolveOwnerDefaultForAccount belum dimuat', () => {
  global.D = { transactions: [{ id: 't1', accountId: 'acc1', deductionOwnerId: 'owner_lama' }] };
  delete global.resolveOwnerDefaultForAccount;
  const res = TitipanReconcile.repairTransactionOwnerRefs();
  assert.deepStrictEqual(res, { fixed: 0, cleared: 0, unresolved: [] });
});

// --- checkPendingOwnerReview() / flag _deductionOwnerReviewNeeded (poin 4,
// sesi lanjutan hasil audit 2026-09-01 -- menutup "unresolved cuma nilai
// balik sesaat, tidak kelihatan lagi setelah tombol perbaikan ditekan") ---

test('repairTransactionOwnerRefs() tandai transaksi yang di-cleared dgn _deductionOwnerReviewNeeded', () => {
  global.D = { transactions: [{ id: 't1', accountId: 'acc1', deductionOwnerId: 'owner_lama' }] };
  global.resolveOwnerDefaultForAccount = (accId) => ({ ok: true, owners: [{ ownerId: 'owner_x' }, { ownerId: 'owner_y' }] });
  TitipanReconcile.repairTransactionOwnerRefs();
  assert.strictEqual(D.transactions[0]._deductionOwnerReviewNeeded, true);
  delete global.resolveOwnerDefaultForAccount;
});

test('repairTransactionOwnerRefs() TIDAK menandai transaksi yang berhasil di-fix (fixed, bukan cleared)', () => {
  global.D = { transactions: [{ id: 't1', accountId: 'acc1', deductionOwnerId: 'owner_lama' }] };
  global.resolveOwnerDefaultForAccount = (accId) => ({ ok: true, owners: [{ ownerId: 'owner_baru' }] });
  TitipanReconcile.repairTransactionOwnerRefs();
  assert.strictEqual(D.transactions[0]._deductionOwnerReviewNeeded, undefined);
  delete global.resolveOwnerDefaultForAccount;
});

test('checkPendingOwnerReview() daftar transaksi ber-flag yang deductionOwnerId-nya masih kosong', () => {
  global.D = {
    transactions: [
      { id: 't1', accountId: 'acc1', deductionOwnerId: null, _deductionOwnerReviewNeeded: true, tanggal: '2026-08-01', jumlah: 50000, catatan: 'Beli galon' },
      { id: 't2', accountId: 'acc1', deductionOwnerId: 'o1' }, // tx biasa, tidak pernah kena repair
    ],
  };
  const res = TitipanReconcile.checkPendingOwnerReview();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.pending.length, 1);
  assert.strictEqual(res.pending[0].txId, 't1');
  assert.strictEqual(res.pending[0].catatan, 'Beli galon');
});

test('checkPendingOwnerReview() tx yang sudah diisi ulang manual lolos dari daftar walau flag lama masih menempel', () => {
  global.D = {
    transactions: [
      { id: 't1', accountId: 'acc1', deductionOwnerId: 'owner_baru_manual', _deductionOwnerReviewNeeded: true },
    ],
  };
  const res = TitipanReconcile.checkPendingOwnerReview();
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.pending, []);
});

test('checkPendingOwnerReview() ok=true kalau tidak ada transaksi ber-flag sama sekali', () => {
  global.D = { transactions: [{ id: 't1', accountId: 'acc1', deductionOwnerId: 'o1' }] };
  const res = TitipanReconcile.checkPendingOwnerReview();
  assert.deepStrictEqual(res, { ok: true, pending: [] });
});

test('checkPendingOwnerReview() aman (tidak throw) kalau D/D.transactions belum ada', () => {
  delete global.D;
  assert.deepStrictEqual(TitipanReconcile.checkPendingOwnerReview(), { ok: true, pending: [] });
  global.D = {};
  assert.deepStrictEqual(TitipanReconcile.checkPendingOwnerReview(), { ok: true, pending: [] });
});

test('checkAll() menyertakan pendingOwnerReview sbg sub-check (informasional)', () => {
  global.D = {
    assets: [], investments: [], debts: [],
    transactions: [{ id: 't1', accountId: 'acc1', deductionOwnerId: null, _deductionOwnerReviewNeeded: true }],
  };
  const res = TitipanReconcile.checkAll();
  assert.strictEqual(res.pendingOwnerReview.ok, false);
  assert.strictEqual(res.pendingOwnerReview.pending.length, 1);
  assert.strictEqual(res.ok, false, 'pendingOwnerReview ikut AND ke checkAll().ok (dipakai warnIfNotOk(), non-blocking di jalur lain)');
});

// --- checkOwnerIdConflicts() (poin 1, sesi lanjutan -- surface tabrakan
// owner ID yang sebelumnya dilewati repairOwnerIdConsistency() cuma via
// console.warn, sekarang bisa dibaca ulang kapan saja TANPA menjalankan
// repair, murni derivasi PURE dari D.assets/D.investments/D.ownerRegistry) ---

test('checkOwnerIdConflicts() deteksi tabrakan (1 entity sudah punya kedua id divergen sekaligus)', () => {
  const a = {
    id: 'a1',
    owners: [
      { ownerId: 'id_a', ownerName: 'Budi', isSelf: false, porsi: 30 },
      { ownerId: 'id_b', ownerName: 'Budi', isSelf: false, porsi: 20 },
    ],
  };
  global.D = { assets: [a], investments: [], debts: [], ownerRegistry: [{ id: 'id_a', name: 'Budi' }] };
  global.MultiOwnerEngine = { getOwners(entity) { return { ok: true, owners: (entity.owners || []).slice() }; } };
  const res = TitipanReconcile.checkOwnerIdConflicts();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.conflicts.length, 1);
  assert.strictEqual(res.conflicts[0].name, 'Budi');
  assert.strictEqual(res.conflicts[0].id, 'a1');
});

test('checkOwnerIdConflicts() TIDAK menulis apa pun ke D (PURE) -- beda dgn repairOwnerIdConsistency()', () => {
  const a = {
    id: 'a1',
    owners: [
      { ownerId: 'id_a', ownerName: 'Budi', isSelf: false, porsi: 30 },
      { ownerId: 'id_b', ownerName: 'Budi', isSelf: false, porsi: 20 },
    ],
  };
  global.D = { assets: [a], investments: [], debts: [], ownerRegistry: [{ id: 'id_a', name: 'Budi' }] };
  global.MultiOwnerEngine = { getOwners(entity) { return { ok: true, owners: (entity.owners || []).slice() }; } };
  TitipanReconcile.checkOwnerIdConflicts();
  assert.strictEqual(a.owners[0].ownerId, 'id_a', '0 mutasi -- checkOwnerIdConflicts() cuma baca');
  assert.strictEqual(a.owners[1].ownerId, 'id_b', '0 mutasi -- checkOwnerIdConflicts() cuma baca');
});

test('checkOwnerIdConflicts() ok=true kalau divergensi ADA tapi tidak bertabrakan (bisa disatukan aman)', () => {
  const a = { id: 'a1', owners: [{ ownerId: 'uid_old_1', ownerName: 'Budi', isSelf: false, porsi: 30 }] };
  const h = { id: 'h1', owners: [{ ownerId: 'owner_budi_registry', ownerName: 'Budi', isSelf: false, porsi: 70 }] };
  global.D = { assets: [a], investments: [h], debts: [], ownerRegistry: [{ id: 'owner_budi_registry', name: 'Budi' }] };
  global.MultiOwnerEngine = { getOwners(entity) { return { ok: true, owners: (entity.owners || []).slice() }; } };
  global.Investment = { getOwners(entity) { return (entity.owners || []).slice(); }, holdingCost: () => 0 };
  const res = TitipanReconcile.checkOwnerIdConflicts();
  assert.deepStrictEqual(res, { ok: true, conflicts: [] });
});

test('checkOwnerIdConflicts() ok=true kalau tidak ada divergensi sama sekali', () => {
  global.D = { assets: [], investments: [], debts: [] };
  const res = TitipanReconcile.checkOwnerIdConflicts();
  assert.deepStrictEqual(res, { ok: true, conflicts: [] });
});

test('checkOwnerIdConflicts() aman (tidak throw) kalau D belum ada', () => {
  delete global.D;
  assert.deepStrictEqual(TitipanReconcile.checkOwnerIdConflicts(), { ok: true, conflicts: [] });
});

test('checkAll() menyertakan ownerIdConflicts sbg sub-check (informasional)', () => {
  const a = {
    id: 'a1',
    owners: [
      { ownerId: 'id_a', ownerName: 'Budi', isSelf: false, porsi: 30 },
      { ownerId: 'id_b', ownerName: 'Budi', isSelf: false, porsi: 20 },
    ],
  };
  global.D = { assets: [a], investments: [], debts: [], ownerRegistry: [{ id: 'id_a', name: 'Budi' }] };
  global.MultiOwnerEngine = { getOwners(entity) { return { ok: true, owners: (entity.owners || []).slice() }; } };
  const res = TitipanReconcile.checkAll();
  assert.strictEqual(res.ownerIdConflicts.ok, false);
  assert.strictEqual(res.ownerIdConflicts.conflicts.length, 1);
  assert.strictEqual(res.ok, false, 'ownerIdConflicts ikut AND ke checkAll().ok (dipakai warnIfNotOk(), non-blocking di jalur lain)');
});
