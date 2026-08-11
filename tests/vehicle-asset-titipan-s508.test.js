'use strict';
// tests/vehicle-asset-titipan-s508.test.js — cakupan S508 (Vehicle ↔ Asset
// Dana Titipan Bridge, PROMPT IMPLEMENTASI S508). Fokus test:
// resolveVehicleAssetTitipan() & baris "Dana Titipan" di vehAssetBridgeHtml()
// (fungsi murni di modules/vehicle/vehicle-core.js, tidak sentuh DOM) — sama
// batasan loadSource.js seperti tests/vehicle-asset-bridge-s507.test.js.
//
// PENTING: S508 murni READ-ONLY, 0 rumus baru. resolveVehicleAssetTitipan()
// HANYA memanggil DanaTitipanPortfolioAPI.build() (API existing, S485c/S499)
// lalu filter+jumlah baris holdings[] yang linkedAssetId===asset.id — angka
// allocatedPrincipal per baris SUDAH dihitung sepenuhnya oleh build() sendiri.
//
// Grup 1 (test 1-6, unit): DanaTitipanPortfolioAPI di-stub manual supaya
// logic filter/jumlah di vehicle-core.js bisa dites terisolasi dari build()
// (build() sendiri sudah punya test sendiri di s499/s485*.test.js — tidak
// diulang di sini) & supaya kasus "API tidak tersedia" mudah disimulasikan.
// Grup 2 (test 7, integrasi): DanaTitipanPortfolioAPI REAL (dana-titipan-
// portfolio-presenter.js + dependensinya) di-load bareng vehicle-core.js
// utk membuktikan wiring end-to-end (bukan cuma stub) benar-benar jalan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStubCtx(assets, titipanApi) {
  const D = { assets: assets || [], deliveryPlans: [] };
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/format-tema.js', 'modules/vehicle/vehicle-core.js'],
    {
      D,
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      DanaTitipanPortfolioAPI: titipanApi,
    },
    ['resolveLinkedVehicleAsset', 'vehAssetBridgeHtml', 'resolveVehicleAssetTitipan']
  );
}

function stubApi(projection) {
  return { build: () => projection };
}

const kendaraanAsset = { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', nilai: 40000000 };

// 1) DanaTitipanPortfolioAPI belum dimuat -> null, TIDAK crash (sama pola
// guard typeof MultiOwnerEngine S507).
test('resolveVehicleAssetTitipan: null kalau DanaTitipanPortfolioAPI belum dimuat', () => {
  const ctx = makeStubCtx([kendaraanAsset], undefined);
  assert.equal(ctx.resolveVehicleAssetTitipan(kendaraanAsset), null);
});

test('vehAssetBridgeHtml: tidak ada baris Dana Titipan kalau API belum dimuat (no crash)', () => {
  const ctx = makeStubCtx([kendaraanAsset], undefined);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_1' });
  assert.match(html, /Terhubung ke Buku Aset/);
  assert.doesNotMatch(html, /Dana Titipan/);
});

// 2) Aset ini tidak muncul di projection titipan sama sekali (mis. cuma
// dimiliki SELF, atau belum pernah diatur porsi titipan) -> null, baris
// disembunyikan (BUKAN ditampilkan sbg Rp 0).
test('resolveVehicleAssetTitipan: null kalau aset tidak ada di holdings manapun', () => {
  const api = stubApi({ owners: [{ ownerId: 'o1', ownerName: 'Ayah', holdings: [{ linkedAssetId: 'asset_LAIN', allocatedPrincipal: 5000000 }] }], totals: {} });
  const ctx = makeStubCtx([kendaraanAsset], api);
  assert.equal(ctx.resolveVehicleAssetTitipan(kendaraanAsset), null);
});

test('vehAssetBridgeHtml: tidak ada baris Dana Titipan kalau aset tidak muncul di projection', () => {
  const api = stubApi({ owners: [], totals: {} });
  const ctx = makeStubCtx([kendaraanAsset], api);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_1' });
  assert.doesNotMatch(html, /Dana Titipan/);
});

// 3/4) Dana Titipan tersedia (single & multi-owner) -> tampil, angka = jumlah
// allocatedPrincipal baris yang match assetId APA ADANYA (0 rumus baru).
test('resolveVehicleAssetTitipan: jumlah allocatedPrincipal lintas owner utk assetId yang sama', () => {
  const api = stubApi({
    owners: [
      { ownerId: 'o1', ownerName: 'Budi', holdings: [{ linkedAssetId: 'asset_1', allocatedPrincipal: 12000000 }] },
      { ownerId: 'o2', ownerName: 'Ayah', holdings: [{ linkedAssetId: 'asset_1', allocatedPrincipal: 8000000 }, { linkedAssetId: 'asset_LAIN', allocatedPrincipal: 1000000 }] },
    ],
    totals: {},
  });
  const ctx = makeStubCtx([kendaraanAsset], api);
  assert.equal(ctx.resolveVehicleAssetTitipan(kendaraanAsset), 20000000);
});

test('vehAssetBridgeHtml: tampilkan baris Dana Titipan dgn nilai terformat kalau tersedia', () => {
  const api = stubApi({
    owners: [{ ownerId: 'o1', ownerName: 'Ayah', holdings: [{ linkedAssetId: 'asset_1', allocatedPrincipal: 20000000 }] }],
    totals: {},
  });
  const ctx = makeStubCtx([kendaraanAsset], api);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_1' });
  assert.match(html, /Dana Titipan: Rp 20\.000\.000/);
});

// 5) Vehicle tanpa asset / orphan / bukan kendaraan -> baris Dana Titipan
// (& seluruh bridge titipan) tidak pernah dievaluasi/tampil, konsisten S507.
test('vehAssetBridgeHtml: vehicle tanpa assetId -> tidak ada baris Dana Titipan', () => {
  const api = stubApi({ owners: [{ ownerId: 'o1', ownerName: 'Ayah', holdings: [{ linkedAssetId: 'asset_1', allocatedPrincipal: 20000000 }] }], totals: {} });
  const ctx = makeStubCtx([kendaraanAsset], api);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1' });
  assert.match(html, /Belum terhubung ke Buku Aset/);
  assert.doesNotMatch(html, /Dana Titipan/);
});

test('vehAssetBridgeHtml: orphan asset -> tidak ada baris Dana Titipan', () => {
  const api = stubApi({ owners: [{ ownerId: 'o1', ownerName: 'Ayah', holdings: [{ linkedAssetId: 'asset_hapus', allocatedPrincipal: 20000000 }] }], totals: {} });
  const ctx = makeStubCtx([], api);
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_hapus' });
  assert.match(html, /⚠️ Link Buku Aset tidak ditemukan/);
  assert.doesNotMatch(html, /Dana Titipan/);
});

// 6) Read-only murni: 0 mutasi ke object vehicle/asset, 0 field baru ditulis.
test('resolveVehicleAssetTitipan & vehAssetBridgeHtml: tidak menulis field apa pun ke vehicle/asset', () => {
  const api = stubApi({ owners: [{ ownerId: 'o1', ownerName: 'Ayah', holdings: [{ linkedAssetId: 'asset_1', allocatedPrincipal: 20000000 }] }], totals: {} });
  const asset = { id: 'asset_1', jenis: 'Kendaraan', name: 'Vario 125', nilai: 40000000 };
  const ctx = makeStubCtx([asset], api);
  const veh = { id: 'veh_1', assetId: 'asset_1' };
  const vehKeysBefore = JSON.stringify(veh);
  const assetKeysBefore = JSON.stringify(asset);
  ctx.vehAssetBridgeHtml(veh);
  ctx.resolveVehicleAssetTitipan(asset);
  assert.equal(JSON.stringify(veh), vehKeysBefore);
  assert.equal(JSON.stringify(asset), assetKeysBefore);
});

// 7) Integrasi end-to-end dgn DanaTitipanPortfolioAPI REAL (bukan stub) +
// MultiOwnerEngine REAL, aset multi-owner (owners[] eksplisit) -> baris
// Kepemilikan (S507) & Dana Titipan (S508) tampil bareng, konsisten.
test('INTEGRASI: vehAssetBridgeHtml dgn DanaTitipanPortfolioAPI & MultiOwnerEngine real, aset multi-owner', () => {
  const asset = {
    id: 'asset_1', jenis: 'Kendaraan', name: 'Brio', nilai: 150000000,
    owners: [
      { ownerId: 'self', ownerName: 'Aku', porsi: 60, isSelf: true },
      { ownerId: 'owner_ayah', ownerName: 'Ayah', porsi: 40 },
    ],
  };
  const D = {
    assets: [asset], investments: [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: [], titipanReturns: [],
    deliveryPlans: [],
  };
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/shared/format-tema.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
      'modules/vehicle/vehicle-core.js',
    ],
    {
      D,
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
    },
    ['vehAssetBridgeHtml', 'DanaTitipanPortfolioAPI']
  );
  const html = ctx.vehAssetBridgeHtml({ id: 'veh_1', assetId: 'asset_1' });
  assert.match(html, /🔗 Terhubung ke Buku Aset/);
  assert.match(html, /Kepemilikan.*Ayah/);
  assert.match(html, /Dana Titipan: Rp 60\.000\.000/); // 40% x 150jt, live dari build()
});
