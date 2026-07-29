// honda-pdf-import.js — Import PDF Honda (Tahap 7D-1, Fondasi)
//
// CAKUPAN TAHAP 7D-1 (disepakati eksplisit — IMPLEMENTATION ONLY):
// - Pilih 1 ATAU BANYAK file PDF sekaligus (input file `multiple`, filter
//   `accept="application/pdf"`), pola picker SAMA PERSIS
//   sparepartOcrPickImageFile() (sparepart-ocr.js, Tahap 7C-1) — reuse
//   struktur Promise + <input type=file>, cuma multi-file & filter PDF.
// - Tiap file DISIMPAN SEMENTARA (metadata + isi base64) ke store
//   IndexedDB terpisah (`honda-pdf-import:store`), status `'pending'`
//   tetap (TIDAK pernah berubah sesi ini — belum ada tahap proses).
// - SENGAJA TIDAK dikerjakan (di luar cakupan, kandidat tahap lanjutan
//   7D-2 dst): parsing teks PDF (pdf.js/OCR), ekstraksi part/OEM Code,
//   integrasi ke VehicleCatalog, UI/modal nyata di index.html/
//   app_production.html. File ini murni fondasi data/logic (storage +
//   validasi + orkestrasi pick->stage), pola SAMA PERSIS vehicle-catalog.js
//   Milestone 0 Phase 1 & sparepart-ocr.js Tahap 7C-1.
//
// ATURAN WAJIB (pola sama ACR-001/vehicle-catalog.js):
// - Tidak pernah menyentuh D. Data terpisah total dari D/LifeOSStore/
//   EIEStore/AIStore/VehicleCatalog — TIDAK menduplikasi/mengubah
//   keduanya.
// - Persist lewat IDBStore (reuse instance global yang sama dgn app), key
//   'honda-pdf-import:store', terpisah total dari siklus save/load D.
// - Modul lain mengakses store ini HANYA lewat namespace `HondaPdfImport`
//   (window.HondaPdfImport) di bawah.
// - Tidak ada rebuild/kompresi PDF, tidak ada validasi isi PDF (mis. cek
//   halaman/struktur) — hanya metadata file + base64 mentah apa adanya.

const HONDA_PDF_IMPORT_STORE_KEY = 'honda-pdf-import:store';
const HONDA_PDF_IMPORT_DEFAULT = { files: [] };
const HONDA_PDF_IMPORT_MAX_FILES = 20; // batas wajar per sesi pick, cegah runaway import

let HondaPdfImportStore = { files: [] };

// ------------------------------------------------------------------------
// Storage — pola SAMA PERSIS vehicleCatalogLoad()/ensureLoaded()/save().
// ------------------------------------------------------------------------
async function hondaPdfImportLoad() {
  const raw = await IDBStore.get(HONDA_PDF_IMPORT_STORE_KEY);
  HondaPdfImportStore = Object.assign({}, HONDA_PDF_IMPORT_DEFAULT, raw || {});
  if (!Array.isArray(HondaPdfImportStore.files)) HondaPdfImportStore.files = [];
  return HondaPdfImportStore;
}

let _hondaPdfImportLoaded = false;
async function hondaPdfImportEnsureLoaded() {
  if (!_hondaPdfImportLoaded) {
    await hondaPdfImportLoad();
    _hondaPdfImportLoaded = true;
  }
  return HondaPdfImportStore;
}

async function hondaPdfImportSave() {
  return IDBStore.set(HONDA_PDF_IMPORT_STORE_KEY, HondaPdfImportStore);
}

function hondaPdfImportGetStore() {
  return HondaPdfImportStore;
}

/** Invalidate cache "sudah dimuat sekali per sesi" — dipanggil backup-restore
 * setelah menulis ulang key 'honda-pdf-import:store' dari file backup, pola
 * sama persis vehicleCatalogInvalidateCache(). */
function hondaPdfImportInvalidateCache() {
  _hondaPdfImportLoaded = false;
}

// ------------------------------------------------------------------------
// Validation — fungsi murni, tidak menyentuh IDBStore, supaya bisa dites
// tanpa efek samping (pola sama vehicleCatalogValidate()).
// ------------------------------------------------------------------------
function hondaPdfImportValidate(data) {
  data = data || {};
  const errors = [];

  const fileName = typeof data.fileName === 'string' ? data.fileName.trim() : '';
  if (!fileName) errors.push('Nama file wajib diisi.');
  else if (fileName.length > 200) errors.push('Nama file maksimal 200 karakter.');

  const mimeType = typeof data.mimeType === 'string' ? data.mimeType : '';
  if (mimeType !== 'application/pdf') errors.push('File harus berformat PDF.');

  const dataBase64 = typeof data.dataBase64 === 'string' ? data.dataBase64 : '';
  if (!dataBase64) errors.push('Isi file (base64) wajib ada.');

  if (data.fileSize !== undefined && data.fileSize !== null) {
    if (typeof data.fileSize !== 'number' || isNaN(data.fileSize) || data.fileSize < 0) {
      errors.push('Ukuran file tidak valid.');
    }
  }

  return { valid: errors.length === 0, errors };
}

function _hondaPdfImportNormalize(data) {
  return {
    fileName: (typeof data.fileName === 'string' ? data.fileName.trim() : ''),
    fileSize: (typeof data.fileSize === 'number' && !isNaN(data.fileSize)) ? data.fileSize : 0,
    mimeType: 'application/pdf',
    dataBase64: (typeof data.dataBase64 === 'string' ? data.dataBase64 : ''),
    status: 'pending', // TETAP 'pending' sesi ini — belum ada tahap parsing/OCR
    addedAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------------------
// CRUD — simpan sementara SAJA (bukan katalog part final), pola sama
// vehicleCatalogCreate() tapi tanpa update() (tidak ada field yang perlu
// diedit sebelum tahap proses berikutnya ada).
// ------------------------------------------------------------------------
async function hondaPdfImportAdd(data) {
  await hondaPdfImportEnsureLoaded();
  const validation = hondaPdfImportValidate(data);
  if (!validation.valid) return { success: false, errors: validation.errors };
  if (HondaPdfImportStore.files.length >= HONDA_PDF_IMPORT_MAX_FILES) {
    return { success: false, errors: ['Batas maksimal ' + HONDA_PDF_IMPORT_MAX_FILES + ' file tersimpan sementara sudah tercapai — hapus beberapa dulu.'] };
  }
  const item = Object.assign({ id: uid() }, _hondaPdfImportNormalize(data));
  HondaPdfImportStore.files.push(item);
  await hondaPdfImportSave();
  return { success: true, errors: [], item };
}

/** addMany(list) — tambah banyak file sekaligus (dipanggil setelah user
 * pick beberapa file PDF), tiap elemen diproses lewat add() apa adanya (0
 * duplikasi validasi). Satu file gagal TIDAK menghentikan file lain (pola
 * sama vehicleImportCommitRows()). Return ringkasan supaya UI bisa toast
 * hasil, bukan silent. */
async function hondaPdfImportAddMany(list) {
  const arr = Array.isArray(list) ? list : [];
  let added = 0;
  let skipped = 0;
  const errors = [];
  const items = [];
  for (const data of arr) {
    const res = await hondaPdfImportAdd(data);
    if (res.success) { added++; items.push(res.item); } else { skipped++; errors.push(...res.errors); }
  }
  return { added, skipped, errors, items };
}

async function hondaPdfImportList() {
  await hondaPdfImportEnsureLoaded();
  return HondaPdfImportStore.files.slice();
}

async function hondaPdfImportGet(id) {
  await hondaPdfImportEnsureLoaded();
  return HondaPdfImportStore.files.find((f) => sameId(f.id, id)) || null;
}

async function hondaPdfImportRemove(id) {
  await hondaPdfImportEnsureLoaded();
  const before = HondaPdfImportStore.files.length;
  HondaPdfImportStore.files = HondaPdfImportStore.files.filter((f) => !sameId(f.id, id));
  const removed = HondaPdfImportStore.files.length < before;
  if (removed) await hondaPdfImportSave();
  return removed;
}

/** update(id, patch) — merge `patch` ke record yang sudah ada (mis. hasil
 * extract text Tahap 7D-2: `{extractedText, status}`). id/fileName/
 * dataBase64/mimeType/addedAt TIDAK dimaksudkan diedit lewat sini (bukan
 * ditolak eksplisit, tapi caller Tahap 7D-2 hanya mengirim field baru),
 * pola sama `vehicleCatalogUpdate()` (merge apa adanya, 0 validasi ulang
 * skema penuh). id tidak ditemukan -> {success:false}, tidak menulis apa
 * pun. */
async function hondaPdfImportUpdate(id, patch) {
  await hondaPdfImportEnsureLoaded();
  const idx = HondaPdfImportStore.files.findIndex((f) => sameId(f.id, id));
  if (idx === -1) return { success: false, errors: ['File tidak ditemukan.'] };
  HondaPdfImportStore.files[idx] = Object.assign({}, HondaPdfImportStore.files[idx], patch || {}, { id: HondaPdfImportStore.files[idx].id });
  await hondaPdfImportSave();
  return { success: true, errors: [], item: HondaPdfImportStore.files[idx] };
}

async function hondaPdfImportClear() {
  await hondaPdfImportEnsureLoaded();
  HondaPdfImportStore.files = [];
  await hondaPdfImportSave();
  return true;
}

// ------------------------------------------------------------------------
// Picker — pilih 1 ATAU BANYAK file PDF dari perangkat. Pola SAMA PERSIS
// sparepartOcrPickImageFile() (Tahap 7C-1), bedanya `multiple` + filter
// `application/pdf`, dan resolve ARRAY (bukan 1 file).
// ------------------------------------------------------------------------
function hondaPdfImportPickFiles() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/pdf';
    inp.multiple = true;
    inp.onchange = (e) => {
      const files = (e && e.target && e.target.files) ? Array.from(e.target.files) : [];
      resolve(files);
    };
    inp.click();
  });
}

/** 1 File -> data URL base64, via FileReader (pola sama _catPhotoToDataUrl()
 * di vehicle-catalog-ui.js, TANPA downscaleImage() krn ini PDF bukan foto). */
function hondaPdfImportFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

function hondaPdfImportErrorMessage(err) {
  if (typeof scanErrorMessage === 'function') {
    return scanErrorMessage(err);
  }
  const raw = (err && err.message) || (typeof err === 'string' ? err : '');
  if (raw) return raw;
  return 'error tidak diketahui — cek koneksi internet, lalu coba lagi';
}

/** pickAndStage() — orkestrasi utama Tahap 7D-1: pilih 1/banyak PDF ->
 * konversi tiap file ke base64 -> simpan sementara (addMany()). TIDAK ada
 * parsing/OCR/integrasi VehicleCatalog di sini (di luar cakupan sesi ini).
 * null = dibatalkan/gagal total, object ringkasan = selesai (walau semua
 * skip). */
async function hondaPdfImportPickAndStage() {
  const files = await hondaPdfImportPickFiles();
  if (!files.length) {
    toast('⚠️ Tidak ada file PDF dipilih');
    return null;
  }
  toast('📄 Menyimpan ' + files.length + ' file PDF sementara...', 4000);
  try {
    const rows = [];
    for (const file of files) {
      const dataBase64 = await hondaPdfImportFileToDataUrl(file);
      rows.push({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
        dataBase64,
      });
    }
    const summary = await hondaPdfImportAddMany(rows);
    if (summary.added) {
      toast('✅ ' + summary.added + ' file PDF tersimpan sementara' + (summary.skipped ? ', ' + summary.skipped + ' dilewati' : ''));
    } else {
      toast('⚠️ Tidak ada file PDF yang berhasil disimpan (cek format file)');
    }
    return summary;
  } catch (err) {
    console.error('[HondaPdfImport] gagal menyimpan file PDF:', err);
    toast('❌ Gagal menyimpan PDF: ' + hondaPdfImportErrorMessage(err));
    return null;
  }
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama persis VehicleCatalog/SparepartOcr (const
// object, expose eksplisit ke window krn Node vm & browser non-module
// script TIDAK otomatis menempelkan binding const/let ke global object).
// ------------------------------------------------------------------------
const HondaPdfImport = {
  MAX_FILES: HONDA_PDF_IMPORT_MAX_FILES,
  ensureLoaded: hondaPdfImportEnsureLoaded,
  getStore: hondaPdfImportGetStore,
  invalidateCache: hondaPdfImportInvalidateCache,
  validate: hondaPdfImportValidate,
  add: hondaPdfImportAdd,
  addMany: hondaPdfImportAddMany,
  list: hondaPdfImportList,
  get: hondaPdfImportGet,
  remove: hondaPdfImportRemove,
  update: hondaPdfImportUpdate,
  clear: hondaPdfImportClear,
  pickFiles: hondaPdfImportPickFiles,
  fileToDataUrl: hondaPdfImportFileToDataUrl,
  errorMessage: hondaPdfImportErrorMessage,
  pickAndStage: hondaPdfImportPickAndStage,
};

if (typeof window !== 'undefined') {
  window.HondaPdfImport = HondaPdfImport;
}
