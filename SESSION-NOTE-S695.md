# SESSION-NOTE-S695 — Slide bulan sebelum/sesudah di filter Laporan

**Basis akumulasi:** ZIP ini dibangun DI ATAS `kw-patch-s694-2026-09-01-
laporan-kategori-click-tosource.zip` (Fix 1: kategori Laporan klik ke
transaksi asal, versi 1508) YANG SUDAH mengakumulasi fix Majoris/
deductionOwner source (versi 1507→1508). Kedua fix sebelumnya TIDAK
disentuh sama sekali di sesi ini dan tetap ikut utuh di ZIP ini. Timpa
semua file di ZIP ini ke project asli.

## Yang dikerjakan sesi ini (S695 — Fix 2, sebelumnya ditunda dari S694)

**Fix 2 — slide bulan sebelum/sesudah di filter Laporan (SELESAI, source +
UI/HTML):**

- `modules/shared/features-helpers-global-security.js` — state baru
  `let lapMonthOffset=0;`, TERPISAH dari `curMonth`/`curYear` (dipakai tab
  Keuangan/dashboard lain lewat `changeMonth()`). 0 = bulan berjalan,
  +N/-N = N bulan sesudah/sebelum bulan berjalan.

- `modules/finance/tx-list-cashflow.js`:
  - `setPeriode(p, el)` — mereset `lapMonthOffset` ke 0 tiap chip
    "Bulan Ini" di-tap (termasuk RE-tap chip yang sama), supaya user yang
    sudah geser ‹ › ke bulan lampau lalu tap ulang "Bulan Ini" balik ke
    bulan berjalan. Juga toggle visibility `#lapMonthNav` (`u-dnone`) —
    nav ‹ › cuma tampil saat `filterPeriode==='bulan'`, pola sama toggle
    `#customRange`.
  - `changeLapMonth(dir)` (baru) — geser `lapMonthOffset`, panggil
    `renderLaporan()`. TIDAK menyentuh `curMonth`/`curYear` sama sekali
    (pola SEPARATE STATE, bukan reuse `changeMonth()`, supaya geser bulan
    di panel Laporan tidak ikut menggeser bulan aktif tab Keuangan lain
    yang kebetulan baca `curMonth`/`curYear` sama).
  - `getRange()` cabang `filterPeriode==='bulan'` — SEBELUMNYA selalu
    `from`=awal bulan berjalan, `to`=**sekarang** (terpotong di "hari ini",
    bukan akhir bulan — jadi 0 cara lihat transaksi bertanggal ke depan di
    bulan yang sama, apalagi bulan lain). SEKARANG pakai
    `lapMonthOffset` untuk menentukan bulan target, dan mengembalikan
    **rentang penuh 1 bulan** (tanggal 1 s/d akhir bulan target) — pola
    sama `getTxListRange()` (`txListPeriode==='bulan'`) yang sudah lebih
    dulu begini untuk kartu "Semua Transaksi".

- `modules/modules-render.js` — `renderLaporan()` mengisi label
  `#lapMonthLabel` (`MONTHS_FULL[bulan] + tahun`) dari `now + lapMonthOffset`,
  pola sama `txListMonthLabel` di `renderKeuangan()`.

- `index.html` — UI baru: blok `.month-nav` `#lapMonthNav` (tombol ‹ ›
  `data-action="changeLapMonth"` + label `#lapMonthLabel`) ditambahkan di
  atas `#periodeChips` (panel filter Laporan), reuse class `.month-nav`/
  `.month-nav-btn`/`.month-nav-label` yang sudah ada (0 CSS baru). Nav ini
  visible by default (konsisten dengan `filterPeriode` default `'bulan'`)
  dan otomatis disembunyikan/ditampilkan oleh `setPeriode()` sesuai chip
  yang aktif.

## Test

`tests/s695-laporan-month-slide.test.js` (12 test, baru):
1. `changeLapMonth(dir)` menggeser `lapMonthOffset`, TIDAK menyentuh
   `curMonth`/`curYear`.
2. `changeLapMonth(dir)` memanggil `renderLaporan()` tiap geser.
3. `setPeriode('bulan', el)` mereset `lapMonthOffset` ke 0, termasuk saat
   RE-tap chip yang sama.
4. `setPeriode(p!=='bulan', el)` menyembunyikan `#lapMonthNav`.
5. `setPeriode(p!=='bulan')` TIDAK mereset `lapMonthOffset` (dipertahankan
   sampai user balik ke chip Bulan Ini).
6. `getRange()` `filterPeriode==='bulan'`, offset 0 → rentang penuh bulan
   berjalan (bukan terpotong "hari ini").
7. `getRange()` offset -1 → rentang penuh bulan lalu.
8. Penyeberangan tahun (Januari, offset -1 → Desember tahun sebelumnya) —
   dibuktikan lewat normalisasi `Date` bawaan JS yang dipakai source.
9. `getRange()` chip selain "bulan" (mis. tahun) — 0 regresi,
   `lapMonthOffset` tidak dipakai sama sekali.
10–12. Cek struktural: deklarasi `lapMonthOffset`, markup `#lapMonthNav` +
   `data-action="changeLapMonth"` di `index.html`, dan
   `renderLaporan()` mengisi `#lapMonthLabel` dari `lapMonthOffset`.

Full suite lokal: **5254/5254 pass, 0 fail** (5242 dari basis S694 + 12 test
baru sesi ini).

## Build

`node scripts/build.js` dijalankan — versi naik **1508 → 1509**.
`app-bundle-a.min.js`/`app-bundle-b.min.js` ter-generate ulang (esbuild
tidak tersedia — TANPA minifikasi, tetap 100% valid). `app_production.html`
ditulis ulang sebagai cermin persis `index.html` (termasuk `lapMonthNav`
baru). `sw.js` CACHE_NAME → `kw-cache-v1509`. Gate `checkHtmlSync()` &
`verify-release-ready` lolos (sempat gagal di run pertama sebelum build
ke-2 dijalankan — sudah dikonfirmasi lolos setelah build final).

## File yang berubah di ZIP ini

- `modules/shared/features-helpers-global-security.js` — `lapMonthOffset`
  (baru, Fix 2) + bump versi
- `modules/finance/tx-list-cashflow.js` — `setPeriode()`/`changeLapMonth()`/
  `getRange()` (Fix 2, baru sesi ini)
- `modules/modules-render.js` — label `#lapMonthLabel` di `renderLaporan()`
  (Fix 2) — Fix 1 (S694, kategori Laporan klik) tetap ikut, tidak diubah
- `modules/finance/filter-laporan.js` — dari S694 (dipertahankan, TIDAK
  diubah sesi ini)
- `index.html`, `app_production.html` — blok `#lapMonthNav` baru + versi
  `?v=1509`
- `modules/finance/dana-titipan-aggregation-api.js`,
  `modules/finance/dana-titipan-portfolio-render.js` — dari patch Majoris
  (dipertahankan, TIDAK diubah sesi ini)
- `tests/s695-laporan-month-slide.test.js` — baru
- `tests/s694-laporan-kategori-click-tosource.test.js`,
  `tests/s595-titipan-majoris-renov-reconcile.test.js`,
  `tests/patch-2026-08-14-b-majoris-deductionowner-sync.test.js`,
  `tests/fix-holding-direct-account-titipan-and-ghost-asset-link.test.js` —
  dari sesi/patch sebelumnya (dipertahankan)
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js` — regenerasi build
  (versi 1509)
- `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `chat-action-handlers.js` — hanya konstanta versi ter-bump otomatis oleh
  `build.js` (0 perubahan logic)
- `FILE-MAP.md`, `COVERAGE-PER-MODULE.md` (root & `docs/`) — regenerasi
  otomatis
