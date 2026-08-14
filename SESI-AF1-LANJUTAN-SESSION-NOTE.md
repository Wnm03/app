# Sesi AF1 (lanjutan) — Auto-fill Sisa Porsi: penutupan item "Next" dari sesi AF1 sebelumnya

Ref: `DESIGN-LOCK-autofill-sisa-porsi.md`, sesi AF1 pertama (`SESI-AF1-SESSION-NOTE.md`,
patch `patch-S-AF1-autofill-sisa-porsi.zip`). Sesi ini HANYA berisi file yang berubah di sesi
lanjutan — untuk 4 file dari sesi AF1 pertama yang TIDAK berubah lagi (`modules-calc.js`,
`investasi-view.js`, `akun.js`), lihat/pakai patch pertama.

## Kenapa sesi ini perlu

Sesi AF1 pertama menyatakan di bagian "Next"-nya bahwa `node --test tests/*.test.js` BELUM
dijalankan, dan optimis regresi S431/S449/S457 "harus tetap lolos". Setelah dijalankan penuh di
sesi ini, asumsi itu **salah** — 8 dari 4245 test gagal. Root cause: `Aset._applyRemainingShare()`
(SESI AF1) mengubah trigger auto-bagi `onOwnerNominalInput()`/`onOwnerPorsiInput()` dari
broadcast/proporsional-ke-semua-baris (`_autoDistributeRemaining()`, S431/S449) menjadi
isi-1-baris-kosong-berikutnya-saja (`calculateRemainingShare()`) — ini PERUBAHAN PERILAKU YANG
DISENGAJA (Design Lock keputusan #1 & #2), bukan regresi, tapi 3 file test lama menguji perilaku
LAMA lewat pemanggilan UI-facing method (`onOwnerNominalInput()`/`onOwnerPorsiInput()`), sehingga
otomatis gagal begitu perilaku barunya benar-benar aktif.

## Yang dikerjakan

1. **Hapus `Aset._autoDistributeRemaining()`** (`modules/asset/aset.js`) — dead code sejak AF1:
   0 caller di kode aplikasi (cuma dipanggil test lama secara langsung), sudah digantikan
   `_applyRemainingShare()` → `calculateRemainingShare()` (SSOT). Sesuai rekomendasi EKSPLISIT
   Design Lock ("ganti total ke util baru supaya 1 sumber logika, hapus
   `_autoDistributeRemaining()` duplikat") yang belum dieksekusi di sesi AF1 pertama.
2. **`tests/asset-owners-nominal-autodistribute-s431.test.js`** — `makeCtx()` sekarang memuat
   `modules/shared/modules-calc.js` (sebelumnya tidak dimuat sama sekali → `_applyRemainingShare()`
   diam-diam no-op lewat guard `typeof`, bukan cuma di test ini tapi berpotensi silent-fail di
   manapun util itu dipakai tanpa modules-calc.js). Skenario 2-pemilik (1 baris "lain" saja) hasil
   identik dgn perilaku lama → assert TIDAK berubah. Skenario 3-pemilik & test Porsi%-manual
   ditulis ulang sesuai perilaku baru (lihat detail di bawah).
3. **`tests/asset-owners-nominal-autodistribute-proportional-s449.test.js`** — ditulis ulang
   total: dulu menguji `_autoDistributeRemaining()` (proporsional ke rasio porsi lama), sekarang
   menguji `_applyRemainingShare()` utk skenario setara (baris berporsi >0 dilewati sbg target;
   baris benar-benar kosong dapat seluruh sisa, bukan dibagi rata).
4. **`tests/asset-owners-nominal-precision-s457.test.js`** — `makeCtx()` ditambah
   `modules-calc.js` (skenario di file ini semuanya 1-baris-lain, hasil identik dgn versi lama,
   presisi 4 desimal TIDAK berubah). Komentar & 1 judul test disesuaikan (referensi
   `_autoDistributeRemaining()` → `_applyRemainingShare()`).
5. **`tests/modules-calc-remaining-share-af1.test.js`** (BARU) — unit test PURE
   `calculateRemainingShare()` sesuai checklist "Test yang wajib ada" di Design Lock: 2 baris,
   3+ baris, semua `_touched`, baris porsi>0 dilewati, clamp sisa≤0 → null, <2 baris → null,
   presisi 4 desimal, guard editedIndex/rows tidak valid.

### Detail perilaku baru yang sekarang tercakup test (Design Lock keputusan #1 & #2)
- `onOwnerPorsiInput()` (edit Porsi% manual) **sekarang JUGA** memicu auto-fill baris kosong
  berikutnya — sebelumnya (S431) sengaja TIDAK. Test baru: 2-pemilik (60% → baris lain 40%) dan
  kasus baris `_touched` tidak ditimpa (baris 1 diisi manual duluan → baris 0 diedit → baris 2
  yang kosong dapat sisa, baris 1 tidak disentuh).
- `onOwnerNominalInput()` 3+ pemilik: HANYA baris kosong/0 **berikutnya** yang dapat SELURUH
  sisa — bukan lagi dibagi rata (S431) atau proporsional ke rasio lama (S449) ke SEMUA baris lain.
  Baris berporsi lama >0 (mis. dari data tersimpan) tidak disentuh sama sekali kalau bukan baris
  kosong pertama.

## Verifikasi

- `node --check` lolos untuk `modules/asset/aset.js` + 4 file test yang diubah/baru.
- **`node --test tests/*.test.js` DIJALANKAN PENUH** (item yang belum dilakukan sesi AF1
  pertama): **4255 test, 4255 pass, 0 fail** (naik dari 4245 sebelumnya — 9 test baru: 6 di file
  AF1 baru minus 1 tergabung, +3 lain dari file s431 yang ditulis ulang; lihat diff test count).
- Regresi S431/S449/S457 (skenario yang perilakunya TIDAK berubah — kasus 2-pemilik) tetap lolos
  dgn assertion sama seperti sebelum AF1, hanya makeCtx() yang diperbaiki.
- `npx eslint` tidak bisa dijalankan di sandbox sesi ini (registry npm diblokir jaringan) — jalankan
  `npm run lint` di lingkungan asli sebelum merge.

## TIDAK disentuh sesi ini
- `modules/shared/modules-calc.js`, `modules/asset/investasi-view.js`, `modules/finance/akun.js`
  — sudah benar dari sesi AF1 pertama, 0 perubahan lagi diperlukan (3 modal tetap konsisten
  memakai `calculateRemainingShare()` sbg SSOT).
- `MODULE_CALC_VERSION` & versi lain — TETAP belum di-bump (sama alasan sesi AF1 pertama: bukan
  build resmi via `scripts/build.js`). Jalankan build resmi sebelum/saat merge ke riwayat sesi
  utama, sekalian bump versi utk KEDUA sesi AF1 (pertama + lanjutan ini) sekaligus.
- Keputusan `AccOwners` (akun.js) auto-fill Porsi-only tanpa Nominal — sudah sesuai Design Lock,
  tidak ada test baru ditambah utk modal ini di sesi AF1 manapun (di luar cakupan "Next" sesi
  pertama); pertimbangkan sesi lanjutan lain kalau mau paritas test coverage dgn Aset/Investasi.

## Cara pakai patch ini
File dalam ZIP ini HANYA yang berubah di sesi lanjutan (per permintaan user "hanya file terbaru
diubah") — extract & overwrite ke root project SETELAH patch AF1 pertama sudah di-apply (atau
gabungkan berurutan: patch pertama dulu, baru patch ini menimpa `modules/asset/aset.js` dan
menambah/menimpa 4 file test).

## File dalam ZIP
- `modules/asset/aset.js` (hapus `_autoDistributeRemaining()`, dead code)
- `tests/asset-owners-nominal-autodistribute-s431.test.js` (diperbarui)
- `tests/asset-owners-nominal-autodistribute-proportional-s449.test.js` (ditulis ulang)
- `tests/asset-owners-nominal-precision-s457.test.js` (diperbarui)
- `tests/modules-calc-remaining-share-af1.test.js` (baru)
- `SESI-AF1-LANJUTAN-SESSION-NOTE.md` (file ini)

## Next
- Jalankan `npm run lint` (tidak bisa dijalankan di sandbox sesi ini).
- Jalankan `scripts/build.js` resmi (bump versi bundle + `MODULE_CALC_VERSION` dkk) utk sesi
  AF1 pertama + lanjutan ini sekaligus.
- Opsional: tambah test wiring Porsi%-trigger utk `InvestmentUI`/`AccOwners` (2 modal lain) kalau
  belum ada — sesi AF1 pertama fokus ke `Aset` utk regresi (S431/S449/S457 sudah ada duluan);
  `InvestmentUI`/`AccOwners` tidak punya riwayat test setara jadi tidak ada regresi utk dicek,
  tapi coverage baru (bukan cuma regresi) belum ditulis.
