# Patch: pecah modules/shared/scan-ocr.js

Lanjutan audit ukuran file setelah split `transaksi.js`. Kandidat #1
dari 2 sisa file oversized.

## modules/shared/scan-ocr.js (1676 -> 1067 baris)

Titik potong bersih: TEPAT SETELAH
`function scanBillMultiItems(){return BillMultiScan.scan();}`, persis
di depan header komentar section `// ==== UniversalScan (Sesi 125) ====`.

- **Diubah:** `modules/shared/scan-ocr.js` — sisa bagian PERTAMA
  (ocrRecognize/downscaleImage/scanReceipt/scanBuktiTransfer/
  scanTanggalDariFoto/scanKmOdometer/scanAssetPortfolio/
  scanReceiptBelanja/scanWorthItCheckout/BillMultiScan, dkk).
- **Baru:** `modules/shared/scan-ocr-b.js` (638 baris) — seluruh
  fitur UniversalScan (Sesi 125): scan screenshot Bank/E-Wallet/
  Bibit/Jago Pocket buat isi Akun otomatis — `detectScreenType*()`,
  `parseBankScreen`/`parseWalletScreen`/`parseWalletNominal`/
  `parseBibitScreen`/`extractBibitKeuntungan`/`parseJagoPocketScreen`,
  `_fuzzyAccountMatch`, `runUniversalScanParser`/
  `validateUniversalScanItem`, `getOcrMinConfidence`/
  `setOcrMinConfidence`, `UniversalScanHistory`, object
  `UniversalScan`, `scanUniversal()`.

Sama seperti pola split sebelumnya: murni deklarasi function/const
top-level, TIDAK butuh `Object.assign` — cukup `scan-ocr-b.js`
dimuat SETELAH `scan-ocr.js` (urutan dijaga di `scripts/build.js`,
entri baru tepat setelah file utama).

## Test

3 file test disesuaikan (`loadSource([...])` ditambah
`modules/shared/scan-ocr-b.js`) karena menguji fungsi yang ikut
pindah:
- `tests/scan-ocr-bibit-detail.test.js` — pakai
  `detectScreenType()`/`parseBibitScreen()`.
- `tests/scan-ocr-wallet.test.js` — pakai `parseWalletScreen()`.
- `tests/window-expose-audit-s347.test.js` — entri audit
  `UniversalScan` (entri `BillMultiScan` di file yang sama TIDAK
  perlu berubah, object-nya tetap di bagian PERTAMA).

1 file test lain yang menyebut `scan-ocr.js`
(`tests/scan-ocr-epoch-guard.test.js`) dicek — TIDAK butuh perubahan
(hanya pakai `_scanEpochNow`/`_scanEpochStale`, tetap di bagian
PERTAMA).

## Verifikasi

- `node --test tests/*.test.js` -> **4857 pass, 0 fail** (sama
  persis sebelum & sesudah split).
- Build: versi `s677-cashflow-siklus-legacy-card`, `?v=1424`,
  `index.html`/`app_production.html`/`sw.js` sinkron.
- Lint "file kegedean" (ambang 1600 baris) di antara file aktif:
  **2 -> 1** file. Sisa: `modules/finance/dana-titipan-portfolio-render.js`
  (1616) — kandidat sesi split berikutnya (yang terakhir dari daftar
  awal 4 file). (`modules/modules-render.js` &
  `modules/shop/modules-render.js` tetap ditandai lint tapi keduanya
  file mati/duplikat, tidak terdaftar di `scripts/build.js`, aman
  diabaikan.)
- Release gate: lint & minify di-override (eslint/esbuild tidak
  tersedia di sandbox); html-sync & version-sync lolos murni.
  **Gate akhir: LOLOS.**

## Setelah menimpa file-file ini, jalankan:
```
npm test          # harus tetap 4857 pass, 0 fail
npm run build     # sudah dijalankan di sesi ini -- hasil rebuild ada di ZIP
```
