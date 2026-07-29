// sparepart-ocr-catalog-detail.js — Sparepart OCR Tahap 7C-3b: tampilkan
// detail part KALAU hasil pencarian (Tahap 7C-3a,
// SparepartOcrCatalogLink) ditemukan.
//
// CAKUPAN TAHAP 7C-3b (disepakati eksplisit — hanya presentasi detail
// part, TIDAK ubah parser & TIDAK ubah pencarian):
// - Terima hasil `{found, item, matchedBy}` dari
//   SparepartOcrCatalogLink.findFromParsed()/findFromText() (Tahap
//   7C-3a) APA ADANYA — file ini TIDAK memanggil VehicleCatalog atau
//   SparepartOcrParser sendiri, TIDAK mengulang logic pencarian/parsing
//   apa pun (0 duplikasi Tahap 7C-2/7C-3a).
// - `found:true` -> bangun detail part siap tampil: field yang sudah
//   diformat (harga via `fmt()` kalau ada, fallback "Belum diisi" utk
//   field opsional kosong — istilah yang SAMA PERSIS dipakai
//   `vehicle-core.js`/`fuel-gauge-engine.js` utk data belum terisi) &
//   1 potongan HTML kartu detail (escaped via `escapeHtml()`).
// - `found:false` (atau `item` kosong) -> TIDAK ADA yang ditampilkan,
//   fungsi kembalikan `null` apa adanya — sesuai instruksi "JIKA
//   ditemukan, tampilkan", bukan selalu tampil.
// - `fields()`/`html()`/`show()` di atas TETAP fungsi MURNI (tidak
//   menyentuh DOM) — pola sama sejak Tahap 7C-3b.
// - `open(result)` (BARU sesi ini, "Hubungkan Detail OCR ke UI"): lapisan
//   wiring tipis di atas `show()` — KALAU ditemukan, tulis `html`-nya ke
//   `#sparepartOcrDetailBody` (modal `sparepartOcrDetailModal`, BARU
//   ditambah di `modules/shared/modals.js` sesi ini) lalu buka modal itu
//   lewat `openModal()` yang SUDAH ADA (`modal-navigasi.js`). TIDAK
//   membuka form/modal edit (`VehicleCatalogUI.openForm()`) — tetap
//   presentasi baca-saja, bukan alur ubah data. `found:false` -> `show()`
//   balik `null`, `open()` TIDAK menulis DOM & TIDAK membuka modal apa
//   pun (perilaku "jika ditemukan, tampilkan" tidak berubah).
// - TIDAK ada fitur lain (tidak ada aksi edit/hapus/tambah ke katalog
//   dari kartu ini).
//
// Dependency: `escapeHtml()` (modules/shared/helper-teks.js) & `fmt()`
// (modules/shared/format-tema.js) keduanya OPSIONAL — guard typeof,
// fallback ke String(...) polos kalau belum dimuat (mis. dipakai
// berdiri sendiri/test terisolasi). `document`/`openModal()` (dipakai
// `open()` di atas) juga OPSIONAL, guard sama.

const SPAREPART_OCR_CATALOG_DETAIL_EMPTY = 'Belum diisi';

function _sparepartOcrCatalogDetailEsc(s) {
  return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s);
}

function _sparepartOcrCatalogDetailFmtPrice(price) {
  if (price === undefined || price === null || price === '') return SPAREPART_OCR_CATALOG_DETAIL_EMPTY;
  return (typeof fmt === 'function') ? fmt(price) : String(price);
}

/** Normalisasi 1 item VehicleCatalog jadi field siap tampil (fallback
 * "Belum diisi" utk field opsional kosong, harga diformat via `fmt()`
 * kalau ada). Fungsi MURNI, TIDAK membaca VehicleCatalog/D — item sudah
 * harus hasil `findFromParsed()`/`findFromText()` (Tahap 7C-3a). "Part
 * Number" = field `aftermarketCode` (istilah SAMA PERSIS dipakai
 * SparepartOcrCatalogLink Tahap 7C-3a). */
function sparepartOcrCatalogDetailFields(item) {
  const it = item || {};
  return {
    id: it.id || '',
    partName: it.partName || SPAREPART_OCR_CATALOG_DETAIL_EMPTY,
    category: it.category || SPAREPART_OCR_CATALOG_DETAIL_EMPTY,
    oemCode: it.oemCode || SPAREPART_OCR_CATALOG_DETAIL_EMPTY,
    barcode: it.barcode || SPAREPART_OCR_CATALOG_DETAIL_EMPTY,
    partNumber: it.aftermarketCode || SPAREPART_OCR_CATALOG_DETAIL_EMPTY,
    price: _sparepartOcrCatalogDetailFmtPrice(it.price),
    supplier: it.supplier || SPAREPART_OCR_CATALOG_DETAIL_EMPTY,
    location: it.location || SPAREPART_OCR_CATALOG_DETAIL_EMPTY,
    notes: it.notes || '',
    serviceNotes: it.serviceNotes || '',
    photos: Array.isArray(it.photos) ? it.photos.slice() : [],
    compatibleVehicleIds: Array.isArray(it.compatibleVehicleIds) ? it.compatibleVehicleIds.slice() : [],
    isDraft: !!it.isDraft,
  };
}

/** Bangun 1 potongan HTML kartu detail (read-only, TIDAK ada tombol
 * aksi apa pun) dari field hasil `sparepartOcrCatalogDetailFields()`.
 * Fungsi MURNI (string saja) — pemanggil (wiring UI tahap lanjutan)
 * yang bertanggung jawab menaruhnya ke elemen DOM mana pun. */
function sparepartOcrCatalogDetailHtml(item) {
  const f = sparepartOcrCatalogDetailFields(item);
  const esc = _sparepartOcrCatalogDetailEsc;
  const thumb = f.photos[0]
    ? '<img src="' + esc(f.photos[0]) + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0" alt="">'
    : '<div class="tx-icon u-bgaccsoft">📦</div>';
  const rows = [
    ['Kategori', f.category],
    ['OEM Code', f.oemCode],
    ['Barcode', f.barcode],
    ['Part Number', f.partNumber],
    ['Harga', f.price],
    ['Supplier', f.supplier],
    ['Lokasi', f.location],
  ].map((row) => '<div class="u-fs11 u-t2">' + esc(row[0]) + ': ' + esc(row[1]) + '</div>').join('');
  const draftBadge = f.isDraft ? '<div class="u-fs11">⚠️ Draft</div>' : '';
  return '<div class="sparepart-ocr-detail" style="display:flex;gap:10px;align-items:flex-start">'
    + thumb
    + '<div class="tx-info"><div class="tx-name">' + esc(f.partName) + '</div>' + rows + draftBadge + '</div>'
    + '</div>';
}

/** Orkestrasi utama Tahap 7C-3b: terima hasil `{found, item, matchedBy}`
 * dari SparepartOcrCatalogLink (Tahap 7C-3a) APA ADANYA.
 * - `found:true` & ada `item` -> `{fields, html, matchedBy}` siap tampil.
 * - `found:false` ATAU `item` kosong -> `null` (TIDAK ADA yang
 *   ditampilkan, sesuai instruksi "jika ditemukan, tampilkan"). */
function sparepartOcrCatalogShowDetail(result) {
  const r = result || {};
  if (!r.found || !r.item) return null;
  return {
    fields: sparepartOcrCatalogDetailFields(r.item),
    html: sparepartOcrCatalogDetailHtml(r.item),
    matchedBy: r.matchedBy || '',
  };
}

// ------------------------------------------------------------------------
// Wiring UI (tahap lanjutan, sesi ini): tampilkan kartu detail di atas ke
// DOM NYATA — `#sparepartOcrDetailBody` di dalam modal `sparepartOcrDetailModal`
// (`modules/shared/modals.js`, baru ditambah sesi ini), lalu buka modalnya
// lewat `openModal()` yang SUDAH ADA (`modal-navigasi.js`). 0 logic baru —
// `sparepartOcrCatalogShowDetail()` di atas dipakai apa adanya (tidak
// diulang), fungsi ini HANYA lapisan tulis-DOM+buka-modal di atasnya.
// `found:false`/item kosong -> `show()` balik `null`, TIDAK ada DOM yang
// ditulis & modal TIDAK dibuka (perilaku "jika ditemukan, tampilkan" tetap
// sama seperti `show()`, cuma sekarang benar-benar kelihatan di layar
// kalau ditemukan). `document`/`openModal` keduanya OPSIONAL (guard
// typeof) — gagal aman, `show()` tetap dikembalikan apa adanya walau DOM
// tidak tersedia (mis. dipanggil dari test terisolasi/Node).
// ------------------------------------------------------------------------
function sparepartOcrCatalogDetailOpen(result) {
  const shown = sparepartOcrCatalogShowDetail(result);
  if (!shown) return null;
  if (typeof document !== 'undefined' && document && typeof document.getElementById === 'function') {
    const body = document.getElementById('sparepartOcrDetailBody');
    if (body) body.innerHTML = shown.html;
  }
  if (typeof openModal === 'function') openModal('sparepartOcrDetailModal');
  return shown;
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama SparepartOcrCatalogLink/VehicleCatalogUI
// (const object, expose eksplisit ke window karena Node vm & browser
// non-module script TIDAK otomatis menempelkan binding const/let ke
// global object).
// ------------------------------------------------------------------------
const SparepartOcrCatalogDetail = {
  EMPTY_LABEL: SPAREPART_OCR_CATALOG_DETAIL_EMPTY,
  fields: sparepartOcrCatalogDetailFields,
  html: sparepartOcrCatalogDetailHtml,
  show: sparepartOcrCatalogShowDetail,
  open: sparepartOcrCatalogDetailOpen,
};

if (typeof window !== 'undefined') {
  window.SparepartOcrCatalogDetail = SparepartOcrCatalogDetail;
}
