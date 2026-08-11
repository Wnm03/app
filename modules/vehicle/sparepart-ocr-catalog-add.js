// sparepart-ocr-catalog-add.js — Sparepart OCR: kalau part TIDAK ditemukan
// (SparepartOcrCatalogLink.findFromParsed()/findFromText(), Tahap 7C-3a,
// `found:false`), buka form tambah part yang SUDAH ADA
// (`VehicleCatalogUI.openForm()`, Sesi 181) dalam mode "Tambah Part Baru",
// ISI OTOMATIS (prefill) field yang bisa dipetakan dari hasil OCR, lalu
// MINTA KONFIRMASI dulu sebelum benar-benar disimpan ke VehicleCatalog.
//
// PERUBAHAN sesi ini (instruksi eksplisit user): `open()` KEMBALI menulis
// field prefill ke DOM (mengembalikan perilaku Tahap 7C-3c, yang sempat
// dinonaktifkan di Sesi 187/noprefill). Proses simpan
// (`confirmAndSave()`/`VehicleCatalogUI.save()`) & fitur lain TIDAK
// disentuh sama sekali.
//
// CAKUPAN (sempit, additive): TIDAK ubah parser (7C-2), TIDAK ubah
// pencarian (7C-3a), TIDAK ubah kartu detail (7C-3b), TIDAK ubah
// `VehicleCatalogUI.openForm()`/`save()` yang sudah ada (dipanggil apa
// adanya, 0 duplikasi logic form/validasi), TIDAK ada fitur lain.
//
// - `fields(parsed)` — presenter MURNI: hasil parse `{oemCode, partName,
//   brand, barcode}` (bentuk PERSIS `SparepartOcrParser.parseText()`,
//   Tahap 7C-2) -> prefill data siap tulis ke form tambah part. HANYA 3
//   field yang dipetakan (`partName`/`oemCode`/`barcode`) krn HANYA 3 itu
//   yang punya input di form add-part `vehicle-catalog-ui.js`
//   (`catPartName`/`catOemCode`/`catBarcode`). `category` SENGAJA
//   dikosongkan (parser tidak mengekstrak kategori), `brand` SENGAJA TIDAK
//   dipetakan (tidak ada field brand di skema/form VehicleCatalog).
// - `open(findResult, parsed)` — orkestrasi utama: HANYA berjalan kalau
//   `findResult.found` falsy (part belum ada di katalog, sesuai instruksi
//   "jika part tidak ditemukan"). `found:true` -> TIDAK melakukan apa pun,
//   return `null` (kartu detail Tahap 7C-3b yang seharusnya tampil, BUKAN
//   form tambah). `found:false` -> panggil `VehicleCatalogUI.openForm()`
//   TANPA id (mode "Tambah Part Baru", 100% reuse, 0 logic form baru), lalu
//   tulis field prefill (`fields(parsed)`) ke DOM
//   (`catPartName`/`catOemCode`/`catBarcode`) KALAU elemennya ada & nilainya
//   TIDAK kosong (guard: elemen tidak ada -> dilewati, tidak melempar;
//   nilai kosong -> field form TIDAK ditimpa, biar user isi manual). TIDAK
//   memanggil `VehicleCatalog.create()` di sini — form tetap berstatus
//   "belum disimpan" sampai user konfirmasi lewat `confirmAndSave()` di
//   bawah (TIDAK berubah).
// - `confirmAndSave()` — SATU-SATUNYA jalur simpan utk alur OCR ini: minta
//   konfirmasi dulu (`askConfirm()`, SUDAH ADA di `modal-navigasi.js`, pola
//   sama persis `catalogUiRemove()` di `vehicle-catalog-ui.js`), BARU kalau
//   user tekan "Ya" -> panggil `VehicleCatalogUI.save()` yang SUDAH ADA
//   (baca field form apa adanya, TIDAK ada validasi/logic simpan baru di
//   sini) utk benar-benar menyimpan ke VehicleCatalog. User tekan "Batal"
//   -> `save()` TIDAK pernah dipanggil, form TETAP terbuka (user bisa
//   lanjut edit atau `VehicleCatalogUI.closeForm()` manual) — 0 perubahan
//   pada `VehicleCatalogUI.save()` itu sendiri, sehingga alur simpan manual
//   "+ Tambah Part"/"Simpan Perubahan" yang SUDAH ADA (TANPA konfirmasi,
//   disepakati sejak awal, TIDAK diminta berubah) TIDAK tersentuh sama
//   sekali.
//
// TIDAK ada tombol/entry-point baru ditaruh ke halaman manapun sesi ini —
// belum ada container/modal OCR nyata di halaman manapun (sama seperti
// Tahap 7C-1/7C-2/7C-3a/7C-3b, semuanya logic/orkestrasi siap pakai, wiring
// ke tombol scan label nyata adalah kandidat tahap lanjutan setelah alur
// ini disetujui).
//
// Dependency: `VehicleCatalogUI` (`openForm()`/`save()`,
// `vehicle-catalog-ui.js`) & `askConfirm()` (`modal-navigasi.js`) keduanya
// OPSIONAL — guard typeof, gagal aman (tidak melempar exception, cukup
// `null`/`false`) kalau belum dimuat, pola sama modul-modul lain di tahap
// ini (`SparepartOcrCatalogLink`/`SparepartOcrCatalogDetail`).

function _sparepartOcrCatalogAddStr(v) {
  return (v === undefined || v === null) ? '' : String(v).trim();
}

// Sesi 190 (tahap7C4b-sparepart-ocr-add-ui): `confirmAndSave()` di bawah SUDAH
// ADA sejak sesi lalu, tapi belum ada yang benar-benar MENYAMBUNGKANNYA ke
// tombol simpan NYATA di form (`#catSaveBtn`, `catalogModal`/`modals.js`) --
// tombol itu masih `data-action="VehicleCatalogUI.save"` apa adanya (dipakai
// bareng oleh alur tambah manual "+ Tambah Manual", yang MEMANG tidak boleh
// diminta konfirmasi). Fix: `open()` di bawah, KHUSUS saat dibuka dari alur
// OCR (`found:false`), mengalihkan sementara `data-action` tombol itu ke
// `SparepartOcrCatalogAdd.confirmAndSave` (dispatcher `[data-action]` yang
// SUDAH ADA di `features-helpers-global-security.js` membaca atribut ini
// SETIAP kali tombol diklik, bukan sekali saat render, jadi aman dialihkan
// belakangan). Dialihkan BALIK ke `VehicleCatalogUI.save` (default) begitu
// alur OCR ini selesai (`confirmAndSave()` sukses simpan, ATAU user batal
// lewat `cancel()` di bawah) -- supaya tombol "+ Tambah Manual" berikutnya
// TETAP seperti semula (langsung simpan, TANPA konfirmasi, TIDAK berubah).
const SPAREPART_OCR_CATALOG_ADD_SAVE_BTN_ID = 'catSaveBtn';
const SPAREPART_OCR_CATALOG_ADD_DEFAULT_SAVE_ACTION = 'VehicleCatalogUI.save';
const SPAREPART_OCR_CATALOG_ADD_CONFIRM_ACTION = 'SparepartOcrCatalogAdd.confirmAndSave';

function _sparepartOcrCatalogAddSetSaveAction(action) {
  if (typeof document === 'undefined' || !document || typeof document.getElementById !== 'function') return;
  const btn = document.getElementById(SPAREPART_OCR_CATALOG_ADD_SAVE_BTN_ID);
  if (btn) btn.dataset.action = action;
}

/** Presenter MURNI: hasil parse OCR (`SparepartOcrParser.parseText()`,
 * Tahap 7C-2) -> prefill data siap tulis ke form tambah part yang SUDAH
 * ADA. Fungsi ini TIDAK menyentuh DOM sama sekali (dipanggil oleh `open()`
 * di bawah). */
function sparepartOcrCatalogAddFields(parsed) {
  const p = parsed || {};
  return {
    partName: _sparepartOcrCatalogAddStr(p.partName),
    oemCode: _sparepartOcrCatalogAddStr(p.oemCode),
    barcode: _sparepartOcrCatalogAddStr(p.barcode),
  };
}

/** Tulis field prefill (`fields(parsed)`) ke DOM form add-part yang SUDAH
 * ADA (`catPartName`/`catOemCode`/`catBarcode`, `vehicle-catalog-ui.js`).
 * Murni DOM-write, dipanggil SETELAH `VehicleCatalogUI.openForm()` (yang
 * mengosongkan field-field itu utk mode "Tambah Part Baru") — pola sama
 * `fields(parsed)`->tulis DOM di modul lain repository ini. Guard: kalau
 * `document`/elemen tidak tersedia -> dilewati (tidak melempar); kalau
 * nilai hasil OCR kosong -> field form yang bersangkutan TIDAK ditimpa. */
function _sparepartOcrCatalogAddWritePrefill(parsed) {
  if (typeof document === 'undefined' || !document || typeof document.getElementById !== 'function') return;
  const f = sparepartOcrCatalogAddFields(parsed);
  const map = { catPartName: f.partName, catOemCode: f.oemCode, catBarcode: f.barcode };
  for (const id in map) {
    const val = map[id];
    if (!val) continue; // kosong -> jangan timpa field form
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
}

/** Orkestrasi utama. `findResult` bentuk PERSIS output
 * `SparepartOcrCatalogLink.findFromParsed()`/`findFromText()` (Tahap
 * 7C-3a).
 * - `findResult.found` truthy -> TIDAK melakukan apa pun, return `null`
 *   (part sudah ada, kartu detail Tahap 7C-3b yang seharusnya tampil).
 * - `findResult.found` falsy -> buka form tambah part (mode "Tambah Part
 *   Baru", `VehicleCatalogUI.openForm()` TANPA id), lalu tulis prefill
 *   hasil OCR (`parsed`) ke field form yang ada & tidak kosong, return
 *   `{ opened: true }` (`null` kalau `VehicleCatalogUI`/`openForm()` belum
 *   tersedia — tidak melempar exception). */
async function sparepartOcrCatalogAddOpen(findResult, parsed) {
  const r = findResult || {};
  if (r.found) return null;
  if (typeof VehicleCatalogUI === 'undefined' || !VehicleCatalogUI || typeof VehicleCatalogUI.openForm !== 'function') {
    return null;
  }

  await VehicleCatalogUI.openForm();
  _sparepartOcrCatalogAddWritePrefill(parsed);
  // Sesi 190: alihkan tombol simpan form ke jalur konfirmasi (lihat catatan
  // di atas `_sparepartOcrCatalogAddSetSaveAction`) -- HANYA utk sesi form
  // yang dibuka dari alur OCR ini, bukan tombol "+ Tambah Manual".
  _sparepartOcrCatalogAddSetSaveAction(SPAREPART_OCR_CATALOG_ADD_CONFIRM_ACTION);

  return { opened: true };
}

/** Konfirmasi dulu (`askConfirm()`, SUDAH ADA) baru simpan
 * (`VehicleCatalogUI.save()`, SUDAH ADA) — SATU-SATUNYA jalur simpan utk
 * form yang dibuka lewat `sparepartOcrCatalogAddOpen()` di atas. User tekan
 * "Batal" -> `save()` TIDAK pernah dipanggil, return `false`. TIDAK ada
 * logic simpan baru — `VehicleCatalogUI.save()` dipanggil apa adanya. */
async function sparepartOcrCatalogAddConfirmSave() {
  if (typeof askConfirm !== 'function') return false;
  const ok = await askConfirm('Simpan part baru ini ke katalog?', {
    icon: '📦',
    title: 'Tambah Part dari OCR',
    okText: 'Ya, Simpan',
    danger: false,
  });
  if (!ok) return false;

  if (typeof VehicleCatalogUI === 'undefined' || !VehicleCatalogUI || typeof VehicleCatalogUI.save !== 'function') {
    return false;
  }
  await VehicleCatalogUI.save();
  // Sesi 190: sesi OCR ini selesai (sudah tersimpan) -- kembalikan tombol
  // simpan form ke default (`VehicleCatalogUI.save`, TANPA konfirmasi)
  // supaya tombol "+ Tambah Manual" berikutnya TIDAK ikut kena konfirmasi.
  _sparepartOcrCatalogAddSetSaveAction(SPAREPART_OCR_CATALOG_ADD_DEFAULT_SAVE_ACTION);
  return true;
}

/** Batal alur tambah dari OCR ini (tombol "✕ Batal" di form, `catalogModal`).
 * Kembalikan dulu tombol simpan ke default (`VehicleCatalogUI.save`, sama
 * seperti setelah `confirmAndSave()` sukses -- lihat catatan di atas) SEBELUM
 * menutup form lewat `VehicleCatalogUI.closeForm()` yang SUDAH ADA (dipanggil
 * apa adanya, 0 logic tutup-form baru). Dipakai sbg `data-action` tombol
 * "✕ Batal" di `catalogModal` (`modals.js`) menggantikan pemanggilan langsung
 * `VehicleCatalogUI.closeForm` -- dipakai jg oleh alur tambah manual (form
 * yang sama), tapi karena tombol simpan SUDAH default di alur manual, reset
 * ini tidak mengubah perilakunya sama sekali (no-op kalau memang sudah
 * default). */
function sparepartOcrCatalogAddCancel() {
  _sparepartOcrCatalogAddSetSaveAction(SPAREPART_OCR_CATALOG_ADD_DEFAULT_SAVE_ACTION);
  if (typeof VehicleCatalogUI !== 'undefined' && VehicleCatalogUI && typeof VehicleCatalogUI.closeForm === 'function') {
    VehicleCatalogUI.closeForm();
  }
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama SparepartOcrCatalogLink/SparepartOcrCatalogDetail
// (const object, expose eksplisit ke window karena Node vm & browser
// non-module script TIDAK otomatis menempelkan binding const/let ke global
// object).
// ------------------------------------------------------------------------
const SparepartOcrCatalogAdd = {
  fields: sparepartOcrCatalogAddFields,
  open: sparepartOcrCatalogAddOpen,
  confirmAndSave: sparepartOcrCatalogAddConfirmSave,
  cancel: sparepartOcrCatalogAddCancel,
};

if (typeof window !== 'undefined') {
  window.SparepartOcrCatalogAdd = SparepartOcrCatalogAdd;
}
