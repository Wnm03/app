# PATCH-CATEGORY-SOT-18 — Service Category/Component Filter Across Dashboard + Finance

Kumulatif dari PATCH-CATEGORY-SOT-17.

## Tujuan
Memperluas konsep S16/S17:
`Kategori -> daftar komponen -> komponen yang benar-benar dicentang -> Service Event -> D.servisLogs`
ke area pembacaan/analitik tanpa membuat SoT baru.

## Perubahan
- Vehicle Analytics: filter Kategori Servis + Komponen Servis dan ringkasan biaya servis berdasarkan log servis aktual.
- Vehicle Service Trend Summary: menerima filter canonical `masterCategoryId` / `serviceComponentId` dan tetap membaca melalui `VehicleTrendAPI`.
- Finance > Semua Transaksi: filter Kategori Servis + Komponen Servis. Relasi dicari melalui `servisLinkId` ke `D.servisLogs`; tidak menyalin `serviceComponentId` menjadi SoT baru di transaksi.
- Reset filter Finance juga mereset filter servis.
- Filter komponen bersifat cascading: komponen hanya tersedia setelah kategori dipilih.
- Kategori tidak berarti semua komponennya dikerjakan.

## Domain yang sengaja tidak diubah
- Tagihan tetap domain terpisah dari Service Event.
- Asset tetap memakai relasi Service Event, bukan checklist baru.
- AI tetap hanya membaca/menjelaskan data; bukan SoT interval/reminder.

## Validasi
- S12: 8/8 PASS
- S13: 7/7 PASS
- S14: 4/4 PASS
- S15: 5/5 PASS
- S16: 3/3 + 1/1 PASS
- S17: 3/3 PASS
- S18: 6/6 PASS
- Syntax target S18: PASS
- Full build: PASS; bundle syntax PASS.
- esbuild tidak tersedia, sehingga bundle build valid tetapi belum diminify.
- Full regression suite aplikasi belum dinyatakan PASS; baseline lama masih memiliki failure/timeout seperti status audit sebelumnya.

## Build
Build menghasilkan versi sinkron `v1655` pada HTML/SW/source version constants.
