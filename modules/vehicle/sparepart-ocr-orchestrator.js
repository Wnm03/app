// sparepart-ocr-orchestrator.js — Sparepart OCR Tahap 7C-4b: orkestrator
// utama Scan -> Parse -> Cari Vehicle Catalog -> (ditemukan -> Detail) /
// (tidak ditemukan -> Add).
//
// CAKUPAN TAHAP 7C-4b (disepakati eksplisit — orkestrasi saja, 0 logic
// baru, 100% reuse ke-4 tahap yang SUDAH ADA):
// 1. SparepartOcr.scan() (Tahap 7C-1) — pilih foto dari galeri + OCR ->
//    STRING teks OCR mentah. `null` = dibatalkan/gagal, `''` = tidak ada
//    teks terdeteksi — SparepartOcr.scan() SUDAH menampilkan toast
//    pesannya sendiri di kedua kasus itu, jadi orkestrator berhenti di
//    situ TANPA toast tambahan & TANPA lanjut ke tahap berikutnya.
// 2. SparepartOcrParser.parseText(text) (Tahap 7C-2) — parse teks jadi
//    { oemCode, partName, brand, barcode }.
// 3. SparepartOcrCatalogLink.findFromParsed(parsed) (Tahap 7C-3a) — cari
//    di VehicleCatalog berdasar OEM Code/Barcode/Part Number, kembalikan
//    { found, item, matchedBy }.
// 4a. `found:true` -> panggil SparepartOcrCatalogDetail.open(findResult)
//     (Tahap 7C-3b + wiring UI Sesi 189) — tampilkan detail part yang
//     sudah ada, SEKARANG langsung ke DOM/modal nyata (fallback ke
//     .show() murni kalau dependency versi lama/belum diupgrade).
// 4b. `found:false` -> panggil
//     SparepartOcrCatalogAdd.open(findResult, parsed) (Tahap 7C-3c) —
//     buka form tambah + prefill OCR (BELUM disimpan; simpan tetap lewat
//     `SparepartOcrCatalogAdd.confirmAndSave()` terpisah, TIDAK dipanggil
//     otomatis di sini — konfirmasi user tetap wajib, sesuai Tahap 7C-3c,
//     TIDAK diubah).
//
// TIDAK ada logic pencarian/parsing/presentasi baru di file ini — murni
// merangkai pemanggilan ke-4 fungsi yang sudah ada apa adanya (0
// duplikasi). TIDAK ada tombol/entry-point UI baru ditaruh ke halaman
// manapun sesi ini (sama seperti Tahap 7C-1..7C-3c, wiring ke tombol scan
// label nyata tetap kandidat tahap lanjutan setelah orkestrator ini
// disetujui).
//
// Dependency: SparepartOcr (Tahap 7C-1), SparepartOcrParser (Tahap 7C-2),
// SparepartOcrCatalogLink (Tahap 7C-3a), SparepartOcrCatalogDetail (Tahap
// 7C-3b), SparepartOcrCatalogAdd (Tahap 7C-3c) — SEMUA OPSIONAL (guard
// typeof), gagal aman (`{ok:false, step, error}`) kalau salah satu belum
// dimuat, pola sama modul-modul Tahap 7C sebelumnya.

/** Orkestrasi utama Tahap 7C-4b: Scan -> Parse -> Cari Vehicle Catalog ->
 * Detail (ditemukan) / Add (tidak ditemukan).
 * Return bentuk `{ok, step, ...}`:
 * - `step:'scan'`   -> berhenti di SparepartOcr.scan() (dependency belum
 *   ada, ATAU hasil scan `null`/`''`). `ok:false`.
 * - `step:'parse'`  -> berhenti krn SparepartOcrParser belum tersedia.
 *   `ok:false`.
 * - `step:'find'`   -> berhenti krn SparepartOcrCatalogLink belum
 *   tersedia. `ok:false`.
 * - `step:'detail'` -> part DITEMUKAN, `detail` = hasil
 *   `SparepartOcrCatalogDetail.open()` (tulis DOM+buka modal, fallback
 *   `.show()` murni kalau `.open()` belum ada; `null` kalau modul itu
 *   belum dimuat sama sekali — findResult tetap dikembalikan apa
 *   adanya). `ok:true`.
 * - `step:'add'`    -> part TIDAK ditemukan, `addResult` = hasil
 *   `SparepartOcrCatalogAdd.open()` (`null` kalau modul itu belum dimuat).
 *   `ok:true`. */
async function sparepartOcrOrchestrateRun() {
  if (typeof SparepartOcr === 'undefined' || !SparepartOcr || typeof SparepartOcr.scan !== 'function') {
    return { ok: false, step: 'scan', error: 'SparepartOcr belum tersedia.' };
  }

  const text = await SparepartOcr.scan();
  if (!text) {
    // dibatalkan/gagal (null) atau tidak ada teks terdeteksi ('') —
    // SparepartOcr.scan() sudah menampilkan toast pesannya sendiri,
    // orkestrasi berhenti di sini TANPA lanjut ke parse/cari/apa pun.
    return { ok: false, step: 'scan', text: text === null ? null : '' };
  }

  if (typeof SparepartOcrParser === 'undefined' || !SparepartOcrParser || typeof SparepartOcrParser.parseText !== 'function') {
    return { ok: false, step: 'parse', error: 'SparepartOcrParser belum tersedia.', text };
  }
  const parsed = SparepartOcrParser.parseText(text);

  if (typeof SparepartOcrCatalogLink === 'undefined' || !SparepartOcrCatalogLink || typeof SparepartOcrCatalogLink.findFromParsed !== 'function') {
    return { ok: false, step: 'find', error: 'SparepartOcrCatalogLink belum tersedia.', text, parsed };
  }
  const findResult = await SparepartOcrCatalogLink.findFromParsed(parsed);

  if (findResult && findResult.found) {
    let detail = null;
    if (typeof SparepartOcrCatalogDetail !== 'undefined' && SparepartOcrCatalogDetail) {
      // Sesi 189 ("Hubungkan Detail OCR ke UI"): utamakan open() (wiring
      // DOM+modal nyata, SparepartOcrCatalogDetail Tahap 7C-3b+) kalau
      // tersedia, fallback ke show() (murni, tanpa DOM) buat kompatibilitas
      // mundur dgn dependency yang belum di-upgrade — 0 logic pencarian/
      // presentasi baru di sini, orkestrator tetap murni pemanggil.
      if (typeof SparepartOcrCatalogDetail.open === 'function') {
        detail = SparepartOcrCatalogDetail.open(findResult);
      } else if (typeof SparepartOcrCatalogDetail.show === 'function') {
        detail = SparepartOcrCatalogDetail.show(findResult);
      }
    }
    return { ok: true, step: 'detail', text, parsed, findResult, detail };
  }

  let addResult = null;
  if (typeof SparepartOcrCatalogAdd !== 'undefined' && SparepartOcrCatalogAdd && typeof SparepartOcrCatalogAdd.open === 'function') {
    addResult = await SparepartOcrCatalogAdd.open(findResult, parsed);
  }
  return { ok: true, step: 'add', text, parsed, findResult, addResult };
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama SparepartOcrCatalogLink/SparepartOcrCatalogDetail/
// SparepartOcrCatalogAdd (const object, expose eksplisit ke window karena
// Node vm & browser non-module script TIDAK otomatis menempelkan binding
// const/let ke global object).
// ------------------------------------------------------------------------
const SparepartOcrOrchestrator = {
  run: sparepartOcrOrchestrateRun,
};

if (typeof window !== 'undefined') {
  window.SparepartOcrOrchestrator = SparepartOcrOrchestrator;
}
