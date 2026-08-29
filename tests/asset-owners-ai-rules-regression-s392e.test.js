'use strict';
// tests/asset-owners-ai-rules-regression-s392e.test.js — Sesi 392e:
// regression check "rule AI S391" (asset-multi-owner-porsi-incomplete &
// asset-multi-owner-profit-split-info, registerAssetAIRules() di aset.js)
// SETELAH input beneran dipakai lewat UI (Aset.saveOwners()/resetOwners(),
// sesi 392d) — sebelum ini kedua rule itu cuma pernah dites/dipakai dgn
// data `owners` yang ditulis manual/DevTools (lihat FIX-s391), belum
// pernah lewat jalur nyata Simpan Porsi -> MultiOwnerEngine.setOwners().
//
// TIDAK ADA logic baru ditulis sesi ini — murni test harness yang
// menjalankan source ASLI (loadSource, sama pola test lain) lewat jalur
// saveOwners()/resetOwners() betulan, lalu mengecek kondisi kedua rule
// S391 terhadap hasilnya.
//
// TEMUAN UTAMA yang dikonfirmasi lewat test ini (lihat test terakhir):
// karena saveOwners() cuma menulis `a.owners` kalau
// MultiOwnerEngine.setOwners() -> validateOwners() LULUS (total pas
// 100%), rule 'asset-multi-owner-porsi-incomplete' TIDAK PERNAH bisa
// menyala dari hasil tombol Simpan Porsi di UI normal -- rule itu cuma
// bisa menyala dari `owners` yang masuk lewat jalur LAIN (import/restore
// backup, migrasi data lama, atau manipulasi D langsung di luar UI).
// Ini BUKAN bug (saveOwners() memang sengaja menolak simpan kalau belum
// 100%, lihat FIX-s392d), tapi klarifikasi cakupan rule S391 supaya tidak
// disangka rule itu "mati"/tidak pernah tersentuh lagi.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(extraAssets) {
  return {
    assets: [
      { id: 'a1', name: 'Ruko Warisan', jenis: 'Ruko', nilai: 500000000, keuntungan: 10000000 },
      ...(extraAssets || []),
    ],
    accounts: [],
    transactions: [],
    debts: [],
  };
}

// Mock AIDecision — cukup untuk registerAssetAIRules(): tangkap rule yang
// didaftarkan lewat rules.register() ke array, supaya condition()/action()
// tiap rule bisa dipanggil manual di test (tidak perlu full AI engine).
function makeAIDecisionMock() {
  const registered = [];
  return {
    rules: { register: (r) => { registered.push(r); return true; } },
    _registered: registered,
    find(id) { return registered.find((r) => r.id === id); },
  };
}

function makeCtx(D, AIDecision) {
  let _n = 0;
  const ctx = loadSource(
    [
      'modules/shared/multi-owner-engine.js',
      'modules/shared/owner-registry.js',
      'modules/asset/asset-ownership-split-presenter.js',
      'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js',
    ],
    {
      D,
      AIDecision,
      escapeHtml: (s) => String(s),
      // uid()/sameId()/save() di-mock ringan (bukan load
      // features-helpers-global-security.js utuh -- file itu punya banyak
      // top-level const lain di luar cakupan sesi ini) -- perilaku yang
      // relevan buat saveOwners()/resetOwners() cuma: uid() unik per
      // panggilan, sameId() bandingkan id sbg string, save() no-op.
      uid: () => 'owner_' + (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: () => {},
      // todayStr() -- FIX (audit s444): saveOwners() sekarang ikut memanggil
      // _syncOwnerDebts() (BUG-OWN-002), yang butuh todayStr() utk field
      // `tanggal` entri utang baru. D.debts=[] di makeD() di atas bikin
      // _syncOwnerDebts() beneran jalan (guard !D.debts di fungsi itu lolos),
      // jadi stub ini wajib ada -- sebelum fix, saveOwners() tidak pernah
      // menyentuh todayStr() sama sekali.
      todayStr: () => '2026-01-01',
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    },
    ['Aset', 'MultiOwnerEngine', 'OwnerRegistry', 'AssetOwnershipSplitPresenter', 'registerAssetAIRules'],
  );
  // saveOwners() (domain logic ditest di sini) memanggil Aset.renderList()
  // di akhir (efek UI, sudah di luar cakupan regression check 392e --
  // rantai formatter DOM-nya (fmtFullSigned dkk) bukan bagian dari rule
  // AI S391 yang dites) -- di-no-op-kan spy, TIDAK mengubah source aset.js.
  ctx.Aset.renderList = () => {};
  return ctx;
}

// --- saveOwners() beneran menulis D.assets (baseline 392d, dipastikan lagi di sini) ---

test('saveOwners() — 2 pemilik total 100% -> tertulis ke D.assets, toast sukses', () => {
  const D = makeD();
  const ctx = makeCtx(D, makeAIDecisionMock());
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: '', ownerName: 'Ayah', porsi: 60 },
    { ownerId: '', ownerName: 'Budi', porsi: 40 },
  ];
  ctx.Aset.saveOwners();
  assert.equal(D.assets[0].owners.length, 2);
  assert.equal(D.assets[0].owners[0].ownerName, 'Ayah');
  assert.equal(D.assets[0].owners.reduce((s, o) => s + o.porsi, 0), 100);
});

test('saveOwners() — total belum 100% -> DITOLAK, D.assets TIDAK berubah (owners tetap undefined)', () => {
  const D = makeD();
  const ctx = makeCtx(D, makeAIDecisionMock());
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: '', ownerName: 'Ayah', porsi: 60 },
    { ownerId: '', ownerName: 'Budi', porsi: 30 },
  ];
  ctx.Aset.saveOwners();
  assert.equal(D.assets[0].owners, undefined);
});

test('saveOwners() — nama pemilik kosong -> DITOLAK, D.assets tidak berubah', () => {
  const D = makeD();
  const ctx = makeCtx(D, makeAIDecisionMock());
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: '', ownerName: '  ', porsi: 100 },
  ];
  ctx.Aset.saveOwners();
  assert.equal(D.assets[0].owners, undefined);
});

test('resetOwners() — setelah save sukses lalu draft diubek-ubek, reset balik ke data tersimpan', () => {
  const D = makeD();
  const ctx = makeCtx(D, makeAIDecisionMock());
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: '', ownerName: 'Ayah', porsi: 60 },
    { ownerId: '', ownerName: 'Budi', porsi: 40 },
  ];
  ctx.Aset.saveOwners();
  ctx.Aset._ownersDraft.push({ ownerId: '', ownerName: 'Iseng', porsi: 999 });
  ctx.Aset.resetOwners();
  assert.equal(ctx.Aset._ownersDraft.length, 2);
  assert.equal(ctx.Aset._ownersDraft.reduce((s, o) => s + o.porsi, 0), 100);
});

// --- Rule AI S391 vs hasil saveOwners() beneran (392e) ---

test('rule asset-multi-owner-profit-split-info — MENYALA setelah saveOwners() beneran (keuntungan>0)', () => {
  const D = makeD();
  const AIDecision = makeAIDecisionMock();
  const ctx = makeCtx(D, AIDecision);
  ctx.registerAssetAIRules();
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: '', ownerName: 'Ayah', porsi: 60 },
    { ownerId: '', ownerName: 'Budi', porsi: 40 },
  ];
  ctx.Aset.saveOwners();
  const rule = AIDecision.find('asset-multi-owner-profit-split-info');
  assert.ok(rule, 'rule harus terdaftar');
  assert.equal(rule.condition(), true);
  const out = rule.action();
  assert.match(out.message, /Ayah 60%/);
  assert.match(out.message, /Budi 40%/);
});

test('rule asset-multi-owner-porsi-incomplete — TIDAK PERNAH menyala dari hasil saveOwners() UI (selalu 100% kalau tersimpan)', () => {
  const D = makeD();
  const AIDecision = makeAIDecisionMock();
  const ctx = makeCtx(D, AIDecision);
  ctx.registerAssetAIRules();
  // Coba "curangi" lewat draft tidak 100% -- tetap ditolak saveOwners(),
  // jadi D.assets[0].owners tidak pernah kebentuk lewat jalur ini.
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [{ ownerId: '', ownerName: 'Ayah', porsi: 70 }];
  ctx.Aset.saveOwners();
  const rule = AIDecision.find('asset-multi-owner-porsi-incomplete');
  assert.equal(rule.condition(), false, 'owners belum tertulis (ditolak validasi) -> rule tidak melihat apa-apa');

  // Sekarang simpan yang VALID lewat UI (100%) -- rule tetap harus false,
  // karena hasil UI SELALU lolos validateOwners().
  ctx.Aset._ownersDraft = [
    { ownerId: '', ownerName: 'Ayah', porsi: 60 },
    { ownerId: '', ownerName: 'Budi', porsi: 40 },
  ];
  ctx.Aset.saveOwners();
  assert.equal(rule.condition(), false, 'hasil saveOwners() UI selalu valid -> rule porsi-incomplete tidak reachable dari jalur ini');
});

test('rule asset-multi-owner-porsi-incomplete — TETAP menyala utk `owners` yang masuk di LUAR jalur UI (import/restore/legacy)', () => {
  // Ini konfirmasi rule S391 belum "mati" total -- masih relevan utk data
  // yang datang dari luar saveOwners() (mis. importShopJSON-style restore,
  // migrasi data lama, atau input manual ke D di luar app). Skenario ini
  // SENGAJA menulis `owners` langsung ke D.assets (bukan lewat
  // Aset.saveOwners()) utk mensimulasikan jalur non-UI tsb.
  const D = makeD([{ id: 'a2', name: 'Emas Warisan (import lama)', nilai: 20000000, keuntungan: 0, owners: [{ ownerId: 'x', ownerName: 'X', porsi: 70 }] }]);
  const AIDecision = makeAIDecisionMock();
  const ctx = makeCtx(D, AIDecision);
  ctx.registerAssetAIRules();
  const rule = AIDecision.find('asset-multi-owner-porsi-incomplete');
  assert.equal(rule.condition(), true);
  const out = rule.action();
  assert.match(out.message, /Emas Warisan/);
});

test('registerAssetAIRules() — idempotent, tidak double-register meski dipanggil 2x (baseline S391 tidak berubah)', () => {
  const D = makeD();
  const AIDecision = makeAIDecisionMock();
  const ctx = makeCtx(D, AIDecision);
  const first = ctx.registerAssetAIRules();
  const second = ctx.registerAssetAIRules();
  assert.equal(first, true);
  assert.equal(second, false);
  const count = AIDecision._registered.filter((r) => r.id === 'asset-multi-owner-profit-split-info').length;
  assert.equal(count, 1);
});
