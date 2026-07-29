'use strict';
// tests/ownership-sync-shop.test.js — cakupan Sesi 194 (Ownership Sync
// Shop). Reuse OwnershipEngine (Sesi 191) mengikuti pola PERSIS sesi
// sebelumnya (S192 akun/keuangan, S193 asset/investasi).
//
// Target: isCobekOwnershipSelf() (helper baru, reuse OwnershipEngine),
// Laporan.render() (Shop/Riwayat), Laporan.renderTab() (Laporan),
// Laporan.renderGrafik() (Grafik), Laporan.topProdukAgg()/
// renderTopPelanggan() (Statistik, dipanggil dari renderTab()) — SEMUA
// cuma nambah 1 filter ownership di atas logic lama, 0 rumus diubah.
// Dashboard (FinCoach, modules-calc.js) & AI Insight (ShopInsight,
// feature-insights.js) dites terpisah di bawah.
//
// RULE yang dites di sini:
//   - SELF (eksplisit atau default/tanpa field ownership) -> dihitung normal.
//   - INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY -> DIKECUALIKAN dari agregat
//     (omzet/untung/margin/grafik/top produk/top pelanggan/insight), TAPI
//     TIDAK dihapus dari D.cobek (histori tetap tersimpan & tetap tampil
//     apa adanya di daftar riwayat/shopList).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    cobek: [
      // SELF (default, tanpa field ownership): omzet 100rb, profit 20rb
      { id: 1, date: '2026-07-01', total: 100000, profit: 20000, items: [{ productId: 'p1', name: 'Produk A', qty: 2, harga: 50000 }], customer: { name: 'Budi', phone: '081111111111' } },
      // SELF eksplisit: omzet 200rb, profit 40rb
      { id: 2, date: '2026-07-05', total: 200000, profit: 40000, ownership: 'SELF', items: [{ productId: 'p2', name: 'Produk B', qty: 1, harga: 200000 }], customer: { name: 'Sari', phone: '082222222222' } },
      // INVESTOR: harus dikecualikan dari semua agregat
      { id: 3, date: '2026-07-10', total: 999999, profit: 999999, ownership: 'INVESTOR', items: [{ productId: 'p3', name: 'Produk C (Investor)', qty: 50, harga: 19999 }], customer: { name: 'Investor X', phone: '083333333333' } },
      // CUSTOMER (lowercase): harus dikecualikan
      { id: 4, date: '2026-07-12', total: 500000, profit: 100000, ownership: 'customer', items: [{ productId: 'p4', name: 'Produk D (Titipan)', qty: 10, harga: 50000 }], customer: { name: 'Titipan Y', phone: '084444444444' } },
    ],
    products: [],
    produsen: [],
    accounts: [],
    transactions: [],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shop/cobek-order.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    },
    ['OwnershipEngine', 'Laporan', 'Pelanggan', 'isCobekOwnershipSelf'],
  );
}

test('isCobekOwnershipSelf() — transaksi tanpa field ownership -> true (default SELF)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isCobekOwnershipSelf(D.cobek[0]), true);
});

test('isCobekOwnershipSelf() — ownership eksplisit SELF -> true', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isCobekOwnershipSelf(D.cobek[1]), true);
});

test('isCobekOwnershipSelf() — INVESTOR/CUSTOMER -> false', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isCobekOwnershipSelf(D.cobek[2]), false);
  assert.equal(ctx.isCobekOwnershipSelf(D.cobek[3]), false);
});

test('isCobekOwnershipSelf() — kalau OwnershipEngine tidak dimuat, fallback true (regresi lama tetap jalan)', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/shop/cobek-order.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n), MONTHS: [] },
    ['isCobekOwnershipSelf'],
  );
  assert.equal(ctx.isCobekOwnershipSelf(D.cobek[2]), true, 'tanpa engine, dianggap SELF (tidak exclude apa pun)');
});

test('Laporan.topProdukAgg() — HANYA transaksi SELF yang masuk agregat produk (Statistik)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const inRangeSelf = D.cobek.filter(ctx.isCobekOwnershipSelf);
  const agg = ctx.Laporan.topProdukAgg(inRangeSelf);
  const names = agg.map((a) => a.name).sort();
  assert.deepEqual(names, ['Produk A', 'Produk B'], 'Produk C (Investor)/Produk D (Titipan) harus dikecualikan');
});

test('Laporan.topProdukAgg() — omzet & qty dihitung persis dari transaksi SELF saja', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const inRangeSelf = D.cobek.filter(ctx.isCobekOwnershipSelf);
  const agg = ctx.Laporan.topProdukAgg(inRangeSelf);
  const a = agg.find((x) => x.name === 'Produk A');
  assert.equal(a.qty, 2);
  assert.equal(a.omzet, 100000);
});

test('Pelanggan.aggregate() — TIDAK terpengaruh filter ownership (di luar cakupan sesi ini), semua transaksi tetap dihitung', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const agg = ctx.Pelanggan.aggregate();
  assert.equal(agg.length, 4, 'D.cobek tidak dihapus/dimutasi — semua 4 transaksi (termasuk non-SELF) tetap ada di data mentah');
});

test('D.cobek — tidak dihapus/dimutasi, histori tetap utuh termasuk transaksi non-SELF', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Laporan.topProdukAgg(D.cobek.filter(ctx.isCobekOwnershipSelf));
  assert.equal(D.cobek.length, 4, 'semua 4 transaksi (termasuk non-SELF) tetap tersimpan di D.cobek');
});

// ------ Dashboard: FinCoach (modules/shared/modules-calc.js), item #8 "Bisnis Shop" ------

test('FinCoach.compute() — insight margin Shop (Dashboard) HANYA hitung transaksi ownership SELF', () => {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const prevD = new Date(y, m - 1, 1);
  const D = {
    transactions: [],
    targets: [],
    gajiMingguanHistory: [],
    workDays: [],
    accounts: [],
    bills: [],
    debts: [],
    piutang: [],
    cobek: [
      // Bulan ini (SELF): margin 10% (omzet 300rb, profit 30rb)
      { id: 1, date: new Date(y, m, 1).toISOString().split('T')[0], total: 100000, profit: 10000 },
      { id: 2, date: new Date(y, m, 2).toISOString().split('T')[0], total: 100000, profit: 10000 },
      { id: 3, date: new Date(y, m, 3).toISOString().split('T')[0], total: 100000, profit: 10000 },
      // Bulan lalu (SELF): margin 50%
      { id: 4, date: new Date(prevD.getFullYear(), prevD.getMonth(), 1).toISOString().split('T')[0], total: 100000, profit: 50000 },
      { id: 5, date: new Date(prevD.getFullYear(), prevD.getMonth(), 2).toISOString().split('T')[0], total: 100000, profit: 50000 },
      { id: 6, date: new Date(prevD.getFullYear(), prevD.getMonth(), 3).toISOString().split('T')[0], total: 100000, profit: 50000 },
      // Noise non-SELF bulan ini dgn margin 100% — HARUS dikecualikan, kalau tidak insight tidak akan muncul
      { id: 7, date: new Date(y, m, 4).toISOString().split('T')[0], total: 100, profit: 100, ownership: 'INVESTOR' },
    ],
  };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/modules-calc.js'],
    { D, fmtFull: (x) => String(x) },
    ['FinCoach', 'OwnershipEngine'],
  );
  const out = ctx.FinCoach.compute({ now, m, y, txM: [], inc: 0, exp: 0 });
  const hit = out.find((x) => x.id === 'shop-margin');
  assert.ok(hit, 'insight margin Shop harus muncul (noise INVESTOR dikecualikan, margin tetap turun 50%->10%)');
  assert.match(hit.text, /10%/);
  assert.match(hit.text, /50%/);
});

test('FinCoach.compute() — kalau isCobekOwnershipSelf tidak ada, fallback hitung semua transaksi (regresi lama tetap jalan)', () => {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const D = {
    transactions: [], targets: [], gajiMingguanHistory: [], workDays: [], accounts: [], bills: [], debts: [], piutang: [],
    cobek: [
      { id: 1, date: new Date(y, m, 1).toISOString().split('T')[0], total: 100000, profit: 10000 },
      { id: 2, date: new Date(y, m, 2).toISOString().split('T')[0], total: 100000, profit: 10000 },
      { id: 3, date: new Date(y, m, 3).toISOString().split('T')[0], total: 100000, profit: 10000 },
    ],
  };
  const ctx = loadSource(['modules/shared/modules-calc.js'], { D, fmtFull: (x) => String(x) }, ['FinCoach']);
  const out = ctx.FinCoach.compute({ now, m, y, txM: [], inc: 0, exp: 0 });
  assert.equal(Array.isArray(out), true, 'compute() tidak error walau isCobekOwnershipSelf belum dimuat');
});

// ------ AI Insight: ShopInsight (modules/ai/feature-insights.js) ------

function makeShopInsightCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shop/cobek-order.js', 'modules/ai/feature-insights.js'],
    { D, escapeHtml: (s) => String(s), fmt: (x) => String(x), fmtFull: (x) => String(x), MONTHS: [] },
    ['ShopInsight', 'isCobekOwnershipSelf'],
  );
}

test('ShopInsight.compute() — "Produk terlaris" HANYA hitung transaksi ownership SELF', () => {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const iso = (d) => new Date(y, m, d).toISOString().split('T')[0];
  const D = {
    products: [], produsen: [], accounts: [], transactions: [],
    cobek: [
      { id: 1, date: iso(1), total: 100000, profit: 20000, items: [{ productId: 'p1', name: 'Produk A', qty: 3 }] },
      { id: 2, date: iso(2), total: 100000, profit: 20000, items: [{ productId: 'p1', name: 'Produk A', qty: 3 }] },
      { id: 3, date: iso(3), total: 100000, profit: 20000, items: [{ productId: 'p1', name: 'Produk A', qty: 3 }] },
      // Non-SELF, qty jauh lebih besar — HARUS dikecualikan dari "produk terlaris"
      { id: 4, date: iso(4), total: 1, profit: 1, ownership: 'INVESTOR', items: [{ productId: 'p9', name: 'Produk Investor', qty: 999 }] },
    ],
  };
  const ctx = makeShopInsightCtx(D);
  const out = ctx.ShopInsight.compute();
  const hit = out.find((x) => x.id === 'shop-terlaris');
  assert.ok(hit, 'insight produk terlaris harus muncul');
  assert.match(hit.text, /Produk A/);
  assert.doesNotMatch(hit.text, /Produk Investor/);
});

test('ShopInsight.compute() — insight margin turun HANYA hitung transaksi ownership SELF', () => {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const prevD = new Date(y, m - 1, 1);
  const isoThis = (d) => new Date(y, m, d).toISOString().split('T')[0];
  const isoPrev = (d) => new Date(prevD.getFullYear(), prevD.getMonth(), d).toISOString().split('T')[0];
  const D = {
    products: [], produsen: [], accounts: [], transactions: [],
    cobek: [
      { id: 1, date: isoThis(1), total: 100000, profit: 10000 },
      { id: 2, date: isoThis(2), total: 100000, profit: 10000 },
      { id: 3, date: isoThis(3), total: 100000, profit: 10000 },
      { id: 4, date: isoPrev(1), total: 100000, profit: 50000 },
      { id: 5, date: isoPrev(2), total: 100000, profit: 50000 },
      { id: 6, date: isoPrev(3), total: 100000, profit: 50000 },
      { id: 7, date: isoThis(4), total: 1, profit: 1, ownership: 'FAMILY' },
    ],
  };
  const ctx = makeShopInsightCtx(D);
  const out = ctx.ShopInsight.compute();
  const hit = out.find((x) => x.id === 'shop-margin');
  assert.ok(hit, 'insight margin Shop harus muncul (noise FAMILY dikecualikan)');
  assert.match(hit.text, /10%/);
});
