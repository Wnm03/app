# FIX — CI / Production Release Gate — 2026-10-08

## Masalah yang diperbaiki

1. GitHub Actions masih memakai `actions/checkout@v4` dan `actions/setup-node@v4`, sehingga runner menampilkan peringatan Node.js 20 deprecated.
2. Workflow masih memakai `ubuntu-latest`, yang akan berpindah image ke Ubuntu 26 dan berpotensi mengubah lingkungan build.
3. Production release memakai `npm install`, bukan install terkunci.
4. `modules/shop/modules-render.js` masih ada walaupun sudah tercantum pada `DELETE-FILES.txt`; ini membuat `verify-release-ready` gagal pada `delete-manifest` dan ikut memblokir `production-gate`.
5. Artifact upload diperbarui ke runtime Node.js 24.

## Perubahan

- `actions/checkout@v4` → `@v7`
- `actions/setup-node@v4` → `@v7`
- `actions/upload-artifact@v4` → `@v7`
- Runner `ubuntu-latest` → `ubuntu-24.04`
- Project CI/release Node.js → 24
- Production dependency install: `npm install` → `npm ci`
- Menghapus file legacy/orphan `modules/shop/modules-render.js` sesuai `DELETE-FILES.txt`
- Tidak mengubah UI/business logic aktif.

## Validasi

- Test targeted legacy-renderer: **4/4 PASS**.
- `npm run test:critical`: **10/10 PASS**.
- `verify-patch-integrity`: **PASS**.
- `verify-patch-contamination`: **PASS**.
- `verify-bundle-freshness`: **PASS**.
- Release gate setelah fix: semua gate substantif **PASS**; local sandbox masih tidak memiliki `eslint` dan pinned `esbuild 0.24.0`, sehingga dua gate environment-only di-override untuk validasi lokal. Production workflow melakukan `npm ci` + `npm run build:release`, sehingga gate tersebut harus dijalankan tanpa override di GitHub Actions.
- Full regression runner dicoba dengan konfigurasi production (`32` shards / concurrency `4`), tetapi melebihi batas eksekusi sandbox; hasil tersebut **tidak diklaim sebagai PASS maupun FAIL**.

## Catatan penting

Jangan menambahkan override lint/minify ke workflow production. Override hanya digunakan untuk validasi lokal ketika toolchain sandbox tidak tersedia.
