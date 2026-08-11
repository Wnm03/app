// vehicle-catalog-web-import.js — Tahap 6: Import Katalog dari URL Web
// (fetch HTML -> Parser -> Preview -> Import), lanjutan dari Tahap 5
// (vehicle-catalog-import.js, PDF -> OCR -> Parser -> Preview -> Import).
// Logic murni (fetch/parsing), TIDAK menyentuh DOM.
//
// KEPUTUSAN PRODUK SESI INI:
// - App ini PWA client-side murni (TIDAK ada backend/server — dicek di
//   README.md, package.json: tidak ada dependency server apa pun). Artinya
//   fetch(url) dari browser ke situs katalog pihak ketiga (mis.
//   hondacengkareng.com) SANGAT MUNGKIN diblokir CORS, karena situs tujuan
//   (WooCommerce) tidak mengirim header Access-Control-Allow-Origin utk
//   origin sembarang. Ini BUKAN bug di sisi kita, tidak bisa "diperbaiki"
//   tanpa proxy server (di luar cakupan — app ini sengaja tanpa server).
// - Strategi: TETAP coba fetch(url) otomatis dulu (siapa tahu situs
//   tujuan kebetulan support CORS, atau nanti ditambah situs lain yang
//   support). Kalau gagal (CORS/network), lempar error dgn code
//   'FETCH_BLOCKED' supaya lapisan UI bisa fallback ke opsi "tempel kode
//   HTML manual" (user tinggal View Source/Ctrl+U di halaman katalog,
//   copy-paste) — parser di bawah ini menerima HTML mentah baik dari
//   fetch() otomatis MAUPUN paste manual, jadi 1 parser dipakai utk kedua
//   jalur (tidak ada logic ganda).
// - Parser TIDAK bergantung ke struktur tag HTML persis (karena beda
//   situs katalog beda markup, & kita tidak bisa uji coba fetch situs
//   nyata dari sandbox tanpa akses network) — sebagai gantinya HTML
//   dinormalisasi jadi baris-baris teks (tag blok -> newline, tag lain
//   dibuang), lalu dicari pola "nama part" -> "kode part" -> "harga"
//   berurutan, sama seperti alur baca manusia. Ini terbukti cocok dgn
//   struktur nyata katalog hondacengkareng.com (dicek isi halamannya):
//   tiap part = [Nama Part] lalu [Kode Part]+"stok ..." lalu harga
//   (kadang "~~Rp lama~~ Rp diskon~~", ambil harga TERAKHIR/final).
// - HANYA baris yang punya kode part DAN harga valid (>0) yang jadi
//   kandidat (sesuai permintaan: "hanya sparepart yg mempunyai kode part
//   dan harga") — baris tanpa salah satunya otomatis tidak diemit,
//   sama semangat dgn filterCompleteRows() di vehicle-catalog-import.js.
// - Reuse penuh VehicleCatalogImport.commitRows() (Tahap 5) apa adanya
//   utk commit ke database — TIDAK duplikasi logic import/dedup/validate.
//   Preview WAJIB sebelum import (kebijakan sama semua tahap import).

// Kode part khas katalog (mis. "12310KZR701", "90463ML7000",
// "957010601400") — alnum murni, mulai dgn digit, panjang 8-15 karakter,
// TIDAK boleh persis sama dgn kata "stok..." dsb (sudah dipisah oleh
// _webImportNormalizeToLines sebelum regex ini jalan).
const VEHICLE_WEB_IMPORT_CODE_RE = /^[0-9][A-Za-z0-9]{7,14}$/;

// Baris yang TIDAK boleh dianggap "nama part" (noise umum: header tabel,
// placeholder gambar, teks tombol/stok) — dicocokkan case-insensitive.
const VEHICLE_WEB_IMPORT_NAME_STOPLIST = new Set([
  'gambar', 'nama part', 'harga', 'order', 'tambah', 'catalog image',
  'loading', '#', 'stok habis',
]);

/** fetchCatalogHtml(url) — coba ambil HTML halaman katalog via fetch()
 * browser. Kalau gagal (CORS/network/HTTP error), lempar Error dgn
 * `.code = 'FETCH_BLOCKED'` supaya UI bisa fallback ke input paste HTML
 * manual (lihat catatan di atas file — app ini tanpa backend/proxy,
 * jadi CORS tidak bisa "diperbaiki" dari sisi kita). */
async function vehicleWebImportFetchHtml(url) {
  const trimmed = (url || '').toString().trim();
  if (!/^https?:\/\/.+/i.test(trimmed)) {
    throw new Error('URL tidak valid — harus diawali http:// atau https://');
  }
  if (typeof fetch !== 'function') {
    const e = new Error('fetch() tidak tersedia di environment ini — tempel HTML halaman secara manual.');
    e.code = 'FETCH_BLOCKED';
    throw e;
  }
  try {
    const res = await fetch(trimmed, { mode: 'cors' });
    if (!res || !res.ok) {
      throw new Error('HTTP ' + (res ? res.status : '?'));
    }
    return await res.text();
  } catch (err) {
    const e = new Error('Gagal mengambil halaman otomatis (kemungkinan diblokir CORS oleh situs tujuan, karena app ini tidak punya server/proxy) — tempel kode HTML halaman secara manual (View Source / Ctrl+U di halaman katalog, lalu copy-paste ke sini).');
    e.code = 'FETCH_BLOCKED';
    e.cause = err;
    throw e;
  }
}

// Ubah HTML mentah jadi array baris teks bersih (1 elemen = 1 "baris"
// dari alur baca dokumen), tag blok (br/tr/td/div/li/p/h1-6) jadi
// pemisah baris, tag lain dibuang, beberapa entity umum didekode, & kode
// part yang nempel tanpa spasi dgn kata "stok" (mis. "12310KZR701stok
// habis") dipisah jadi 2 baris supaya regex kode part di atas match
// bersih (lihat komentar VEHICLE_WEB_IMPORT_CODE_RE).
function _vehicleWebImportNormalizeToLines(html) {
  let text = (html || '').toString();
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<(br|\/tr|\/td|\/div|\/li|\/p|\/h[1-6])\b[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
  // pisahkan kode part yang nempel tanpa spasi dgn kata "stok"
  text = text.replace(/([A-Za-z0-9])stok\b/gi, '$1\nstok');
  return text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// Ambil harga TERAKHIR yang muncul di baris (kalau ada "~~Rp lama~~ Rp
// diskon~~" / "<del>Rp X</del> <ins>Rp Y</ins>", yang dipakai adalah
// harga diskon/final — angka Rp yang paling terakhir muncul di baris).
function _vehicleWebImportParsePriceLine(line) {
  const re = /Rp\.?\s?([\d.,]{3,})/gi;
  let m;
  let last = null;
  while ((m = re.exec(line))) last = m[1];
  if (!last) return null;
  const num = parseInt(last.replace(/[.,]/g, ''), 10);
  return isNaN(num) || num <= 0 ? null : num;
}

function _vehicleWebImportIsPriceLine(line) {
  return /Rp\.?\s?[\d.,]{3,}/i.test(line);
}

function _vehicleWebImportIsNameCandidate(line) {
  if (!line || line.length < 3) return false;
  if (VEHICLE_WEB_IMPORT_NAME_STOPLIST.has(line.toLowerCase())) return false;
  if (/^stok\b/i.test(line)) return false;
  if (VEHICLE_WEB_IMPORT_CODE_RE.test(line)) return false;
  if (_vehicleWebImportIsPriceLine(line)) return false;
  if (/^\d+$/.test(line)) return false; // nomor urut baris tabel
  return true;
}

/** parseCatalogHtml(html) — HTML katalog (dari fetch() otomatis ATAU
 * paste manual) -> array kandidat part { partName, oemCode, barcode,
 * price, raw }. HANYA mengembalikan baris yang punya kode part DAN
 * harga valid (>0) — sesuai kebutuhan "hanya sparepart yg mempunyai
 * kode part dan harga". barcode dikosongkan (kode part di sini selalu
 * dianggap oemCode, konsisten dgn field yg dipakai VehicleCatalog). */
function vehicleWebImportParseCatalogHtml(html) {
  const lines = _vehicleWebImportNormalizeToLines(html);
  const rows = [];
  let pendingName = '';
  let pendingCode = '';
  for (const line of lines) {
    if (_vehicleWebImportIsPriceLine(line)) {
      const price = _vehicleWebImportParsePriceLine(line);
      if (price && pendingCode) {
        rows.push({
          partName: pendingName || '',
          oemCode: pendingCode,
          barcode: '',
          price,
          raw: (pendingName ? pendingName + ' | ' : '') + pendingCode + ' | ' + line,
        });
      }
      // reset per part — nama & kode berikutnya harus baru
      pendingName = '';
      pendingCode = '';
      continue;
    }
    // Baris kode part kadang diikuti teks lain di baris yang sama tanpa
    // pemisah blok (mis. "12310KZR701 stok habis" atau
    // "957010601400 stok 300") — cek TOKEN PERTAMA baris terhadap pola
    // kode, bukan seluruh baris, supaya tetap match walau ada ekor teks.
    const firstToken = line.split(/\s+/)[0];
    if (VEHICLE_WEB_IMPORT_CODE_RE.test(firstToken)) {
      pendingCode = firstToken;
      continue;
    }
    if (_vehicleWebImportIsNameCandidate(line)) {
      pendingName = line;
    }
  }
  return rows;
}

const VehicleCatalogWebImport = {
  fetchHtml: vehicleWebImportFetchHtml,
  parseCatalogHtml: vehicleWebImportParseCatalogHtml,
};

if (typeof window !== 'undefined') {
  window.VehicleCatalogWebImport = VehicleCatalogWebImport;
}
