// vehicle-catalog-import-stock-push.js — "Push ke Stok Sparepart" pasca
// Import Katalog (jawaban langsung atas pertanyaan user: sync Katalog ->
// Stok Sparepart TIDAK otomatis dapat qty nyata, cuma dapat baris kosong
// qty:0 lewat syncUnlinkedCatalogPartsToStock() Tahap 10 yang SUDAH ADA,
// dan part harus ditambah manual satu-satu lewat modal "Tambah Stok
// Sparepart"/dropdown Servis kalau mau qty aslinya kepakai).
//
// CAKUPAN (sempit, additive, 100% reuse):
// - TIDAK ada skema/storage baru. Reuse `syncPartsStockFromCatalog()`
//   (modules/finance/tx-stok-sparepart.js, Tahap 9 — SATU-SATUNYA titik
//   yang boleh bikin/hubungkan baris D.partsStock dari item Vehicle
//   Catalog) apa adanya utk hubungkan tiap part yang BARU DIIMPOR
//   (`summary.createdItems` dari `VehicleCatalogImport.commitRows()`,
//   field baru sesi ini) ke baris D.partsStock-nya.
// - TIDAK ada modal baru. Reuse `askConfirm()`/`showPromptModal()`
//   (modal-navigasi.js, SUDAH ADA) utk tanya "push?" + qty stok awal
//   (SATU angka dipakai rata utk semua part yang baru diimpor sesi
//   commit ini — bukan per-part, supaya alur tetap ringkas utk import
//   PDF katalog puluhan/ratusan baris; user yang mau qty berbeda per
//   part tetap bisa edit manual lewat "Tambah Stok Sparepart" seperti
//   biasa setelahnya, TIDAK ada yang dikunci/dibatasi oleh fitur ini).
// - qty ditambahkan (`p.qty += qty`), TIDAK menimpa — konsisten dgn
//   aturan `syncPartsStockFromCatalog()` "tidak pernah menimpa qty yang
//   sudah ada" & pola `applyStockPurchase()` (tx-stok-sparepart.js).
// - Dipanggil dari `vehicle-catalog-import-ui.js` SETELAH
//   `catalogImportUiCommit()` sukses (part yang baru diimpor sudah ada
//   `id`-nya) — TIDAK mengubah `commitRows()`/alur import itu sendiri
//   selain field `createdItems` yang ditambah di file itu (additive).
// - `save()` (features-helpers-global-security.js, SUDAH ADA) dipanggil
//   SATU KALI di titik akhir alur ini kalau ada baris yang diubah, sama
//   pola `syncUnlinkedCatalogPartsToStock()`.

/** pushToStock(items, qty) — logic MURNI terhadap D (lewat
 * syncPartsStockFromCatalog(), tidak baca/tulis DOM/IDBStore sendiri).
 * `items`: array item VehicleCatalog (bentuk PERSIS `createdItems` dari
 * `VehicleCatalogImport.commitRows()`). `qty`: angka stok awal yang
 * ditambahkan ke tiap baris (0/negatif/NaN -> tetap hubungkan part ke
 * stok tapi qty TIDAK ditambah, sama seperti Tahap 10). Return
 * `{ pushed, totalQtyAdded }` — `pushed` = jumlah part yang berhasil
 * dihubungkan (termasuk yang qty-nya 0), TIDAK melempar exception kalau
 * `syncPartsStockFromCatalog` belum tersedia (return `{pushed:0,
 * totalQtyAdded:0}`). */
function vehicleCatalogImportStockPushRun(items, qty) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return { pushed: 0, totalQtyAdded: 0 };
  if (typeof syncPartsStockFromCatalog !== 'function') return { pushed: 0, totalQtyAdded: 0 };
  const addQty = (typeof qty === 'number' && !isNaN(qty) && qty > 0) ? qty : 0;
  let pushed = 0;
  let totalQtyAdded = 0;
  for (const item of list) {
    const p = syncPartsStockFromCatalog(item);
    if (!p) continue;
    pushed++;
    if (addQty > 0) {
      p.qty = (p.qty || 0) + addQty;
      totalQtyAdded += addQty;
    }
  }
  return { pushed, totalQtyAdded };
}

/** promptAndRun(createdItems) — orkestrasi UI: tawarkan push ke Stok
 * Sparepart lewat modal konfirmasi + prompt qty yang SUDAH ADA (reuse
 * apa adanya). `createdItems` kosong/tidak ada -> return `null` tanpa
 * menampilkan modal apa pun (dipanggil aman meski commit gagal/0 part).
 * User pilih "Batal" di salah satu langkah -> `null`, TIDAK ada
 * perubahan data. */
async function vehicleCatalogImportStockPushPromptAndRun(createdItems) {
  const list = Array.isArray(createdItems) ? createdItems.filter(Boolean) : [];
  if (!list.length) return null;
  if (typeof askConfirm !== 'function' || typeof showPromptModal !== 'function') return null;

  const ok = await askConfirm(
    list.length + ' part yang baru diimpor mau langsung dihubungkan ke Stok Sparepart juga?',
    { icon: '📦', title: 'Push ke Stok Sparepart', okText: 'Ya, Lanjut', danger: false }
  );
  if (!ok) return null;

  const qtyStr = await showPromptModal({
    title: 'Stok Awal',
    message: 'Isi jumlah stok awal utk tiap part (dipakai rata utk semua ' + list.length + ' part yang baru diimpor). Kosongkan/0 kalau mau dihubungkan dulu tanpa stok — bisa diisi belakangan lewat "Tambah Stok Sparepart".',
    icon: '🔢',
    inputType: 'number',
    defaultValue: '',
    okText: 'Simpan',
  });
  if (qtyStr === null || qtyStr === undefined) return null; // user batal

  const qty = parseInt(String(qtyStr).replace(/[^\d]/g, ''), 10);
  const result = vehicleCatalogImportStockPushRun(list, isNaN(qty) ? 0 : qty);

  if (result.pushed > 0) {
    if (typeof save === 'function') save();
    if (typeof populateTxStockSelect === 'function') populateTxStockSelect();
    if (typeof toast === 'function') {
      toast('📦 ' + result.pushed + ' part dihubungkan ke Stok Sparepart' + (result.totalQtyAdded ? ' (total qty +' + result.totalQtyAdded + ')' : ''));
    }
  } else if (typeof toast === 'function') {
    toast('⚠️ Gagal menghubungkan part ke Stok Sparepart');
  }
  return result;
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama modul lain di area ini (const object, expose
// eksplisit ke window krn Node vm & browser non-module script TIDAK
// otomatis menempelkan binding const/let ke global object).
// ------------------------------------------------------------------------
const VehicleCatalogImportStockPush = {
  run: vehicleCatalogImportStockPushRun,
  promptAndRun: vehicleCatalogImportStockPushPromptAndRun,
};

if (typeof window !== 'undefined') {
  window.VehicleCatalogImportStockPush = VehicleCatalogImportStockPush;
}
