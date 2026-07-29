// sparepart-ocr-parser.js — Parser Hasil OCR Sparepart (Tahap 7C-2, logic
// murni)
//
// CAKUPAN TAHAP 7C-2 (disepakati eksplisit — parsing MURNI, BELUM
// menyimpan data, BELUM ubah UI):
// - Terima STRING teks OCR mentah (hasil SparepartOcr.scan(), Tahap 7C-1,
//   atau sumber teks OCR apa pun) -> ekstrak 4 field: oemCode, partName,
//   brand, barcode. Fungsi MURNI (regex/keyword-match saja, TIDAK
//   menyentuh DOM/database) supaya gampang dites via loadSource(), pola
//   sama vehicleCatalogValidate()/vehicleCatalogParseLabelText().
// - OEM Code & Barcode: 100% REUSE regex VehicleCatalog.parseLabelText()
//   (vehicle-catalog.js, Tahap 3) lewat guard typeof — SATU sumber
//   kebenaran pola OEM/barcode di app ini, TIDAK didefinisikan ulang
//   beda. Fallback: salinan regex IDENTIK dipakai HANYA kalau
//   vehicle-catalog.js belum dimuat (mis. modul ini dipakai berdiri
//   sendiri/test terisolasi) — pola sama persis fallback
//   sparepartScannerErrorMessage()/sparepartOcrPickImageFile() (reuse
//   kalau ada, fallback identik kalau tidak).
// - Brand: BELUM ADA skema/daftar merek di modul mana pun sebelumnya —
//   field & daftar keyword BARU sesi ini (bukan duplikasi data yang
//   sudah ada), dicocokkan case-insensitive dari daftar keyword merek
//   sparepart yang UMUM dipakai di Indonesia (OEM pabrikan & aftermarket
//   populer). Heuristik keyword-match sederhana, BUKAN NLP/AI baru.
// - Nama Part: BELUM ADA ekstraksi otomatis sebelumnya (Tahap 3 cuma
//   ekstrak oemCode/barcode) — heuristik BARU sesi ini: pilih baris teks
//   TERPANJANG yang bukan angka murni & bukan persis sama dengan token
//   OEM Code/Barcode yang sudah kedeteksi. Pola serupa semangat
//   firstLine()/guessTransferNameFromText() di scan-ocr.js (pilih baris
//   paling deskriptif, skip baris noise/angka), diaplikasikan ke "baris
//   terpanjang" krn nama part di label kemasan biasanya baris paling
//   deskriptif, tidak selalu baris pertama.
// - SENGAJA TIDAK dikerjakan (di luar cakupan): panggil
//   VehicleCatalog.create()/findByCode()/handleOcrLabel() (BELUM
//   menyimpan data, instruksi eksplisit sesi ini), render/tampilkan hasil
//   parse ke DOM mana pun (BELUM ubah UI, instruksi eksplisit) — kandidat
//   tahap lanjutan (7C-3 dst) setelah parser ini disetujui.
//
// Dependency: VehicleCatalog (vehicle-catalog.js) OPSIONAL, guard typeof
// (reuse parseLabelText() kalau ada). TIDAK bergantung ke SparepartOcr
// (sparepart-ocr.js) — modul ini murni terima STRING teks apa pun,
// bisa dipanggil dari SparepartOcr.scan() atau sumber teks OCR lain.

// ------------------------------------------------------------------------
// Daftar keyword merek sparepart — BARU sesi ini (belum ada di skema
// manapun sebelumnya). Dikelompokkan per kategori supaya gampang
// ditambah/diaudit tahap berikutnya; heuristik keyword-match sederhana,
// urutan array = prioritas match kalau lebih dari 1 kandidat cocok.
// ------------------------------------------------------------------------
const SPAREPART_BRAND_KEYWORDS = [
  // OEM pabrikan kendaraan
  'Honda Genuine Parts', 'AHM', 'Yamaha Genuine Parts', 'YGP',
  'Suzuki Genuine Parts', 'SGP', 'Kawasaki Genuine Parts', 'TVS',
  // Aftermarket populer Indonesia
  'Aspira', 'Federal Parts', 'FDR', 'Indoparts', 'Mataharimotor',
  'Astra Otoparts', 'RCB', 'TDR', 'Daytona', 'KTC', 'Nankai',
  // Komponen kelistrikan/pengapian/rem/suspensi
  'NGK', 'Denso', 'Bosch', 'Nissin', 'Akebono', 'GS Astra', 'Yuasa',
  'Showa', 'Kayaba', 'KYB',
  // Pelumas
  'Motul', 'Shell', 'Castrol', 'Top 1', 'Enduro', 'AHM Oil', 'Federal Oil',
  // Ban
  'IRC', 'Corsa', 'FDR Tire', 'Swallow',
];

// ------------------------------------------------------------------------
// OEM Code & Barcode — reuse VehicleCatalog.parseLabelText() kalau ada
// (guard typeof), fallback regex IDENTIK kalau belum dimuat.
// ------------------------------------------------------------------------
function sparepartOcrParseCodes(text) {
  if (typeof VehicleCatalog !== 'undefined' && VehicleCatalog && typeof VehicleCatalog.parseLabelText === 'function') {
    const parsed = VehicleCatalog.parseLabelText(text) || {};
    return { oemCode: parsed.oemCode || '', barcode: parsed.barcode || '' };
  }
  const raw = (text || '').toString();
  const barcodeMatch = raw.match(/\b\d{8,14}\b/);
  // OEM code: token campuran huruf+angka (opsional dash), panjang 5-30,
  // WAJIB ada huruf & angka — regex IDENTIK vehicleCatalogParseLabelText().
  const oemMatch = raw.match(/\b(?=[A-Za-z0-9-]{5,30}\b)(?=[A-Za-z0-9-]*[A-Za-z])(?=[A-Za-z0-9-]*\d)[A-Za-z0-9-]{5,30}\b/);
  return { oemCode: oemMatch ? oemMatch[0] : '', barcode: barcodeMatch ? barcodeMatch[0] : '' };
}

// ------------------------------------------------------------------------
// Brand — keyword-match case-insensitive dari SPAREPART_BRAND_KEYWORDS.
// ------------------------------------------------------------------------
function sparepartOcrParseBrand(text) {
  const raw = (text || '').toString();
  for (let i = 0; i < SPAREPART_BRAND_KEYWORDS.length; i++) {
    const brand = SPAREPART_BRAND_KEYWORDS[i];
    const re = new RegExp('\\b' + brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(raw)) return brand;
  }
  return '';
}

// ------------------------------------------------------------------------
// Nama Part — baris terpanjang yang bukan angka murni & bukan persis sama
// dgn token OEM Code/Barcode yang sudah kedeteksi (exact-match per baris,
// BUKAN exclude-substring, supaya baris "NGK BUSI CB150R IRIDIUM" yang
// SECARA KEBETULAN mengandung kata cocok brand tetap dianggap kandidat
// nama part apa adanya, sesuai bentuk label sungguhan yang sering
// menggabungkan merek+nama dalam 1 baris).
// ------------------------------------------------------------------------
function sparepartOcrParsePartName(text, exclude) {
  const raw = (text || '').toString();
  const excludeSet = new Set((exclude || []).filter(Boolean).map((s) => String(s).toLowerCase()));
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  let best = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\d+$/.test(line)) continue; // angka murni (mis. barcode sendirian di 1 baris)
    if (excludeSet.has(line.toLowerCase())) continue; // persis sama dgn OEM Code/Barcode terdeteksi
    if (line.length < 3) continue;
    if (line.length > best.length) best = line;
  }
  return best;
}

// ------------------------------------------------------------------------
// Orkestrasi utama — 1 STRING teks OCR -> 4 field { oemCode, partName,
// brand, barcode }. TIDAK menyimpan apa pun, TIDAK menyentuh DOM.
// ------------------------------------------------------------------------
function sparepartOcrParseText(text) {
  const raw = (text || '').toString();
  const codes = sparepartOcrParseCodes(raw);
  const brand = sparepartOcrParseBrand(raw);
  const partName = sparepartOcrParsePartName(raw, [codes.oemCode, codes.barcode]);
  return {
    oemCode: codes.oemCode,
    partName,
    brand,
    barcode: codes.barcode,
  };
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama persis SparepartOcr/SparepartScanner (const
// object, expose eksplisit ke window krn Node vm & browser non-module
// script TIDAK otomatis menempelkan binding const/let ke global object).
// ------------------------------------------------------------------------
const SparepartOcrParser = {
  parseText: sparepartOcrParseText,
  parseCodes: sparepartOcrParseCodes,
  parseBrand: sparepartOcrParseBrand,
  parsePartName: sparepartOcrParsePartName,
  BRAND_KEYWORDS: SPAREPART_BRAND_KEYWORDS.slice(),
};

if (typeof window !== 'undefined') {
  window.SparepartOcrParser = SparepartOcrParser;
}
