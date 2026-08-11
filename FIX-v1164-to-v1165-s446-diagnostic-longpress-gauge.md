# FIX v1164 -> v1165 — Diagnostic view long-press gauge fuel

## Ringkasan

Mengerjakan rekomendasi #1 dari `FIX-v1162-to-v1163-s444-fuel-referencekm-selfheal-audit.md`
(yang belum dikerjakan di sesi S445): "Diagnostic view untuk dev" — expose
`referenceKm`/`deltaKm`/`estimationLimited` dkk mentah lewat long-press pada
gauge fuel di Fuel Intelligence Card, supaya audit kasus "fuel bar
statis"-serupa ke depan tidak perlu lagi baca kode/console.log manual.

## Perubahan

- `modules/vehicle/fuel-card.js`:
  - `_gaugeHtml(vehicleId)` — gauge TIDAK lagi pakai `data-action=
    "FuelBarCorrection.open"` (dispatcher global cuma bisa 1 aksi per
    klik, tidak cukup untuk tap-singkat vs tap-lama). Diganti
    `onpointerdown`/`onpointerup`/`onpointerleave`/`onpointercancel` yang
    memanggil method baru di bawah.
  - Method BARU `_gaugePointerDown(e, vehicleId)` / `_gaugePointerUp(e,
    vehicleId)` / `_gaugePointerCancel()` — detektor long-press: tap
    singkat (<550ms) = `FuelBarCorrection.open(vehicleId)` (perilaku LAMA,
    TIDAK berubah), tap-tahan ≥550ms = `showDiagnostic(vehicleId)` (BARU).
    Flag `_gaugeLongPressed` memastikan pointerup SETELAH long-press
    terpicu tidak ikut membuka `FuelBarCorrection` juga (1 gesture = 1
    aksi, bukan 2 aksi ganda).
  - Method BARU `showDiagnostic(vehicleId)` — 100% REUSE
    `FuelStateEstimator.estimateCurrentLiter(vehicleId)` (SUDAH ADA, 0
    kalkulasi baru), tampilkan field mentahnya (`referenceKm`, `currentKm`,
    `deltaKm` + status clamp, `kmPerLiter`, `baseLiter`, `addedLiter` +
    jumlah partial fill, `consumedLiter`, `liter` hasil akhir,
    `estimationLimited`, `partialFillDriftRisk`, `confidenceScore` →
    `decayedConfidenceScore`) lewat `showAlertModal()` (SUDAH ADA,
    `infoModalMsg` sudah `white-space:pre-line` jadi tiap field tampil di
    baris terpisah). `{ok:false}` (mis. belum pernah Koreksi BBM sama
    sekali) menampilkan `reason` apa adanya, bukan crash.
- `tests/fuel-card.test.js` — 6 test baru: `showDiagnostic()` (kasus ok,
  kasus `estimationLimited`/referenceKm null, kasus `{ok:false}`), dan 3
  test long-press detector (`_gaugePointerUp` tap singkat vs setelah
  long-press, `_gaugePointerCancel`).
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang, versi v1164 -> v1165.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis.

## Yang TIDAK berubah (sengaja)

- Perilaku tap singkat pada gauge — tetap membuka `FuelBarCorrection.open()`
  persis seperti sebelumnya, cuma jalur pemanggilannya pindah dari
  `data-action` ke handler pointer manual.
- `FuelStateEstimator.estimateCurrentLiter()` itu sendiri — tidak disentuh,
  `showDiagnostic()` murni membaca output yang sudah ada.
- Rekomendasi #2 dari sesi S444 (label sumber KM odometer) — sudah
  dikerjakan di sesi S445 (`FIX-v1163-to-v1164-s445-odometer-source-label.md`),
  tidak diulang di sini.

## Verifikasi

```
node --test tests/*.test.js
# 2926/2926 pass (2920 lama + 6 baru), 0 fail.

node scripts/build.js
# build sukses, sintaks kedua bundle valid, v1164 -> v1165.
```

## Rekomendasi lanjutan (belum dikerjakan, kandidat sesi berikutnya)

Kedua rekomendasi dari audit S444 (diagnostic view + label sumber KM)
sudah selesai dikerjakan (S446 & S445). Belum ada item baru yang
teridentifikasi dari audit ini — item baru akan muncul dari sesi
berikutnya kalau ada.
