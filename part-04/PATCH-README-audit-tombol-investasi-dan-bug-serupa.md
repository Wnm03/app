# PATCH KUMULATIF — Audit "Tab Aset > Investasi: tombol tidak berfungsi" + bug serupa

Dua fix dengan akar penyebab yang SAMA PERSIS, digabung jadi satu patch (kumulatif,
build terakhir v1459):

## 1. InvestmentWatchUI.render() tanpa try/catch

**Laporan awal:** Tab Aset > Investasi, semua tombol tidak bereaksi, 0 toast, ADA error
di console.

**Root cause:** `InvestmentListUI.render()` memanggil 3 fungsi berurutan tiap tab
Investasi dibuka: `_renderSummary()` → `_renderList()` → `InvestmentWatchUI.render()`.
Dua yang pertama sudah dilindungi try/catch dari audit-audit sebelumnya — tapi
`InvestmentWatchUI.render()` (`modules/asset/investasi-watch-view.js`) TIDAK. Fungsi ini
dipanggil LANGSUNG dari `setAsetTab('investasi')`/`renderPageContent('aset')`, BUKAN
lewat dispatcher `data-action` (yang selalu toast). 1 item watchlist bermasalah ->
exception lolos -> console error tanpa toast -> alur setelahnya di pemanggil ikut batal
-> gejala "semua tombol tidak bereaksi".

**Fix:** `render()` dibungkus try/catch, pola sama persis `_renderSummary()`/
`_renderList()` — 1 item watchlist gagal fallback ke badge ⚠️, item lain tetap tampil.

## 2. PropertyManagementAPI.taxSummary() / depreciationSummary() — bug serupa

**Ditemukan lewat audit lanjutan** (pola yang sama dicari di seluruh call chain
`renderPageContent('aset')`): `modules/asset/property-management-api.js` punya 2 titik
identik — `PajakAset.hitungPBB(a, settings)` di `taxSummary()` dan `Penyusutan.hitung(a)`
di `depreciationSummary()`, keduanya dipanggil per-item TANPA try/catch. Celah ini murni
kelalaian: `AssetMaintenanceAPI.maintenanceOverview()` (file tetangga) sudah membungkus
panggilan `Penyusutan.hitung()` yang SAMA PERSIS sejak awal.

`PropertyManagementAPI.summary()` dipanggil dari `PropertyManagementPresenter.render()`,
yang JUGA dipanggil langsung dari `renderPageContent('aset')` (rantai yang sama persis
dengan InvestmentListUI.render()) — 1 aset properti dengan data yang bikin salah satu
fungsi ini throw akan menjatuhkan seluruh render tab Aset dengan gejala identik: console
error, 0 toast, tombol tidak bereaksi.

Diaudit juga (aman, tidak ada masalah): `rental-management-api.js` (reduce murni
aritmatika, 0 panggilan eksternal per-item), `asset-portfolio-api.js` (map di array
literal kecil, bukan data user), dan keempat `render()` presenter Aset (semuanya sudah
guard `s.ok` sebelum render kartu).

**Fix:** `taxSummary()` & `depreciationSummary()` dibungkus try/catch per item, pola
sama persis `AssetMaintenanceAPI.maintenanceOverview()`.

## File yang berubah (kumulatif)
- `modules/asset/investasi-watch-view.js` (`render()`)
- `modules/asset/property-management-api.js` (`taxSummary()`, `depreciationSummary()`)
- `app-bundle-a.min.js` / `app-bundle-b.min.js` (hasil build ulang)
- `index.html`, `app_production.html` (`?v=1457` → `?v=1459`)
- `sw.js` (`CACHE_NAME` → `kw-cache-v1459`)
- `tests/investasi-watch-render-guard-audit-tombol-investasi.test.js` (baru, 3 test)
- `tests/property-management-api-per-item-guard.test.js` (baru, 4 test)
- `docs/COVERAGE-PER-MODULE.md`, `docs/FILE-MAP.md` (regenerasi otomatis)
- `docs/CLAUDE.md` (2 catatan sesi)

## Verifikasi
- `node --check` lolos untuk kedua file source yang diubah.
- 2 file test baru: 7/7 pass total. Test terkait lain (investasi s467/s469/s540b-d/s552/
  s614, asset-nav-consistency-s252, dll): semua tetap pass.
- Full suite: **4920 test, 4920 pass, 0 fail** — 0 regresi.
- Build (`node scripts/build.js`) sukses, versi akhir **1459**, sintaks kedua bundle
  lolos `node --check`.

## Cara pasang
Timpa (overwrite) semua 12 file di atas ke lokasi yang sama di project — bundle & `sw.js`
WAJIB ikut diupload, bukan cuma source/HTML, supaya browser benar-benar memuat kode yang
sudah diperbaiki (bukan cache lama).

## Catatan
Kalau setelah patch ini tombol di tab Aset (Investasi ATAU sub-tab Manajemen properti)
masih tidak bereaksi, kemungkinan besar penyebabnya BUKAN lagi salah satu dari 2 titik di
atas — semua render langsung di rantai `renderPageContent('aset')` yang teridentifikasi
sudah dilindungi. Aktifkan toggle "Debug Console" di Pengaturan biar toast error
menunjukkan lokasi persis, atau kirim isi console error-nya untuk audit titik lain.
