// inventory-service.js — Generic Shop Engine, Tahap 1 (Generic Domain Layer).
//
// InventoryService = Master Inventory (setara `master_inventory` +
// `inventory_movement` di skema SQL yang diusulkan) — versi yang cocok utk
// KW: TIDAK ada ledger pergerakan stok baru (D.products[i].stock TETAP
// satu angka snapshot per produk, sama seperti sekarang — menambah ledger
// gerakan stok adalah PERUBAHAN PERILAKU BISNIS, bukan cakupan additive
// sesi ini, lihat instruksi user "berhenti & laporkan" §7), murni lapisan
// baca generik di atas InventoryEngine (S198, inventory-engine.js) yang
// SUDAH pure/stateless & sudah membungkus Etalase.*/StockRekoWidget.*.
//
// SAMA POLA PurchaseEngine dkk: pure/stateless, TIDAK PERNAH menyentuh D
// kecuali baca read-only, TIDAK PERNAH panggil save(), TIDAK ADA rumus
// baru — 100% delegasi ke InventoryEngine supaya SSOT rumus tetap satu
// tempat (kalau InventoryEngine berubah, lapisan ini otomatis ikut).
const InventoryService = {

  // stockStatus(product) — delegasi PERSIS InventoryEngine.stockStatus().
  stockStatus(product) {
    if (typeof InventoryEngine === 'undefined') return { stock: 0, cls: 'ok', label: 'Aman' };
    return InventoryEngine.stockStatus(product);
  },

  // valueAt(product, priceType) — nilai stok satu produk pada tipe harga
  // generik tertentu (PricingService), PERSIS rumus `stock * harga` yang
  // dipakai InventoryEngine.totalModalStok()/totalNilaiJualStok() tapi utk
  // SATU produk (bukan agregat) — supaya modul BARU bisa tampilkan nilai
  // stok per baris tanpa hardcode nama field harga.
  valueAt(product, priceType) {
    if (!product) return 0;
    const stock = parseFloat(product.stock) || 0;
    const price = (typeof PricingService !== 'undefined') ? (PricingService.getPrice(product, priceType) || 0) : 0;
    return stock * price;
  },

  // totalValue(products, priceType) — agregat valueAt() di atas utk daftar
  // produk. Utk priceType 'cost'/'retail' pada D.products penuh, hasilnya
  // SAMA dgn InventoryEngine.totalModalStok()/totalNilaiJualStok() TAPI
  // TANPA filter ownership SELF-only (pemanggil yang menentukan filter,
  // mis. pakai ProductStore.listSelf() dulu) — beda sengaja ini didokumentasikan
  // supaya tidak dikira duplikat/bug.
  totalValue(products, priceType) {
    return (products || []).reduce((s, p) => s + this.valueAt(p, priceType), 0);
  },

  // restockScan() — delegasi PERSIS InventoryEngine.restockScan().
  restockScan() {
    if (typeof InventoryEngine === 'undefined') {
      return { ok: false, reason: 'InventoryEngine belum dimuat', items: [] };
    }
    return InventoryEngine.restockScan();
  },
};
