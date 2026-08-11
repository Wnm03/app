// sparepart-scanner-ui.js — UI tipis Scanner Sparepart (Tahap 7B-1 Fondasi +
// Tahap 7B-2 Kamera Real-Time), tombol "📷 Scan" (kamera) & "🖼️ Scan dari
// Galeri" di catalogModal (modules/shared/modals.js) yang SUDAH ADA
// (VehicleCatalogUI/catalogModal, Sesi 181). File ini HANYA lapisan
// presenter/orkestrasi hasil scan -> UI, TIDAK ada logic scan/cari-atau-draft
// baru (semua reuse SparepartScanner/VehicleCatalog).
//
// Alur (sama utk kedua adapter, 'camera' maupun 'gallery'):
// - Tap tombol -> SparepartScannerUI.scanCamera()/scanGallery() ->
//   SparepartScanner.scan('camera'|'gallery') (sparepart-scanner.js, reuse
//   penuh) -> dapat { found, item, draft } dari VehicleCatalog.handleScan().
// - Kode ditemukan (found:true) -> buka VehicleCatalogUI.openForm(item.id)
//   yang SUDAH ADA (Sesi 181) -> tampil sbg detail/edit part (field terisi
//   dari data existing, termasuk Barcode yang baru ditambah sesi ini).
// - Kode tidak ditemukan (draft:true, VehicleCatalog.handleScan() otomatis
//   bikin draft) -> openForm(item.id) yang sama dibuka utk draft itu ->
//   field Barcode otomatis terisi kode hasil scan (field `barcode` draft),
//   user tinggal lengkapi Nama Part/Kategori lalu simpan. TIDAK ada form
//   "tambah part" terpisah — REUSE 100% form yang SUDAH ADA.
// - onScanResult() (dipanggil dari sparepart-scanner.js setelah handleCode())
//   HANYA refresh list kalau catalogModal sedang terbuka — pola SAMA PERSIS
//   catalogUiOnScanResult() (vehicle-catalog-ui.js) utk VehicleScanner.
//
// CATATAN Tahap 7B-2: tombol "📷 Scan" di catalogModal sebelumnya terpasang
// ke VehicleScanner.scan() langsung (kamera live, tapi TIDAK auto-buka form
// hasil scan — hanya refresh list, lihat catalogUiOnScanResult()). Sesi ini
// tombol tsb diarahkan ke SparepartScannerUI.scanCamera() supaya kamera live
// JUGA otomatis membuka detail part (found) atau form draft terisi (belum
// ada) — perilaku yang sebelumnya cuma dimiliki adapter gallery. TIDAK ada
// logic kamera baru: scanCamera() cuma pemanggil tipis adapter 'camera' yang
// didaftarkan di sparepart-scanner.js (reuse VehicleScanner.ensureZXing/
// buildHints yang sama dgn adapter gallery).

async function sparepartScannerUiScanGallery() {
  // BUGFIX (laporan user: tombol "Scan dari Galeri" di Katalog Suku Cadang
  // kadang tidak terbuka & TIDAK ADA toast error sama sekali) -- sebelumnya
  // fungsi ini langsung panggil SparepartScanner.scan() tanpa guard typeof.
  // Kalau modules/vehicle/sparepart-scanner.js gagal/belum ke-load (mis.
  // urutan script rusak/file hilang di hosting), SparepartScanner undefined
  // -> ReferenceError SEBELUM baris toast manapun sempat jalan -> gagal
  // senyap, user cuma lihat tombol seperti tidak merespon. Guard ini
  // menyamakan pola dgn txStockScanPartVia() (tx-stok-sparepart.js) yang
  // SUDAH benar: cek dulu, kasih toast jelas kalau modul belum siap.
  if (typeof SparepartScanner === 'undefined' || !SparepartScanner) {
    toast('⚠️ Fitur scan belum siap dimuat — coba refresh halaman, lalu coba lagi');
    return;
  }
  const result = await SparepartScanner.scan('gallery');
  if (!result) return;
  if (typeof VehicleCatalogUI === 'undefined' || !VehicleCatalogUI) return;
  if (typeof VehicleCatalogUI.renderList === 'function') await VehicleCatalogUI.renderList();
  if (result.item && result.item.id && typeof VehicleCatalogUI.openForm === 'function') {
    await VehicleCatalogUI.openForm(result.item.id);
  }
}

async function sparepartScannerUiScanCamera() {
  // Guard sama persis scanGallery() di atas -- lihat catatan BUGFIX di sana.
  if (typeof SparepartScanner === 'undefined' || !SparepartScanner) {
    toast('⚠️ Fitur scan belum siap dimuat — coba refresh halaman, lalu coba lagi');
    return;
  }
  const result = await SparepartScanner.scan('camera');
  if (!result) return;
  if (typeof VehicleCatalogUI === 'undefined' || !VehicleCatalogUI) return;
  if (typeof VehicleCatalogUI.renderList === 'function') await VehicleCatalogUI.renderList();
  if (result.item && result.item.id && typeof VehicleCatalogUI.openForm === 'function') {
    await VehicleCatalogUI.openForm(result.item.id);
  }
}

// Dipanggil sparepartScannerHandleCode() (sparepart-scanner.js) setelah scan
// selesai — refresh list HANYA kalau catalogModal sedang terbuka ('open'),
// pola sama persis catalogUiOnScanResult(). Pembukaan form detail/draft itu
// sendiri TETAP tanggung jawab scanGallery() di atas (yang meng-await hasil
// langsung), supaya form tidak terbuka dobel.
function sparepartScannerUiOnScanResult() {
  const modalEl = document.getElementById('catalogModal');
  if (!modalEl || !modalEl.classList.contains('open')) return;
  if (typeof VehicleCatalogUI !== 'undefined' && VehicleCatalogUI && typeof VehicleCatalogUI.renderList === 'function') {
    VehicleCatalogUI.renderList();
  }
}

const SparepartScannerUI = {
  scanGallery: sparepartScannerUiScanGallery,
  scanCamera: sparepartScannerUiScanCamera,
  onScanResult: sparepartScannerUiOnScanResult,
};

if (typeof window !== 'undefined') {
  window.SparepartScannerUI = SparepartScannerUI;
}
