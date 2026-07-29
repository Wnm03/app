'use strict';
// tests/business-ai-ownership-sync-s260.test.js — cakupan Sesi 260 (Business
// AI Ownership Sync). Target: StockRekoWidget (Restock Engine)/PurchaseEngine
// (via chain InventoryEngine.restockScan()), PriceRekoWidget (Pricing
// Recommendation), & ShopInsight (Shop AI, modules/ai/feature-insights.js)
// SEKARANG hanya menghitung/menandai PRODUK ownership SELF — konsisten
// dengan Etalase.totalModalStok()/totalNilaiJualStok() (S259). Sebelum S260,
// SEMUA widget di atas membaca D.products MENTAH (tanpa filter ownership),
// beda dari Etalase.totalModalStok() yang sudah SELF-only sejak S259 —
// produk INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY ikut nyasar ke rekomendasi
// restock/harga & AI Insight walau bukan milik sendiri.
//
// Pola loadSource sama persis tests/dashboard-ai-insight-finalisasi-s200.test.js
// (satu context gabungan supaya bisa dibandingkan lintas modul, bukan
// diasumsikan konsisten).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/shop/cobek-order.js',
      'modules/shop/purchase-engine.js',
      'modules/shop/inventory-engine.js',
      'modules/shop/profit-engine.js',
      'modules/shop/shop-business-engine-presenter.js',
      'modules/ai/feature-insights.js',
    ],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      FeatureInsightUI: { renderInto() {} },
      daysUntilDate: () => 999,
    },
    ['StockRekoWidget', 'PriceRekoWidget', 'Etalase', 'InventoryEngine', 'PurchaseEngine', 'ShopInsight'],
  );
}

function baseD(extra) {
  return Object.assign(
    { products: [], cobekKategori: [], cobek: [], bbmLogs: [], produsen: [], accounts: [], transactions: [] },
    extra,
  );
}

// --- (1) Restock Engine (StockRekoWidget) --------------------------------

test('S260: StockRekoWidget.scan() — produk non-SELF stok menipis TIDAK ikut direkomendasikan restock', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Batu A (Milik Sendiri)', stock: 1, ownership: 'SELF' },
      { id: 'p2', name: 'Batu B (Investor)', stock: 1, ownership: 'INVESTOR' },
      { id: 'p3', name: 'Batu C (tanpa field ownership)', stock: 1 }, // fallback SELF
    ],
  });
  const ctx = makeCtx(D);
  const result = ctx.StockRekoWidget.scan();
  const ids = result.map((r) => r.product.id);
  assert.ok(ids.includes('p1'));
  assert.ok(ids.includes('p3'));
  assert.ok(!ids.includes('p2'), 'produk INVESTOR tidak boleh direkomendasikan restock');
  assert.equal(result.length, 2);
});

test('S260: InventoryEngine.restockScan() (Restock Engine) & PurchaseEngine.estimatedCost() (Purchase Engine) ikut ownership-aware lewat chain, 0 rumus baru', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Batu A', stock: 0, hargaBeli: 10000, ownership: 'SELF' },
      { id: 'p2', name: 'Batu B (Investor, stok juga habis)', stock: 0, hargaBeli: 999999, ownership: 'INVESTOR' },
    ],
  });
  const ctx = makeCtx(D);
  const scan = ctx.InventoryEngine.restockScan();
  assert.ok(scan.ok);
  const ids = scan.items.map((x) => x.product.id);
  assert.ok(ids.includes('p1'));
  assert.ok(!ids.includes('p2'), 'restockScan() (dipakai PurchaseEngine) harus exclude produk INVESTOR');
  const est = ctx.PurchaseEngine.estimatedCost(scan.items);
  // Kalau p2 (hargaBeli 999999) ikut kehitung, totalCost akan meledak jauh
  // di atas nilai wajar restock p1 saja (5 unit x 10000 = 50000, sesuai
  // aturan StockRekoWidget "belum cukup data" utk stock<=2).
  assert.ok(est.totalCost < 999999, 'PurchaseEngine.estimatedCost() tidak boleh ikut hitung modal produk INVESTOR');
});

// --- (2) Pricing Recommendation (PriceRekoWidget) ------------------------

test('S260: PriceRekoWidget.avgMarginForKategori() — baseline margin HANYA dari produk SELF sekategori', () => {
  const D = baseD({
    products: [
      { id: 'a1', kategoriId: 'k1', hargaBeli: 1000, hargaJual: 1200, ownership: 'SELF' }, // margin 20%
      { id: 'a2', kategoriId: 'k1', hargaBeli: 1000, hargaJual: 1200, ownership: 'SELF' }, // margin 20%
      { id: 'b1', kategoriId: 'k1', hargaBeli: 1000, hargaJual: 5000, ownership: 'INVESTOR' }, // margin 400%, harus dikecualikan
    ],
  });
  const ctx = makeCtx(D);
  const margin = ctx.PriceRekoWidget.avgMarginForKategori('k1', 'tidak-ada-id-ini');
  assert.equal(margin, 20, 'margin baseline harus 20% (rata-rata a1+a2), bukan tercampur margin 400% milik investor');
});

test('S260: PriceRekoWidget.scan() — produk non-SELF yang harganya menyimpang jauh TIDAK ikut ditandai', () => {
  const D = baseD({
    products: [
      { id: 's1', name: 'Wajar (SELF)', kategoriId: 'k2', hargaBeli: 1000, hargaJual: 1500, ownership: 'SELF' }, // margin 50%, baseline
      { id: 's2', name: 'Kemahalan (SELF)', kategoriId: 'k2', hargaBeli: 1000, hargaJual: 5000, ownership: 'SELF' }, // jauh di atas estimasi -> harus flagged
      { id: 'i1', name: 'Kemahalan (Investor)', kategoriId: 'k2', hargaBeli: 1000, hargaJual: 5000, ownership: 'INVESTOR' }, // sama menyimpang, TAPI bukan SELF -> harus TIDAK flagged
    ],
  });
  const ctx = makeCtx(D);
  const flagged = ctx.PriceRekoWidget.scan();
  const ids = flagged.map((f) => f.product.id);
  assert.ok(ids.includes('s2'), 'produk SELF yang menyimpang harus tetap flagged');
  assert.ok(!ids.includes('i1'), 'produk INVESTOR tidak boleh ikut direkomendasikan ubah harga');
});

// --- (3) Shop AI (ShopInsight) --------------------------------------------

test('S260: ShopInsight.compute() — item "stok menipis" HANYA hitung produk SELF', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Produk SELF menipis', stock: 1, ownership: 'SELF' },
      { id: 'p2', name: 'Produk Investor menipis', stock: 1, ownership: 'INVESTOR' },
      { id: 'p3', name: 'Produk Titipan menipis', stock: 0, ownership: 'CUSTOMER' },
    ],
  });
  const ctx = makeCtx(D);
  const insight = ctx.ShopInsight.compute();
  const item = insight.find((i) => i.id === 'shop-stok-menipis');
  assert.ok(item, 'item stok menipis harus muncul (ada 1 produk SELF stok<=2)');
  assert.match(item.text, /^1 produk/, 'hanya 1 produk (SELF) yang boleh dihitung, bukan 3');
});

test('S260: ShopInsight.compute() — tidak ada item "stok menipis" kalau HANYA produk non-SELF yang menipis', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Produk Investor menipis', stock: 1, ownership: 'INVESTOR' },
      { id: 'p2', name: 'Produk Titipan menipis', stock: 0, ownership: 'CUSTOMER' },
    ],
  });
  const ctx = makeCtx(D);
  const insight = ctx.ShopInsight.compute();
  const item = insight.find((i) => i.id === 'shop-stok-menipis');
  assert.equal(item, undefined, 'tidak boleh ada peringatan stok menipis kalau semua yg menipis bukan milik sendiri');
});

// --- (4) Single Source of Truth: konsisten dengan Etalase.totalModalStok() ---

test('S260: PurchaseEngine/StockRekoWidget hasil restock konsisten dgn Etalase.totalModalStok() — sama-sama exclude non-SELF', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Produk SELF', stock: 5, hargaBeli: 1000, hargaJual: 2000, ownership: 'SELF' },
      { id: 'p2', name: 'Produk Investor', stock: 5, hargaBeli: 1000, hargaJual: 2000, ownership: 'INVESTOR' },
    ],
  });
  const ctx = makeCtx(D);
  // Etalase.totalModalStok() (S259 SSOT) -> hanya p1: 5*1000 = 5000.
  assert.equal(ctx.Etalase.totalModalStok(), 5000);
  // StockRekoWidget.groupForScan() (S260) harus memakai populasi produk YANG SAMA (SELF-only).
  const groups = ctx.StockRekoWidget.groupForScan();
  const ids = groups.map((g) => g.primary.id);
  assert.ok(ids.includes('p1'));
  assert.ok(!ids.includes('p2'));
});

// --- (5) Shop AI — konteks chat AI (ai-chat.js) ---------------------------
// ai-chat.js terlalu berat utk dimuat penuh di harness vm (banyak dependensi
// top-level: initChat/sendChat/callAIProviderRaw dst yg butuh puluhan modul
// lain). Pola sama seperti guard regresi lain di scripts/build.js (mis. cek
// "chicken-egg" OCR Tesseract): verifikasi lewat pembacaan source, bukan
// eksekusi penuh, supaya S260 tidak menyentuh cakupan test/build lain di
// luar scope sesi ini.

const fs = require('node:fs');
const path = require('node:path');

test('S260: ai-chat.js — shopLowStok & shopModalStok (fallback) SUDAH difilter ownership SELF, tidak regresi ke D.products mentah', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'ai-chat.js'), 'utf8');
  const shopLowStokLines = src.match(/const shopLowStok=.*$/gm) || [];
  assert.equal(shopLowStokLines.length, 1, 'shopLowStok harus terdefinisi tepat 1x di ai-chat.js');
  assert.match(shopLowStokLines[0], /prodSelfFilterChat|isProductOwnershipSelf/, 'shopLowStok harus difilter ownership SELF');

  const shopModalStokLines = src.match(/const shopModalStok=.*$/gm) || [];
  assert.equal(shopModalStokLines.length, 2, 'shopModalStok terdefinisi di 2 tempat (_sendChatInner & AIWidget.buildContext)');
  shopModalStokLines.forEach((line) => {
    assert.match(line, /Etalase\.totalModalStok\(\)/, 'jalur normal harus tetap reuse Etalase.totalModalStok() (SSOT, S259)');
    assert.match(line, /prodSelfFilterChat|prodSelfFilterWidget|isProductOwnershipSelf/, 'jalur fallback (Etalase belum dimuat) harus tetap difilter ownership SELF, konsisten dgn jalur normal');
  });
});

