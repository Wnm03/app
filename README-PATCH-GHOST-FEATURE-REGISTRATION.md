# Patch: Registrasi 4 "Ghost Feature" + Hapus 2 File Mati (versi diperbaiki)

Base: `app-main__1_.zip` (fresh, tidak menumpuk di atas patch v1687 lama)
Build version: `s-v26-scanner-lifecycle-reattach-final` -> `s-v26-scanner-lifecycle-reattach-final-1687`
Bundle version: `?v=1686` -> `?v=1687`

## Koreksi dari percobaan sebelumnya
1. **Rebuild dari base bersih**, bukan menumpuk di atas ZIP patch lama —
   memastikan hasil ini reproducible dari `app-main__1_.zip` apa adanya.
2. **Version string diperbaiki minimal**, bukan diganti tema baru. String
   lama (`s-v26-scanner-lifecycle-reattach-final`) TIDAK cocok kedua format
   yang diterima `computeNextVersion()` di `scripts/build.js` (bukan
   `...-angka` polos, bukan pula `sNNN-slug`) — itu sebabnya build gagal
   kalau dijalankan tanpa argumen eksplisit. Perbaikannya HANYA menambah
   akhiran `-1687` (angka) ke string yang sama persis, bukan mengarang
   slug baru — ini otomatis membuatnya cocok pola `...-angka`, sehingga
   `node scripts/build.js` (TANPA argumen) akan berjalan normal & auto-
   naik ke `...-1688` dst di sesi berikutnya, tidak perlu override manual
   lagi.
3. Perihal nomor bundle: `scripts/bump-version.sh` (dipanggil `build.js`
   TANPA argumen) selalu mengambil `?v=` tertinggi yang terdeteksi di HTML
   + 1. Dari base bersih ini angka tertinggi adalah 1686, jadi hasil build
   yang benar & reproducible adalah **v1687** (bukan v1688) — v1688 baru
   akan muncul di sesi build BERIKUTNYA setelah v1687 ini diupload. Ini
   bukan pembulatan sembarangan, melainkan perilaku asli `build.js` yang
   sengaja tidak saya paksa menyimpang.

## A. File mati (dihapus, lihat HAPUS-FILE-INI.txt)
- `modules/vehicle/honda-oem-service-mapping.js` (`HondaOemServiceMapping`)
- `tests/honda-oem-service-mapping-s22.test.js`

## B. Ghost feature — didaftarkan ke scripts/build.js (GROUP_B)
1. `modules/finance/piutang-utang-reminder.js` (`PiutangUtangReminder`)
2. `modules/finance/tagihan-reminder.js` (`TagihanReminder`)
3. `modules/shop/shop-restock-reminder.js` (`ShopRestockReminder`)
4. `modules/vehicle/service-interval-sot.js` (`resolveCanonicalInterval`)

## Verifikasi (dilakukan 2x independen, hasil byte-identical)
- **Percobaan 1**: extract base bersih -> hapus 2 file mati -> edit
  `build.js` -> `npm test` (6626 pass/23 fail, identik base) -> `node
  scripts/build.js s-v26-scanner-lifecycle-reattach-final-1687` -> 4 simbol
  terverifikasi masuk `app-bundle-b.min.js` -> `npm test` lagi (6626
  pass/23 fail, 0 regresi baru).
- **Dry-run kedua**: ulangi SELURUH proses di atas dari extract ZIP base
  yang sama sekali baru (folder terpisah). Hasil:
  - `scripts/build.js` hasil edit: MD5 identik dgn percobaan 1
  - `app-bundle-a.min.js` & `app-bundle-b.min.js`: MD5 identik dgn
    percobaan 1 (byte-for-byte, `diff` kosong)
  - Test suite: 6626 pass/23 fail, sama persis
  - **Kesimpulan: proses build ini reproducible**, bukan kebetulan sekali
    jalan.
- 23 fail yang tersisa sudah dikonfirmasi (sesi sebelumnya) **identik**
  dengan base sebelum patch — pre-existing, seputar epic checklist
  v9–v22/CATEGORY-SOT, tidak terkait patch ini.
- `verify-release-ready.js`: gate `service-sot-integrity` (30 vs 46
  checklist item) masih FAIL — pre-existing di base, di luar scope patch
  ini. Gate `bundle-freshness` LULUS (bundle baru = source terbaru). Gate
  `lint`/`minify` tidak bisa jalan di sandbox ini (eslint/esbuild tidak
  terpasang, tidak ada akses jaringan) — batasan environment, bukan bug
  kode.

## STATUS: READY TO IMPLEMENT
Patch ini reproducible (2x independen menghasilkan bundle byte-identik),
tidak membawa perubahan version-string yang tidak perlu (hanya minimal fix
format), dan tidak menambah regresi test. Yang masih di luar scope:
`service-sot-integrity` gate (pre-existing) dan temuan C/D/E dari audit
awal (duplikat file basi, snapshot `docs/` basi, test di luar folder
`tests/`) — perlu sesi terpisah kalau mau ditindaklanjuti.

## File dalam ZIP ini
Hanya file yang berubah. Lihat `HAPUS-FILE-INI.txt` untuk file yang perlu
dihapus manual (ZIP tidak bisa merepresentasikan delete).
