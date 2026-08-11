# FIX v1119 -> v1120 — Sesi 413 (FUEL-AUTOSYNC-02, badge sumber estimasi)

## Ringkasan

Fuel Card sekarang menampilkan badge kecil di bawah gauge yang bilang
dari mana estimasi BBM saat ini berasal ("🔧 Manual" / "⛽ Auto dari BBM
log") + umur estimasinya ("3 hari lalu"), supaya user langsung tahu
seberapa bisa dipercaya angkanya tanpa harus buka detail. Murni presenter
— membaca ulang `veh.fuelState.estimatedSource`/`correctedAt` yang sudah
ditulis dua jalur yang sudah ada (`FuelBarCorrection.save()` & `sync
FuelStateFromFullTankBbm()` dari sesi s412), 0 field baru ditulis ke `D`,
0 rumus baru.

## File yang berubah

- `modules/vehicle/fuel-card.js` — `SOURCE_BADGE_LABEL`, `_daysSince()`,
  `_sourceBadgeHtml()` (baru) + dipasang di `_body()`.
- `tests/fuel-card.test.js` — +7 test baru.
- `app-bundle-b.min.js` — hasil build ulang (fuel-card.js ada di
  GROUP_B).
- `app-bundle-a.min.js`, `index.html`, `app_production.html`, `sw.js` —
  ikut ter-update karena bump versi global (v1119 -> v1120), isi
  fungsional GROUP_A tidak berubah.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
  oleh `build.js`.

## Cakupan & batasan (lihat `s413-SESSION-NOTE.md` untuk detail)

✅ Badge tampil kalau `fuelState.estimatedSource` sudah terisi (dari
full-tank auto-sync s412 atau koreksi manual TASK-144) — label sesuai
sumber + umur estimasi.
✅ Fallback aman: tidak ada `fuelState` sama sekali, tidak ada
`estimatedSource`, atau `correctedAt` tidak valid → badge tidak
ditampilkan (bukan menebak/menampilkan "NaN").

❌ Belum ada perubahan ke perhitungan `fuelState` itu sendiri — sesi ini
murni presenter. Isi BBM parsial, auto-refresh berbasis km, dan
confidence decay masih di rencana sesi berikutnya (lihat sisa rencana di
`s413-SESSION-NOTE.md`).

## Verifikasi

- `node --test tests/*.test.js` → 2746/2746 pass.
- `node scripts/build.js s413-fuel-source-badge` → build sukses, sintaks
  kedua bundle valid, versi `v1119` -> `v1120`.
