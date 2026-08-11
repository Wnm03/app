// pricing-service.js — Generic Shop Engine, Tahap 1 (Generic Domain Layer).
//
// PricingService = Master Pricing (setara `price_type` + `master_pricing`
// di skema SQL yang diusulkan) — "tipe harga sbg data, bukan kolom",
// diterjemahkan jadi PEMETAAN generik ke field harga yang SUDAH ADA di
// D.products (`hargaBeli`, `hargaJual`, `hargaReseller`), BUKAN tabel
// harga baru dgn histori/valid_from-valid_to (itu di luar cakupan sesi
// ini — lihat ARSITEKTUR-SHOP-ENGINE-GENERIC.md §"Yang perlu diputuskan").
// Field asli TIDAK dipindah/diubah (compatibility layer §2).
//
// Margin/profit/rekomendasi harga TIDAK dihitung ulang di sini — 100%
// delegasi ke ProfitEngine (S198, profit-engine.js, yang sendiri delegasi
// ke calculateProfit()/PriceReko.roundNice() di cobek-pricing.js) supaya
// SSOT rumus tetap satu tempat.
//
// SAMA POLA PurchaseEngine dkk: pure/stateless, TIDAK PERNAH menyentuh D
// kecuali baca read-only, TIDAK PERNAH panggil save(), TIDAK ADA rumus baru.
const PricingService = {

  // PRICE_TYPES — pemetaan kode tipe harga generik -> field asli di
  // D.products. Menambah tipe harga baru di masa depan (mis. "harga
  // member") = tambah 1 baris di sini, BUKAN field baru tersebar di 18+
  // file (lihat audit §2 tabel field) — tapi sesi ini cuma memetakan yang
  // SUDAH ADA, tidak menambah tipe harga baru.
  PRICE_TYPES: {
    cost: 'hargaBeli',
    retail: 'hargaJual',
    reseller: 'hargaReseller',
  },

  // getPrice(product, type) — nilai harga produk berdasarkan tipe generik
  // ('cost'/'retail'/'reseller'). undefined kalau product kosong/tipe
  // tidak dikenal (kaidah "kosong != 0" tetap dijaga — bukan fallback 0).
  getPrice(product, type) {
    if (!product) return undefined;
    const field = this.PRICE_TYPES[type];
    if (!field) return undefined;
    return product[field];
  },

  // margin(product) — margin Rp & % antara harga retail & cost, delegasi
  // PERSIS ke ProfitEngine.margin() (S198) memakai getPrice() di atas
  // (bukan baca product.hargaJual/hargaBeli literal, supaya konsisten
  // dgn pemetaan PRICE_TYPES).
  margin(product) {
    const cost = this.getPrice(product, 'cost') || 0;
    const retail = this.getPrice(product, 'retail') || 0;
    const marginRp = retail - cost;
    if (typeof ProfitEngine === 'undefined') return { marginRp, marginPct: 0 };
    return { marginRp, marginPct: ProfitEngine.margin(retail, marginRp) };
  },

  // getCost()/getRetail()/getReseller()/getMargin() — Tahap 2 (Generic Shop
  // Engine, Pricing & Inventory Integration). Alias bernama eksplisit di
  // atas getPrice()/margin() yang SUDAH ADA (Tahap 1) — TIDAK ADA logika
  // baru, murni supaya pemanggil (Dashboard/Report dst) tidak perlu tahu
  // string tipe generik ('cost'/'retail'/'reseller') & konsisten dgn nama
  // yang diminta di sesi ini. 100% delegasi, 0 rumus baru.
  getCost(product) {
    return this.getPrice(product, 'cost');
  },

  getRetail(product) {
    return this.getPrice(product, 'retail');
  },

  getReseller(product) {
    return this.getPrice(product, 'reseller');
  },

  getMargin(product) {
    return this.margin(product);
  },

  // recommend(params) — rekomendasi harga jual, delegasi PERSIS ke
  // ProfitEngine.recommendPrice() (S198) — tidak menduplikasi rumus
  // PriceReko di sini.
  recommend(params) {
    if (typeof ProfitEngine === 'undefined') return null;
    return ProfitEngine.recommendPrice(params);
  },
};
