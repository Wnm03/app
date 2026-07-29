// sparepart-ocr.js — Engine OCR Sparepart Scanner (Tahap 7C-1, Fondasi)
//
// CAKUPAN TAHAP 7C-1 (disepakati eksplisit — RULE #1: 100% reuse, TIDAK ada
// OCR engine baru, TIDAK ada integrasi Vehicle Catalog):
// - Engine baca 1 foto dari GALERI (input file) — pola SAMA PERSIS
//   sparepartScannerPickImageFile() (sparepart-scanner.js, Tahap 7B-1):
//   reuse fungsi itu lewat SparepartScanner.pickImageFile() kalau modul itu
//   sudah dimuat, fallback bikin <input type=file> sendiri kalau belum
//   (mis. dipakai berdiri sendiri/test terisolasi) — guard typeof, pola
//   SAMA PERSIS sparepartScannerErrorMessage() reuse VehicleScanner.
// - OCR-nya SENDIRI 100% REUSE ocrRecognize() (Tesseract, modules/shared/
//   scan-ocr.js) — engine OCR yang SUDAH ADA di app ini (scan struk/bukti
//   transfer/odometer/dll sejak Sesi 17-18), dipakai lagi apa adanya sama
//   seperti vehicle-catalog-import.js (Tahap 5, fallback OCR halaman PDF).
//   TIDAK ada worker/library OCR baru yang didefinisikan di file ini.
// - Hasil dikembalikan APA ADANYA: STRING teks OCR mentah saja (trim()).
//   TIDAK ada parsing/regex OEM-code/harga/nama-part (itu ranah
//   VehicleCatalog.parseLabelText()/parseCatalogRow() di modul lain),
//   TIDAK memanggil VehicleCatalog sama sekali — SENGAJA DI LUAR CAKUPAN
//   sesi ini (instruksi eksplisit: "belum integrasi Vehicle Catalog").
// - SENGAJA TIDAK dikerjakan (di luar cakupan): parsing teks hasil OCR jadi
//   field part, pencarian/draft ke VehicleCatalog, UI/tombol pemicu —
//   kandidat tahap lanjutan (7C-2 dst) setelah engine ini disetujui.
//
// Dependency: ocrRecognize() (modules/shared/scan-ocr.js) HARUS sudah
// dimuat lebih dulu (lihat urutan di scripts/build.js). SparepartScanner
// (sparepart-scanner.js) OPSIONAL — dipakai kalau ada utk reuse
// pickImageFile(), fallback sendiri kalau belum/tidak dimuat.

// ------------------------------------------------------------------------
// Pilih 1 foto dari galeri — reuse SparepartScanner.pickImageFile() kalau
// tersedia (satu sumber kebenaran picker galeri, tidak ada 2 implementasi
// berbeda), fallback identik kalau modul itu belum dimuat.
// ------------------------------------------------------------------------
function sparepartOcrPickImageFile() {
  if (typeof SparepartScanner !== 'undefined' && SparepartScanner && typeof SparepartScanner.pickImageFile === 'function') {
    return SparepartScanner.pickImageFile();
  }
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = (e) => {
      const file = (e && e.target && e.target.files) ? e.target.files[0] : null;
      resolve(file || null);
    };
    inp.click();
  });
}

// ------------------------------------------------------------------------
// Error message — reuse penuh scanErrorMessage() (modules/shared/scan-ocr.js,
// pesan error OCR yang SUDAH ADA: timeout/jaringan/modul gagal muat dst),
// fallback minimal kalau dipanggil dari konteks scan-ocr.js belum ter-load
// (mis. test terisolasi) — pola SAMA PERSIS sparepartScannerErrorMessage().
// ------------------------------------------------------------------------
function sparepartOcrErrorMessage(err) {
  if (typeof scanErrorMessage === 'function') {
    return scanErrorMessage(err);
  }
  const raw = (err && err.message) || (typeof err === 'string' ? err : '');
  if (raw) return raw;
  return 'error tidak diketahui — cek koneksi internet, lalu coba lagi';
}

// ------------------------------------------------------------------------
// OCR murni satu file -> STRING teks (trim()), TIDAK ada parsing lanjutan.
// Reuse ocrRecognize() (Tesseract) apa adanya, guard typeof supaya jelas
// pesan errornya kalau scan-ocr.js belum termuat (pola sama vehicle-
// catalog-import.js).
// ------------------------------------------------------------------------
async function sparepartOcrRecognizeFile(file) {
  if (!file) return '';
  if (typeof ocrRecognize !== 'function') {
    throw new Error('Modul OCR belum tersedia (scan-ocr.js belum dimuat)');
  }
  const result = await ocrRecognize(file);
  const text = (result && result.data && typeof result.data.text === 'string') ? result.data.text : '';
  return text.trim();
}

// ------------------------------------------------------------------------
// Orkestrasi utama — pilih foto dari galeri lalu OCR, kembalikan STRING
// teks OCR saja (bukan object hasil parse apa pun). null = dibatalkan/
// gagal (sudah ditoast pesan errornya), '' = foto terbaca tapi tidak ada
// teks terdeteksi.
// ------------------------------------------------------------------------
async function sparepartOcrScan() {
  const file = await sparepartOcrPickImageFile();
  if (!file) {
    toast('⚠️ Tidak ada gambar dipilih');
    return null;
  }
  toast('🔍 Membaca teks dari gambar...', 4000);
  try {
    const text = await sparepartOcrRecognizeFile(file);
    if (!text) {
      toast('⚠️ Tidak ada teks terbaca dari gambar — coba foto lebih dekat/jelas');
      return '';
    }
    toast('✅ Teks berhasil dibaca dari gambar');
    return text;
  } catch (err) {
    console.error('[SparepartOcr] gagal OCR:', err);
    toast('❌ Gagal OCR: ' + sparepartOcrErrorMessage(err));
    return null;
  }
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama persis SparepartScanner (const object,
// expose eksplisit ke window krn Node vm & browser non-module script TIDAK
// otomatis menempelkan binding const/let ke global object).
// ------------------------------------------------------------------------
const SparepartOcr = {
  scan: sparepartOcrScan,
  recognizeFile: sparepartOcrRecognizeFile,
  pickImageFile: sparepartOcrPickImageFile,
  errorMessage: sparepartOcrErrorMessage,
};

if (typeof window !== 'undefined') {
  window.SparepartOcr = SparepartOcr;
}
