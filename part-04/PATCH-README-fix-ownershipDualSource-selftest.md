# Patch Perbaikan — Tes Otomatis "ownershipDualSource" false-positive

## Masalah (dari screenshot)
Tes Otomatis menampilkan **102/103 · 1 gagal** pada baris
"TitipanReconcile.checkAll(): audit sinkron Dana Titipan...", dgn detail
`ownershipDualSource.ok=false (flagged:1)` — aset "Majoris".

## Ini BUKAN bug data
`ownershipDualSource` (S636 Opsi C) sengaja didesain sbg **warning saja**
(lihat komentar `checkOwnershipDualSource()`/`warnIfNotOk()` di
`titipan-reconcile.js`) untuk aset yang punya 2 representasi kepemilikan
sekaligus (dropdown "Kepemilikan" non-SELF + "Porsi Kepemilikan" eksplisit
non-SELF) — **kondisi ini SAH**, bukan data rusak/orphan seperti 5
sub-check lain (yang masing-masing punya tombol "Perbaiki Gap Dana
Titipan"). Sebelum patch ini, Tes Otomatis salah menganggapnya sbg
kegagalan tes.

## Perbaikan
`self-test.js` — assert Tes Otomatis sekarang berdasarkan `coreOk` (5
sub-check asli: sync, ownerIdConsistency, debtNameStaleness, accountSync,
transactionOwnerRefs), TIDAK lagi ikut men-gagal-kan tes kalau HANYA
`ownershipDualSource` yang false. Status `ownershipDualSource` tetap
ditulis di pesan (informasional) kalau ada sub-check lain yang gagal.

`checkAll()`/`warnIfNotOk()` di `titipan-reconcile.js` **TIDAK diubah** —
tetap AND dari 6 sub-check & tetap `console.warn` saat `saveOwners()`,
karena di situ memang tempat semestinya sinyal "aset ini punya 2
representasi kepemilikan" muncul (development-visible, tidak
mengganggu/mengunci user).

File lain di zip ini (bundle, index.html, app_production.html, sw.js,
FILE-MAP.md, COVERAGE-PER-MODULE.md, dan file-file yang versinya
disamakan otomatis oleh `scripts/build.js`) adalah hasil build ulang —
ikut berubah karena versi naik ke **s638-keamanan-pin-per-device-salt**
(`?v=1370`), bukan karena ada perubahan logic di file-file itu sendiri.

## Verifikasi
- `node --test tests/*.test.js` → **4527/4527 pass, 0 fail**
- `node scripts/build.js` → lolos semua cek internal (version sync, dsb)

## Cara pasang
Timpa 13 file di zip ini ke lokasi yang sama di repo, commit & push
semuanya sekaligus (termasuk 2 bundle .min.js).
