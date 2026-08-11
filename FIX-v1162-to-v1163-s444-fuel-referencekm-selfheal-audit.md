# FIX v1162 -> v1163 — Audit lanjutan (fuel bar statis walau KM di-update)

## Ringkasan

User lapor: fuel bar/analisa BBM (Vario 125, "Sisa BBM 5.5L (100%)") tetap
statis walau odometer di-update lewat Car Notes. Audit awal (chat) sudah
konfirmasi rantai render (`saveKm()`/`commitCurKmEdit()` -> `renderCnTab()`
-> `FuelCard.render()` dst) & mesin `FuelStateEstimator` sudah reaktif thd
KM secara kode. Root cause sebenarnya: `fuelState.referenceKm` — field yang
baru ada mulai Sesi 415 (v1122) — TIDAK ADA di data lama (ditulis sebelum
sesi itu, "TIDAK ADA migrasi otomatis" by design saat itu, lihat
`FIX-v1121-to-v1122-s415-fuel-state-estimator.md`). Tanpa `referenceKm`,
`estimateCurrentLiter()` PERMANEN balikin `estimationLimited:true` — liter
beku di angka lama, konsumsi km TIDAK PERNAH dikurangi, 0 indikator di UI
yang menjelaskan kenapa.

## Perubahan

- `modules/vehicle/vehicle-core.js`:
  - Fungsi BARU `healFuelStateReferenceKm()` — self-heal: kalau
    `fuelState.currentFuelLiter` ada tapi `referenceKm` belum (data lama),
    isi `referenceKm` = `getVehicleKm()` SAAT INI (titik acuan baru mulai
    sekarang; KM sebelum heal ini tidak direkonstruksi mundur — prinsip
    sama persis yang sudah dipakai `FuelStateEstimator`). Idempotent &
    murah (early-return kalau tidak ada yang perlu di-heal), aman dipanggil
    berkali-kali.
- `modules/shared/modules-render.js`:
  - `renderCnTab()` — panggil `healFuelStateReferenceKm()` di baris
    pertama, SEBELUM semua presenter fuel (`FuelCard`, `FuelDashboard`,
    dst) di-render — jadi self-heal jalan otomatis begitu halaman Car
    Notes dibuka, 0 aksi manual dibutuhkan dari user.
- `modules/vehicle/fuel-card.js`:
  - Fungsi BARU `_estimationLimitedHint(vehicleId)` — sisi UI dari
    `estimationLimited`. Sekarang cuma tampil kalau penyebabnya
    `kmPerLiter` null (data full-tank kendaraan itu belum cukup, min. 2x)
    — kasus `referenceKm` null praktis sudah tidak pernah kejadian lagi
    krn self-heal di atas jalan duluan.
  - `_body()` — sisipkan nudge baru "⚠️ Estimasi belum mengurangi konsumsi
    km (butuh min. 2x catat 'Isi Full Tank' dengan km naik)..." di antara
    nudge low-confidence & Fuel Briefing — independen, bisa tampil
    bersamaan dgn nudge lain.
- `tests/fuel-state-referencekm-selfheal-s444.test.js` — BARU, 6 test
  (backfill dari data lama, reaktif setelah heal, idempotent, kendaraan
  tanpa fuelState, multi-kendaraan).
- `tests/fuel-card.test.js` — 7 test baru (`_estimationLimitedHint()` 4
  kasus guard, nudge tampil/tidak tampil sesuai reason).
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang, versi v1162 -> v1163.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis.

## Yang TIDAK berubah (sengaja)

- Rumus konsumsi/estimasi di `FuelStateEstimator` — 0 rumus baru, murni
  backfill 1 field yang sudah ada di skema.
- Kasus KM Car Notes yang diisi user < KM tertinggi yang sudah tercatat di
  log BBM/servis (karena `getVehicleKm()` pakai `Math.max`) — ini SUDAH
  ditangani guard existing ("KM yang diisi lebih kecil dari catatan
  terakhir..."), bukan bug baru.

## Verifikasi

```
node --test tests/*.test.js
# 2920/2920 pass (2907 lama + 13 baru), 0 fail.

node scripts/build.js s444-fuel-referencekm-selfheal-audit
# build sukses, sintaks kedua bundle valid, v1162 -> v1163.
```

## Rekomendasi lanjutan (belum dikerjakan, kandidat sesi berikutnya)

1. **Diagnostic view untuk dev**: expose `referenceKm`/`deltaKm`/
   `estimationLimited` mentah di suatu tempat (mis. long-press pada gauge)
   biar audit serupa ke depan lebih cepat tanpa perlu baca kode.
2. **Hint sumber "KM saat ini"**: label kecil di odometer Car Notes yang
   nunjukin dari log mana KM tertinggi itu berasal (BBM/servis/manual) —
   biar user paham kenapa input KM yang lebih kecil "keliatannya" diabaikan
   (`Math.max` di `getVehicleKm()`).
3. Pola self-heal yang sama (`heal*()` dipanggil dari `render*Tab()`) bisa
   jadi template kalau ke depan ada field baru lagi yang ditambahkan ke
   `fuelState`/objek serupa tanpa migrasi data lama.
