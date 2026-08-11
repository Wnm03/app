# Sesi 413 (FUEL-AUTOSYNC-02, lanjutan rencana "Fuel Estimation Auto-Update")

## Konteks

Lanjutan dari s412 (`s412-SESSION-NOTE.md`). Rencana lengkap ada 6 sesi
inti + "saran tambahan" (badge sumber estimasi, guard KM non-monoton,
guard akumulasi error fill-parsial, histori estimasi, audit
`withSaveGuard()`). Diminta kerjakan yang paling ringan dulu — dari semua
yang belum dikerjakan, **badge sumber estimasi di UI** paling ringan:
murni presenter, 0 field baru ditulis ke `D`, 0 rumus baru, tinggal
membaca ulang field yang sudah ditulis dua jalur yang sudah ada
(`FuelBarCorrection.save()` TASK-144 & `syncFuelStateFromFullTankBbm()`
sesi s412).

## Perubahan

- `modules/vehicle/fuel-card.js`:
  - `SOURCE_BADGE_LABEL` (BARU) — peta `estimatedSource` -> label:
    `'manual-bar-correction'` -> "🔧 Manual", `'auto-bbm-log-full'` ->
    "⛽ Auto dari BBM log".
  - `_daysSince(iso)` (BARU) — helper murni, `Date.parse()` + floor hari.
    `null` kalau `iso` kosong/tidak valid (presenter diam, bukan tampil
    "NaN hari lalu"). Clamp ke 0 kalau hasilnya negatif (correctedAt di
    masa depan — jam klien nyeleneh, bukan bug tampilan).
  - `_sourceBadgeHtml(vehicleId)` (BARU) — baca `veh.fuelState.
    estimatedSource`/`correctedAt` LANGSUNG dari `D.vehicles` (field yang
    SUDAH ada, 0 baru), susun 1 baris kecil "label · X hari lalu" di
    bawah gauge. `''` kalau `fuelState`/`estimatedSource` belum ada sama
    sekali. Fallback label "📉 Estimasi" kalau `estimatedSource` terisi
    tapi nilainya belum dikenal peta (mis. sumber otomatis baru yang akan
    ditambah sesi mendatang — Sesi 2 rencana, isi BBM parsial) supaya
    badge tidak hilang begitu saja saat field baru itu ditambah nanti.
  - `_body()` — sisipkan `_sourceBadgeHtml(insight.vehicleId)` tepat
    setelah `_gaugeHtml()`, sebelum baris rekomendasi low-confidence yang
    sudah ada. 0 markup/urutan bagian lain diubah.
- `tests/fuel-card.test.js` (+7 test): label manual, label auto, fallback
  generik utk `estimatedSource` tidak dikenal, tanpa `fuelState` sama
  sekali, `fuelState` ada tapi tanpa `estimatedSource`, `correctedAt`
  tidak valid (assert TIDAK ada "NaN" & TIDAK ada badge), dan
  `_daysSince()` clamp ke 0 utk tanggal di masa depan.

## Yang BELUM ditangani (sisa rencana, urutan makin berat)

1. Isi BBM parsial belum mengurangi/menambah estimasi — perlu
   `estimateCurrentLiter()` (Sesi 1 asli rencana): titik acuan terakhir +
   akumulasi liter parsial + km ditempuh / `kmPerLiter`.
2. `recordBbmLog()` belum jadi SSOT utk fill PARSIAL (baru full tank,
   dari s412).
3. Tidak ada auto-refresh berbasis KM murni (tanpa BBM log baru).
4. `FuelPredictionEngine`/`FuelInsightEngine` belum baca lewat estimator
   terpusat — masih baca `fuelState.currentFuelLiter` mentah.
5. `confidenceScore` masih statis, belum ada peluruhan waktu/km.
6. Belum ada regression test suite gabungan utk Sesi 1-5 di atas.
7. Saran tambahan sisa: guard KM non-monoton, guard akumulasi error
   fill-parsial berturut-turut, histori estimasi (opsional), audit
   `withSaveGuard()` utk `fuelState` write mendatang.

## Verifikasi

- `node --test tests/*.test.js` → **2746/2746 pass** (2739 lama + 7
  baru), 0 fail.
- `node scripts/build.js s413-fuel-source-badge` → build sukses, sintaks
  kedua bundle valid, versi `v1119` -> `v1120`.
