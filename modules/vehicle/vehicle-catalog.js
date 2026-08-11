// vehicle-catalog.js — Parts Catalog (Katalog Suku Cadang), Milestone 0
// Phase 1: fondasi murni (storage + CRUD + validation + search + filter),
// TANPA UI/wiring page baru.
//
// PERUBAHAN SESI INI (TASK-007 — Tahap 3 OCR label kemasan, logic saja,
// ringkas): tambah `parseLabelText(text)` (regex murni, cari OEM Code
// alfanumerik & barcode 8-14 digit dari teks) & `handleOcrLabel(text)`
// (reuse `parseLabelText()`+`findByCode()`, pola SAMA PERSIS
// `handleScan()` Tahap 2 — kode ketemu -> buka part existing, tidak
// ketemu -> draft otomatis). Reuse OCR engine yang SUDAH ADA
// (`ocrRecognize()`/Tesseract, modules/shared/scan-ocr.js) — TIDAK ada
// library/keputusan produk baru. Kamera/upload foto label & pemanggilan
// `ocrRecognize()` itu sendiri TETAP di luar cakupan (butuh UI Phase 2).
//
// PERUBAHAN SEBELUMNYA (TASK-006 — lanjutan ringan dari handleScan()):
// tambah `getDrafts()` (daftar part isDraft:true saja) & `resolveDraft(id,
// patch)` (lengkapi draft jadi part biasa, paksa isDraft:false, reuse
// update()/validate() apa adanya). Draft otomatis dari handleScan() TIDAK
// pernah punya cara disurvei/diselesaikan sebelum ini — gap kecil ini
// ditutup, murni logic, TIDAK ada skema/storage baru.
//
// PERUBAHAN SEBELUMNYA (Tahap 2 — logic HASIL SCAN saja, ringkas): tambah
// `handleScan(code)` — dipanggil dgn STRING kode hasil decode (dari
// scanner APAPUN: barcode/QR/DataMatrix), BUKAN implementasi kamera/
// library scan itu sendiri (itu butuh keputusan produk terpisah: pilih
// library, izin kamera, dsb — di luar cakupan "ringkas"). Kalau kode
// cocok (reuse findByCode()) -> buka part existing. Kalau tidak ->
// otomatis buat draft part (flag `isDraft:true`, TIDAK ada data
// imajinasi/dummy selain barcode itu sendiri), sesuai Tahap 2: "Jika
// kode ditemukan -> buka data part. Jika belum ada -> buat draft part
// otomatis." Field `isDraft` ditambah ke skema (default false untuk
// part yg dibuat lewat create() biasa).
//
// PERUBAHAN SEBELUMNYA (Tahap 4 — kelengkapan field database part,
// lanjutan ringkas dari Tahap 1): tambah field aftermarketCode/price/
// supplier/location/serviceNotes (semua opsional, "Database Belum
// Terinput" kalau kosong — TIDAK ada nilai imajinasi/dummy).
// photos/compatibleVehicleIds TETAP array. Tahap 3 (OCR)/Tahap 5
// (import massal)/Tahap 6 (integrasi Car Notes) TETAP belum dikerjakan
// (butuh UI/wiring page baru, di luar cakupan "ringkas").
//
// PERUBAHAN SEBELUMNYA (Tahap 1 — permintaan user, keputusan eksplisit:
// "Ubah/perluas vehicle-catalog.js yang ada jadi katalog suku cadang"):
// skema Phase 1 sebelumnya (name/jenis/brand/year/plateNumber — katalog
// REFERENSI KENDARAAN) DIGANTI TOTAL jadi katalog SUKU CADANG (part
// name/OEM Code/barcode/kategori/kompatibilitas kendaraan/foto), sesuai
// Tahap 1 roadmap user: "Search nama part, OEM Code, barcode. Filter
// kendaraan dan kategori. Multi foto." Key storage TIDAK berubah
// ('vehicle-catalog:store') supaya backup/restore (modules/shared/
// backup-restore.js) & entri scripts/build.js tetap valid tanpa
// perubahan tambahan — keduanya bekerja di level store/file generik,
// bukan di level skema item.
//
// ATURAN WAJIB (tetap sama seperti sebelumnya — lihat ACR-001,
// docs/architecture/ACR-001-vehicle-catalog-bridge.md, Opsi A):
// - Tidak pernah menyentuh D. Tidak ada property baru di D. Katalog part
//   ini data terpisah dari D.vehicles & D.sparepartCats (kategori servis
//   existing di modules/vehicle/sparepart-servis.js) — TIDAK menduplikasi
//   atau mengubah keduanya. `compatibleVehicleIds` HANYA menyimpan array
//   id referensi (string) ke D.vehicles, tanpa membaca/validasi ke D
//   langsung dari modul ini (validasi keberadaan id dilakukan di lapisan
//   UI/adapter pada fase berikutnya, bukan di sini — pola sama seperti
//   sourceRef LifeOS yang resolvernya terpisah dari writer-nya).
// - Tidak pernah memanggil save() milik D.
// - Persist lewat IDBStore (reuse instance global yang sama dgn app),
//   key 'vehicle-catalog:store', terpisah total dari siklus save/load
//   milik D/LifeOSStore/EIEStore/AIStore.
// - Modul lain mengakses store ini HANYA lewat method di namespace
//   `VehicleCatalog` (window.VehicleCatalog) di bawah.
// - Phase 1 ini sengaja TANPA UI (tidak ada tab baru di page:'carnotes',
//   tidak ada perubahan index.html/app_production.html) — Tahap 2/3/4/5/6
//   (scan barcode/QR/DataMatrix, OCR, database OEM Honda, import massal,
//   integrasi Car Notes) SENGAJA belum dikerjakan sesi ini, di luar
//   cakupan "kerjakan yang ringan dulu".

const VEHICLE_CATALOG_STORE_KEY = 'vehicle-catalog:store';
const VEHICLE_CATALOG_DEFAULT = { items: [] };
const VEHICLE_CATALOG_MAX_PHOTOS = 8;

let VehicleCatalogStore = { items: [] };

async function vehicleCatalogLoad() {
  // CATATAN: IDBStore.get() cuma terima 1 argumen, default diterapkan
  // manual di sini — sama seperti ai-core.js/eie-store.js/lifeos-store.js.
  const raw = await IDBStore.get(VEHICLE_CATALOG_STORE_KEY);
  VehicleCatalogStore = Object.assign({}, VEHICLE_CATALOG_DEFAULT, raw || {});
  if (!Array.isArray(VehicleCatalogStore.items)) VehicleCatalogStore.items = [];
  return VehicleCatalogStore;
}

let _vehicleCatalogLoaded = false;
// Dipanggil di awal tiap operasi CRUD/search/filter — load dari IDBStore
// SEKALI per sesi app, pola sama persis aiEnsureLoaded()/lifeOSEnsureLoaded().
async function vehicleCatalogEnsureLoaded() {
  if (!_vehicleCatalogLoaded) {
    await vehicleCatalogLoad();
    _vehicleCatalogLoaded = true;
  }
  return VehicleCatalogStore;
}

async function vehicleCatalogSave() {
  return IDBStore.set(VEHICLE_CATALOG_STORE_KEY, VehicleCatalogStore);
}

function vehicleCatalogGetStore() {
  return VehicleCatalogStore;
}

/** Invalidate cache "sudah dimuat sekali per sesi". SATU-SATUNYA pemanggil
 * yang sah: applyRestoredData() (backup-restore.js), setelah menulis ulang
 * key 'vehicle-catalog:store' di IndexedDB dari file backup. Dipanggil
 * lewat guard `typeof vehicleCatalogInvalidateCache==='function'`. */
function vehicleCatalogInvalidateCache() {
  _vehicleCatalogLoaded = false;
}

// vehicleCatalogIsLoaded() — Sesi 276 (audit sinkronisasi lintas-fitur):
// getter sync murni (baca flag module-scope `_vehicleCatalogLoaded` apa
// adanya, 0 logic baru) supaya konsumen SYNC lain (mis. runDataHealthCheck()
// di data-health-check.js) bisa tahu apakah vehicleCatalogGetStore() sudah
// terisi data asli dari IndexedDB atau masih default kosong bawaan modul
// ({items:[]}) — tanpa ini, cek orphan catalogId berisiko false-positive
// (menganggap semua tautan catalogId "hilang" padahal katalognya belum
// sempat dimuat). Tidak mengubah perilaku ensureLoaded()/getStore() yang
// sudah ada sama sekali.
function vehicleCatalogIsLoaded() {
  return _vehicleCatalogLoaded;
}

// ------------------------------------------------------------------------
// Validation — fungsi murni, tidak menyentuh IDBStore/D, supaya bisa dites
// dan dipakai ulang (mis. calon form UI Phase 2) tanpa efek samping.
// ------------------------------------------------------------------------
function vehicleCatalogValidate(data) {
  data = data || {};
  const errors = [];

  const partName = typeof data.partName === 'string' ? data.partName.trim() : '';
  if (!partName) errors.push('Nama part wajib diisi.');
  else if (partName.length > 150) errors.push('Nama part maksimal 150 karakter.');

  const category = typeof data.category === 'string' ? data.category.trim() : '';
  if (!category) errors.push('Kategori wajib diisi.');
  else if (category.length > 50) errors.push('Kategori maksimal 50 karakter.');

  if (data.oemCode !== undefined && data.oemCode !== null && typeof data.oemCode !== 'string') {
    errors.push('OEM Code harus berupa teks.');
  } else if (data.oemCode && data.oemCode.length > 50) {
    errors.push('OEM Code maksimal 50 karakter.');
  }

  if (data.barcode !== undefined && data.barcode !== null && typeof data.barcode !== 'string') {
    errors.push('Barcode harus berupa teks.');
  } else if (data.barcode && data.barcode.length > 64) {
    errors.push('Barcode maksimal 64 karakter.');
  }

  if (data.compatibleVehicleIds !== undefined && data.compatibleVehicleIds !== null) {
    if (!Array.isArray(data.compatibleVehicleIds)) {
      errors.push('Kompatibilitas kendaraan harus berupa daftar (array).');
    } else if (data.compatibleVehicleIds.some((v) => typeof v !== 'string' && typeof v !== 'number')) {
      errors.push('Setiap id kendaraan kompatibel harus berupa teks/angka.');
    }
  }

  if (data.photos !== undefined && data.photos !== null) {
    if (!Array.isArray(data.photos)) {
      errors.push('Foto harus berupa daftar (array).');
    } else if (data.photos.length > VEHICLE_CATALOG_MAX_PHOTOS) {
      errors.push('Maksimal ' + VEHICLE_CATALOG_MAX_PHOTOS + ' foto per part.');
    } else if (data.photos.some((p) => typeof p !== 'string' || !p)) {
      errors.push('Setiap foto harus berupa teks (data URL/path) yang tidak kosong.');
    }
  }

  if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
    errors.push('Catatan harus berupa teks.');
  } else if (data.notes && data.notes.length > 500) {
    errors.push('Catatan maksimal 500 karakter.');
  }

  // ---- Tahap 4: kelengkapan field database part (semua opsional) ----
  if (data.aftermarketCode !== undefined && data.aftermarketCode !== null && typeof data.aftermarketCode !== 'string') {
    errors.push('Aftermarket Code harus berupa teks.');
  } else if (data.aftermarketCode && data.aftermarketCode.length > 50) {
    errors.push('Aftermarket Code maksimal 50 karakter.');
  }

  if (data.price !== undefined && data.price !== null && data.price !== '') {
    const p = Number(data.price);
    if (!Number.isFinite(p) || p < 0) errors.push('Harga harus berupa angka >= 0.');
  }

  if (data.supplier !== undefined && data.supplier !== null && typeof data.supplier !== 'string') {
    errors.push('Supplier harus berupa teks.');
  } else if (data.supplier && data.supplier.length > 100) {
    errors.push('Supplier maksimal 100 karakter.');
  }

  if (data.location !== undefined && data.location !== null && typeof data.location !== 'string') {
    errors.push('Lokasi penyimpanan harus berupa teks.');
  } else if (data.location && data.location.length > 100) {
    errors.push('Lokasi penyimpanan maksimal 100 karakter.');
  }

  if (data.serviceNotes !== undefined && data.serviceNotes !== null && typeof data.serviceNotes !== 'string') {
    errors.push('Catatan servis harus berupa teks.');
  } else if (data.serviceNotes && data.serviceNotes.length > 500) {
    errors.push('Catatan servis maksimal 500 karakter.');
  }

  // ---- Golongan A (audit UID v1.0 — field additive dari skema part yg
  // diusulkan): semua opsional, pola SAMA PERSIS field Tahap 4 di atas.
  // Bukan implementasi UID penuh (Bagian 3/4/5/6/12/13/17/18/23 SENGAJA
  // tidak dikerjakan — butuh store/arsitektur baru & keputusan produk
  // terpisah, lihat hasil audit).
  if (data.oldPartNumber !== undefined && data.oldPartNumber !== null && typeof data.oldPartNumber !== 'string') {
    errors.push('Old Part Number harus berupa teks.');
  } else if (data.oldPartNumber && data.oldPartNumber.length > 50) {
    errors.push('Old Part Number maksimal 50 karakter.');
  }

  if (data.replacementPartNumber !== undefined && data.replacementPartNumber !== null && typeof data.replacementPartNumber !== 'string') {
    errors.push('Replacement Part Number harus berupa teks.');
  } else if (data.replacementPartNumber && data.replacementPartNumber.length > 50) {
    errors.push('Replacement Part Number maksimal 50 karakter.');
  }

  if (data.dimension !== undefined && data.dimension !== null && typeof data.dimension !== 'string') {
    errors.push('Dimensi harus berupa teks.');
  } else if (data.dimension && data.dimension.length > 100) {
    errors.push('Dimensi maksimal 100 karakter.');
  }

  if (data.material !== undefined && data.material !== null && typeof data.material !== 'string') {
    errors.push('Material harus berupa teks.');
  } else if (data.material && data.material.length > 100) {
    errors.push('Material maksimal 100 karakter.');
  }

  if (data.weight !== undefined && data.weight !== null && data.weight !== '') {
    const w = Number(data.weight);
    if (!Number.isFinite(w) || w < 0) errors.push('Berat harus berupa angka >= 0 (gram).');
  }

  // source — bebas teks (mis. "Service Manual"/"OCR"/"User Input"), TIDAK
  // dibatasi enum tertutup supaya sumber baru tidak perlu ubah kode ini.
  if (data.source !== undefined && data.source !== null && typeof data.source !== 'string') {
    errors.push('Source harus berupa teks.');
  } else if (data.source && data.source.length > 50) {
    errors.push('Source maksimal 50 karakter.');
  }

  const CONFIDENCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
  if (data.confidence !== undefined && data.confidence !== null && data.confidence !== '' && CONFIDENCE_LEVELS.indexOf(String(data.confidence).toUpperCase()) === -1) {
    errors.push('Confidence harus salah satu dari: ' + CONFIDENCE_LEVELS.join(', ') + '.');
  }

  return { valid: errors.length === 0, errors };
}

// ------------------------------------------------------------------------
// CRUD
// ------------------------------------------------------------------------
function _vehicleCatalogNormalize(data) {
  return {
    partName: (typeof data.partName === 'string' ? data.partName : '').trim(),
    category: (typeof data.category === 'string' ? data.category : '').trim(),
    oemCode: data.oemCode ? String(data.oemCode).trim() : '',
    barcode: data.barcode ? String(data.barcode).trim() : '',
    compatibleVehicleIds: Array.isArray(data.compatibleVehicleIds)
      ? data.compatibleVehicleIds.map((v) => String(v))
      : [],
    photos: Array.isArray(data.photos) ? data.photos.slice(0, VEHICLE_CATALOG_MAX_PHOTOS) : [],
    notes: data.notes ? String(data.notes).trim() : '',
    // ---- Tahap 4: kelengkapan field database part ----
    aftermarketCode: data.aftermarketCode ? String(data.aftermarketCode).trim() : '',
    price: (data.price !== undefined && data.price !== null && data.price !== '') ? Number(data.price) : null,
    supplier: data.supplier ? String(data.supplier).trim() : '',
    location: data.location ? String(data.location).trim() : '',
    serviceNotes: data.serviceNotes ? String(data.serviceNotes).trim() : '',
    isDraft: !!data.isDraft,
    // ---- Golongan A (audit UID v1.0) ----
    oldPartNumber: data.oldPartNumber ? String(data.oldPartNumber).trim() : '',
    replacementPartNumber: data.replacementPartNumber ? String(data.replacementPartNumber).trim() : '',
    dimension: data.dimension ? String(data.dimension).trim() : '',
    material: data.material ? String(data.material).trim() : '',
    weight: (data.weight !== undefined && data.weight !== null && data.weight !== '') ? Number(data.weight) : null,
    consumable: !!data.consumable,
    source: data.source ? String(data.source).trim() : '',
    confidence: data.confidence ? String(data.confidence).trim().toUpperCase() : '',
  };
}

async function vehicleCatalogCreate(data) {
  await vehicleCatalogEnsureLoaded();
  const check = vehicleCatalogValidate(data);
  if (!check.valid) return { success: false, errors: check.errors };
  const now = new Date().toISOString();
  // uid() — reuse generator generik existing (features-helpers-global-
  // security.js), bukan skema id baru.
  const item = Object.assign({ id: uid() }, _vehicleCatalogNormalize(data), {
    createdAt: now,
    updatedAt: now,
  });
  VehicleCatalogStore.items.push(item);
  await vehicleCatalogSave();
  return { success: true, item };
}

async function vehicleCatalogUpdate(id, patch) {
  await vehicleCatalogEnsureLoaded();
  const idx = VehicleCatalogStore.items.findIndex((it) => sameId(it.id, id));
  if (idx === -1) return { success: false, errors: ['Part tidak ditemukan di katalog.'] };
  const existing = VehicleCatalogStore.items[idx];
  const merged = Object.assign({}, existing, patch || {});
  const check = vehicleCatalogValidate(merged);
  if (!check.valid) return { success: false, errors: check.errors };
  const updated = Object.assign({}, existing, _vehicleCatalogNormalize(merged), {
    updatedAt: new Date().toISOString(),
  });
  VehicleCatalogStore.items[idx] = updated;
  await vehicleCatalogSave();
  return { success: true, item: updated };
}

async function vehicleCatalogRemove(id) {
  await vehicleCatalogEnsureLoaded();
  const before = VehicleCatalogStore.items.length;
  VehicleCatalogStore.items = VehicleCatalogStore.items.filter((it) => !sameId(it.id, id));
  const removed = VehicleCatalogStore.items.length < before;
  if (removed) await vehicleCatalogSave();
  return { success: removed };
}

// Hapus BANYAK part sekaligus (dipakai fitur "Pilih & Hapus" di
// VehicleCatalogUI, sesi ini) — reuse sameId() apa adanya, 1x save() saja
// di akhir (bukan per-id) supaya tidak boros I/O kalau id banyak. `ids`
// kosong/bukan array -> tidak melakukan apa pun, return removed:0.
async function vehicleCatalogRemoveMany(ids) {
  await vehicleCatalogEnsureLoaded();
  const list = Array.isArray(ids) ? ids : [];
  if (!list.length) return { success: true, removed: 0 };
  const idSet = new Set(list.map((id) => String(id)));
  const before = VehicleCatalogStore.items.length;
  VehicleCatalogStore.items = VehicleCatalogStore.items.filter((it) => !idSet.has(String(it.id)));
  const removed = before - VehicleCatalogStore.items.length;
  if (removed > 0) await vehicleCatalogSave();
  return { success: true, removed };
}

// Hapus SEMUA part di katalog (dipakai tombol "Hapus Semua" di
// VehicleCatalogUI) — cukup panggil removeMany() dgn semua id yang ada
// sekarang, 0 duplikasi logic hapus.
async function vehicleCatalogRemoveAll() {
  await vehicleCatalogEnsureLoaded();
  const ids = VehicleCatalogStore.items.map((it) => it.id);
  return vehicleCatalogRemoveMany(ids);
}

async function vehicleCatalogGetAll() {
  await vehicleCatalogEnsureLoaded();
  return VehicleCatalogStore.items.slice();
}

async function vehicleCatalogGetById(id) {
  await vehicleCatalogEnsureLoaded();
  return VehicleCatalogStore.items.find((it) => sameId(it.id, id)) || null;
}

// ------------------------------------------------------------------------
// Search & Filter — substring case-insensitive di partName/oemCode/barcode
// (Tahap 1: "Search nama part, OEM Code, barcode"), plus filter opsional
// by kategori & kendaraan kompatibel (Tahap 1: "Filter kendaraan dan
// kategori").
// ------------------------------------------------------------------------
async function vehicleCatalogSearch(query, opts) {
  await vehicleCatalogEnsureLoaded();
  opts = opts || {};
  const q = (query || '').toString().trim().toLowerCase();
  let results = VehicleCatalogStore.items.slice();
  if (opts.category) {
    const cat = String(opts.category).trim().toLowerCase();
    results = results.filter((it) => (it.category || '').toLowerCase() === cat);
  }
  if (opts.vehicleId) {
    const vid = String(opts.vehicleId);
    results = results.filter((it) => Array.isArray(it.compatibleVehicleIds) && it.compatibleVehicleIds.some((id) => sameId(id, vid)));
  }
  if (q) {
    results = results.filter((it) => {
      return (it.partName && it.partName.toLowerCase().includes(q))
        || (it.oemCode && it.oemCode.toLowerCase().includes(q))
        || (it.barcode && it.barcode.toLowerCase().includes(q));
    });
  }
  return results;
}

/** Cari 1 part persis dari kode barcode/OEM (dipakai Tahap 2 Scanner nanti
 * — "Jika kode ditemukan -> buka data part"). Cocok EXACT (bukan substring)
 * di barcode ATAU oemCode, case-insensitive. Return null kalau tidak
 * ditemukan (caller memutuskan buat draft baru — di luar cakupan sesi ini). */
async function vehicleCatalogFindByCode(code) {
  await vehicleCatalogEnsureLoaded();
  const c = (code || '').toString().trim().toLowerCase();
  if (!c) return null;
  return VehicleCatalogStore.items.find((it) => (it.barcode && it.barcode.toLowerCase() === c) || (it.oemCode && it.oemCode.toLowerCase() === c)) || null;
}

/** Tahap 2 (logic saja — lihat catatan header): terima STRING kode hasil
 * decode scanner apa pun (barcode/QR/DataMatrix), reuse findByCode().
 * - Kode ditemukan -> { found:true, item } (part existing, siap dibuka).
 * - Kode tidak ditemukan/kosong -> otomatis buat draft part
 *   (`isDraft:true`, `partName` placeholder eksplisit "Draft — belum
 *   diberi nama" supaya TIDAK terlihat seperti data asli/halusinasi,
 *   `category` placeholder "Belum Dikategorikan", `barcode`=kode apa
 *   adanya) -> { found:false, item, draft:true }.
 * - Kode kosong/whitespace -> tidak membuat apa pun,
 *   { found:false, item:null, error:'Kode kosong.' }. */
async function vehicleCatalogHandleScan(code) {
  const trimmed = (code || '').toString().trim();
  if (!trimmed) return { found: false, item: null, error: 'Kode kosong.' };
  const existing = await vehicleCatalogFindByCode(trimmed);
  if (existing) return { found: true, item: existing };
  const res = await vehicleCatalogCreate({
    partName: 'Draft — belum diberi nama',
    category: 'Belum Dikategorikan',
    barcode: trimmed,
    isDraft: true,
  });
  return { found: false, item: res.item, draft: true };
}

/** Lanjutan ringkas dari handleScan(): draft yg dibuat otomatis butuh cara
 * disurvei/dilengkapi nanti (Phase 2 UI belum ada) — 2 fungsi murni di atas
 * store yang sudah ada, TIDAK ada skema/storage baru.
 * getDrafts() — daftar part dgn isDraft:true saja, supaya draft hasil scan
 * bisa disurvei/ditelusuri terpisah dari katalog part biasa. */
async function vehicleCatalogGetDrafts() {
  await vehicleCatalogEnsureLoaded();
  return VehicleCatalogStore.items.filter((it) => it.isDraft === true);
}

/** resolveDraft(id, patch) — lengkapi draft jadi part biasa: merge `patch`
 * (mis. partName/category asli dari user) lalu paksa isDraft:false. Reuse
 * update()+validate() apa adanya (0 validasi baru) — kalau id bukan draft
 * atau tidak ditemukan, error dikembalikan sama seperti update() biasa. */
async function vehicleCatalogResolveDraft(id, patch) {
  await vehicleCatalogEnsureLoaded();
  const existing = VehicleCatalogStore.items.find((it) => sameId(it.id, id));
  if (!existing) return { success: false, errors: ['Part tidak ditemukan di katalog.'] };
  if (!existing.isDraft) return { success: false, errors: ['Part ini bukan draft.'] };
  return vehicleCatalogUpdate(id, Object.assign({}, patch || {}, { isDraft: false }));
}

// ------------------------------------------------------------------------
// Tahap 3 (OCR label kemasan) — logic parsing SAJA, ringkas. Reuse OCR
// engine yang SUDAH ADA (`ocrRecognize()`/Tesseract di modules/shared/
// scan-ocr.js) — TIDAK ada library/keputusan produk baru, sama seperti
// Tahap 2 handleScan() reuse hasil decode scanner apa pun. Pemanggil
// (Phase 2 UI, belum dikerjakan) bertanggung jawab ambil foto label ->
// `ocrRecognize(file)` -> `result.data.text` -> lempar STRING itu ke sini.
// ------------------------------------------------------------------------

/** Cari kode OEM (huruf+angka, mis. "AHM-12345-K12") & barcode (deret 8-14
 * digit, pola EAN/UPC umum) dari teks mentah hasil OCR label kemasan.
 * Fungsi MURNI (regex saja, tidak menyentuh store) — supaya bisa dites
 * & dipakai ulang tanpa efek samping, pola sama vehicleCatalogValidate(). */
function vehicleCatalogParseLabelText(text) {
  const raw = (text || '').toString();
  const barcodeMatch = raw.match(/\b\d{8,14}\b/);
  // OEM code: token campuran huruf+angka (opsional dash), panjang 5-30,
  // WAJIB ada huruf & angka supaya tidak salah tangkap kata biasa/nomor
  // barcode murni.
  const oemMatch = raw.match(/\b(?=[A-Za-z0-9-]{5,30}\b)(?=[A-Za-z0-9-]*[A-Za-z])(?=[A-Za-z0-9-]*\d)[A-Za-z0-9-]{5,30}\b/);
  return {
    oemCode: oemMatch ? oemMatch[0] : '',
    barcode: barcodeMatch ? barcodeMatch[0] : '',
  };
}

/** Tahap 3 (logic saja — sama pola handleScan() Tahap 2): terima STRING
 * teks hasil OCR (dari `ocrRecognize()` yang SUDAH ADA, bukan foto/file
 * mentah), parse pakai parseLabelText(), lalu reuse findByCode():
 * - Tidak ada OEM Code maupun barcode terdeteksi -> tidak membuat apa
 *   pun, { found:false, item:null, error }.
 * - Kode (OEM Code diutamakan, fallback barcode) cocok part existing ->
 *   { found:true, item }.
 * - Tidak cocok -> draft part otomatis (`isDraft:true`, oemCode/barcode
 *   diisi apa adanya dari hasil parse, TIDAK ada data imajinasi lain,
 *   pola sama persis draft handleScan()) -> { found:false, item, draft:true }. */
async function vehicleCatalogHandleOcrLabel(text) {
  const parsed = vehicleCatalogParseLabelText(text);
  const code = parsed.oemCode || parsed.barcode;
  if (!code) return { found: false, item: null, error: 'OEM Code/barcode tidak terdeteksi dari teks OCR.' };
  const existing = await vehicleCatalogFindByCode(code);
  if (existing) return { found: true, item: existing };
  const res = await vehicleCatalogCreate({
    partName: 'Draft — belum diberi nama',
    category: 'Belum Dikategorikan',
    oemCode: parsed.oemCode,
    barcode: parsed.barcode,
    isDraft: true,
  });
  return { found: false, item: res.item, draft: true };
}

// ------------------------------------------------------------------------
// Tahap 6, Sesi 4 (ringkas) — rekomendasi part katalog berdasar kompatibilitas
// kendaraan (vehicleId, dari D.vehicles — TIDAK dibaca langsung di sini,
// sama seperti compatibleVehicleIds lainnya, cuma dicocokkan sebagai id
// string) & jenis servis/kata kunci bebas (item, mis. isi field "Jenis
// Servis/Item" di modal Servis). Pure read (reuse getAll() apa adanya,
// TIDAK ada skema/store baru), dipakai UI Sesi 2 utk area rekomendasi
// chip/list di servisModal.
// ------------------------------------------------------------------------

/** Rekomendasikan part katalog yang relevan untuk 1 kendaraan & (opsional)
 * jenis servis. `opts`: `{vehicleId, item, limit}` — semua opsional, tapi
 * kalau vehicleId & item dua-duanya kosong hasilnya array kosong (tidak
 * ada dasar rekomendasi apa pun, daripada menampilkan katalog acak).
 * Skoring ringan & murni (bukan ML/AI):
 * - Part yang compatibleVehicleIds-nya memuat vehicleId -> +2.
 * - Nama part ATAU kategori memuat kata kunci `item` (substring,
 *   case-insensitive) -> +1.
 * Part draft (isDraft:true) tidak pernah direkomendasikan (belum lengkap
 * datanya). Hasil disortir skor desc lalu nama part A-Z, dibatasi `limit`
 * (default 5, cukup utk chip list di 1 layar mobile). Async karena baca
 * IDBStore lewat ensureLoaded()/getAll() yang sudah ada. */
async function vehicleCatalogRecommend(opts) {
  opts = opts || {};
  const vehicleId = (opts.vehicleId !== undefined && opts.vehicleId !== null && opts.vehicleId !== '')
    ? String(opts.vehicleId) : '';
  const itemQuery = (opts.item || '').toString().trim().toLowerCase();
  const limit = (Number.isFinite(opts.limit) && opts.limit > 0) ? opts.limit : 5;
  if (!vehicleId && !itemQuery) return [];
  await vehicleCatalogEnsureLoaded();
  const scored = VehicleCatalogStore.items
    .filter((it) => !it.isDraft)
    .map((it) => {
      let score = 0;
      const compat = Array.isArray(it.compatibleVehicleIds) ? it.compatibleVehicleIds : [];
      if (vehicleId && compat.some((id) => sameId(id, vehicleId))) score += 2;
      if (itemQuery) {
        const inName = (it.partName || '').toLowerCase().includes(itemQuery);
        const inCat = (it.category || '').toLowerCase().includes(itemQuery);
        if (inName || inCat) score += 1;
      }
      return { item: it, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || (a.item.partName || '').localeCompare(b.item.partName || ''))
    .slice(0, limit)
    .map((row) => row.item);
  return scored;
}

/** Filter array item katalog utk 1 kendaraan (dipakai bersama oleh
 * VehicleCatalogUI.renderList() & Servis.populateCatalogPartSelect() —
 * bugfix "katalog masih menampilkan kendaraan lain saat pindah kendaraan"
 * di Car Notes). Part dengan `compatibleVehicleIds` KOSONG/belum diisi
 * dianggap berlaku utk SEMUA kendaraan (part universal, mis. baru discan/
 * belum sempat ditandai) — bukan disembunyikan, supaya tidak ada data yang
 * tiba-tiba "hilang" dari tampilan (backward compatible). Kalau `vehicleId`
 * kosong (belum ada kendaraan aktif), kembalikan apa adanya tanpa filter. */
function vehicleCatalogFilterForVehicle(items, vehicleId) {
  const list = Array.isArray(items) ? items : [];
  if (!vehicleId) return list.slice();
  const vid = String(vehicleId);
  return list.filter((it) => !Array.isArray(it.compatibleVehicleIds) || !it.compatibleVehicleIds.length
    || it.compatibleVehicleIds.some((id) => sameId(id, vid)));
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama seperti AIBus/AIContext (const object,
// perlu expose eksplisit ke window karena Node vm & browser non-module
// script TIDAK otomatis menempelkan binding const/let ke global object).
// ------------------------------------------------------------------------
const VehicleCatalog = {
  MAX_PHOTOS: VEHICLE_CATALOG_MAX_PHOTOS,
  validate: vehicleCatalogValidate,
  create: vehicleCatalogCreate,
  update: vehicleCatalogUpdate,
  remove: vehicleCatalogRemove,
  removeMany: vehicleCatalogRemoveMany,
  removeAll: vehicleCatalogRemoveAll,
  getAll: vehicleCatalogGetAll,
  getById: vehicleCatalogGetById,
  search: vehicleCatalogSearch,
  findByCode: vehicleCatalogFindByCode,
  handleScan: vehicleCatalogHandleScan,
  getDrafts: vehicleCatalogGetDrafts,
  resolveDraft: vehicleCatalogResolveDraft,
  parseLabelText: vehicleCatalogParseLabelText,
  handleOcrLabel: vehicleCatalogHandleOcrLabel,
  recommend: vehicleCatalogRecommend,
  ensureLoaded: vehicleCatalogEnsureLoaded,
  getStore: vehicleCatalogGetStore,
  invalidateCache: vehicleCatalogInvalidateCache,
  isLoaded: vehicleCatalogIsLoaded,
  filterForVehicle: vehicleCatalogFilterForVehicle,
};

// Expose ke window kalau dijalankan di browser (pola sama dgn AIBus/
// AIContext di ai-core.js) — modul lain akses lewat variabel global ini,
// bukan module.exports, karena app ini tidak pakai bundler ES module.
if (typeof window !== 'undefined') {
  window.VehicleCatalog = VehicleCatalog;
}
