# Patch s345 — Fix tombol Car Notes (BBM/Servis/Torsi) tidak bereaksi, 0 toast

File utama yang berubah: `car-notes.js` — objek `BBM`, `Servis`, `Torsi`
sekarang di-ekspos ke `window` (`window.BBM=BBM`, dst) tepat setelah tiap
deklarasi, supaya dispatcher klik global (`data-action="Owner.method"` ->
`window[Owner][method]`) bisa menemukannya. Sebelumnya `const Owner={...}`
top-level cuma jadi binding lexical-scope, bukan properti `window`, jadi
semua tombol BBM/Servis/Torsi gagal diam-diam. Detail root-cause lengkap:
`FIX-v1009-s345-carnotes-window-expose.md`.

File lain dalam patch ini:
- `tests/car-notes-window-expose-s345.test.js` — 3 test regresi baru
  (permanen menjaga supaya window.BBM/Servis/Torsi tidak hilang lagi).
- `docs/CHECKPOINT.md` — entri Sesi 345 ditambahkan di atas (Current
  Session).
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — HANYA konstanta
  versi yang naik (`s344-...` -> `s345-fix-carnotes-window-expose-bbm-servis-torsi`),
  0 perubahan logic.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis
  (`node scripts/build.js`), `?v=1008` -> `?v=1009`.

Cara pakai: timpa semua file di atas di project kerja Anda dengan versi di
patch ini (struktur folder sama persis), lalu jalankan `npm test` untuk
verifikasi (harus 2270/2270 pass). Tidak perlu jalankan `node scripts/build.js`
lagi — bundle & versi `?v=` di patch ini sudah hasil build final.

## Test

`node --test tests/*.test.js` -> **2270/2270 pass, 0 fail** (2267 lama + 3
baru), 2x (sebelum & sesudah build).

## Build

`node scripts/build.js s345-fix-carnotes-window-expose-bbm-servis-torsi` ->
sukses, `?v=1009`.
