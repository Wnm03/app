# FIX v1163 -> v1164 — Label sumber KM di odometer Car Notes

## Ringkasan

Mengerjakan rekomendasi #2 dari `FIX-v1162-to-v1163-s444-fuel-referencekm-selfheal-audit.md`:
"Hint sumber 'KM saat ini'" — label kecil di odometer Car Notes yang
menunjukkan dari log mana KM tertinggi itu berasal (BBM/servis/manual),
supaya user paham kenapa input KM yang lebih kecil "keliatannya" diabaikan
(`getVehicleKm()` pakai `Math.max()` dari 3 sumber log, bukan input
terakhir).

Rekomendasi #1 (diagnostic view long-press gauge utk `referenceKm`/
`deltaKm` mentah) **belum dikerjakan** — dipindah ke bagian "Rekomendasi
lanjutan" di bawah utk sesi berikutnya, sesuai arahan "satu poin dulu".

## Perubahan

- `modules/vehicle/vehicle-core.js`:
  - Fungsi BARU `getVehicleKmSource(vehicleId)` — 100% reuse 3 array yang
    sama persis dengan `getVehicleKm()` (`bbmLogs`/`servisLogs`/`kmLogs`,
    filter per `vehicleId`), tapi dipisah per-sumber dulu sebelum
    `Math.max()` supaya bisa tahu sumber mana yang menang. Balikin
    `{km, source}` dengan `source` salah satu dari `'bbm'|'servis'|
    'manual'|null`. Tie-break kalau 2 sumber sama-sama punya nilai max:
    `bbm > servis > manual` (urutan sama dengan urutan array
    `getVehicleKm()`, jadi nilai `km` yang dibalikin identik dengan
    `getVehicleKm()` — cuma nambah label sumber). Read-only, 0 field
    ditulis ke `D`.
  - Fungsi BARU `kmSourceLabel(source)` — mapping `source` -> teks label
    pendek (`'📋 dari log BBM'` / `'🔧 dari log Servis'` / `'✍️ dari input
    manual'` / `''`).
- `modules/shared/modules-render.js`:
  - `renderCnTab()` — baris yang mengisi `#cnCurKm` sekarang juga mengisi
    elemen baru `#cnCurKmSrc` lewat `getVehicleKmSource()` +
    `kmSourceLabel()`. Nilai KM yang ditampilkan di `#cnCurKm` TIDAK
    berubah (masih angka yang sama persis dengan `getVehicleKm()`) — murni
    tambahan label di bawahnya, guard `!document.getElementById(
    'cnCurKmInput')` yang sama tetap dipakai supaya label tidak ikut
    ke-refresh saat odometer lagi diedit inline.
- `index.html`, `app_production.html`:
  - Tambah `<div id="cnCurKmSrc" class="u-fs11 u-t3">` sebagai sibling
    `#cnCurKm` di card "Odometer Saat Ini" — markup/id/logic elemen
    `#cnCurKm` sendiri TIDAK diubah.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js` — hasil build
  ulang, versi v1163 -> v1164.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis.

## Yang TIDAK berubah (sengaja)

- Nilai `getVehicleKm()` itu sendiri — tidak disentuh, tetap `Math.max()`
  dari 3 log seperti sebelumnya. Perubahan ini murni menambah *visibility*
  atas nilai yang sudah ada, bukan mengubah cara odometer dihitung.
- Guard "KM yang diisi lebih kecil dari catatan terakhir..." di
  `commitCurKmEdit()` — sudah ada sejak sebelumnya, tidak ada perubahan
  perilaku di alur edit KM.
- Rekomendasi #1 (diagnostic view long-press gauge) — belum dikerjakan,
  lihat "Rekomendasi lanjutan" di bawah.

## Verifikasi

```
node --test tests/*.test.js
# 2920/2920 pass, 0 fail (tidak ada test baru ditambahkan sesi ini —
# perubahan murni presentasional/read-only, di-cover cukup oleh
# regression test getVehicleKm() yang sudah ada).

node scripts/build.js
# build sukses, sintaks kedua bundle valid, v1163 -> v1164.
```

## Rekomendasi lanjutan (belum dikerjakan, kandidat sesi berikutnya)

1. **Diagnostic view untuk dev** (rekomendasi #1 dari sesi S444, belum
   dikerjakan): expose `referenceKm`/`deltaKm`/`estimationLimited` mentah
   di suatu tempat (mis. long-press pada gauge fuel) biar audit serupa ke
   depan lebih cepat tanpa perlu baca kode.
2. Kalau nanti ada permintaan untuk menampilkan *tanggal* log sumber KM
   (bukan cuma jenis sumbernya), `getVehicleKmSource()` bisa diperluas
   balikin objek log aslinya (bukan cuma `km`) — sengaja belum dilakukan
   sekarang supaya perubahan tetap minimal (1 field baru: label sumber).
