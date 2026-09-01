# SESSION-NOTE-S698 — Kategori di dashboard ringkasan dapat pola klik-ke-sumber (item tertunda dari S697)

**Basis akumulasi:** ZIP ini dibangun DI ATAS
`kw-patch-s697-2026-09-01-fix-live-file-relocation.zip` (relokasi Fix 1/S694
& label bulan Fix 2/S695 ke file `renderLaporan()` yang benar-benar live,
versi 1511). Timpa semua file di ZIP ini ke project asli.

## Konteks

Item ini adalah yang tertunda dari SESSION-NOTE-S697 (poin "Belum
dikerjakan"): audit widget "Kategori Teratas" di Dashboard
(`renderDashLaporanMini()` → `#dashLapKatMini`,
`modules/shared/modules-render-b.js`) sudah terkonfirmasi ADA tapi BELUM
punya pola klik-ke-sumber, berbeda dari kartu kategori Laporan (`#lapKat`,
Fix 1/S694) yang sudah bisa diklik untuk lihat transaksi asal.

## Fix (SELESAI, source + test)

Pola SAMA PERSIS dengan Fix 1 (S694) — 100% reuse `showFilteredTx()` +
dispatcher `data-action` global yang sudah ada, 0 mekanisme baru:

- `modules/finance/filter-laporan.js`, `showFilteredTx()`: parameter
  opsional ke-5 `kat` SEBELUMNYA cuma diterapkan di blok `scope==='laporan'`.
  Ditambah guard yang sama persis (`if(kat)txs=txs.filter(t=>
  t.category===kat);`) ke blok `scope==='dashboard'`. Aditif murni —
  pemanggil lama scope `'dashboard'` tanpa argumen ke-5 (kartu
  "Pemasukan"/"Pengeluaran" bulan ini, dll) 0 regresi karena `kat` default
  `undefined` → guard skip.
- `modules/shared/modules-render-b.js`, `renderDashLaporanMini()`: tiap
  baris kategori di `#dashLapKatMini` dibungkus
  `data-action="showFilteredTx"` + `data-args` (`['dashboard','all','📁
  '+k,null,k]`, di-escapeHtml) — pola identik `#lapKat`. Tap kategori
  dashboard sekarang buka `filterTxModal` isi transaksi kategori itu utk
  bulan berjalan.

## Test

`tests/s698-dashboard-kategori-click-tosource.test.js` (5 test, baru):
1. `showFilteredTx('dashboard','all',label,null,'Makan')` — hanya transaksi
   bulan berjalan + kategori itu yang ikut (lewat `loadSource`, fungsional).
2. `showFilteredTx('dashboard',...)` tanpa `kat` — 0 regresi, pola lama
   (semua kategori bulan berjalan) tetap jalan.
3. `showFilteredTx('laporan',...)` — perilaku scope lain tidak berubah oleh
   fix scope dashboard sesi ini.
4. Struktural: `filter-laporan.js` blok scope dashboard punya guard filter
   `kat`.
5. Struktural: `modules-render-b.js` blok `#dashLapKatMini` punya
   `data-action="showFilteredTx"` + `data-args` ke `['dashboard','all','📁
   '+k,null,k]`.

Full suite lokal: **5273/5273 pass, 0 fail** (5268 dari basis S697 + 5 test
baru sesi ini).

## Build

`node scripts/build.js` dijalankan — versi naik **1511 → 1512**.
`app-bundle-a.min.js`/`app-bundle-b.min.js` ter-generate ulang (esbuild
masih belum tersedia — TANPA minifikasi, tetap 100% valid, sama seperti
4 sesi sebelumnya). `app_production.html` ditulis ulang sebagai cermin
persis `index.html`. `sw.js` CACHE_NAME → `kw-cache-v1512`.

Gate `verify-release-ready.js`: `html-sync` & `version-sync` LOLOS bersih.
`lint`/`minify` di-override manual dengan alasan sama seperti sesi
sebelumnya (sandbox tanpa akses jaringan). Lihat `docs/RELEASE-GATE-LOG.md`.

## File yang berubah di ZIP ini

- `modules/finance/filter-laporan.js` — **fix utama sesi ini**: guard
  filter `kat` ditambah ke blok `scope==='dashboard'` di `showFilteredTx()`
- `modules/shared/modules-render-b.js` — **fix utama sesi ini**:
  `#dashLapKatMini` (`renderDashLaporanMini()`) dibungkus
  `data-action="showFilteredTx"` + `data-args`; sisanya (fungsi
  `renderLaporan()` dari S697) dipertahankan, TIDAK diubah lagi sesi ini
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — hanya konstanta
  versi ter-bump otomatis oleh `build.js`, 0 perubahan logic
- `index.html`, `app_production.html`, `sw.js` — versi `?v=1512` /
  `kw-cache-v1512`
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — regenerasi build (versi
  1512) — pertama kali membawa efek fix sesi ini ke app nyata
- `tests/s698-dashboard-kategori-click-tosource.test.js` — baru
- `modules/modules-render.js` — file DEAD (S697), dipertahankan APA ADANYA,
  TIDAK disentuh sesi ini (keputusan hapus tetap diserahkan ke user)
- `modules/finance/tx-list-cashflow.js`,
  `modules/finance/dana-titipan-aggregation-api.js`,
  `modules/finance/dana-titipan-portfolio-render.js` — dari patch
  sebelumnya (dipertahankan, TIDAK diubah)
- `tests/s697-renderLaporan-live-file-fix-relocation.test.js`,
  `tests/s694-laporan-kategori-click-tosource.test.js`,
  `tests/s695-laporan-month-slide.test.js`,
  `tests/s696-full-period-range-hari-minggu-tahun.test.js`,
  `tests/s595-titipan-majoris-renov-reconcile.test.js`,
  `tests/patch-2026-08-14-b-majoris-deductionowner-sync.test.js`,
  `tests/fix-holding-direct-account-titipan-and-ghost-asset-link.test.js`
  — dari sesi/patch sebelumnya (dipertahankan)
- `FILE-MAP.md`, `COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `SESSION-NOTE-S694.md`, `SESSION-NOTE-S695.md`, `SESSION-NOTE-S696.md`,
  `SESSION-NOTE-S697.md` — dipertahankan dari patch sebelumnya (riwayat
  akumulasi)

## Belum dikerjakan (di luar scope sesi ini, tetap di daftar audit)

- **"Semua Transaksi" (tab Kelola)** — slide bulan (`changeTxListMonth`)
  belum dicek apakah punya bug serupa Fix 2 (label terpotong di "hari
  ini" untuk chip lain). Belum diaudit sesi ini.
- **`renderGrafik()` (chart Laporan)** — belum diverifikasi manual apakah
  ikut update range sesuai `lapMonthOffset` atau baca `getRange()`
  langsung.
- `economic-intelligence/` — belum disentuh.
- Audit ulang `BUG_REGISTRY.md` pasca-disiplin S656 — belum dikerjakan.
- Penghapusan file dead `modules/modules-render.js` (dan file dead lain
  di `scripts/remove-shop-dead-files.sh`) — masih menunggu keputusan user.
- Restore `esbuild` / pemecahan `scripts/build.js` (2444 baris, di atas
  ambang 1600) — belum dikerjakan (butuh akses jaringan, di luar sandbox
  ini).
