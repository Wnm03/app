// honda-pdf-import-parse.js — Import PDF Honda: Parse Text -> JSON
// (Tahap 7D-3), lanjutan Tahap 7D-2 (honda-pdf-import-extract.js, extract
// teks -> preview). Logic murni orkestrasi, TIDAK ada engine parsing baru:
// 100% reuse `VehicleCatalogImport.parseCatalogRows(text)` (Tahap 5) apa
// adanya, sama pola honda-pdf-import-extract.js reuse extractPdfText().
//
// CAKUPAN TAHAP 7D-3 (IMPLEMENTATION ONLY — RULE #1: 100% reuse):
// - Parse teks: 100% REUSE `VehicleCatalogImport.parseCatalogRows(text)`
//   (vehicle-catalog-import.js, Tahap 5) apa adanya, TIDAK ada regex/engine
//   parsing baru. Input = `record.extractedText` (hasil Tahap 7D-2).
// - Hasil parse disimpan balik ke record (Tahap 7D-1, `HondaPdfImport.
//   update()`) sbg `parsedRows` (array JSON `{partName, oemCode, barcode,
//   price, raw}`) + `status:'parsed'` (gagal -> `status:'failed'` +
//   `parseError`), TIDAK menghapus/mengubah field lain (fileName/
//   dataBase64/extractedText/dst).
// - SENGAJA TIDAK dikerjakan (di luar cakupan, kandidat tahap lanjutan
//   7D-4 dst): integrasi `parsedRows` ke VehicleCatalog (commit/import),
//   UI/modal nyata.
//
// Dependency: `HondaPdfImport` (honda-pdf-import.js, Tahap 7D-1) &
// `VehicleCatalogImport` (vehicle-catalog-import.js, Tahap 5) keduanya
// WAJIB sudah dimuat lebih dulu (guard `typeof`, error jelas kalau belum).

/** parseText(id) — ambil 1 record tersimpan (sudah diextract, Tahap 7D-2),
 * parse `extractedText` jadi array baris JSON (reuse
 * VehicleCatalogImport.parseCatalogRows()), simpan balik ke record
 * (HondaPdfImport.update()). Gagal di tahap manapun -> record ditandai
 * `status:'failed'` + `parseError`, TIDAK throw ke pemanggil. */
async function hondaPdfParseParseText(id) {
  if (typeof HondaPdfImport === 'undefined' || !HondaPdfImport) {
    throw new Error('Modul HondaPdfImport belum tersedia (honda-pdf-import.js belum dimuat)');
  }
  const record = await HondaPdfImport.get(id);
  if (!record) return { success: false, errors: ['File tidak ditemukan.'] };
  if (typeof VehicleCatalogImport === 'undefined' || !VehicleCatalogImport || typeof VehicleCatalogImport.parseCatalogRows !== 'function') {
    const failRes = await HondaPdfImport.update(id, { status: 'failed', parseError: 'Modul VehicleCatalogImport belum tersedia (vehicle-catalog-import.js belum dimuat)' });
    return { success: false, errors: ['Modul VehicleCatalogImport belum tersedia (vehicle-catalog-import.js belum dimuat)'], item: failRes.item };
  }
  try {
    const text = (typeof record.extractedText === 'string') ? record.extractedText : '';
    const rows = VehicleCatalogImport.parseCatalogRows(text) || [];
    const res = await HondaPdfImport.update(id, { parsedRows: rows, status: 'parsed', parseError: '' });
    return { success: true, errors: [], rows, item: res.item };
  } catch (err) {
    const msg = (err && err.message) || 'gagal parse teks PDF';
    const failRes = await HondaPdfImport.update(id, { status: 'failed', parseError: msg });
    return { success: false, errors: [msg], item: failRes.item };
  }
}

/** parseAll() — jalankan parseText() ke SEMUA record berstatus
 * `'extracted'` (sudah diextract Tahap 7D-2, belum diparse), satu gagal
 * TIDAK menghentikan yang lain (pola sama hondaPdfExtractExtractAll()).
 * Return ringkasan supaya UI bisa toast hasil, bukan silent. */
async function hondaPdfParseParseAll() {
  if (typeof HondaPdfImport === 'undefined' || !HondaPdfImport) {
    throw new Error('Modul HondaPdfImport belum tersedia (honda-pdf-import.js belum dimuat)');
  }
  const list = await HondaPdfImport.list();
  const pending = list.filter((f) => f && f.status === 'extracted');
  let parsed = 0;
  let failed = 0;
  const errors = [];
  const items = [];
  for (const record of pending) {
    const res = await hondaPdfParseParseText(record.id);
    if (res.success) { parsed++; items.push(res.item); } else { failed++; errors.push(...res.errors); }
  }
  return { parsed, failed, errors, items };
}

/** parseAndPreview(id) — orkestrasi 1 file dgn toast (dipakai calon UI
 * lanjutan), reuse parseText() apa adanya. TIDAK ada logic baru selain
 * toast ringkasan. */
async function hondaPdfParseAndPreview(id) {
  toast('🔎 Membaca kandidat part dari teks PDF...', 4000);
  const res = await hondaPdfParseParseText(id);
  if (res.success) {
    toast(res.rows.length ? '✅ ' + res.rows.length + ' kandidat part ditemukan' : '⚠️ Tidak ada kandidat part terdeteksi dari teks');
  } else {
    toast('❌ Gagal parse PDF: ' + (res.errors[0] || 'error tidak diketahui'));
  }
  return res;
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama persis HondaPdfImportExtract.
// ------------------------------------------------------------------------
const HondaPdfImportParse = {
  parseText: hondaPdfParseParseText,
  parseAll: hondaPdfParseParseAll,
  parseAndPreview: hondaPdfParseAndPreview,
};

if (typeof window !== 'undefined') {
  window.HondaPdfImportParse = HondaPdfImportParse;
}
