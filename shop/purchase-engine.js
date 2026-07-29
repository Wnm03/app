// purchase-engine.js — Shop Business Engine, S198 (Business Engine untuk Shop).
//
// TARGET EKSPLISIT USER (S198): "Buat Business Engine untuk Shop. Reuse
// seluruh Shop existing. Jangan ubah business logic. Jangan implementasi ke
// modul lain. Jangan refactor. Hanya: PurchaseEngine/TripEngine/
// InventoryEngine/ProfitEngine. Engine berupa file baru saja. Belum
// digunakan UI. Belum dihubungkan ke Shop."
//
// PurchaseEngine = lapisan pembelian/restock (Produsen, harga beli per
// produsen, & rekomendasi restock StockRekoWidget). SAMA POLA dgn
// OwnershipEngine (modules/shared/ownership-engine.js, S191) & LogisticsEngine
// (modules/logistics/logistics-engine.js): pure/stateless, TIDAK PERNAH
// menyentuh D (kecuali baca read-only lewat fungsi Shop existing yang
// dipanggilnya), TIDAK PERNAH panggil save(), TIDAK ADA business logic BARU
// — semua angka & aturan di bawah ini murni membungkus fungsi yang SUDAH ADA
// di modules/shop/cobek-*.js (Produsen, Etalase, StockRekoWidget) supaya
// kalau rumus aslinya berubah, hasil di sini otomatis ikut berubah (satu
// sumber kebenaran, sama prinsip komentar LogisticsEngine).
//
// SESI INI SENGAJA TIDAK MENYENTUH modul lain apa pun: tidak ada field baru
// di D.*, tidak ada UI, tidak ada wiring dari cobek-*.js ke engine ini —
// wiring itu tugas sesi lain yang eksplisit memintanya.
const PurchaseEngine = {

  // recordCost(params) — hitung biaya pembelian stok (delta qty x harga
  // beli), PERSIS rumus di Etalase.save() (modules/shop/cobek-etalase.js):
  // `const cost=delta*hargaBeli`. Dibungkus jadi fungsi murni (parameter,
  // bukan baca #pStock/#pBeli dari DOM) supaya bisa dipanggil/dites tanpa
  // form produk terbuka. delta<=0 (stok tidak naik / stok turun) -> tidak
  // ada biaya pembelian (recorded:false), sama seperti Etalase.save() yang
  // cuma mencatat transaksi expense saat delta>0 & hargaBeli>0.
  recordCost({ prevStock, newStock, hargaBeli } = {}) {
    const prev = Math.max(0, parseFloat(prevStock) || 0);
    const next = Math.max(0, parseFloat(newStock) || 0);
    const beli = Math.max(0, parseFloat(hargaBeli) || 0);
    const delta = next - prev;
    const recorded = delta > 0 && beli > 0;
    const cost = recorded ? delta * beli : 0;
    return { prevStock: prev, newStock: next, hargaBeli: beli, delta, recorded, cost };
  },

  // produsenPrice(product, produsenId) — harga beli produk dari produsen
  // tertentu, PERSIS pola `product.hargaByProdusen[produsenId]` yang dibaca
  // di Etalase.onProdusenChange() (cobek-etalase.js). null kalau produk/
  // produsenId tidak ada atau belum ada histori harga dari produsen itu.
  produsenPrice(product, produsenId) {
    if (!product || !produsenId || !product.hargaByProdusen) return null;
    const val = product.hargaByProdusen[produsenId];
    return (val !== undefined) ? val : null;
  },

  // produsenProducts(produsen, products) — daftar produk yang punya histori
  // harga beli dari produsen tsb, PERSIS filter di Produsen.openModal()
  // (cobek-order.js): `p.hargaByProdusen && p.hargaByProdusen[pr.id]!==undefined`.
  produsenProducts(produsen, products) {
    if (!produsen) return [];
    return (products || []).filter(
      (p) => p.hargaByProdusen && p.hargaByProdusen[produsen.id] !== undefined,
    );
  },

  // restockPlan(scanResult) — dari daftar hasil StockRekoWidget.scan() (tiap
  // item {product, restockQty, ...}, TIDAK dihitung ulang di sini — hitungan
  // asli tetap satu-satunya di StockRekoWidget.scan(), modules/shop/
  // cobek-pricing.js), susun ringkasan rencana beli: jumlah item yang perlu
  // direstock & total qty yang perlu dibeli. PERSIS agregasi yang dipakai
  // StockRekoWidget.renderApplyAllBtn() (`flagged.reduce((s,x)=>s+x.restockQty,0)`).
  restockPlan(scanResult) {
    const flagged = (scanResult || []).filter((x) => x && x.restockQty > 0);
    const totalQty = flagged.reduce((s, x) => s + (x.restockQty || 0), 0);
    return { items: flagged, itemCount: flagged.length, totalQty };
  },

  // estimatedCost(scanResult) — perkiraan total modal (Rp) yang dibutuhkan
  // untuk restock semua item terflag di restockPlan(), pakai hargaBeli
  // masing-masing produk (product.hargaBeli, field yang sudah ada di
  // D.products — bukan field baru). Item tanpa hargaBeli (0/undefined)
  // dianggap 0 (tidak error).
  estimatedCost(scanResult) {
    const plan = this.restockPlan(scanResult);
    const totalCost = plan.items.reduce((s, x) => {
      const beli = (x.product && x.product.hargaBeli) || 0;
      return s + beli * (x.restockQty || 0);
    }, 0);
    return Object.assign({}, plan, { totalCost });
  },
};
