'use strict';
// tests/realokasi-sisa-kuota-lintas-domain.test.js — SESI FIX-2026-09-01, fitur baru
// "🔀 Alihkan sisa ke aset lain" (RealokasiSisaKuota, modules/shared/realokasi-sisa-kuota.js).
// Cakup Bagian 1 yang diminta eksplisit user: kandidat realokasi HARUS menjangkau KEDUA domain
// porsi kepemilikan yang sudah ada di project ini -- Buku Aset (D.assets) DAN Holding Investasi
// (D.investments) -- bukan cuma Buku Aset spt draft fitur sebelumnya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(overrides) {
  return Object.assign({
    assets: [], investments: [], accounts: [], transactions: [], debts: [],
    investmentTx: [], investmentWatchlist: [], titipanCommitments: [], titipanReturns: [],
    ownerRegistry: [],
  }, overrides || {});
}

function makeCtx(D) {
  const savedCalls = { count: 0 };
  return {
    ctx: loadSource(
      ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/shared/realokasi-sisa-kuota.js'],
      {
        D,
        uid: () => 'u' + (D._n = (D._n || 0) + 1),
        save: () => { savedCalls.count++; },
        escapeHtml: (s) => String(s),
        fmt: (n) => String(n),
        fmtFull: (n) => String(n),
        sameId: (a, b) => String(a) === String(b),
        recalcAccBalance: () => 0,
      },
      ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'RealokasiSisaKuota'],
    ),
    savedCalls,
  };
}

// Aset._applyOwnersToAsset() diperlukan RealokasiSisaKuota.applyAllocationRow() saat targetnya
// aset Buku Aset -- fungsi ini DIBANGUN sesi ini juga (aset-owners.js), tapi aset-owners.js
// terlalu berat dependency DOM-nya utk dites lewat loadSource() murni (lihat catatan file itu:
// banyak method baca document.getElementById). Test ini menyuntik stub Aset MINIMAL yang
// method _applyOwnersToAsset()-nya 100% REPLIKA logic asli (0 DOM) -- bukan dites via source asli
// (itu ranah smoke-test.js/manual QA), tapi memverifikasi KONTRAK yang dipanggil
// RealokasiSisaKuota.applyAllocationRow() (owners[] final -> D.assets ditulis) benar.
function makeAsetStub(D, MultiOwnerEngine, save) {
  return {
    DUST_THRESHOLD_RP: 100,
    _applyOwnersToAsset(a, owners) {
      const res = MultiOwnerEngine.setOwners(a, owners);
      if (!res.ok) throw new Error(res.reason);
      Object.assign(a, { owners: res.entity.owners });
      save();
      return a;
    },
  };
}

test('findCandidates() — mencakup KEDUA domain: aset Buku Aset & Holding Investasi yang punya ruang kosong (porsi Milik Sendiri)', () => {
  const D = baseD({
    assets: [
      { id: 'aRumah', name: 'Rumah', nilai: 500000000, owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] },
      { id: 'aMobil', name: 'Mobil', nilai: 200000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    investments: [
      { id: 'hMajoris', name: 'Majoris', unit: 1, avgPrice: 20000000, currentPrice: 20000000, owners: [{ ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true }, { ownerId: 'budi', porsi: 50, ownerName: 'Budi', isSelf: false }] },
    ],
  });
  const { ctx } = makeCtx(D);
  const cands = ctx.RealokasiSisaKuota.findCandidates({});
  // Rumah: 100% SELF x 500jt = 500jt ruang. Mobil: 0% SELF -> 0 (skip). Majoris (holding): 50%
  // SELF x 20jt = 10jt ruang.
  const rumah = cands.find((c) => c.id === 'aRumah');
  const majoris = cands.find((c) => c.id === 'hMajoris');
  assert.ok(rumah, 'Rumah harus jadi kandidat (ada ruang SELF)');
  assert.equal(rumah.type, 'asset');
  assert.equal(rumah.room, 500000000);
  assert.ok(majoris, 'Majoris (Holding Investasi) harus IKUT jadi kandidat -- inti fix Bagian 1');
  assert.equal(majoris.type, 'holding');
  assert.equal(majoris.room, 10000000);
  assert.ok(!cands.find((c) => c.id === 'aMobil'), 'Mobil (0% SELF) tidak boleh jadi kandidat');
  // Terurut ruang TERBESAR dulu (Rumah 500jt > Majoris 10jt).
  assert.equal(cands[0].id, 'aRumah');
});

test('findCandidates() — aset yang tertaut Holding Investasi (a.investmentId) dikecualikan dari domain Buku Aset', () => {
  const D = baseD({
    assets: [{ id: 'aEmas', name: 'Emas (proksi)', nilai: 100000000, investmentId: 'hEmas', owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] }],
    investments: [],
  });
  const { ctx } = makeCtx(D);
  const cands = ctx.RealokasiSisaKuota.findCandidates({});
  assert.equal(cands.length, 0, 'Aset tertaut Holding Investasi tidak boleh muncul sbg kandidat -- porsinya diatur di holding, bukan di sini');
});

test('findCandidates() — exclude entity yang sedang dibuka di modal caller', () => {
  const D = baseD({
    assets: [{ id: 'aRumah', name: 'Rumah', nilai: 500000000, owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] }],
    investments: [{ id: 'hMajoris', name: 'Majoris', unit: 1, avgPrice: 20000000, currentPrice: 20000000, owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] }],
  });
  const { ctx } = makeCtx(D);
  const candsExcludeAsset = ctx.RealokasiSisaKuota.findCandidates({ assetId: 'aRumah' });
  assert.ok(!candsExcludeAsset.find((c) => c.id === 'aRumah'));
  const candsExcludeHolding = ctx.RealokasiSisaKuota.findCandidates({ holdingId: 'hMajoris' });
  assert.ok(!candsExcludeHolding.find((c) => c.id === 'hMajoris'));
});

test('buildPlan() — isi ruang kosong TERBESAR dulu (greedy), berhenti begitu sisa habis', () => {
  const { ctx } = makeCtx(baseD());
  const candidates = [
    { type: 'asset', id: 'a1', name: 'Kecil', room: 100000 },
    { type: 'asset', id: 'a2', name: 'Besar', room: 5000000 },
    { type: 'holding', id: 'h1', name: 'Sedang', room: 1000000 },
  ].sort((x, y) => y.room - x.room);
  const built = ctx.RealokasiSisaKuota.buildPlan(377244, candidates);
  assert.equal(built.plan.length, 1, 'sisa 377.244 harus habis di kandidat terbesar pertama (5jt ruang > sisa)');
  assert.equal(built.plan[0].id, 'a2');
  assert.equal(built.plan[0].alloc, 377244);
  assert.equal(built.unallocated, 0);
});

test('buildPlan() — meluber ke kandidat berikutnya kalau kandidat pertama tidak cukup, sisa unallocated kalau semua kandidat habis', () => {
  const { ctx } = makeCtx(baseD());
  const candidates = [
    { type: 'holding', id: 'h1', name: 'H1', room: 300000 },
    { type: 'asset', id: 'a1', name: 'A1', room: 200000 },
  ];
  const built = ctx.RealokasiSisaKuota.buildPlan(700000, candidates);
  assert.equal(built.plan.length, 2);
  assert.equal(built.plan[0].alloc, 300000);
  assert.equal(built.plan[1].alloc, 200000);
  assert.equal(built.unallocated, 200000, '700rb - 300rb - 200rb = 200rb tetap belum teralokasi');
});

test('applyAllocationRow() — target Holding Investasi: porsi owner titipan naik, porsi SELF turun sebesar itu, owner titipan LAIN di holding itu TIDAK tersentuh', () => {
  const D = baseD({
    investments: [{ id: 'hMajoris', name: 'Majoris', unit: 1, avgPrice: 20000000, currentPrice: 20000000, owners: [
      { ownerId: 'SELF', porsi: 60, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'siti', porsi: 40, ownerName: 'Siti', isSelf: false },
    ] }],
  });
  const { ctx, savedCalls } = makeCtx(D);
  const item = { type: 'holding', id: 'hMajoris', name: 'Majoris', alloc: 2000000 }; // 10% dari 20jt
  const res = ctx.RealokasiSisaKuota.applyAllocationRow(item, 'budi', 'Budi');
  assert.ok(res.ok, res.reason);
  assert.equal(Math.round(res.actualAlloc), 2000000);
  const h = D.investments[0];
  const budi = h.owners.find((o) => o.ownerId === 'budi');
  const self = h.owners.find((o) => o.isSelf);
  const siti = h.owners.find((o) => o.ownerId === 'siti');
  assert.ok(budi, 'owner titipan baru (budi) harus ditambahkan sbg baris pemilik holding');
  assert.equal(budi.porsi, 10);
  assert.equal(self.porsi, 50, 'porsi SELF turun 10% (60 -> 50), PERSIS sejumlah yang dialihkan');
  assert.equal(siti.porsi, 40, 'porsi owner titipan LAIN (Siti) TIDAK PERNAH ikut dipotong');
  const total = h.owners.reduce((s, o) => s + o.porsi, 0);
  assert.ok(Math.abs(total - 100) < 0.01, 'total porsi tetap 100% setelah realokasi');
  assert.ok(savedCalls.count >= 1, 'Investment.setOwners() harus memanggil save() (side-effect existing, 0 diubah)');
});

test('applyAllocationRow() — owner titipan yang SUDAH punya porsi di target: porsi ditambah (bukan baris duplikat)', () => {
  const D = baseD({
    investments: [{ id: 'hMajoris', name: 'Majoris', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [
      { ownerId: 'SELF', porsi: 70, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'budi', porsi: 30, ownerName: 'Budi', isSelf: false },
    ] }],
  });
  const { ctx } = makeCtx(D);
  const item = { type: 'holding', id: 'hMajoris', name: 'Majoris', alloc: 1000000 }; // 10% dari 10jt
  const res = ctx.RealokasiSisaKuota.applyAllocationRow(item, 'budi', 'Budi');
  assert.ok(res.ok, res.reason);
  const h = D.investments[0];
  const budiRows = h.owners.filter((o) => o.ownerId === 'budi');
  assert.equal(budiRows.length, 1, 'tidak boleh ada baris duplikat utk owner yang sama');
  assert.equal(budiRows[0].porsi, 40);
});

test('applyAllocationRow() — target Buku Aset: dispatch ke Aset._applyOwnersToAsset() (stub), porsi SELF terpotong, aset lain di D.assets TIDAK ikut berubah', () => {
  const D = baseD({
    assets: [
      { id: 'aRumah', name: 'Rumah', nilai: 400000000, owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] },
      { id: 'aTanah', name: 'Tanah', nilai: 300000000, owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] },
    ],
  });
  const { ctx, savedCalls } = makeCtx(D);
  ctx.Aset = makeAsetStub(D, ctx.MultiOwnerEngine, () => { savedCalls.count++; });
  const item = { type: 'asset', id: 'aRumah', name: 'Rumah', alloc: 40000000 }; // 10% dari 400jt
  const res = ctx.RealokasiSisaKuota.applyAllocationRow(item, 'wati', 'Wati');
  assert.ok(res.ok, res.reason);
  const rumah = D.assets.find((a) => a.id === 'aRumah');
  const tanah = D.assets.find((a) => a.id === 'aTanah');
  const wati = rumah.owners.find((o) => o.ownerId === 'wati');
  const self = rumah.owners.find((o) => o.isSelf);
  assert.ok(wati);
  assert.equal(wati.porsi, 10);
  assert.equal(self.porsi, 90);
  assert.equal(tanah.owners[0].porsi, 100, 'aset LAIN yang tidak ditarget realokasi tidak boleh berubah sama sekali');
});

test('applyAllocationRow() — target Buku Aset gagal jika Aset._applyOwnersToAsset belum dimuat (fail-safe, bukan crash)', () => {
  const D = baseD({ assets: [{ id: 'aRumah', name: 'Rumah', nilai: 100000000, owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] }] });
  const { ctx } = makeCtx(D);
  // Aset SENGAJA tidak disuntik ke sandbox (typeof Aset === 'undefined').
  const res = ctx.RealokasiSisaKuota.applyAllocationRow({ type: 'asset', id: 'aRumah', name: 'Rumah', alloc: 10000000 }, 'x', 'X');
  assert.equal(res.ok, false);
  assert.match(res.reason, /belum siap dimuat/);
});

test('applyAllocationRow() — target tidak ditemukan (mis. sudah dihapus sejak preview) -> gagal terkendali', () => {
  const { ctx } = makeCtx(baseD({ investments: [] }));
  const res = ctx.RealokasiSisaKuota.applyAllocationRow({ type: 'holding', id: 'hGhost', name: 'Ghost', alloc: 1000000 }, 'budi', 'Budi');
  assert.equal(res.ok, false);
  assert.match(res.reason, /tidak ditemukan/);
});

test('end-to-end: skenario user (pokok 11jt, Majoris cuma 9.145.761, sisa 377.244) — realokasi ke holding lain yang masih punya ruang', () => {
  const D = baseD({
    investments: [
      { id: 'hMajoris', name: 'Majoris', unit: 1, avgPrice: 9145761, currentPrice: 9145761, owners: [{ ownerId: 'renov', porsi: 100, ownerName: 'Dana Renov', isSelf: false }] },
      { id: 'hSchorder', name: 'Schorder', unit: 1, avgPrice: 5000000, currentPrice: 5000000, owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] },
    ],
    titipanCommitments: [{ id: 'c1', ownerId: 'renov', ownerName: 'Dana Renov', principalAmount: 11000000 }],
  });
  const { ctx } = makeCtx(D);
  // sisa = principal - allocatedExcluding(exclude hMajoris) = 11jt - 0 = 11jt? -- tapi holding
  // hMajoris SENDIRI sudah py 9.145.761 dialokasikan ke 'renov' (porsi 100%, holdingCost 9.145.761).
  // allocatedExcluding(renov, {holdingId:hMajoris}) tidak menghitung hMajoris sendiri -> 0.
  // Simulasikan "sisa" via rumus yg sama dipakai InvestmentUI._ownerQuotaText(): principal -
  // excluding - draftNominal(current=9.145.761) = 11.000.000 - 0 - 9.145.761 = 1.854.239.
  // (Angka skenario user pakai draftNominal berbeda -- test ini fokus verifikasi REALOKASI-nya,
  // bukan re-derive rumus sisa yang sudah dikunci test lain/DL-Next-9.)
  const sisa = 11000000 - 9145761;
  const candidates = ctx.RealokasiSisaKuota.findCandidates({ holdingId: 'hMajoris' });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, 'hSchorder');
  const built = ctx.RealokasiSisaKuota.buildPlan(sisa, candidates);
  assert.equal(built.plan.length, 1);
  assert.equal(built.plan[0].alloc, sisa);
  assert.equal(built.unallocated, 0);
  const res = ctx.RealokasiSisaKuota.applyAllocationRow(built.plan[0], 'renov', 'Dana Renov');
  assert.ok(res.ok, res.reason);
  const schorder = D.investments.find((h) => h.id === 'hSchorder');
  const renovRow = schorder.owners.find((o) => o.ownerId === 'renov');
  assert.ok(renovRow, 'sisa kuota "Dana Renov" berhasil dialihkan ke Schorder (holding, bukan Buku Aset)');
  assert.ok(Math.abs(renovRow.porsi - (sisa / 5000000 * 100)) < 0.001);
});
