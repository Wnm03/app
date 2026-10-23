# S2715 — Audit rantai perbaikan dan rantai akumulasi

## Basis dan metode
- Baseline: `app-main (38).zip` (diekstrak bersih).
- Patch kumulatif yang diaudit: `kw_patch_reminder-single-sot-cumulative_s2714.zip`.
- S2714 dioverlay ke baseline; audit membandingkan byte setiap file hasil overlay terhadap baseline. File lokal `node_modules/`, `backups/`, `.git/`, dan `.test-checkpoints/` tidak dibawa ke patch.
- Tidak ada data backup pengguna yang ditulis ulang atau disertakan dalam ZIP patch.

## Temuan substantif pada rantai akumulasi
1. **Baseline inventaris yang salah dipilih untuk pembaruan.** Catatan S2714 memperbarui tabel di bagian bawah `docs/AUDIT_MATRIX.md`, tetapi pemeriksa build `lintDocsBaselineCountDrift()` mengambil kemunculan pertama tiap label. Tabel paling atas masih berisi angka lama sehingga build terus memperingatkan drift.
2. **Pengecualian inventaris tidak konsisten.** Dokumentasi menyebut `.test-checkpoints/` dikecualikan, tetapi walker di `scripts/build-lints.js` hanya mengecualikan `node_modules`, `.git`, dan `backups`. File checkpoint lokal yang dihasilkan oleh full-test runner menambah jumlah file/JSON dan mencemari inventaris sumber.
3. **Laporan snapshot S2714 tidak cocok dengan tree aktual.** Hitung ulang terhadap seluruh isi ZIP S2714 (termasuk lima catatan patch dan enam file tes yang ditambahkan) menunjukkan 3.765 file, 2.091 JavaScript, 1.397 Markdown, 7 HTML, 21 JSON, 4 CSS, dan 1.450 file tes. Setelah S2715 menambahkan satu file tes, satu catatan audit, dan manifest patch, hitungan menjadi 3.768 file, 2.092 JavaScript, 1.398 Markdown, 7 HTML, 22 JSON, 4 CSS, dan 1.451 file tes. Ini menggantikan angka snapshot sebelumnya yang tidak terverifikasi.

## Perbaikan S2715
- `scripts/build-lints.js` kini mengecualikan `.test-checkpoints/` sesuai kebijakan inventaris yang sudah didokumentasikan.
- Kemunculan tabel baseline pertama di `docs/AUDIT_MATRIX.md` diselaraskan ke hasil hitung aktual yang dipakai build.
- Ditambahkan `tests/s2715-patch-chain-inventory-contract.test.js` untuk menjaga pengecualian checkpoint dan baseline pertama agar tidak drift lagi.
- Bundle A/B, `index.html`, `app_production.html`, dan `sw.js` dibangun ulang dan disinkronkan ke build/cache versi **2677**.
- Patch akhir hanya berisi file baru/berubah dibanding baseline, bukan full release.

## Verifikasi yang dijalankan
- `npm run build`: PASS; baseline inventaris sinkron, bundle A/B lolos `node --check`, shell HTML sinkron, cache service worker sinkron.
- `npm run verify-bundle`: PASS; kedua bundle segar terhadap sumber.
- `npm run audit:carnotes`: PASS; 548 file sumber dipindai, forbidden=0, duplicateIds=0/0, ServisDeclarations=1.
- `npm run audit:sot-drift`: PASS, 6/6 checks.
- `npm run audit:sot-reconciliation`: script/fixture yang dijalankan melaporkan 0 konflik/duplikasi pada input yang diperiksa; ini bukan pengganti uji browser dengan backup pengguna.
- Rangkaian tes terarah Car Notes/service/reminder/SOT/history: **1.281/1.281 PASS** dari 348 file tes.
- Tes fokus final untuk inventaris, baseline reminder, duplikasi kategori SOT, pagination riwayat: **15/15 PASS**.
- Uji ZIP final diverifikasi terpisah dengan `ZipFile.testzip()` dan hash SHA-256.

## Batasan yang tetap terbuka
- Full suite `npm run test:full` dicoba, tetapi proses tidak selesai dalam batas eksekusi 240 detik. Hasil full suite **tidak diklaim PASS**; checkpoint yang dibuat runner adalah state lokal dan tidak dimasukkan ke patch.
- Belum dilakukan sesi Chromium/perangkat nyata menggunakan backup pengguna.
- Gate ukuran sumber tetap memperingatkan file besar, termasuk `modules/vehicle/servis.js` (2.054 baris). Ambang tidak dinaikkan untuk menyembunyikan peringatan.
- Status yang tepat: temuan rantai akumulasi yang direproduksi telah diperbaiki; nol bug substantif global belum dapat dinyatakan.
