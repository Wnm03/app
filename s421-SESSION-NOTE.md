# Sesi 421 (2 sisa "saran tambahan" dari rencana "Fuel Estimation Auto-Update", s420)

## Konteks

Rencana "Fuel Estimation Auto-Update" (Sesi 1-6, s415-s420) sudah selesai.
Sesi s420 mencatat 2 item yang sengaja dicadangkan di luar cakupan Sesi
1-6 asli — sesi ini mengerjakan keduanya, murni presenter (0 rumus baru,
0 field `D`/`fuelState` baru ditulis):

1. **Guard km non-monoton versi lengkap** — versi dasar (s415,
   `FuelStateEstimator.kmClamped`) sudah clamp delta km negatif ke 0
   secara diam-diam (korektnes engine sudah aman). Sesi ini menambah sisi
   PROAKTIF: nudge UI "⚠️ Estimasi mulai kurang akurat, cek odometer" di
   Fuel Card kalau `kmClamped:true` terdeteksi utk kendaraan aktif.
2. **Badge angka `decayedConfidenceScore` eksplisit** — sebelumnya decay
   (s419) cuma dipakai sbg trigger hint low-confidence (ambang 50), user
   tidak lihat angka skornya langsung. Sekarang `_sourceBadgeHtml()`
   tambah "Skor N/100" di belakang label sumber + umur estimasi.

## Perubahan

- `modules/vehicle/fuel-card.js`:
  - `_kmClampedHint(vehicleId)` (BARU) — 100% REUSE
    `FuelStateEstimator.estimateCurrentLiter()`, balikin `{ok:true}` kalau
    `kmClamped:true`, pola guard sama persis `_lowConfidenceHint()`.
  - `_body()` — sisipkan baris nudge km-clamped (SEBELUM baris
    low-confidence, keduanya independen & bisa tampil bersamaan kalau dua
    -duanya true).
  - `_sourceBadgeHtml()` — tambah bagian "Skor N/100" (100% REUSE
    `_currentConfidence()`, SUDAH ADA sejak Sesi 5), dihilangkan diam-diam
    (bukan tampil "—") kalau skor tidak tersedia.
- `tests/fuel-card.test.js` — 10 test baru: `_kmClampedHint()` (4 kasus
  guard), nudge km-clamped tampil/tidak tampil/bersamaan dgn
  low-confidence (3 kasus), badge "Skor N/100" (3 kasus: tersedia,
  fallback confidenceScore mentah, tidak ada skor).
- 0 perubahan ke `FuelStateEstimator`/modul lain — field `kmClamped` &
  `decayedConfidenceScore` sudah ada sejak s415/s419, sesi ini murni
  presenter baca ulang.

## Verifikasi

- `node --test tests/*.test.js` → **2826/2826 pass** (2816 lama + 10
  baru), 0 fail.
- `node scripts/build.js s421-fuel-estimation-proactive-guards` → build
  sukses, sintaks kedua bundle valid, versi `v1127` -> `v1128`.

## Status rencana "Fuel Estimation Auto-Update"

Semua item dari rencana asli (Sesi 1-6) + kedua "saran tambahan" yang
sengaja dicadangkan di s420 kini sudah selesai dikerjakan. Sisa "saran
tambahan" yang MASIH belum ditangani (bukan bagian sesi ini, disebutkan
di s420 tapi tidak diminta eksplisit sesi ini):

- Guard akumulasi error fill-parsial berturut-turut (beda dari guard km
  non-monoton) — belum dikerjakan, kandidat sesi terpisah kalau
  diperlukan.
