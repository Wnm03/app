# Audit Rantai Akumulasi dan Rantai Perbaikan — S2649 / Build 2649

Tanggal validasi: 2026-10-23

## 1. Rantai input yang benar-benar ditumpuk

1. Baseline: `app-main (35).zip`.
2. Overlay target: `patch-Shop-CarNotes-Renov-S2649-akumulatif.zip`.
3. Overlay lanjutan: `patch-S2649-continued-hotfix-cumulative-v2648.zip`.
4. Perubahan validasi sesi ini: perbaikan kontrak tes lama `tests/s2646-p1-14-17.test.js`, pembaruan `FILE-HASHES-SHA256.txt`, dan dokumen audit ini.
5. Build resmi dari source menghasilkan versi `2649`; kedua bundle, `index.html`, `app_production.html`, dan `sw.js` diselaraskan melalui `node scripts/build.js --require-minify`.

Urutan overlay penting: file dari tahap 3 menimpa file yang sama dari tahap 2; keduanya diterapkan di atas baseline, bukan ditumpuk di atas ZIP parsial.

## 2. Temuan rantai akumulasi

- Dokumen historis `PERBAIKAN-S2649-TEMUAN-1-5.md` mengklaim tes penuh dan browser lulus pada suatu run, tetapi dokumen hotfix v2648 secara eksplisit menyatakan full-suite dan browser belum diverifikasi. Bukti yang saling bertentangan ini tidak boleh diperlakukan sebagai gate rilis.
- Tes kontrak `s2646-p1-14-17.test.js` masih mengharapkan selector CSS `[data-action=...]`, padahal kebijakan CSS pada patch telah mengalihkan ukuran tombol ke `.btn-sm`; tes juga mencari komentar bundle yang hilang setelah minifikasi. Ini kegagalan kontrak tes usang, bukan bukti kegagalan perilaku runtime. Tes diperbarui untuk memeriksa selector kelas dan penanda runtime `__pwaOrderPoPresentationInstalled`.
- Build awal menghasilkan 2649 dan kedua bundle fresh. Build memperbarui file yang dipelihara generator; setelah itu `scripts/refresh-file-hashes.py --write` dijalankan.
- `scripts/refresh-file-hashes.py --check`: PASS, 58 entri, 0 basi, 0 hilang.
- `scripts/verify-bundle-freshness.js`: PASS untuk kedua bundle.
- `scripts/verify-release-ready.js` tidak selesai dalam batas waktu lingkungan; status gate ini **belum terverifikasi**, bukan PASS.

## 3. Rantai perbaikan dan bukti

| Risiko | Perbaikan sumber yang terakumulasi | Bukti yang tersedia |
|---|---|---|
| Observer subtotal Order memicu dirinya sendiri | Teks subtotal hanya ditulis saat berubah | Tes terarah; pemeriksaan browser nyata belum dilakukan pada run ini |
| Ringkasan Renovasi memicu observer berulang | Kunci ringkasan idempoten berbasis state (sisa/jumlah item belum lunas) | Tes CRUD Renovasi lulus; browser nyata belum dilakukan pada run ini |
| Fold pelanggan/harga membungkus shell modal | Pencarian field dan filter modal pada helper dekorator | Source dan build lulus; browser nyata belum dilakukan pada run ini |
| Dropdown proyek tidak diperbarui setelah Simpan | Refresh dropdown setelah save dan pilih proyek yang baru dibuat/diedit | Tes link Renovasi yang ada lulus; persistence browser nyata belum dilakukan pada run ini |
| Tes kontrak tidak cocok dengan desain final | Assertion diarahkan ke selector presentasi dan penanda runtime stabil | Tes `s2646` lulus setelah pembaruan |

## 4. Hasil tes sesi ini

- Tes regresi terarah: **44/44 lulus** (`s2646-p1-14-17`, `renovasi-modal-crud`, `s447-tx-renov-numeric-id-fix`, `s633-renovasi-delete-cascade-regression`, `s436-tx-renov-e2e-real`, `s256au-file-hashes-sync`).
- Percobaan `npm run test:full`: **tidak selesai** dalam batas waktu 300 detik. Run sempat berhenti di shard 6/32; di dalam shard itu terlihat satu kegagalan S256AU karena hash belum disegarkan setelah build. Hash sudah disegarkan dan tes S256AU sekarang lulus 4/4, tetapi full-suite harus diulang dari awal agar hasil agregat dapat dipercaya.
- `node scripts/build.js --require-minify`: PASS, menghasilkan build 2649.
- `node scripts/verify-bundle-freshness.js`: PASS.
- `python3 scripts/refresh-file-hashes.py --check`: PASS.
- `node scripts/verify-release-ready.js`: timeout; belum ada hasil.
- Playwright/Puppeteer tidak tersedia sebagai dependency lokal. Browser interaktif nyata belum dijalankan pada validasi sesi ini.

## 5. Status rilis

**BELUM RELEASE-CERTIFIED.** Tidak boleh mengklaim full-suite hijau atau uji browser lulus. Sebelum rilis:

1. Ulangi `npm run test:full` setelah hash final, dengan waktu cukup; simpan ringkasan agregat semua shard.
2. Selesaikan `node scripts/verify-release-ready.js` dan perbaiki setiap kegagalan yang benar-benar muncul.
3. Jalankan browser interaktif pada 390×844 dan 360×640 untuk: membuka modal Order; tambah produk ke keranjang; buka modal Tambah Produk; simpan proyek Renovasi dari form transaksi; verifikasi `renovProjectLinkId`, item Renovasi, dan persistence setelah reload.
4. Audit daftar file overlay terhadap manifest dan pastikan setiap perubahan non-target terdokumentasi; jangan hapus fitur baseline diam-diam.
