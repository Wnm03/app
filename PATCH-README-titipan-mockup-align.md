# PATCH v2 — Dana Titipan: selaraskan tampilan ke mockup

## Kenapa patch pertama (source-only) tidak kelihatan di layar

Screenshot kedua (`Screenshot_2026-08-17-13-36-45-758...`) identik persis
dgn screenshot pertama — 0 perubahan visual sama sekali. Root cause:
`app_production.html`/`index.html` MEMUAT `app-bundle-a.min.js` /
`app-bundle-b.min.js` (hasil concat+build `scripts/build.js`), BUKAN file
source `modules/finance/dana-titipan-portfolio-render.js` langsung.
Patch v1 cuma berisi file source mentah — tanpa `node scripts/build.js`
dijalankan & bundle-nya di-upload ulang, browser tetap memuat bundle LAMA
yang belum punya class `.titipan-card`/`.titipan-owner-avatar`/dst, jadi
CSS baru di `styles.css` juga tidak ada yang "menyala" (0 elemen di DOM
pakai class itu).

## Isi patch v2 (kali ini SUDAH termasuk hasil build, siap upload)

Source yang benar-benar diedit (sama persis dgn patch v1, 0 perubahan
tambahan):
- `modules/finance/dana-titipan-portfolio-render.js`
- `styles.css`
- `tests/s643-audit-lintas-s641-s642.test.js`
- `tests/s645-dana-titipan-owner-list-tabel-modern.test.js`

File TURUNAN hasil `node scripts/build.js` (wajib ikut di-upload karena
inilah yang benar-benar dimuat browser + biar versi tetap sinkron sesuai
konvensi `verify-release-ready`):
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — bundle baru, sudah
  mengandung fix (diverifikasi: `titipan-card-hero`/`titipan-owner-avatar`/
  `titipan-audit-toggle`/"Rincian Audit" ADA di dalam bundle, `node --check`
  lolos utk keduanya).
- `app_production.html`, `index.html` — query `?v=1377` (naik dari 1376).
- `sw.js` — `CACHE_NAME` jadi `kw-cache-v1377`.
- `chat-action-handlers.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `modules/shared/modules-render.js`,
  `modules/shared/features-helpers-global-security.js` — HANYA bump
  konstanta versi (`s642-...` → `s643-...`), 0 logic diubah di 5 file ini.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — dokumentasi
  auto-generate, ikut diperbarui oleh `build.js`.

**Verifikasi:** `node --test tests/*.test.js` → 4628/4628 lolos (dijalankan
ulang setelah build). `node --check` lolos utk kedua bundle.

## Cara pasang

1. Timpa SEMUA file di atas ke lokasi yang sama (root project /
   `wnm03.github.io/app/`).
2. Push/upload — SEMUA file wajib ikut naik bareng (bukan cuma
   `index.html`/`app_production.html`), karena `?v=1377` di HTML akan
   coba muat `app-bundle-b.min.js?v=1377` — kalau file bundle lama masih
   ada di server tapi belum ketimpa, browser 404/pakai cache lama.
3. Hard refresh (atau clear cache PWA) di HP setelah upload, karena
   `sw.js` (`CACHE_NAME v1377`) perlu re-registrasi service worker biar
   versi lama di cache PWA tidak nyangkut.

## Rekap perubahan visual (sama dgn v1, sekarang benar-benar live)

- Kartu ringkasan pool ("👥 Sudah Dialokasikan" dst) & kartu "Total
  Teralokasi" jadi kartu bulat dgn angka hero besar (bukan kotak dashed).
- Kartu per-pemilik jadi kartu bulat + avatar inisial (bukan flat/`⚠️`
  polos).
- Rincian audit (Pengeluaran Majoris/Sisa Saldo/warning mismatch/Total
  Kelebihan Alokasi) disembunyikan di balik "🔍 Rincian Audit &
  Rekonsiliasi" (collapsed by default) — "Total Teralokasi" tetap selalu
  kelihatan.
- Badge "⚠️ Rp X" jadi pil merah, bukan teks polos.
- Berlaku di SEMUA tema (bukan cuma `[data-theme="modern"]`), termasuk
  tema default yang dipakai di screenshot.

## Belum diimplementasikan (usulan lanjutan, di luar scope 1 patch ini)

- Porsi % per pemilik di kartu (perlu field baru di
  `DanaTitipanPortfolioAPI.build()`, bukan murni CSS/markup).
- Restrukturisasi kalimat warning mismatch Majoris/Renov jadi badge
  ringkas — perlu keputusan Design Lock krn menyangkut isi pesan.
- `dana-titipan-portfolio-render.js` sekarang 1605 baris (ambang lint
  1600) — pertimbangkan pecah file spt pola `aset.js`/`aset-reports.js`
  di sesi mendatang.
