# Audit Rantai Akumulasi Keluarga W — S2295 Re-audit

## Ringkasan keputusan

ZIP `PATCH-KW-S2295-CUMULATIVE-REGRESSION-FIX.zip` ditemukan dan diuji dengan clean overlay di atas baseline `app-main (15).zip` (build v2290). Akumulasi S2291 → S2292 → S2293 → S2294 → S2295 dapat diekstrak dan dibangun ulang. Full sharded suite dan release gate lulus. **Status tetap kandidat, belum final accepted**, karena browser Chromium terkelola memblokir navigasi sebelum aplikasi dimuat sehingga R1/R2 belum terbukti lewat alur UI nyata.

## Temuan R1/R2

1. **R1 — backdate BBM:** source guard membandingkan KM dengan tetangga bertanggal terdekat sebelum dan sesudah tanggal input serta mengecualikan catatan yang sedang diedit. Eksekusi langsung snippet guard dari source lulus untuk backdate 12.500 km di antara 12.000 dan 13.000, nilai sama dengan batas, nilai di luar batas, dan edit catatan tengah.
2. **Batas tanggal sama:** guard tidak mengurutkan beberapa log pada tanggal yang sama; catatan tanggal sama bukan `prior` atau `next`. Ini sesuai kebijakan tanpa urutan intrahari yang didokumentasikan, tetapi berarti KM ant catatan pada tanggal yang sama tidak dibandingkan. Jika urutan per hari diperlukan, aturan bisnis tambahan dibutuhkan.
3. **R2 — kategori yatim:** snippet guard dari source mengizinkan edit jika kategori lama tetap sama, menolak kategori ketik-bebas yang tidak ada dalam daftar, mengizinkan perubahan ke kategori yang dikenal, dan tidak memberi bypass bila ID edit tidak cocok dengan transaksi.
4. **Keterbatasan:** tes `tests/s2295-backdate-legacy-category-regression.test.js` adalah source/regex + fixture. Eksekusi snippet guard menambah keyakinan pada kondisi guard, tetapi keduanya bukan pengganti panggilan UI penuh.

## Hasil verifikasi

- ZIP: PASS — 34 file unik; tidak ada anggota arsip korup.
- Clean overlay baseline v2290 + ZIP: PASS.
- Build: PASS; build script menaikkan versi dari v2295 menjadi v2296.
- Reproducible build: PASS pada dua clean overlay yang independen. SHA-256 hasil v2296 identik:
  - bundle A: `91e92b8f47bf2354d9976594bc1e23664f3bcd1b56964b1b1ec11df2836b26ee`
  - bundle B: `988a749a8f73efe698b93337294f67895f77d5a2ba0acd4d5024167e38b600c5`
- `npm run release-check`: PASS, exit 0 pada v2296; lint 0 error, SOT/version/cache dan bundle freshness pass. Tiga peringatan ukuran source non-blocking masih dalam guard cap.
- `npm run test:critical`: 10/10 PASS.
- Targeted S2295 tests: 2/2 PASS.
- Targeted bug-hardening BUG-01 sampai BUG-09 + multi-domain crash replay: 17/17 PASS; sifatnya source-level/fixture test, bukan bukti seluruh alur UI.
- `npm run test:full`, 64 shards: **8754 tests, 8753 pass, 0 fail, 0 cancelled, 1 skipped**.
- Source-guard execution terhadap snippet aktual: 16 assertions PASS (termasuk batas KM sama, edit log tengah, tanggal sama, dan kategori yatim).
- Chromium `npm run test:e2e`: **BLOCKED sebelum aplikasi dimuat**. Browser menampilkan “Your organization doesn’t allow you to view this site” untuk URL loopback maupun `file://`. Ini pembatasan lingkungan, bukan hasil lulus/gagal aplikasi.

## Risiko yang masih terbuka

- Uji Chromium UI aktual untuk R1/R2 dan regresi UI lain belum berjalan.
- Smoke-test masih mencatat 71 ID yang belum terpetakan menurut audit sebelumnya; perlu klasifikasi satu per satu, jangan otomatis dianggap aman hanya karena lazy owner.
- Payload restore salah bentuk perlu diuji untuk pesan yang jelas; self-test 108/109, form Servis, offline/impor-ekspor, alur Shop/kasir/order, serta Pajak/Zakat/Proyeksi masih memerlukan skenario penerimaan khusus.
- Tanggal sama tidak memiliki urutan intrahari; perilaku saat ini tidak memeriksa konsistensi KM antarlog pada tanggal yang sama.
- Tiga peringatan ukuran source tetap ada: `modules/vehicle/servis.js` 2001/2020, `modules/shared/features-helpers-global-security.js` 1750/1750, dan `build.js` 1620/1700 baris (guard cap masing-masing).

## Keputusan penerimaan

**S2295: full test dan release gate lulus, tetapi belum final accepted.** Tidak ada dasar untuk klaim “0 gap substantif” karena UI E2E terblokir dan beberapa risiko lanjutan belum diuji secara khusus.


## Addendum — tes perilaku permanen
`tests/s2295-behavioral-bbm-category.test.js` (12 tes) menjalankan kode asli `BBM._saveInner` dan `_saveTxInner` dalam sandbox vm. Pada kode S2294 tes R1 (backdate) dan R2 (kategori lama) gagal; pada S2295 12/12 lulus. Full suite 64/64 shard: 8766 tes, 0 gagal, 1 skip. Batas: ini bukan uji klik UI; E2E UI penuh tetap terbuka.
