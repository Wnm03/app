// honda-pdf-import-extract.js — Import PDF Honda: Extract Text -> Preview
// (Tahap 7D-2), lanjutan Tahap 7D-1 (honda-pdf-import.js, pilih+simpan
// sementara). Logic murni orkestrasi + 1 helper decode base64 -> pdf.js;
// TIDAK ada parsing OEM/harga/nama-part di sini (itu tahap lanjutan
// setelah preview disetujui, sama pola vehicle-catalog-import.js Tahap 5
// yang memisahkan extractPdfText() vs parseCatalogRows()).
//
// CAKUPAN TAHAP 7D-2 (IMPLEMENTATION ONLY — RULE #1: 100% reuse):
// - Extract teks: 100% REUSE `VehicleCatalogImport.extractPdfText(file)`
//   (vehicle-catalog-import.js, Tahap 5 — pdf.js text layer native +
//   fallback OCR per halaman) apa adanya, TIDAK ada engine baca-PDF baru.
//   Record tersimpan (Tahap 7D-1) hanya punya `dataBase64` (bukan objek
//   File asli, sudah pernah dipilih user lalu ditutup), jadi disiapkan
//   objek "file-like" minimal `{arrayBuffer()}` dari base64 tsb — SATU-
//   SATUNYA hal baru sesi ini, bukan implementasi baca-PDF baru.
// - Hasil extract disimpan balik ke record (Tahap 7D-1, `HondaPdfImport.
//   update()`) sbg `extractedText` + `status:'extracted'` (gagal ->
//   `status:'failed'` + `extractError`), TIDAK menghapus/mengubah field
//   lain (fileName/dataBase64/mimeType/addedAt).
// - Preview: potong teks ke panjang wajar (`previewText()`, murni),
//   dipakai pemanggil/UI utk tampilan ringkas SEBELUM parsing/impor
//   lanjutan (belum ada tahap itu sesi ini).
// - SENGAJA TIDAK dikerjakan (di luar cakupan, kandidat tahap lanjutan
//   7D-3 dst): parsing teks jadi field part (OEM/harga/nama), integrasi
//   ke VehicleCatalog, UI/modal nyata.
//
// Dependency: `HondaPdfImport` (honda-pdf-import.js, Tahap 7D-1) &
// `VehicleCatalogImport` (vehicle-catalog-import.js, Tahap 5) keduanya
// WAJIB sudah dimuat lebih dulu (guard `typeof`, error jelas kalau belum).

const HONDA_PDF_EXTRACT_PREVIEW_LEN = 500;

/** base64ToArrayBuffer(dataUrl) — decode data URL (`data:application/pdf;
 * base64,....` ATAU base64 mentah tanpa prefix) -> ArrayBuffer. Fungsi
 * MURNI, tidak menyentuh IDBStore/DOM. */
function hondaPdfExtractBase64ToArrayBuffer(dataUrl) {
  const raw = (typeof dataUrl === 'string') ? dataUrl : '';
  const commaIdx = raw.indexOf(',');
  const base64 = commaIdx !== -1 && raw.slice(0, commaIdx).indexOf('base64') !== -1
    ? raw.slice(commaIdx + 1)
    : raw;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** makeFileLike(record) — bungkus record tersimpan (Tahap 7D-1) jadi
 * objek minimal yang diterima `VehicleCatalogImport.extractPdfText()`
 * (yang HANYA memanggil `file.arrayBuffer()`) — BUKAN implementasi baca-
 * PDF baru, murni adapter supaya reuse `extractPdfText()` apa adanya. */
function hondaPdfExtractMakeFileLike(record) {
  const dataBase64 = (record && record.dataBase64) || '';
  let size = (record && typeof record.fileSize === 'number' && record.fileSize > 0) ? record.fileSize : 0;
  if (!size && dataBase64) {
    try { size = hondaPdfExtractBase64ToArrayBuffer(dataBase64).byteLength; } catch (err) { size = 0; }
  }
  return {
    name: (record && record.fileName) || '',
    type: (record && record.mimeType) || 'application/pdf',
    size,
    arrayBuffer: async () => hondaPdfExtractBase64ToArrayBuffer(dataBase64),
  };
}

/** previewText(text, maxLen) — potong teks hasil extract ke panjang wajar
 * utk tampilan preview, fungsi MURNI. `maxLen` opsional (default 500). */
function hondaPdfExtractPreviewText(text, maxLen) {
  const raw = (typeof text === 'string') ? text : '';
  const limit = (typeof maxLen === 'number' && maxLen > 0) ? maxLen : HONDA_PDF_EXTRACT_PREVIEW_LEN;
  if (raw.length <= limit) return raw;
  return raw.slice(0, limit).trim() + '…';
}

/** extractText(id) — ambil 1 record tersimpan (Tahap 7D-1), extract teks
 * (reuse VehicleCatalogImport.extractPdfText()), simpan balik hasilnya ke
 * record (HondaPdfImport.update()). Gagal di tahap manapun -> record
 * ditandai `status:'failed'` + `extractError`, TIDAK throw ke pemanggil. */
async function hondaPdfExtractExtractText(id) {
  if (typeof HondaPdfImport === 'undefined' || !HondaPdfImport) {
    throw new Error('Modul HondaPdfImport belum tersedia (honda-pdf-import.js belum dimuat)');
  }
  const record = await HondaPdfImport.get(id);
  if (!record) return { success: false, errors: ['File tidak ditemukan.'] };
  if (typeof VehicleCatalogImport === 'undefined' || !VehicleCatalogImport || typeof VehicleCatalogImport.extractPdfText !== 'function') {
    const failRes = await HondaPdfImport.update(id, { status: 'failed', extractError: 'Modul VehicleCatalogImport belum tersedia (vehicle-catalog-import.js belum dimuat)' });
    return { success: false, errors: ['Modul VehicleCatalogImport belum tersedia (vehicle-catalog-import.js belum dimuat)'], item: failRes.item };
  }
  try {
    const fileLike = hondaPdfExtractMakeFileLike(record);
    const text = await VehicleCatalogImport.extractPdfText(fileLike);
    const res = await HondaPdfImport.update(id, { extractedText: text || '', status: 'extracted', extractError: '' });
    return { success: true, errors: [], text: text || '', item: res.item, preview: hondaPdfExtractPreviewText(text || '') };
  } catch (err) {
    const msg = (err && err.message) || 'gagal extract teks PDF';
    const failRes = await HondaPdfImport.update(id, { status: 'failed', extractError: msg });
    return { success: false, errors: [msg], item: failRes.item };
  }
}

/** extractAll() — jalankan extractText() ke SEMUA record berstatus
 * `'pending'` (belum pernah diproses), satu gagal TIDAK menghentikan yang
 * lain (pola sama `vehicleImportCommitRows()`/`hondaPdfImportAddMany()`).
 * Return ringkasan supaya UI bisa toast hasil, bukan silent. */
async function hondaPdfExtractExtractAll() {
  if (typeof HondaPdfImport === 'undefined' || !HondaPdfImport) {
    throw new Error('Modul HondaPdfImport belum tersedia (honda-pdf-import.js belum dimuat)');
  }
  const list = await HondaPdfImport.list();
  const pending = list.filter((f) => f && f.status === 'pending');
  let extracted = 0;
  let failed = 0;
  const errors = [];
  const items = [];
  for (const record of pending) {
    const res = await hondaPdfExtractExtractText(record.id);
    if (res.success) { extracted++; items.push(res.item); } else { failed++; errors.push(...res.errors); }
  }
  return { extracted, failed, errors, items };
}

/** extractAndPreview(id) — orkestrasi 1 file dgn toast (dipakai calon UI
 * lanjutan), reuse extractText() apa adanya. TIDAK ada logic baru selain
 * toast ringkasan. */
async function hondaPdfExtractAndPreview(id) {
  toast('📄 Membaca teks PDF (OCR otomatis kalau perlu, bisa beberapa detik)...', 4000);
  const res = await hondaPdfExtractExtractText(id);
  if (res.success) {
    toast(res.text ? '✅ Teks berhasil dibaca dari PDF' : '⚠️ PDF terbaca tapi tidak ada teks terdeteksi');
  } else {
    toast('❌ Gagal membaca PDF: ' + (res.errors[0] || 'error tidak diketahui'));
  }
  return res;
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama persis HondaPdfImport/VehicleCatalogImport.
// ------------------------------------------------------------------------
const HondaPdfImportExtract = {
  PREVIEW_LEN: HONDA_PDF_EXTRACT_PREVIEW_LEN,
  base64ToArrayBuffer: hondaPdfExtractBase64ToArrayBuffer,
  makeFileLike: hondaPdfExtractMakeFileLike,
  previewText: hondaPdfExtractPreviewText,
  extractText: hondaPdfExtractExtractText,
  extractAll: hondaPdfExtractExtractAll,
  extractAndPreview: hondaPdfExtractAndPreview,
};

if (typeof window !== 'undefined') {
  window.HondaPdfImportExtract = HondaPdfImportExtract;
}
