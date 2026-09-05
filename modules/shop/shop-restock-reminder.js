// modules/shop/shop-restock-reminder.js — Shop Restock Reminder
// Foundation (sesi lanjutan Fix #3 DASHBOARD-DEDUP.md, "Poin 1":
// perluasan cakupan saran Dashboard Hub — lanjutan dari Piutang/Utang +
// Tagihan/Dana Titipan, lihat DESIGN-LOCK-PERLUASAN-SARAN-DASHBOARD.md
// §"Sesi berikutnya": konsolidasi widget ad-hoc `dashboard-hub.js`).
//
// LATAR: "Stok Menipis" (ShopMiniSummary di dashboard-hub.js) SUDAH ada
// sbg angka ringkas (100% reuse InventoryEngine.restockScan(), itemCount
// via PurchaseEngine.estimatedCost()) TAPI cuma tampil sbg 1 angka di
// widget Shop sendiri, TIDAK ikut jalur PriorityEngine (tidak ikut
// terurut bareng reminder lain, tidak ikut priorityCount). File ini
// TIDAK menggantikan ShopMiniSummary (widget itu tetap ada apa adanya,
// masih berguna sbg ringkasan di konteks halaman Shop) — murni
// menambahkan jalur KEDUA: versi itemized dari sumber yang SAMA, supaya
// juga muncul di feed "butuh perhatian" terpusat.
//
// PRINSIP (RULE #1, pola SAMA PERSIS modules/finance/tagihan-reminder.js/
// piutang-utang-reminder.js): 100% REUSE, TIDAK ada rumus/state baru,
// TIDAK membaca D langsung. Sumber dipakai apa adanya:
//   - InventoryEngine.restockScan() (modules/shop/inventory-engine.js) —
//     delegasi PERSIS ke StockRekoWidget.scan() (cobek-pricing.js), SUDAH
//     difilter ke produk yg `daysLeft<=URGENT_DAYS(14)` (ambang SUDAH
//     final di scan() itu sendiri, TIDAK diulang/diubah di sini).
//
// severity — TIDAK ada ambang baru: `daysLeft<=0` (stok sudah/hampir
// habis, estimasi hari tersisa negatif atau nol) jadi 'overdue', sisanya
// (0 < daysLeft <= 14, sudah dijamin oleh filter scan() sendiri) jadi
// 'due-soon' — pola label SAMA PERSIS reminder due-date lain (Piutang/
// Utang/Tagihan/Vehicle), murni derivasi dari field `daysLeft` yang SUDAH
// final, BUKAN skoring baru.
//
// TIDAK ada UI baru di file ini — murni fondasi data, dikonsumsi
// PriorityEngine (modules/cross/priority-engine.js) lewat
// LifeDashboardSummaryAPI, sesi ini juga. Semua fungsi PURE — tidak
// pernah memanggil save() atau menulis ke D/localStorage, tidak
// menyentuh DOM.
const ShopRestockReminder = {

// restockReminders() — reminder restock dari InventoryEngine.
// restockScan() apa adanya. {ok:false} dari restockScan() (StockRekoWidget
// belum dimuat) -> array kosong, tidak throw (pola sama guard typeof
// reminder lain).
restockReminders() {
  if (typeof InventoryEngine === 'undefined' || typeof InventoryEngine.restockScan !== 'function') return [];
  const scan = InventoryEngine.restockScan();
  if (!scan.ok || !Array.isArray(scan.items)) return [];
  return scan.items.map((it) => {
    const daysLeft = it.daysLeft;
    const severity = (daysLeft <= 0) ? 'overdue' : 'due-soon';
    const name = (it.product && it.product.name) || 'Produk';
    const message = severity === 'overdue'
      ? `Stok "${name}" sudah/hampir habis, segera direstock.`
      : `Stok "${name}" diperkirakan habis dalam ${Math.ceil(daysLeft)} hari, siapkan restock.`;
    return {
      type: 'restock',
      id: (it.product && it.product.id) || null,
      name,
      severity,
      daysLeft,
      restockQty: it.restockQty,
      message,
    };
  });
},

// summary() — Reminder Summary API, satu pintu masuk (dikonsumsi
// LifeDashboardSummaryAPI/PriorityEngine, sesi ini juga) — pola SAMA
// PERSIS TagihanReminder.summary()/PiutangUtangReminder.summary().
summary() {
  const all = this.restockReminders();
  return {
    total: all.length,
    overdueCount: all.filter((r) => r.severity === 'overdue').length,
    dueSoonCount: all.filter((r) => r.severity === 'due-soon').length,
    all,
  };
},

};
