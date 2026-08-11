// vehicle-catalog-servis-link.js — Vehicle Catalog Tahap 6, Sesi 1/3
// (paling ringan): jembatan MURNI LOGIC antara D.servisLogs (catatan
// servis, dimiliki car-notes.js/data-default.js) dan VehicleCatalog
// (katalog suku cadang, IDBStore terpisah, modules/vehicle/vehicle-catalog.js).
//
// CAKUPAN SESI INI (dari 3 sesi Tahap 6 — "integrasi Vehicle Catalog ke
// Car Notes", lihat catatan Tahap 6 di CHANGELOG.md § kw183-...-641):
//   Sesi 1 (ini): SIMPAN REFERENSI part/jumlah/kode OEM ke catatan servis
//   — murni logic, TIDAK ADA UI baru.
//   Sesi 2 (berikutnya): UI picker "Pilih dari Katalog" di servisModal,
//   memanggil fungsi di file ini saat simpan; tampilkan part terlampir
//   di daftar/detail servis.
//   Sesi 3 (berikutnya): rekomendasi part berdasar jenis kendaraan &
//   jenis servis (engine baru, reuse VehicleCatalog.search()+kompatibilitas
//   kendaraan dari Sesi 165 `jenisKendaraan`).
//
// ATURAN WAJIB (konsisten ACR-001):
// - File ini TIDAK menyentuh IDBStore/VehicleCatalogStore — hanya
//   memanggil method publik `VehicleCatalog.getById()` (baca saja),
//   guard `typeof VehicleCatalog==='function'`... (objek, guard
//   `typeof VehicleCatalog!=='undefined'`).
// - File ini BOLEH membaca/menulis `D.servisLogs` (field baru opsional
//   `catalogPartRefs`, additive — entri lama tanpa field ini tetap valid,
//   diperlakukan sebagai array kosong) karena `D.servisLogs` sendiri
//   sudah dimiliki bersama oleh banyak modul vehicle/car-notes (pola sama
//   `usedPartId`/`usedPartQty` yang ditulis dari car-notes.js).
// - TIDAK memanggil `save()` global (persistensi D) di sini — modul ini
//   murni logic, pemanggil (Sesi 2: `Servis.save()` di car-notes.js)
//   yang bertanggung jawab memanggil `save()`+render setelah sukses.
//   Ini SENGAJA beda dari `vehicleCatalogAttachToServis` versi "otonom":
//   supaya fungsi ini bisa dites tanpa mock `save()`, dan supaya 1 titik
//   `save()` per alur (tidak dobel-simpan).
// - Tidak ada skema/storage/field baru di VehicleCatalog itu sendiri.
// - `catalogPartRefs` HANYA menyimpan array referensi ringan
//   `{catalogId, qty}` (id + jumlah) di sisi D.servisLogs — bukan salinan
//   data part (nama/OEM/harga dst tetap dibaca live dari VehicleCatalog
//   lewat `vehicleCatalogResolveServisParts()`, supaya tidak ada data
//   part yang basi/dobel-sumber-kebenaran).

/** Normalisasi 1 array referensi part mentah jadi bentuk baku
 * `{catalogId, qty}` (qty >= 1, default 1 kalau tidak valid/kosong).
 * Fungsi MURNI, tidak menyentuh D/VehicleCatalog — dipisah supaya bisa
 * dites & dipakai ulang oleh UI Sesi 2 nanti. */
function vehicleCatalogNormalizeServisRefs(refs) {
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
 * terlampir di 1 catatan servis. Selalu array (kosong kalau tidak ada
 * `id` cocok atau field belum pernah diisi — entri servis lama tetap
 * valid, backward compatible). Pure read, tidak async (tidak butuh
 * VehicleCatalog untuk ini — cuma baca D.servisLogs). */
function vehicleCatalogGetServisRefs(servisId) {
  if (typeof D === 'undefined' || !Array.isArray(D.servisLogs)) return [];
  const s = D.servisLogs.find((x) => x && x.id === servisId);
  if (!s || !Array.isArray(s.catalogPartRefs)) return [];
  return s.catalogPartRefs.slice();
}

/** Tulis (replace total, bukan merge) referensi part katalog ke 1
 * catatan servis. `refs` melalui `vehicleCatalogNormalizeServisRefs()`
 * dulu. TIDAK memanggil `save()` (lihat catatan header) — caller wajib
 * memanggil `save()` sendiri setelah `success:true`.
 * Return `{success:false, errors}` kalau `servisId` tidak ditemukan di
 * `D.servisLogs` (tidak membuat entri baru — modul ini bukan pemilik
 * siklus hidup catatan servis, cuma pelengkap referensi part). */
function vehicleCatalogAttachToServis(servisId, refs) {
  if (typeof D === 'undefined' || !Array.isArray(D.servisLogs)) {
    return { success: false, errors: ['D.servisLogs tidak tersedia.'] };
  }
  const s = D.servisLogs.find((x) => x && x.id === servisId);
  if (!s) return { success: false, errors: ['Catatan servis tidak ditemukan.'] };
  s.catalogPartRefs = vehicleCatalogNormalizeServisRefs(refs);
  return { success: true, catalogPartRefs: s.catalogPartRefs.slice() };
}

/** Lepas 1 referensi part (by catalogId) dari 1 catatan servis, sisanya
 * dibiarkan apa adanya. Sama seperti attach: TIDAK memanggil `save()`.
 * `success:true` juga kalau catalogId memang tidak ada di daftar
 * (idempotent — hasil akhirnya sama, tidak dianggap error). */
function vehicleCatalogDetachFromServis(servisId, catalogId) {
  if (typeof D === 'undefined' || !Array.isArray(D.servisLogs)) {
    return { success: false, errors: ['D.servisLogs tidak tersedia.'] };
  }
  const s = D.servisLogs.find((x) => x && x.id === servisId);
  if (!s) return { success: false, errors: ['Catatan servis tidak ditemukan.'] };
  const before = Array.isArray(s.catalogPartRefs) ? s.catalogPartRefs : [];
  s.catalogPartRefs = before.filter((r) => String(r.catalogId) !== String(catalogId));
  return { success: true, catalogPartRefs: s.catalogPartRefs.slice() };
}

/** Resolusi referensi part 1 catatan servis jadi data part LENGKAP (live
 * dari VehicleCatalog, bukan salinan) — dipakai UI Sesi 2 untuk
 * menampilkan nama/OEM/harga part yang terlampir. Tiap baris hasil:
 * `{catalogId, qty, item}` — `item` adalah hasil `VehicleCatalog.getById()`
 * (bisa `null` kalau part sudah dihapus dari katalog sejak dilampirkan —
 * dilaporkan jujur sebagai `item:null`, BUKAN dihapus otomatis dari
 * `catalogPartRefs`, supaya qty/riwayat servis tidak hilang diam-diam).
 * Async karena `VehicleCatalog.getById()` async (baca IDBStore). Kalau
 * `VehicleCatalog` belum dimuat (guard typeof), setiap `item` jadi
 * `null` apa adanya — tidak melempar error. */
async function vehicleCatalogResolveServisParts(servisId) {
  const refs = vehicleCatalogGetServisRefs(servisId);
  const hasCatalog = typeof VehicleCatalog !== 'undefined' && VehicleCatalog && typeof VehicleCatalog.getById === 'function';
  const rows = [];
  for (const ref of refs) {
    const item = hasCatalog ? await VehicleCatalog.getById(ref.catalogId) : null;
    rows.push({ catalogId: ref.catalogId, qty: ref.qty, item: item || null });
  }
  return rows;
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama VehicleCatalog/AIBus (const object, expose
// eksplisit ke window karena Node vm & browser non-module script TIDAK
// otomatis menempelkan binding const/let ke global object).
// ------------------------------------------------------------------------
const VehicleCatalogServisLink = {
  normalizeRefs: vehicleCatalogNormalizeServisRefs,
  getServisRefs: vehicleCatalogGetServisRefs,
  attachToServis: vehicleCatalogAttachToServis,
  detachFromServis: vehicleCatalogDetachFromServis,
  resolveServisParts: vehicleCatalogResolveServisParts,
};

if (typeof window !== 'undefined') {
  window.VehicleCatalogServisLink = VehicleCatalogServisLink;
}
