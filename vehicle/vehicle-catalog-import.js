// vehicle-catalog-import.js — Tahap 5: Import Katalog (PDF -> OCR -> Parser
// -> Preview -> Import), logic murni (parsing/orchestration), TIDAK
// menyentuh DOM. Lanjutan dari ACR-001/Vehicle Catalog, mengikuti Project
// Decision sesi ini.
//
// KEPUTUSAN PRODUK SESI INI (dipakai tanpa klarifikasi ulang lagi, sama
// pola dgn keputusan library ZXing di vehicle-scanner.js Tahap 2):
// - Library baca PDF: pdf.js (pdfjs-dist), CDN jsDelivr + lazy-load via
//   _loadScriptOnce() (pola sama existing) — dibutuhkan karena repo ini
//   belum pernah baca file PDF sama sekali sebelumnya (audit: tidak ada
//   pdf.js/PDFLib di manapun), jadi ini keputusan teknis wajib supaya
//   "PDF -> OCR" bisa jalan, bukan keputusan produk baru di luar cakupan
//   yang sudah ditetapkan (TAHAP 5 sudah eksplisit menyebut "PDF").
// - Alur baca per halaman: coba text layer NATIF pdf.js dulu
//   (`page.getTextContent()` — akurat & cepat untuk PDF katalog hasil
//   export/cetak digital). Kalau teks yang didapat suatu halaman kosong/
//   terlalu pendek (indikasi halaman hasil SCAN/gambar, bukan teks asli),
//   BARU fallback render halaman ke <canvas> lalu OCR pakai
//   `ocrRecognize()` yang SUDAH ADA (Tesseract, scan-ocr.js) — TIDAK ada
//   OCR engine baru, reuse penuh, konsisten dgn "Reuse OCR engine yang
//   SUDAH ADA" di Tahap 3 (handleOcrLabel).
// - Parser: 1 baris teks = 1 kandidat part. Regex OEM code & barcode REUSE
//   `VehicleCatalog.parseLabelText()` yang SUDAH ADA (guard typeof, pola
//   adapter tipis sama seperti modul lain) per baris, ditambah 1 regex
//   baru khusus harga (`Rp`/angka ribuan) karena baris katalog biasanya
//   "Nama Part ... Rp50.000" — kebutuhan yang belum ada sebelumnya karena
//   Tahap 3 (label kemasan) fokus ke 1 kode per foto, bukan tabel katalog.
// - Preview WAJIB sebelum import (Tahap 5: "Jangan langsung mengubah
//   database tanpa preview dan konfirmasi pengguna") — file ini hanya
//   menyiapkan array baris hasil parse (bukan langsung create()); commit
//   ke database ada di importCatalogRows(rows), dipanggil UI HANYA
//   setelah user mengonfirmasi baris mana yang dicentang (lihat
//   vehicle-catalog-import-ui.js).

const VEHICLE_IMPORT_PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const VEHICLE_IMPORT_PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

async function ensurePdfJs() {
  await _loadScriptOnce(VEHICLE_IMPORT_PDFJS_URL);
  if (typeof pdfjsLib !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = VEHICLE_IMPORT_PDFJS_WORKER_URL;
  }
}

// Render 1 halaman PDF ke Blob JPEG (via <canvas>), dipakai HANYA sebagai
// fallback OCR utk halaman yang tidak punya text layer (hasil scan/gambar).
function _vehicleImportRenderPageToBlob(page) {
  return new Promise((resolve, reject) => {
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    page.render({ canvasContext: ctx, viewport }).promise
      .then(() => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Gagal render halaman PDF'))), 'image/jpeg', 0.9))
      .catch(reject);
  });
}

/** extractPdfText(file) — baca SEMUA halaman PDF, gabung jadi 1 string teks
 * (dipisah newline per baris/item). Text layer natif diutamakan; fallback
 * OCR per halaman kalau text layer kosong/terlalu pendek (<10 karakter). */
async function vehicleImportExtractPdfText(file) {
  await ensurePdfJs();
  if (!file || !file.size) {
    throw new Error('File PDF kosong atau tidak terbaca.');
  }
  const buf = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  } catch (err) {
    throw new Error('File PDF rusak atau tidak valid, coba file lain.');
  }
  if (!pdf || !pdf.numPages) {
    return '';
  }
  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const nativeText = content.items.map((it) => it.str).join('\n').trim();
    if (nativeText.length >= 10) {
      pageTexts.push(nativeText);
      continue;
    }
    // Fallback OCR — reuse ocrRecognize() (Tesseract) yang SUDAH ADA,
    // guard typeof supaya tetap aman kalau scan-ocr.js belum termuat.
    if (typeof ocrRecognize === 'function') {
      try {
        const blob = await _vehicleImportRenderPageToBlob(page);
        const ocrResult = await ocrRecognize(blob);
        const ocrText = (ocrResult && ocrResult.data && ocrResult.data.text) ? ocrResult.data.text.trim() : '';
        if (ocrText) pageTexts.push(ocrText);
      } catch (err) {
        console.warn('[VehicleCatalogImport] OCR halaman ' + i + ' gagal, dilewati:', err);
      }
    }
  }
  return pageTexts.join('\n');
}

// Toleransi typo OCR (laporan user: modul ini juga dipakai jalur OCR utk
// halaman PDF hasil SCAN gambar — lihat vehicleImportExtractPdfText() di
// atas — Tesseract sering salah baca digit yang bentuknya mirip huruf:
// "0"->"O", "1"->"I"/"l"). HANYA dipakai pada substring yang SUDAH
// terbukti berada di posisi yang secara pola HARUS angka (kode kategori
// setelah huruf kategori, nilai harga setelah "Rp"/sebelum "rb") — TIDAK
// pernah diterapkan ke nama part/oemCode supaya huruf O/I/l yang memang
// asli (mis. "OIL", "INJECTOR") tidak ikut rusak jadi angka.
function _vehicleImportFixOcrDigits(s) {
  return (s || '').replace(/[oil]/gi, (ch) => (ch.toUpperCase() === 'O' ? '0' : '1'));
}

// Harga: "Rp50.000" / "Rp 50000" / "50rb" / "50 ribu" — WAJIB ada penanda
// eksplisit (Rp/rb/ribu). Versi sebelumnya punya fallback "angka berdiri
// sendiri terakhir di baris" tanpa penanda apa pun — di data katalog PDF
// sungguhan ini terbukti SALAH TANGKAP fragmen kode part (mis. "12310"
// dari "12310-KZR-600" ikut kebaca sebagai harga, karena "-" dianggap
// batas kata oleh regex). Fallback itu dibuang; tanpa "Rp"/"rb"/"ribu"
// eksplisit, baris dianggap TIDAK punya harga (price: null) — lebih baik
// kosong daripada harga palsu. Kelas karakter digit di bawah ini
// menerima juga O/I/l (typo OCR umum, lihat _vehicleImportFixOcrDigits
// di atas) supaya "Rp 87.OOO" (hasil scan) tetap kebaca sbg 87000.
const VEHICLE_IMPORT_PRICE_RE = /Rp\.?\s?([\dOIl.,]{3,})|(\d[\dOIl.,]{1,})\s?(rb|ribu)\b/i;

function _vehicleImportParsePrice(line) {
  const m = line.match(VEHICLE_IMPORT_PRICE_RE);
  if (!m) return null;
  if (m[3]) { // "50rb"/"50 ribu"
    const num = parseFloat(_vehicleImportFixOcrDigits(m[2]).replace(/[.,]/g, ''));
    return isNaN(num) ? null : num * 1000;
  }
  const raw = m[1];
  if (!raw) return null;
  const num = parseInt(_vehicleImportFixOcrDigits(raw).replace(/[.,]/g, ''), 10);
  return isNaN(num) ? null : num;
}

// FALLBACK harga angka POLOS tanpa penanda "Rp"/"rb" (laporan user: banyak
// PDF katalog dealer nyata nampilkan kolom harga sbg angka biasa saja,
// mis. tabel "Kode Part | Nama Part | Harga" -> "12310-KZR-600 KNALPOT
// ASSY 185.000", TANPA "Rp" sama sekali). HANYA dipakai kalau
// VEHICLE_IMPORT_PRICE_RE di atas TIDAK ketemu apa pun (lihat pemanggil di
// parseCatalogRow()), supaya tidak menimpa harga yang sudah eksplisit &
// akurat. Beda dgn fallback lama yang DIBUANG (komentar di atas
// VEHICLE_IMPORT_PRICE_RE) krn pakai \b (batas kata) yang salah tangkap
// fragmen kode part spt "12310" dari "12310-KZR-600" (krn "-" dianggap
// batas kata oleh \b) -- regex ini pakai batas SPASI eksplisit (bukan \b),
// jadi angka yang menempel ke tanda "-" (bagian dari kode part) TIDAK
// ketangkap sama sekali (harus benar-benar token angka berdiri sendiri,
// dipisah spasi/tab/awal-akhir baris). Kandidat: token angka 4-9 digit
// polos, ATAU angka berformat ribuan (mis. "45.000"/"45,000"). Kalau ada
// beberapa kandidat dalam 1 baris (mis. kolom qty+harga), ambil yang
// PALING KANAN -- pola tabel katalog nyata biasanya menaruh harga di
// kolom paling akhir.
const VEHICLE_IMPORT_PRICE_PLAIN_RE = /(?:^|\s)(\d{1,3}(?:[.,]\d{3})+|\d{4,9})(?=\s|$)/g;

function _vehicleImportParsePricePlain(line, excludeTokens) {
  const raw = (line || '').toString();
  const exclude = new Set((excludeTokens || []).filter(Boolean).map((s) => String(s)));
  let best = null;
  let m;
  VEHICLE_IMPORT_PRICE_PLAIN_RE.lastIndex = 0;
  while ((m = VEHICLE_IMPORT_PRICE_PLAIN_RE.exec(raw))) {
    const token = m[1];
    if (exclude.has(token)) continue; // sama persis dgn oemCode/barcode terdeteksi -> bukan harga
    const num = parseInt(token.replace(/[.,]/g, ''), 10);
    if (isNaN(num) || num < 500) continue; // di bawah 500 dianggap bukan harga wajar (kemungkinan qty/nomor lain)
    best = num; // simpan kandidat PALING KANAN (loop maju, selalu ditimpa yg lebih akhir)
  }
  return best;
}

// Toleransi spasi nyempil (laporan user: hasil ekstraksi PDF kadang
// nyisipin spasi ganjil di sekitar "-", mis. "E- 2" / "E -2") DAN typo
// OCR di segmen angkanya (mis. "E-O" hasil scan salah baca "0" jadi
// "O") — pola digit di sini pakai [\dOoIil] (lihat _vehicleImportFixOcrDigits
// di atas), bukan cuma \d, supaya kode kategori hasil OCR tetap
// terdeteksi. Grup 1 = huruf kategori, grup 2/3 = segmen angka mentah
// (BELUM dinormalisasi, dinormalisasi di _vehicleImportExtractCategory).
const VEHICLE_IMPORT_CATEGORY_CODE_RE = /^([A-Z]{1,3})\s*-\s*([\dOoIil]{1,3})(?:\s*-\s*([\dOoIil]{1,3}))?\s+/;

// Token kode part (SAMA PERSIS pola oemMatch di VehicleCatalog.parseLabelText(),
// disalin di sini murni utk cari BATAS AKHIR nama kategori -- lihat pola
// duplikasi yang sama di tests/vehicle-catalog-import.test.js) -- dipakai
// untuk menemukan di mana kode part mulai supaya teks SEBELUM itu (setelah
// kode kategori) bisa diambil sbg nama kategori, tanpa perlu VehicleCatalog.
const VEHICLE_IMPORT_CODE_TOKEN_RE = /\b\d{8,14}\b|\b(?=[A-Za-z0-9-]{5,30}\b)(?=[A-Za-z0-9-]*[A-Za-z])(?=[A-Za-z0-9-]*\d)[A-Za-z0-9-]{5,30}\b/;

/** _extractCategory(raw) — kalau baris DIAWALI kode kategori (mis. "E-2 ")
 * DAN ada kode part yang terdeteksi setelahnya, kategori = teks antara kode
 * kategori & kode part tsb (mis. "E-2 Cylinder Head Cover"), `rest` = sisa
 * baris MULAI dari kode part (kategori & prefiksnya dibuang, tidak boleh
 * ikut kepentok jadi bagian partName). Tidak match/tidak ada kode part
 * setelahnya -> category:'', rest: raw apa adanya (aman, tidak mengubah
 * baris yang bukan format ini). */
function _vehicleImportExtractCategory(raw) {
  const prefixMatch = raw.match(VEHICLE_IMPORT_CATEGORY_CODE_RE);
  if (!prefixMatch) return { category: '', rest: raw };
  // Kode kategori dibangun ulang dari grup tangkapan (bukan prefixMatch[0]
  // apa adanya) supaya spasi nyempil ("E- 2") dirapikan & digit typo OCR
  // ("E-O") dikoreksi jadi bentuk baku "E-2" pada `category` yang tampil.
  const normalizedCode = prefixMatch[1] + '-' + _vehicleImportFixOcrDigits(prefixMatch[2]) +
    (prefixMatch[3] ? '-' + _vehicleImportFixOcrDigits(prefixMatch[3]) : '');
  const afterPrefix = raw.slice(prefixMatch[0].length);
  const codeMatch = afterPrefix.match(VEHICLE_IMPORT_CODE_TOKEN_RE);
  if (!codeMatch) return { category: '', rest: raw };
  const category = (normalizedCode + ' ' + afterPrefix.slice(0, codeMatch.index)).replace(/\s{2,}/g, ' ').trim();
  return { category, rest: afterPrefix.slice(codeMatch.index) };
}

/** _isCategoryOnlyLine(raw) — true kalau baris HANYA nama kategori tanpa
 * kode/harga sama sekali -- indikasi nama kategori kepanjangan & terpotong
 * ganti-baris oleh PDF (mis. "E-19-10 Right Crank Case" sendirian, lanjutan
 * "Cover ..." nya ada di baris SESUDAHNYA). Dipakai stitch di bawah. */
function _vehicleImportIsCategoryOnlyLine(raw) {
  if (!VEHICLE_IMPORT_CATEGORY_CODE_RE.test(raw)) return false;
  const { category } = _vehicleImportExtractCategory(raw);
  return !category; // kode kategori doang, TIDAK ketemu kode part setelahnya -> nama kategori kepotong ganti-baris
}

/** _stitchOrphanCategoryRows(lines) — pass tambahan SEBELUM stitch kode
 * yatim (beda kasus, lihat _stitchOrphanCodeRows di bawah): baris nama
 * kategori yang kepotong ganti-baris digabung MURNI TEKSTUAL dgn baris-
 * baris sesudahnya SAMPAI kode part-nya ketemu (lookahead bertahap, pola
 * sama seperti _stitchOrphanCodeRows) — bukan cuma 1 baris tetap seperti
 * versi awal. BUGFIX (ditemukan lewat regresi file PDF katalog LENGKAP
 * sungguhan): versi awal cuma coba gabung dgn PERSIS 1 baris sesudahnya,
 * cukup utk kasus "E-19-10 Right Crank Case" + "Cover 1110BKZR600 ... Rp
 * 564.500" (lanjutan nama+kode+nama part+harga semua nempel di 1 baris
 * itu). Tapi di ekstraksi PDF penuh, ada kasus nama kategori kepanjangan
 * WRAP LEBIH dari 1 baris SEBELUM kode part-nya muncul (mis. "E-22
 * Throttle Body/Fuel" / "Injector" / "16016KVBS51" masing2 baris sendiri)
 * — lookahead 1 baris gagal nemuin kode di situ, kategori jadi kosong &
 * baris lanjutan nyasar dikira part baru tanpa kategori (carry-forward ke
 * kategori LAMA yang salah). Sekarang nambah baris SATU-SATU ke gabungan
 * sampai kode part ketemu (sama logika _vehicleImportExtractCategory yang
 * sudah ada) atau batas lookahead abis. */
const VEHICLE_IMPORT_CATEGORY_STITCH_MAX_LOOKAHEAD = 3;

function _vehicleImportStitchOrphanCategoryRows(lines) {
  const list = Array.isArray(lines) ? lines : [];
  const out = [];
  let i = 0;
  while (i < list.length) {
    const line = (list[i] || '').toString().trim();
    if (_vehicleImportIsCategoryOnlyLine(line) && i + 1 < list.length) {
      let merged = line;
      let consumed = 0;
      const maxLook = Math.min(VEHICLE_IMPORT_CATEGORY_STITCH_MAX_LOOKAHEAD, list.length - i - 1);
      for (let look = 1; look <= maxLook; look++) {
        merged = merged + ' ' + (list[i + look] || '').toString().trim();
        consumed = look;
        if (_vehicleImportExtractCategory(merged).category) break; // kode part ketemu -> nama kategori sudah lengkap, stop
      }
      out.push(merged);
      i += consumed + 1;
      continue;
    }
    out.push(list[i]);
    i++;
  }
  return out;
}

/** parseCatalogRow(line) — 1 baris teks -> 1 kandidat part { partName,
 * oemCode, barcode, price, category, raw }. Reuse VehicleCatalog.parseLabelText()
 * (guard typeof) utk OEM/barcode, regex baru di atas khusus harga. Nama
 * part = baris asli dikurangi token kode & harga yang sudah ditangkap.
 * `category` diambil dari kolom "Kategori" kalau baris diawali kode
 * kategori (lihat _extractCategory di atas), kosong kalau tidak ada. */
function vehicleImportParseCatalogRow(line) {
  const rawFull = (line || '').toString().trim();
  const { category, rest } = _vehicleImportExtractCategory(rawFull);
  const raw = category ? rest.trim() : rawFull;
  const result = { partName: '', oemCode: '', barcode: '', price: null, category, raw: rawFull };
  if (!raw) return result;
  if (typeof VehicleCatalog !== 'undefined' && VehicleCatalog && typeof VehicleCatalog.parseLabelText === 'function') {
    const parsed = VehicleCatalog.parseLabelText(raw);
    result.oemCode = parsed.oemCode || '';
    result.barcode = parsed.barcode || '';
  }
  result.price = _vehicleImportParsePrice(raw);
  let name = raw;
  if (result.oemCode) name = name.replace(result.oemCode, '');
  if (result.barcode && result.barcode !== result.oemCode) name = name.replace(result.barcode, '');
  const priceMatch = raw.match(VEHICLE_IMPORT_PRICE_RE);
  if (priceMatch) {
    name = name.replace(priceMatch[0], '');
  } else {
    // Tidak ada "Rp"/"rb" eksplisit -> coba fallback angka polos (lihat
    // catatan VEHICLE_IMPORT_PRICE_PLAIN_RE di atas), dicoba SETELAH
    // oemCode/barcode dibuang dari `name` supaya token yang tersisa tidak
    // kebetulan bagian dari oemCode/barcode itu sendiri.
    const plainPrice = _vehicleImportParsePricePlain(name, [result.oemCode, result.barcode]);
    if (plainPrice != null) {
      result.price = plainPrice;
      // Cari & buang token PALING KANAN yg cocok dgn plainPrice (loop
      // ulang match krn regex global bisa punya >1 kandidat per baris).
      VEHICLE_IMPORT_PRICE_PLAIN_RE.lastIndex = 0;
      let m; let lastFull = '';
      while ((m = VEHICLE_IMPORT_PRICE_PLAIN_RE.exec(name))) {
        const num = parseInt(m[1].replace(/[.,]/g, ''), 10);
        if (num === plainPrice) lastFull = m[0];
      }
      if (lastFull) name = name.replace(lastFull, ' ');
    }
  }
  result.partName = name.replace(/[\t|;,-]+$/g, '').replace(/\s{2,}/g, ' ').trim();
  return result;
}

// BUGFIX (laporan user, PDF katalog Honda Cengkareng): baris tepat di
// batas ganti-halaman PDF suka kebelah dua (atau lebih) oleh pdf.js text
// layer -- kode part nyangkut sendirian di 1 "baris" (item teks), nama
// dan/atau harga part yang SAMA malah nongol di baris-baris SESUDAHNYA
// (bukan baris yang salah, cuma kepisah). Karena parseCatalogRow() lama
// cuma baca 1 baris berdiri sendiri, baris kode yatim begini selalu
// berakhir partName='' & price null walau datanya lengkap beberapa baris
// di bawahnya. _isOrphanCodeRow() + _stitchOrphanCodeRows() di bawah
// menambal ini dengan cara MURNI tekstual (gabung baris yatim + baris-
// baris sesudahnya, lalu parse ulang gabungannya) -- TIDAK mengubah
// parseCatalogRow()/regex kode-harga yang sudah ada, dan TIDAK menyentuh
// baris yang bukan kasus ini.
//
// BUGFIX LANJUTAN (ditemukan lewat pengecekan ulang, sesi ini): fix
// sebelumnya cuma lookahead 1 baris (kode + SATU baris berikutnya). Di
// sebagian PDF, tabelnya kepisah lebih jauh lagi -- kode, nama, DAN harga
// masing-masing jadi baris sendiri-sendiri (3 baris terpisah, bukan 2).
// Lookahead 1 baris cuma berhasil menangkap "kode+nama" (baris nama ikut
// tergabung), tapi baris harga yang menyusul SETELAHNYA sudah kepakai
// jadi baris-berdiri-sendiri berikutnya (tidak ikut tergabung) --
// hasilnya partName ketemu tapi price tetap null/hilang. Diganti jadi
// lookahead BERTAHAP sampai `VEHICLE_IMPORT_STITCH_MAX_LOOKAHEAD` baris
// ke depan: tiap baris ditambahkan satu-satu ke gabungan, berhenti lebih
// awal begitu gabungan sudah lengkap (ada partName DAN price), supaya
// tidak menelan baris lebih banyak dari yang perlu. Guard "baris
// berikutnya part lain (py kode sendiri di awal baris)" dari fix lama
// tetap dipakai apa adanya di SETIAP langkah lookahead, jadi begitu
// ketemu baris yang ternyata kode part baru, lookahead langsung berhenti
// (tidak ikut menelan part berikutnya) -- itulah "batas aman"-nya.
const VEHICLE_IMPORT_STITCH_MAX_LOOKAHEAD = 3;

/** _isOrphanCodeRow(row) — true kalau row HANYA berhasil menangkap kode
 * (oemCode/barcode), tapi partName kosong DAN price tidak ketemu —
 * indikasi baris ini cuma pecahan kode part, bukan part utuh. */
function _vehicleImportIsOrphanCodeRow(row) {
  return !!row && !!(row.oemCode || row.barcode) && !row.partName && row.price == null;
}

/** _stitchOrphanCodeRows(lines) — pass tambahan SEBELUM parse-per-baris
 * biasa: jalan maju per baris mentah (bukan hasil parse), kalau baris ke-i
 * ternyata baris kode yatim (lihat _isOrphanCodeRow di atas), coba gabung
 * dgn baris-baris SESUDAHNYA satu per satu (maksimal
 * `VEHICLE_IMPORT_STITCH_MAX_LOOKAHEAD` baris ke depan — batas aman
 * supaya tidak diam-diam menelan baris part lain yang tidak berhubungan).
 * Berhenti lookahead lebih awal begitu gabungan sudah LENGKAP (partName
 * DAN price sudah ketemu) — menangani baik kasus 2 baris (kode+nama&harga
 * jadi satu baris) MAUPUN kasus 3 baris (kode, nama, harga masing-masing
 * baris sendiri). Baris berikutnya yang ternyata kode part BARU (kode
 * persis di awal baris situ) langsung menghentikan lookahead (guard sama
 * seperti fix sebelumnya, supaya token kode yg nyempil di tengah nama —
 * mis. "10X16" dari "DOWEL,PIN,10X16" — tetap dianggap lanjutan nama,
 * bukan part baru). Kalau sampai batas lookahead gabungan tetap TIDAK ada
 * peningkatan sama sekali (partName tetap kosong & price tetap null),
 * batalkan penggabungan (fallback ke baris asli apa adanya). Return array
 * baris teks baru (baris yatim sudah tergabung, baris yg dipakai utk
 * menggabung dihapus dari daftar) — murni transformasi teks, TIDAK
 * memanggil parseCatalogRow() di luar keperluan pengecekan ini sendiri. */
function _vehicleImportStitchOrphanCodeRows(lines) {
  const list = Array.isArray(lines) ? lines : [];
  const stitched = [];
  let i = 0;
  while (i < list.length) {
    const line = list[i];
    const row = vehicleImportParseCatalogRow(line);
    if (_vehicleImportIsOrphanCodeRow(row)) {
      let merged = (line || '').toString().trim();
      let bestMerged = null; // gabungan terbaik yg TERBUKTI ada peningkatan (partName atau price), fallback kalau tidak sampai lengkap penuh
      let bestConsumed = 0;
      const maxLook = Math.min(VEHICLE_IMPORT_STITCH_MAX_LOOKAHEAD, list.length - i - 1);
      for (let look = 1; look <= maxLook; look++) {
        const nextLine = list[i + look];
        const nextTrimmed = (nextLine || '').toString().trim();
        const nextRow = vehicleImportParseCatalogRow(nextLine);
        // Guard sama persis dgn fix lama: kode yg BENERAN menandai part
        // baru selalu ada di AWAL baris (posisi kolom Kode Part) -- kode
        // yg nyempil di tengah/akhir (salah-tangkap token ukuran/model
        // oleh regex) tetap dianggap lanjutan nama & boleh digabung.
        const nextCode = nextRow.oemCode || nextRow.barcode;
        const nextHasOwnCode = !!nextCode && nextTrimmed.indexOf(nextCode) === 0;
        // BUGFIX (regresi PDF penuh): baris kategori BARU (mis. "E-3
        // Cylinder Head" berdiri sendiri, blm ketemu kode part-nya sendiri)
        // TIDAK punya kode -> lolos dari guard nextHasOwnCode di atas &
        // ikut tertelan sbg "lanjutan nama part" yg salah. Baris kategori
        // selalu menandai part BARU juga, jadi diberi guard sendiri di sini.
        const nextIsCategoryStart = VEHICLE_IMPORT_CATEGORY_CODE_RE.test(nextTrimmed);
        if (nextHasOwnCode || nextIsCategoryStart) break; // baris berikutnya part lain -> stop, jangan ditelan
        merged = merged + ' ' + nextTrimmed;
        const mergedRow = vehicleImportParseCatalogRow(merged);
        if (mergedRow.partName || mergedRow.price != null) {
          bestMerged = merged;
          bestConsumed = look;
        }
        if (mergedRow.partName && mergedRow.price != null) break; // sudah lengkap, tidak perlu nambah baris lagi
      }
      if (bestMerged) {
        stitched.push(bestMerged);
        i += bestConsumed + 1; // semua baris yg ikut tergabung dilewati, jangan diproses lagi sendirian
        continue;
      }
    }
    stitched.push(line);
    i++;
  }
  return stitched;
}

/** _stripNoiseLines(lines) — BUGFIX (ditemukan lewat regresi file PDF
 * katalog LENGKAP sungguhan, bukan cuma potongan 2-4 baris seperti test
 * lama — lihat fixture tests/fixtures/): 2 masalah baru yang muncul HANYA
 * di ekstraksi PDF penuh (banyak halaman), tidak pernah kelihatan di
 * potongan pendek:
 * 1. Ekstraksi teks PDF nyata sering taruh SETIAP sel tabel di baris
 *    sendiri-sendiri, DIPISAH BARIS KOSONG di antaranya (kategori,
 *    kode, nama, harga masing-masing + 1 baris kosong). Baris kosong
 *    ini merusak asumsi "lookahead ke baris SEGERA sesudahnya" di kedua
 *    fungsi stitch di atas (baris kosong ikut tertelan sbg 1 langkah
 *    lookahead, sisa kolom aslinya jadi tidak sempat tergabung).
 * 2. Header tabel ("Kategori"/"Kode Part"/"Nama Part"/"Harga") TERULANG
 *    di setiap pergantian halaman (bukan cuma sekali di awal dokumen) —
 *    baris header nyempil ini bisa ikut kepenggal ke tengah grup kategori
 *    yang sedang di-lookahead, salah dianggap bagian nama part.
 * Baris kosong & header berulang dibuang SEBELUM proses stitch apa pun
 * (bukan cuma di akhir), supaya baris konten asli yang sebelum/sesudahnya
 * jadi bertetangga langsung lagi seperti kasus 2-4 baris yang sudah
 * teruji. Judul/sumber dokumen (muncul 1x di awal, bukan noise berulang)
 * ikut dibuang di sini juga supaya tidak nyangkut jadi 1 "part" palsu.
 */
const VEHICLE_IMPORT_NOISE_LINE_RE = /^(Kategori|Kode Part|Nama Part|Harga)$/i;
const VEHICLE_IMPORT_TITLE_LINE_RE = /^(Katalog Suku Cadang|Kategori Mesin|Sumber:)/i;

function _vehicleImportStripNoiseLines(lines) {
  const list = Array.isArray(lines) ? lines : [];
  return list.filter((l) => {
    const t = (l || '').toString().trim();
    if (!t) return false;
    if (VEHICLE_IMPORT_NOISE_LINE_RE.test(t)) return false;
    if (VEHICLE_IMPORT_TITLE_LINE_RE.test(t)) return false;
    return true;
  });
}

/** parseCatalogRows(text) — pecah per baris (\n), STITCH DULU baris kode
 * yatim akibat page-break (lihat catatan BUGFIX di atas), baru parse tiap
 * baris, buang baris yang sama sekali tidak menghasilkan apa pun (tidak
 * ada nama/kode/harga) — baris kosong/header murni tidak masuk daftar
 * kandidat. TIDAK menyentuh store — murni logic, sama pola
 * vehicleCatalogParseLabelText(). */
function vehicleImportParseCatalogRows(text) {
  const rawLines = _vehicleImportStripNoiseLines((text || '').toString().split('\n'));
  const categoryStitched = _vehicleImportStitchOrphanCategoryRows(rawLines);
  const lines = _vehicleImportStitchOrphanCodeRows(categoryStitched);
  const rows = [];
  let lastCategory = '';
  for (const line of lines) {
    const row = vehicleImportParseCatalogRow(line);
    if (row.category) lastCategory = row.category;
    else if (lastCategory && (row.partName || row.oemCode || row.barcode)) row.category = lastCategory;
    if (row.partName || row.oemCode || row.barcode) rows.push(row);
  }
  return rows;
}

/** importCatalogRows(rows) — commit HANYA baris yang dikirim (pemanggil/UI
 * bertanggung jawab hanya mengirim baris yang sudah dicentang user setelah
 * preview, sesuai Tahap 5: "Jangan langsung mengubah database tanpa
 * preview dan konfirmasi pengguna"). Reuse VehicleCatalog.create() apa
 * adanya per baris (0 validasi/skema baru); baris yang partName-nya kosong
 * dilewati (create() akan menolaknya lewat validate() yang sudah ada).
 * Return ringkasan { imported, skipped, errors } supaya UI bisa kasih
 * toast ringkasan hasil, bukan silent. */
function _vehicleImportSafeCategory(category) {
  const trimmed = (category && String(category).trim()) || '';
  if (!trimmed) return 'Belum Dikategorikan';
  return trimmed.length > 50 ? trimmed.slice(0, 50).trim() : trimmed;
}

// PERUBAHAN sesi ini (fitur "Push ke Stok Sparepart" pasca-import, lihat
// vehicle-catalog-import-stock-push.js): tambah field `createdItems` di
// summary return — array item VehicleCatalog yang BENAR-BENAR berhasil
// dibuat (`res.item` dari VehicleCatalog.create(), Tahap Milestone 0)
// sesi commit ini. Additive murni: field lama (`imported`/`skipped`/
// `duplicates`/`errors`) TIDAK berubah bentuk/nilai, jadi TIDAK
// mempengaruhi pemanggil lama (vehicle-catalog-web-import.js dst) yang
// belum baca field baru ini. Tujuannya supaya UI pasca-commit (Import
// Katalog PDF) bisa langsung tawarkan push ke Stok Sparepart TANPA query
// ulang VehicleCatalog (part yang baru dibuat sudah di tangan).
async function vehicleImportCommitRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let imported = 0;
  let skipped = 0;
  let duplicates = 0;
  const errors = [];
  const createdItems = [];
  for (const row of list) {
    if (!row || !row.partName) { skipped++; continue; }
    const code = row.oemCode || row.barcode;
    if (code && typeof VehicleCatalog !== 'undefined' && VehicleCatalog && typeof VehicleCatalog.findByCode === 'function') {
      const existing = await VehicleCatalog.findByCode(code);
      if (existing) { duplicates++; skipped++; continue; }
    }
    const data = {
      partName: row.partName,
      oemCode: row.oemCode || '',
      barcode: row.barcode || '',
      price: (typeof row.price === 'number' && !isNaN(row.price)) ? row.price : undefined,
      category: _vehicleImportSafeCategory(row.category),
    };
    if (typeof VehicleCatalog !== 'undefined' && VehicleCatalog && typeof VehicleCatalog.validate === 'function') {
      const check = VehicleCatalog.validate(data);
      if (check && check.valid === false) { skipped++; if (check.errors) errors.push(...check.errors); continue; }
    }
    const res = await VehicleCatalog.create(data);
    if (res && res.success) { imported++; if (res.item) createdItems.push(res.item); }
    else { skipped++; if (res && res.errors) errors.push(...res.errors); }
  }
  return { imported, skipped, duplicates, errors, createdItems };
}

/** filterCompleteRows(rows, opts) — HANYA baris yang punya kode part (OEM
 * code ATAU barcode — baris katalog dgn 1 kode angka murni bisa kedeteksi
 * sbg barcode oleh parseLabelText(), bukan cuma oemCode, jadi tetap
 * dihitung "ada kodepart"). Kode part WAJIB, harga TIDAK — banyak PDF
 * katalog dealer nyata menampilkan harga sbg angka polos tanpa penanda
 * "Rp"/"rb" (lihat komentar VEHICLE_IMPORT_PRICE_RE di atas kenapa
 * fallback angka polos sengaja tidak dipakai lagi, supaya tidak salah
 * tangkap fragmen kode part), jadi mensyaratkan harga valid bikin baris
 * yang kode-nya sudah benar ikut terbuang — harga tetap bisa diisi
 * manual di layar preview (field-nya sudah editable). `opts.requirePrice`
 * (default true, demi backward-compat pemanggil lain mis. web-import)
 * bisa di-set `false` supaya harga jadi opsional — dipakai PDF import
 * (vehicle-catalog-import-ui.js & honda-pdf-import-ui.js) sesuai
 * permintaan user. Fungsi murni, TIDAK mengubah rows asli. */
function vehicleImportFilterCompleteRows(rows, opts) {
  const requirePrice = !opts || opts.requirePrice !== false;
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((r) => {
    if (!r || !(r.oemCode || r.barcode)) return false;
    if (!requirePrice) return true;
    return typeof r.price === 'number' && !isNaN(r.price) && r.price > 0;
  });
}

/** groupRowsByCategory(rows) — kelompokkan baris hasil parse per kategori
 * (saran user: preview yang masih list datar bikin kategori "nyasar"/salah
 * gabung baru ketahuan SETELAH commit; dikelompokkan + ringkasan jumlah
 * kategori, user bisa cek visual DULU sebelum commit). Baris tanpa
 * kategori dikelompokkan di bawah label 'Belum Dikategorikan' (SAMA dgn
 * fallback commitRows()), sengaja diletakkan PALING AKHIR supaya
 * kategori asli dari PDF terlihat dulu. Urutan grup mengikuti urutan
 * KEMUNCULAN PERTAMA di `rows` (bukan alfabet) — mengikuti urutan asli di
 * PDF, memudahkan user membandingkan visual dgn dokumen sumber. Setiap
 * item menyimpan `idx` = index ASLI di array `rows` (bukan index dalam
 * grup) supaya UI tetap bisa panggil toggleRow(idx)/editField(idx,...)
 * yang sudah ada apa adanya, tanpa perlu skema index baru. Fungsi murni,
 * TIDAK menyentuh DOM — dipakai oleh honda-pdf-import-ui.js &
 * vehicle-catalog-import-ui.js utk render preview terkelompok. */
function vehicleImportGroupRowsByCategory(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const FALLBACK = 'Belum Dikategorikan';
  const order = [];
  const map = new Map();
  list.forEach((row, idx) => {
    const key = (row && row.category && String(row.category).trim()) || FALLBACK;
    if (!map.has(key)) { map.set(key, []); order.push(key); }
    map.get(key).push({ row, idx });
  });
  const ordered = order.filter((k) => k !== FALLBACK);
  if (map.has(FALLBACK)) ordered.push(FALLBACK);
  return ordered.map((category) => ({ category, items: map.get(category) }));
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama seperti VehicleCatalog/VehicleScanner.
// ------------------------------------------------------------------------
const VehicleCatalogImport = {
  ensurePdfJs,
  extractPdfText: vehicleImportExtractPdfText,
  parseCatalogRow: vehicleImportParseCatalogRow,
  parseCatalogRows: vehicleImportParseCatalogRows,
  filterCompleteRows: vehicleImportFilterCompleteRows,
  groupRowsByCategory: vehicleImportGroupRowsByCategory,
  commitRows: vehicleImportCommitRows,
  parsePricePlain: _vehicleImportParsePricePlain,
};

if (typeof window !== 'undefined') {
  window.VehicleCatalogImport = VehicleCatalogImport;
}
