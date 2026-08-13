# FIX v1310 → v1312 — Sesi S581 (DL-Next-8: Data Health Check Other-Account Owner Source Fix)

## Konteks
Implementasi **DL-Next-8** dari `docs/DESIGN-LOCK-DL-NEXT-8-DATA-HEALTH-
CHECK-OTHER-ACC-SOURCE.md`, menutup temuan `docs/AUDIT-13-OWNER-RESOLVER-
POST-DL-NEXT-7.md`. 1 sesi, 1 fokus: ganti basis cabang `existsOnOtherAcc`
di `runDataHealthCheck()`.

## Bug yang diperbaiki
Cabang `existsOnOtherAcc` (pembeda kasus A "owner tidak ditemukan sama
sekali" vs C "owner valid tapi di akun lain") sebelumnya cek `a.owners||[]`
mentah ke semua akun lain — buta terhadap aset multi-owner tertaut di akun
lain itu, pola source-mismatch sama seperti bug yang diperbaiki DL-Next-7
(tapi di cabang berbeda). Akibatnya: owner yang valid HANYA lewat aset
tertaut di akun lain (akun itu sendiri tanpa `owners[]` manual) salah
dikategorikan sebagai kasus A ("tidak ditemukan sama sekali") padahal
seharusnya kasus C ("ada, tapi di akun lain"). Level tetap `warn` di
kedua kasus (bukan false-negative seperti DL-Next-7) — murni salah judul/
pesan.

## Perbaikan
- `data-health-check.js` — basis `existsOnOtherAcc` diganti dari
  `(a.owners||[])` mentah per akun lain ke
  `resolveOwnerDefaultForAccount(a.id).owners` (sumber sama persis yang
  dipakai cabang utama, DL-Next-7). Guard `typeof` + fallback ke
  `a.owners||[]` lama dipertahankan — 0 crash kalau fungsi belum termuat.
- Wording pesan kasus C **tidak berubah** (sudah cukup akurat generik,
  sesuai Design Lock — beda dari DL-Next-7 yang perlu sebut nama aset
  spesifik).
- `data-health-check.js` — **satu-satunya** file source produksi yang
  disentuh sesi ini.

## Test
`tests/data-health-check-other-acc-owner-source-s581.test.js`
(**baru**, 4 test):
1. Owner valid via aset tertaut di AKUN LAIN → kategori C, BUKAN A
   (regresi utama yang diperbaiki, reproduksi persis kasus di
   `AUDIT-13`).
2. Owner valid di akun lain via `acc.owners[]` manual (kasus lama) →
   tetap kategori C.
3. Owner benar-benar tidak ada di manapun → tetap kategori A.
4. Guard fallback (tanpa `resolveOwnerDefaultForAccount` termuat) →
   logic lama tetap jalan, 0 crash.

Full `npm test`: **4081 test, 4072 pass, 9 fail** (naik dari 4077/4068/9,
+4 test baru semua pass) — 9 kegagalan **identik pre-existing** (sama
persis sejak v1309), **0 regresi baru**.

## Rilis
`node scripts/build.js s581-dl-next-8-datahealth-other-acc-owner-source-fix`
(v1310→v1312 — build sempat dijalankan 2x karena run pertama pakai label
auto-increment yang salah nama sesi, diperbaiki dgn label eksplisit;
semua file terverifikasi konsisten di v1312 setelahnya). Bundle **tidak
diminify** (esbuild tidak terpasang, sandbox tanpa akses jaringan) —
`node --check` lolos di kedua bundle. Gate lint/minify di-override
manual, pola sama sesi-sesi sebelumnya.

## Cakupan yang SENGAJA tidak dikerjakan
Optimasi loop `resolveOwnerDefaultForAccount()` per akun lain (mis. cache
per-run) — di luar cakupan DL-Next-8 (lihat Design Lock, keputusan
eksplisit: diterima apa adanya, skala akun kecil & bukan hot path).
