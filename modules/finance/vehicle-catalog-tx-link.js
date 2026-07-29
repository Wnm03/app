// vehicle-catalog-tx-link.js — Vehicle Catalog Tahap 7A: "Smart Transaction
// Foundation", jembatan MURNI LOGIC antara D.transactions (transaksi
// keuangan, dimiliki modules/finance/transaksi.js) dan VehicleCatalog
// (katalog suku cadang, IDBStore terpisah, modules/vehicle/vehicle-catalog.js).
//
// Pola & alasan SAMA PERSIS dua mekanisme yang sudah terbukti dipakai untuk
// D.servisLogs (Vehicle Catalog Tahap 6, lihat
// modules/vehicle/vehicle-catalog-servis-link.js & CHANGELOG Sesi 180 §Tahap
// 6B2), sekarang direplikasi untuk D.transactions:
//
//   1) `catalogPartRefs` (array `{catalogId, qty}[]`) — SUMBER KEBENARAN
//      untuk multi-part per transaksi + resolve LIVE ke VehicleCatalog
//      (nama/OEM/harga selalu terbaru, tidak basi).
//   2) 4 field flat opsional langsung di record transaksi —
//      `catalogPartId`, `catalogPartName`, `catalogPartOemCode`,
//      `catalogPartQty` — snapshot RINGAN utk 1 part utama, supaya tetap
//      terbaca cepat/langsung tanpa resolve async, bahkan kalau part itu
//      nanti dihapus dari katalog (pola sama persis
//      catalogPartId/catalogPartQty/catalogPartOemCode di D.servisLogs).
//
// CAKUPAN SESI INI (Tahap 7A — Foundation, murni logic, TIDAK ADA UI baru):
// hanya bridge/helper. Wiring ke txModal (form pilih part di dalam modal
// transaksi, mis. `_saveTxInner()` di transaksi.js) SENGAJA belum
// dikerjakan — itu wiring UI, di luar cakupan "Foundation" (pola sama
// Tahap 6 Sesi 1 vs Sesi 2 utk servis: logic dulu, UI menyusul sesi lain).
//
// ATURAN WAJIB (konsisten ACR-001 & pola vehicle-catalog-servis-link.js):
// - File ini TIDAK menyentuh IDBStore/VehicleCatalogStore — hanya memanggil
//   method publik `VehicleCatalog.getById()` (baca saja), guard
//   `typeof VehicleCatalog!=='undefined'`.
// - File ini BOLEH membaca/menulis `D.transactions` (field baru opsional
//   `catalogPartRefs`/`catalogPartId`/`catalogPartName`/`catalogPartOemCode`/
//   `catalogPartQty`, SEMUA additive — entri lama tanpa field ini tetap
//   valid, diperlakukan sebagai array kosong / null / '' / 0).
// - TIDAK memanggil `save()` global di sini — modul ini murni logic,
//   pemanggil (masa depan: `_saveTxInner()` di transaksi.js, sesi UI
//   berikutnya) yang bertanggung jawab memanggil `save()`+render setelah
//   sukses. Sama alasan seperti vehicle-catalog-servis-link.js: supaya
//   fungsi ini bisa dites tanpa mock `save()`, dan supaya 1 titik `save()`
//   per alur (tidak dobel-simpan).
// - Tidak ada skema/storage/field baru di VehicleCatalog itu sendiri.
// - Tidak ada database/storage baru — reuse IDBStore (via VehicleCatalog)
//   & D (via transaksi.js) yang sudah ada.
// - `catalogPartRefs` HANYA menyimpan array referensi ringan
//   `{catalogId, qty}` — bukan salinan data part (nama/OEM/harga tetap
//   dibaca live dari VehicleCatalog lewat `resolveTxParts()`).
// - 4 field flat adalah SNAPSHOT (boleh jadi basi kalau part diedit di
//   katalog setelahnya) — ini SENGAJA, sama seperti snapshot servis,
//   supaya riwayat transaksi tetap terbaca walau part sudah diubah/hapus.

// ------------------------------------------------------------------------
// Mekanisme 1: catalogPartRefs (array, multi-part, resolve live)
// ------------------------------------------------------------------------

/** Normalisasi 1 array referensi part mentah jadi bentuk baku
 * `{catalogId, qty}` (qty >= 1, default 1 kalau tidak valid/kosong).
 * Fungsi MURNI, tidak menyentuh D/VehicleCatalog — sama persis
 * `vehicleCatalogNormalizeServisRefs()` (vehicle-catalog-servis-link.js). */
function vehicleCatalogNormalizeTxRefs(refs) {
  if (!Array.isArray(refs)) return [];
  return refs
    .filter((r) => r && (typeof r.catalogId === 'string' || typeof r.catalogId === 'number') && String(r.catalogId).trim())
    .map((r) => {
      const qtyNum = Number(r.qty);
      return {
        catalogId: String(r.catalogId).trim(),
        qty: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1,
      };
    });
}

/** Ambil referensi part katalog (mentah, `{catalogId, qty}[]`) yang
 * terlampir di 1 transaksi. Selalu array (kosong kalau tidak ada `id`
 * cocok atau field belum pernah diisi — transaksi lama tetap valid,
 * backward compatible). Pure read, tidak async. */
function vehicleCatalogGetTxRefs(txId) {
  if (typeof D === 'undefined' || !Array.isArray(D.transactions)) return [];
  const t = D.transactions.find((x) => x && x.id === txId);
  if (!t || !Array.isArray(t.catalogPartRefs)) return [];
  return t.catalogPartRefs.slice();
}

/** Tulis (replace total, bukan merge) referensi part katalog ke 1
 * transaksi. `refs` melalui `vehicleCatalogNormalizeTxRefs()` dulu. TIDAK
 * memanggil `save()` — caller wajib memanggil `save()` sendiri setelah
 * `success:true`. Return `{success:false, errors}` kalau `txId` tidak
 * ditemukan di `D.transactions` (tidak membuat entri baru — modul ini
 * bukan pemilik siklus hidup transaksi). */
function vehicleCatalogAttachToTx(txId, refs) {
  if (typeof D === 'undefined' || !Array.isArray(D.transactions)) {
    return { success: false, errors: ['D.transactions tidak tersedia.'] };
  }
  const t = D.transactions.find((x) => x && x.id === txId);
  if (!t) return { success: false, errors: ['Transaksi tidak ditemukan.'] };
  t.catalogPartRefs = vehicleCatalogNormalizeTxRefs(refs);
  return { success: true, catalogPartRefs: t.catalogPartRefs.slice() };
}

/** Lepas 1 referensi part (by catalogId) dari 1 transaksi, sisanya
 * dibiarkan apa adanya. TIDAK memanggil `save()`. `success:true` juga
 * kalau catalogId memang tidak ada di daftar (idempotent). */
function vehicleCatalogDetachFromTx(txId, catalogId) {
  if (typeof D === 'undefined' || !Array.isArray(D.transactions)) {
    return { success: false, errors: ['D.transactions tidak tersedia.'] };
  }
  const t = D.transactions.find((x) => x && x.id === txId);
  if (!t) return { success: false, errors: ['Transaksi tidak ditemukan.'] };
  const before = Array.isArray(t.catalogPartRefs) ? t.catalogPartRefs : [];
  t.catalogPartRefs = before.filter((r) => String(r.catalogId) !== String(catalogId));
  return { success: true, catalogPartRefs: t.catalogPartRefs.slice() };
}

/** Resolusi referensi part 1 transaksi jadi data part LENGKAP (live dari
 * VehicleCatalog, bukan salinan) — dipakai UI masa depan untuk menampilkan
 * nama/OEM/harga part yang terlampir. Tiap baris hasil:
 * `{catalogId, qty, item}` — `item` bisa `null` kalau part sudah dihapus
 * dari katalog sejak dilampirkan (dilaporkan jujur, BUKAN dihapus otomatis
 * dari `catalogPartRefs`). Async karena `VehicleCatalog.getById()` async. */
async function vehicleCatalogResolveTxParts(txId) {
  const refs = vehicleCatalogGetTxRefs(txId);
  const hasCatalog = typeof VehicleCatalog !== 'undefined' && VehicleCatalog && typeof VehicleCatalog.getById === 'function';
  const rows = [];
  for (const ref of refs) {
    const item = hasCatalog ? await VehicleCatalog.getById(ref.catalogId) : null;
    rows.push({ catalogId: ref.catalogId, qty: ref.qty, item: item || null });
  }
  return rows;
}

// ------------------------------------------------------------------------
// Mekanisme 2: snapshot flat (catalogPartId/catalogPartName/
// catalogPartOemCode/catalogPartQty) — pola sama persis Sesi 180 (Tahap
// 6B2) utk D.servisLogs, direplikasi utk D.transactions.
// ------------------------------------------------------------------------

/** Bangun snapshot 4-field flat dari 1 item katalog + qty. Fungsi MURNI,
 * tidak menyentuh D/VehicleCatalog — dipisah supaya bisa dites & dipakai
 * ulang oleh UI masa depan (mis. txModal) tanpa efek samping. `item` null/
 * kosong -> snapshot kosong (`catalogPartId:null, catalogPartQty:0, dst`),
 * sama seperti transaksi yang tidak memilih part sama sekali. */
function vehicleCatalogBuildTxSnapshot(item, qty) {
  if (!item || !item.id) {
    return { catalogPartId: null, catalogPartName: '', catalogPartOemCode: '', catalogPartQty: 0 };
  }
  const qtyNum = Number(qty);
  return {
    catalogPartId: String(item.id),
    catalogPartName: item.partName || '',
    catalogPartOemCode: item.oemCode || '',
    catalogPartQty: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1,
  };
}

/** Baca snapshot flat 1 transaksi apa adanya dari `D.transactions` —
 * backward compatible: transaksi lama tanpa field ini -> snapshot kosong
 * (`catalogPartId:null`, dst), BUKAN `undefined`. Pure read, tidak async. */
function vehicleCatalogGetTxSnapshot(txId) {
  if (typeof D === 'undefined' || !Array.isArray(D.transactions)) {
    return { catalogPartId: null, catalogPartName: '', catalogPartOemCode: '', catalogPartQty: 0 };
  }
  const t = D.transactions.find((x) => x && x.id === txId);
  if (!t) return { catalogPartId: null, catalogPartName: '', catalogPartOemCode: '', catalogPartQty: 0 };
  return {
    catalogPartId: t.catalogPartId != null ? t.catalogPartId : null,
    catalogPartName: t.catalogPartName || '',
    catalogPartOemCode: t.catalogPartOemCode || '',
    catalogPartQty: t.catalogPartQty || 0,
  };
}

/** Resolve `catalogId` -> item (via `VehicleCatalog.getById()`, SEKALI
 * panggilan async) lalu tulis 4 field flat snapshot ke record transaksi di
 * `D.transactions` (additive, replace total field-field itu saja — field
 * lain transaksi tidak disentuh). TIDAK memanggil `save()` (lihat catatan
 * header) — caller wajib memanggil `save()` sendiri setelah `success:true`.
 * `catalogId` kosong/falsy -> snapshot dikosongkan (sama seperti
 * `clearTxSnapshot()`), dipakai kasus user membatalkan pilihan part saat
 * edit transaksi. Return `{success:false, errors}` kalau `txId` tidak
 * ditemukan, atau kalau `catalogId` diisi tapi part-nya sudah tidak ada di
 * katalog (tidak menyimpan snapshot dari data yang tidak valid). */
async function vehicleCatalogAttachSnapshotToTx(txId, catalogId, qty) {
  if (typeof D === 'undefined' || !Array.isArray(D.transactions)) {
    return { success: false, errors: ['D.transactions tidak tersedia.'] };
  }
  const t = D.transactions.find((x) => x && x.id === txId);
  if (!t) return { success: false, errors: ['Transaksi tidak ditemukan.'] };
  if (!catalogId) {
    const empty = vehicleCatalogBuildTxSnapshot(null, 0);
    Object.assign(t, empty);
    return { success: true, snapshot: empty };
  }
  const hasCatalog = typeof VehicleCatalog !== 'undefined' && VehicleCatalog && typeof VehicleCatalog.getById === 'function';
  const item = hasCatalog ? await VehicleCatalog.getById(catalogId) : null;
  if (!item) return { success: false, errors: ['Part tidak ditemukan di katalog.'] };
  const snapshot = vehicleCatalogBuildTxSnapshot(item, qty);
  Object.assign(t, snapshot);
  return { success: true, snapshot };
}

/** Kosongkan snapshot flat 1 transaksi (dipakai saat user membatalkan
 * pilihan part). TIDAK memanggil `save()`. `success:true` juga kalau
 * snapshot memang sudah kosong (idempotent). */
function vehicleCatalogClearTxSnapshot(txId) {
  if (typeof D === 'undefined' || !Array.isArray(D.transactions)) {
    return { success: false, errors: ['D.transactions tidak tersedia.'] };
  }
  const t = D.transactions.find((x) => x && x.id === txId);
  if (!t) return { success: false, errors: ['Transaksi tidak ditemukan.'] };
  Object.assign(t, vehicleCatalogBuildTxSnapshot(null, 0));
  return { success: true, snapshot: vehicleCatalogGetTxSnapshot(txId) };
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama VehicleCatalogServisLink/VehicleCatalog
// (const object, expose eksplisit ke window karena Node vm & browser
// non-module script TIDAK otomatis menempelkan binding const/let ke
// global object).
// ------------------------------------------------------------------------
const VehicleCatalogTxLink = {
  normalizeRefs: vehicleCatalogNormalizeTxRefs,
  getTxRefs: vehicleCatalogGetTxRefs,
  attachToTx: vehicleCatalogAttachToTx,
  detachFromTx: vehicleCatalogDetachFromTx,
  resolveTxParts: vehicleCatalogResolveTxParts,
  buildSnapshot: vehicleCatalogBuildTxSnapshot,
  getSnapshot: vehicleCatalogGetTxSnapshot,
  attachSnapshotToTx: vehicleCatalogAttachSnapshotToTx,
  clearSnapshot: vehicleCatalogClearTxSnapshot,
};

if (typeof window !== 'undefined') {
  window.VehicleCatalogTxLink = VehicleCatalogTxLink;
}
