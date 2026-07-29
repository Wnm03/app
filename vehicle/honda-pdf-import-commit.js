// honda-pdf-import-commit.js — Import PDF Honda: JSON -> Vehicle Catalog
// (Tahap 7D-4), lanjutan Tahap 7D-3 (honda-pdf-import-parse.js, parse
// teks -> JSON). Logic murni orkestrasi, TIDAK ada engine commit baru:
// 100% reuse `VehicleCatalogImport.commitRows(rows)` (Tahap 5) apa
// adanya, sama pola honda-pdf-import-parse.js reuse parseCatalogRows().
//
// CAKUPAN TAHAP 7D-4 (IMPLEMENTATION ONLY — RULE #1: 100% reuse):
// - Commit: 100% REUSE `VehicleCatalogImport.commitRows(rows)`
//   (vehicle-catalog-import.js, Tahap 5) apa adanya, TIDAK ada validasi/
//   skema baru. Input = `record.parsedRows` (hasil Tahap 7D-3), ATAU
//   subset baris yang dikirim eksplisit (preview/konfirmasi user memilih
//   sebagian baris — pola sama vehicleImportCommitRows() yang HANYA
//   commit baris yang dikirim pemanggil, bukan langsung semua).
// - Hasil commit disimpan balik ke record (Tahap 7D-1, `HondaPdfImport.
//   update()`) sbg `status:'committed'` + `commitResult:{imported,
//   skipped, errors}`, TIDAK menghapus/mengubah field lain.
// - SENGAJA TIDAK dikerjakan (di luar cakupan, kandidat tahap lanjutan
//   7D-5 dst): UI/modal nyata (checklist pilih baris, dsb).
//
// Dependency: `HondaPdfImport` (honda-pdf-import.js, Tahap 7D-1) &
// `VehicleCatalogImport` (vehicle-catalog-import.js, Tahap 5) keduanya
// WAJIB sudah dimuat lebih dulu (guard `typeof`, error jelas kalau belum).

/** commitRows(id, rows) — commit `rows` (default: `record.parsedRows`
 * hasil Tahap 7D-3 kalau `rows` tidak dikirim) ke VehicleCatalog (reuse
 * VehicleCatalogImport.commitRows()), simpan ringkasan hasil balik ke
 * record (HondaPdfImport.update()). Gagal di tahap manapun -> record
 * ditandai `status:'failed'` + `commitError`, TIDAK throw ke pemanggil. */
async function hondaPdfCommitCommitRows(id, rows) {
  if (typeof HondaPdfImport === 'undefined' || !HondaPdfImport) {
    throw new Error('Modul HondaPdfImport belum tersedia (honda-pdf-import.js belum dimuat)');
  }
  const record = await HondaPdfImport.get(id);
  if (!record) return { success: false, errors: ['File tidak ditemukan.'] };
  if (typeof VehicleCatalogImport === 'undefined' || !VehicleCatalogImport || typeof VehicleCatalogImport.commitRows !== 'function') {
    const failRes = await HondaPdfImport.update(id, { status: 'failed', commitError: 'Modul VehicleCatalogImport belum tersedia (vehicle-catalog-import.js belum dimuat)' });
    return { success: false, errors: ['Modul VehicleCatalogImport belum tersedia (vehicle-catalog-import.js belum dimuat)'], item: failRes.item };
  }
  try {
    const list = Array.isArray(rows) ? rows : (Array.isArray(record.parsedRows) ? record.parsedRows : []);
    const summary = await VehicleCatalogImport.commitRows(list);
    const res = await HondaPdfImport.update(id, { status: 'committed', commitResult: summary, commitError: '' });
    return { success: true, errors: [], imported: summary.imported, skipped: summary.skipped, commitErrors: summary.errors, item: res.item };
  } catch (err) {
    const msg = (err && err.message) || 'gagal commit ke Vehicle Catalog';
    const failRes = await HondaPdfImport.update(id, { status: 'failed', commitError: msg });
    return { success: false, errors: [msg], item: failRes.item };
  }
}

/** commitAndPreview(id, rows) — orkestrasi 1 file dgn toast (dipakai
 * calon UI lanjutan), reuse commitRows() apa adanya. TIDAK ada logic baru
 * selain toast ringkasan. */
async function hondaPdfCommitAndPreview(id, rows) {
  toast('📥 Menyimpan kandidat part ke Vehicle Catalog...', 4000);
  const res = await hondaPdfCommitCommitRows(id, rows);
  if (res.success) {
    toast(res.imported ? '✅ ' + res.imported + ' part tersimpan ke Vehicle Catalog' + (res.skipped ? ', ' + res.skipped + ' dilewati' : '') : '⚠️ Tidak ada part yang berhasil disimpan');
  } else {
    toast('❌ Gagal simpan ke Vehicle Catalog: ' + (res.errors[0] || 'error tidak diketahui'));
  }
  return res;
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama persis HondaPdfImportExtract/Parse.
// ------------------------------------------------------------------------
const HondaPdfImportCommit = {
  commitRows: hondaPdfCommitCommitRows,
  commitAndPreview: hondaPdfCommitAndPreview,
};

if (typeof window !== 'undefined') {
  window.HondaPdfImportCommit = HondaPdfImportCommit;
}
