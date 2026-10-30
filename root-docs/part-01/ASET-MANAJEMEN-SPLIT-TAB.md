# Dashboard — Migrasi Widget Aset ke Tab "Manajemen" (page-aset)

## Kenapa
4 widget domain Aset (Property Management, Rental Management, Asset
Portfolio, Asset Maintenance — S101-104) sebelumnya cuma numpuk di
Dashboard Hub sub-tab "Insight", padahal isinya murni domain Aset
(bukan lintas-domain seperti LifeOS/EIE/Cross yang memang harus di
Dashboard). Bikin Dashboard Hub kepanjangan & datanya lebih pas dicari
di tab Aset. Pola yang dipakai SAMA PERSIS Sesi 133 (Finance/Vehicle
dipindah dari Dashboard Hub ke tab Keuangan/Car Notes masing-masing).

## Perubahan
- **`index.html`** — tambah tab ke-4 "🏢 Manajemen" di `#page-aset`
  (`.cn-tabs`), berisi 4 widget yang dipindah dari Dashboard Hub
  (container HTML-nya dipindah apa adanya, bukan disalin/duplikat).
- **`modules/asset/aset.js`** — `ASET_TAB_ORDER`/`setAsetTab()` nambah
  opsi `'manajemen'`, toggle `u-dnone` pola sama 3 tab lain.
- **`modules/dashboard-hub/dashboard-hub.js`** — `ASET_TAB_IDX` nambah
  `manajemen: 3` (dipakai navigasi tab dari kartu manapun); hapus 4
  panggilan `.render()` presenter ini dari `DashboardHub.render()`
  (container-nya sudah tidak ada di sana); hapus 4 id itu dari
  `SECTION_GROUPS.insight`.
- **`modules/shared/modules-render.js`** — tambah 4 panggilan
  `.render()` presenter ke branch `renderPageContent('aset')`, supaya
  widget terisi begitu user buka tab Aset (pola sama `renderKeuangan()`/
  `renderCnTab()` di Sesi 133).
- Fungsi presenter sendiri (`PropertyManagementPresenter` dkk) **0
  perubahan** — 100% reuse, cuma pindah lokasi tampil & lokasi
  pemanggilan.
- Live-refresh generik di `renderDashboard()` (`_safeRender` block)
  SENGAJA tidak disentuh — presenter tetap dipanggil ulang tiap ada
  `save()` di halaman manapun, supaya tab Manajemen tetap live-update
  kalau user sedang di tab itu saat data berubah dari tempat lain.

## Verifikasi
```
node --test
# 1150/1151 pass — 1 fail (self-test.js, pre-existing, tidak terkait)

node scripts/build.js aset-manajemen-split-tab-migration
# ✅ Build selesai, lint u-dnone/style.display lolos, ?v=747
```

## Belum disentuh (opsional sesi berikutnya)
`FEATURE_REGISTRY` belum ada entri baru yang menunjuk `goTo` ke 4
widget ini secara langsung (sebelumnya juga tidak ada) — bisa
ditambahkan supaya widget ini bisa ditemukan lewat pencarian Dashboard
Hub, tapi di luar cakupan migrasi ini.
