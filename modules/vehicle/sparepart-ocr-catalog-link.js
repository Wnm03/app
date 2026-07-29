// sparepart-ocr-catalog-link.js — Sparepart OCR Tahap 7C-3a: jembatan
// MURNI LOGIC antara hasil SparepartOcrParser (Tahap 7C-2,
// modules/vehicle/sparepart-ocr-parser.js) dan VehicleCatalog
// (modules/vehicle/vehicle-catalog.js).
//
// CAKUPAN TAHAP 7C-3a (disepakati eksplisit — hanya CARI, belum simpan):
// - Terima hasil parse (`{oemCode, barcode, partName, brand}`, bentuk
//   PERSIS output SparepartOcrParser.parseText()) ATAU string teks OCR
//   mentah (akan diparse dulu lewat SparepartOcrParser.parseText() kalau
//   tersedia, guard typeof).
// - Cari 1 part di VehicleCatalog berdasar OEM Code, Barcode, ATAU Part
//   Number (field `aftermarketCode` di skema VehicleCatalog — istilah
//   "Part Number" pada part aftermarket, beda dari `oemCode` bawaan
//   pabrikan). Exact match, case-insensitive (pola sama persis
//   VehicleCatalog.findByCode()) — BUKAN substring/search bebas.
// - Kembalikan HANYA status ditemukan/tidak ditemukan (`{found, item,
//   matchedBy}` / `{found:false, item:null}`) — TIDAK membuat draft,
//   TIDAK memanggil VehicleCatalog.create()/update() sama sekali (beda
//   dari VehicleCatalog.handleOcrLabel() Tahap 3 yang otomatis bikin
//   draft kalau tidak ketemu — itu fitur terpisah yang SUDAH ADA, TIDAK
//   diduplikasi/diubah di sini).
// - TIDAK ada UI/form baru, TIDAK menyentuh DOM sama sekali — modul ini
//   murni fungsi logic (async karena baca VehicleCatalog/IDBStore).
//
// Dependency: SparepartOcrParser (sparepart-ocr-parser.js, Tahap 7C-2)
// OPSIONAL — guard typeof, hanya dipakai kalau input berupa string teks
// mentah. VehicleCatalog (vehicle-catalog.js) OPSIONAL juga — guard
// typeof, kalau belum dimuat hasilnya selalu `{found:false, item:null,
// error:'VehicleCatalog belum tersedia.'}`, TIDAK melempar exception.

/** Cari 1 part VehicleCatalog persis (exact, case-insensitive) berdasar
 * SATU kode (OEM Code, Barcode, ATAU Part Number/aftermarketCode).
 * 100% REUSE VehicleCatalog.findByCode() (sudah cek oemCode & barcode)
 * untuk 2 dari 3 field; field `aftermarketCode` ("Part Number") belum
 * dicek oleh findByCode() yang sudah ada, jadi ditambah di sini SAJA
 * (lewat VehicleCatalog.getAll(), tanpa mengubah vehicle-catalog.js) —
 * supaya findByCode() existing (dipakai handleScan()/handleOcrLabel())
 * tetap sama persis perilakunya, tidak ada perubahan pada modul lain.
 * Return `null` kalau kode kosong, VehicleCatalog belum tersedia, atau
 * tidak ada part yang cocok di ketiga field tsb. */
async function sparepartOcrCatalogFindByCode(code) {
  const c = (code || '').toString().trim();
  if (!c) return null;
  if (typeof VehicleCatalog === 'undefined' || !VehicleCatalog) return null;

  if (typeof VehicleCatalog.findByCode === 'function') {
    const byCode = await VehicleCatalog.findByCode(c);
    if (byCode) return byCode;
  }

  if (typeof VehicleCatalog.getAll === 'function') {
    const lower = c.toLowerCase();
    const all = await VehicleCatalog.getAll();
    const byPartNumber = all.find((it) => it && it.aftermarketCode && it.aftermarketCode.toLowerCase() === lower);
    if (byPartNumber) return byPartNumber;
  }

  return null;
}

/** Orkestrasi utama Tahap 7C-3a: terima hasil parse
 * `{oemCode, barcode, partName?, brand?}` (bentuk output
 * SparepartOcrParser.parseText()), cari di VehicleCatalog berdasar OEM
 * Code dulu (paling spesifik), lalu Barcode, lalu Part Number
 * (aftermarketCode) — berhenti di kecocokan pertama.
 * - Tidak ada satu pun kode yang bisa dicari (oemCode & barcode
 *   sama-sama kosong) -> `{found:false, item:null, error:'...'}`, TIDAK
 *   mencoba mencari apa pun.
 * - Ketemu -> `{found:true, item, matchedBy:'oemCode'|'barcode'}`.
 * - Tidak ketemu -> `{found:false, item:null}` (BUKAN error — kode
 *   valid, cuma belum ada di katalog; caller/tahap lanjutan yang
 *   memutuskan mau bikin draft atau tidak, di luar cakupan 7C-3a). */
async function sparepartOcrCatalogFindFromParsed(parsed) {
  const p = parsed || {};
  const oemCode = (p.oemCode || '').toString().trim();
  const barcode = (p.barcode || '').toString().trim();

  if (!oemCode && !barcode) {
    return { found: false, item: null, error: 'OEM Code/Barcode tidak terdeteksi dari hasil parse.' };
  }

  if (oemCode) {
    const byOem = await sparepartOcrCatalogFindByCode(oemCode);
    if (byOem) return { found: true, item: byOem, matchedBy: 'oemCode' };
  }

  if (barcode) {
    const byBarcode = await sparepartOcrCatalogFindByCode(barcode);
    if (byBarcode) return { found: true, item: byBarcode, matchedBy: 'barcode' };
  }

  return { found: false, item: null };
}

/** Varian nyaman: terima STRING teks OCR mentah langsung (bukan hasil
 * parse), parse dulu lewat SparepartOcrParser.parseText() (Tahap 7C-2,
 * guard typeof) baru cari ke VehicleCatalog lewat findFromParsed() di
 * atas. Kalau SparepartOcrParser belum dimuat -> tidak bisa parse ->
 * `{found:false, item:null, error:'...'}`, TIDAK menebak/regex sendiri
 * (satu sumber kebenaran parsing tetap SparepartOcrParser). */
async function sparepartOcrCatalogFindFromText(text) {
  if (typeof SparepartOcrParser === 'undefined' || !SparepartOcrParser || typeof SparepartOcrParser.parseText !== 'function') {
    return { found: false, item: null, error: 'SparepartOcrParser belum tersedia.' };
  }
  const parsed = SparepartOcrParser.parseText(text);
  return sparepartOcrCatalogFindFromParsed(parsed);
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama VehicleCatalogServisLink/VehicleCatalogTxLink
// (const object, expose eksplisit ke window karena Node vm & browser
// non-module script TIDAK otomatis menempelkan binding const/let ke
// global object).
// ------------------------------------------------------------------------
const SparepartOcrCatalogLink = {
  findByCode: sparepartOcrCatalogFindByCode,
  findFromParsed: sparepartOcrCatalogFindFromParsed,
  findFromText: sparepartOcrCatalogFindFromText,
};

if (typeof window !== 'undefined') {
  window.SparepartOcrCatalogLink = SparepartOcrCatalogLink;
}
