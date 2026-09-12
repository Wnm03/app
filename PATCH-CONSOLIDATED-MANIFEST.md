# PATCH CONSOLIDATED — app-main-81

Hasil akumulasi dari **15 file patch** yang diupload (SOT-07 s/d SOT-20,
PATCH-TX-SERVIS-FALLBACK-FIX, PATCH-FIX-AND-TEST-FINAL-STABILIZATION)
menjadi **1 folder/zip final**, tanpa kehilangan perubahan dari sesi mana pun.

## Cara menyusunnya (urutan & alasan)

1. **Base = s20_out (PATCH-CATEGORY-SOT-20)** — ini snapshot paling lengkap &
   paling baru; setiap patch SOT bersifat kumulatif dari SOT sebelumnya
   (S07→...→S17→S18→S19→S20), jadi S20 sudah otomatis memuat S07–S19,
   termasuk S18 yang zip-nya sendiri tidak diupload (isinya tetap ada
   di dalam s19_out/s20_out).
2. **Ditumpuk di atas S20: `PATCH-FIX-AND-TEST-FINAL-STABILIZATION`**
   — dicek dgn diff, ini genuinely lanjutan S20 (bukan cabang lama):
   - `modules/vehicle/vehicle-analytics-presenter.js` → tambahan expose
     `window.VehicleAnalyticsPresenter` (1 baris genuine fix, sisanya identik).
   - Semua test lain di patch ini (`service-filter-s17`,
     `service-category-component-checklist-s16`,
     `honda-oem-catalog-master-s20`,
     `finance-service-component-checklist-s16`) **byte-identical** dengan
     versi S20 — dilewati (tidak ada perubahan riil).
   - Test baru `honda-oem-service-mapping-s22.test.js` ⚠️ **lihat bagian
     GAP di bawah.**
3. **Dikembalikan dari sesi S07–S09 / `PATCH-TX-SERVIS-FALLBACK-FIX`:**
   `tests/tx-servis-purchase-stock-categorysync-s629.test.js` — test ini
   valid & tidak pernah berubah isinya sejak S07, tapi sempat tidak
   ikut dibundel lagi mulai S10. Ditambahkan kembali ke `tests/`.

## Sengaja TIDAK dipakai (agar tidak jadi regresi)

- **`modules/finance/tx-servis.js` dari `PATCH-TX-SERVIS-FALLBACK-FIX`**
  — file ini di-diff dan ternyata dibuat dari baseline JAUH LEBIH LAMA
  (376 baris di S20 vs 240 baris di sini): tidak punya
  `masterCategoryId`, `serviceComponentId`, `checklist`,
  `ServiceEventLifecycle.update()`, atau idempotency
  `findServiceEventForTransaction()` dari S11–S13. Fungsi
  `_resolveServisCategoryId()` yang jadi tujuan fix di patch ini
  **sudah identik byte-per-byte** dengan yang ada di S20 — jadi fix-nya
  sudah include, memakai file lama ini justru akan **menghapus fitur
  S11–S20**. File ini tidak disalin.
- Manifest/README lama yang sudah digantikan naming/versi baru:
  `CATEGORY-SOT-07/08/09-MANIFEST.json`, `PATCH-MANIFEST.json` (S07/S11-fix),
  `PATCH-README-CATEGORY-SOT-11.md`, `modules/modals.js` (versi lama,
  sudah pindah ke `modules/shared/modals.js` sejak S12).
  Tidak ada isi kode/dokumentasi unik yang hilang dari ini — semuanya
  supersede oleh dokumen/lokasi baru di S20 (`docs/FILE-MAP.md`,
  `docs/COVERAGE-PER-MODULE.md`, `PATCH-README-CATEGORY-SOT-13..20.md`).

## ⚠️ GAP yang TIDAK BISA saya tutup dari 15 file ini

`tests/honda-oem-service-mapping-s22.test.js` (ikut dibawa dari
FIX-AND-TEST-FINAL-STABILIZATION) me-`require`/load module:

```
modules/vehicle/honda-oem-service-mapping.js
```

**File source ini TIDAK ADA di 15 zip yang diupload** — hanya test-nya
yang "selamat". Ini kemungkinan besar hasil sesi "S21/S22" yang
zip-nya tidak ikut diupload kali ini (tidak ada README-SOT-21 atau
SOT-22 di manapun, beda dengan S18 yang reametadata-nya masih ada
di dalam S19/S20).

**Test ini SAYA IKUTKAN di folder `tests/`, tapi akan FAIL/error module
not found sampai file `modules/vehicle/honda-oem-service-mapping.js`
dari sesi tsb di-upload & ditambahkan.** Supaya tidak ada history yang
hilang lagi, upload patch sesi S21/S22 (kalau masih ada) dan saya
gabungkan lapis berikutnya di atas paket ini.

## Isi akhir (57 file)

Struktur lengkap ada di `docs/FILE-MAP.md` (auto-generated per S20) —
mencakup seluruh `modules/`, `scripts/`, `tests/`, `docs/`, plus
`index.html`, `app_production.html`, `sw.js`, `app-bundle-a.min.js`,
`app-bundle-b.min.js`, `package.json`.

Catatan: paket ini adalah **overlay/patch di atas repo app-main-81
kamu**, bukan aplikasi utuh — modul-modul lain (Shop, Aset, Budget,
dll., total ±338 file source per FILE-MAP.md) tetap ada di repo asli
kamu dan tidak termasuk di paket ini karena memang tidak disentuh
patch SOT manapun.
