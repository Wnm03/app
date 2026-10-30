# Patch: pecah modules/finance/transaksi.js

Lanjutan audit ukuran file (kandidat berikutnya setelah split
`sparepart-servis.js`). File terbesar di luar `scripts/build.js`.

## modules/finance/transaksi.js (1899 -> 1244 baris)

Titik potong bersih: TEPAT SEBELUM `async function saveTx(){`
(langsung setelah `deleteTxFromModal(){...}` selesai).

- **Diubah:** `modules/finance/transaksi.js` — sisa bagian PERTAMA
  (setTxType, panel kendaraan/BBM/sparepart/shop, autocomplete
  kategori/produk, owner-resolver, openTxModal/editTx/
  deleteTxFromModal, dkk).
- **Baru:** `modules/finance/transaksi-b.js` (680 baris) —
  `saveTx()`/`_saveTxInner()` (mesin simpan transaksi ~600 baris:
  cicilan/langganan/piutang/servis/bbm/shop sync) + fungsi tak
  terkait domain transaksi yang sebelumnya menumpuk di ekor file
  yang sama: `saveCatatan`, `saveReminder`, `saveLDR`, `toggleMs`,
  `delReminder`.

Sama seperti pola split `sparepart-servis.js`: murni deklarasi
`function` top-level, TIDAK butuh `Object.assign` — cukup
`transaksi-b.js` dimuat SETELAH `transaksi.js` (urutan dijaga di
`scripts/build.js`, entri baru tepat setelah file utama).

## Test

10 file test disesuaikan (`loadSource([...])` ditambah
`modules/finance/transaksi-b.js`) karena menguji fungsi yang ikut
pindah, terutama `saveTx()`/`_saveTxInner()`:
- `tests/s628-bugB-atomicity-create-regression.test.js`
- `tests/s316-tagihan-tx-edit-billlink-sync.test.js`
- `tests/s433-tx-renov-edit-save-fix.test.js`
- `tests/s436-tx-renov-e2e-real.test.js`
- `tests/s447-tx-renov-numeric-id-fix.test.js`
- `tests/s452-tx-renov-edit-checkbox-restore.test.js`
- `tests/s574-d2-deduction-owner-persist-validation.test.js`
- `tests/s574-e-history-badge-datahealth-regression.test.js`
- `tests/s578-dl-next-1-deduction-owner-validation-source.test.js`
- `tests/tx-stock-edit-checkbox-restore-s629b.test.js` (2 loadSource
  call di file ini disesuaikan)

1 file test khusus, `tests/s271-bill-list-cicilan-fixes.test.js` —
"source guard" yang baca isi mentah `transaksi.js` via regex (bukan
`loadSource`), diubah baca gabungan `transaksi.js` + `transaksi-b.js`
karena pola yang dicek ikut pindah ke file baru.

18 file test lain yang menyebut `transaksi.js` dicek satu per satu —
TIDAK butuh perubahan (fungsi yang mereka pakai tetap di bagian
PERTAMA, tidak menyentuh saveTx/saveCatatan/saveReminder/saveLDR/
toggleMs/delReminder).

## Verifikasi

- `node --test tests/*.test.js` -> **4857 pass, 0 fail** (sama
  persis sebelum & sesudah split).
- Build: versi `s676-cashflow-siklus-legacy-card`, `?v=1423`,
  `index.html`/`app_production.html`/`sw.js` sinkron. (Versi naik 3
  langkah dari baseline karena build dijalankan berulang saat
  verifikasi output di sesi ini — tidak ada dampak fungsional.)
- Lint "file kegedean" (ambang 1600 baris) di antara file aktif:
  **3 -> 2** file. Sisa: `modules/shared/scan-ocr.js` (1677),
  `modules/finance/dana-titipan-portfolio-render.js` (1616) —
  kandidat sesi split berikutnya. (Lint juga menandai
  `modules/modules-render.js` & `modules/shop/modules-render.js`,
  tapi keduanya file mati/duplikat, tidak terdaftar di
  `scripts/build.js`, aman diabaikan.)
- Release gate: lint & minify di-override (eslint/esbuild tidak
  tersedia di sandbox); html-sync & version-sync lolos murni.
  **Gate akhir: LOLOS.**

## Setelah menimpa file-file ini, jalankan:
```
npm test          # harus tetap 4857 pass, 0 fail
npm run build     # sudah dijalankan di sesi ini -- hasil rebuild ada di ZIP
```
