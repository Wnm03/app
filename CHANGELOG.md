# Changelog — Sesi S581 (DL-Next-8: Data Health Check Other-Account Owner Source Fix, v1312)

## Konteks
Implementasi **DL-Next-8** dari `docs/DESIGN-LOCK-DL-NEXT-8-DATA-HEALTH-
CHECK-OTHER-ACC-SOURCE.md` (ref `docs/AUDIT-13-OWNER-RESOLVER-POST-DL-
NEXT-7.md`). 1 sesi, 1 fokus: ganti basis cabang `existsOnOtherAcc` di
`runDataHealthCheck()`.

## Hasil
- **Bug diperbaiki**: kategorisasi salah di Data Health Check untuk
  transaksi yang `deductionOwnerId`-nya valid HANYA lewat aset multi-
  owner tertaut di AKUN LAIN — sebelumnya dikategorikan "tidak ditemukan
  sama sekali" (kasus A), seharusnya "ada, tapi di akun lain" (kasus C).
  Level `warn` tidak berubah di kedua kasus (bukan false-negative), murni
  perbaikan judul/pesan.
- `data-health-check.js` sekarang pakai `resolveOwnerDefaultForAccount()`
  per akun lain (sumber sama dgn cabang utama DL-Next-7), fallback ke
  `a.owners[]` lama kalau fungsi belum termuat.
- `data-health-check.js` — **satu-satunya** file source produksi yang
  disentuh sesi ini.
- `tests/data-health-check-other-acc-owner-source-s581.test.js`
  (**baru**, 4 test — regresi utama AUDIT-13 dikonfirmasi fix).
- Full `npm test`: **4081 test, 4072 pass, 9 fail** (naik dari 4077/4068/9,
  +4 test baru semua pass) — 9 kegagalan identik pre-existing, **0
  regresi baru**.

Detail lengkap: `docs/FIX-v1310-to-v1312-s581-data-health-check-other-acc-owner-source-fix.md`.
