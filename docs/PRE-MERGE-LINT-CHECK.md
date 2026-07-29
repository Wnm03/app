# Pre-Merge Lint Check — eslint.config.js

Sandbox Claude tidak ada akses internet, jadi `npm install` / `npm run lint`
tidak bisa dijalankan di sana. Validasi yang SUDAH dilakukan di sandbox
(tanpa eslint asli):

- `node --check eslint.config.js` — syntax OK
- `node --check scripts/collect-app-globals.js` — syntax OK
- `require('./eslint.config.js')` berhasil, hasilkan 3 config block sesuai
  schema flat config ESLint v9 (ignores / files+languageOptions+rules /
  files+languageOptions)
- `collectAppGlobals()` jalan tanpa error → 852 global app-specific +
  51 global browser = 903 total, semua value & key valid

Yang BELUM tervalidasi (butuh eslint asli): hasil lint sebenarnya
(no-undef, no-unused-vars, dll) di seluruh source.

## Jalankan sebelum merge (Node >= 20):

```bash
npm install
npm run lint
```

Kalau ada yang auto-fixable:
```bash
npm run lint:fix
```

Atau full check (lint + test + build):
```bash
npm run check
```

Aman merge kalau `npm run lint` exit code 0 (no error).

## Tambahan (smoke test + openModal warning)

- `tests/modal-html-parity.test.js` (baru): otomatis cek bahwa jumlah elemen
  `MODAL_HTML[]` di `modals.js` sama dengan jumlah pemanggilan
  `document.write(MODAL_HTML[i])` di `index.html` DAN `app_production.html`,
  dan index-nya berurutan `0..N-1` (bukan cuma jumlahnya cocok, tapi urutannya
  juga tidak geser). Sudah dijalankan di sandbox lewat
  `node --test tests/modal-html-parity.test.js` — 3/3 pass, dan sudah
  divalidasi juga bahwa test ini BENAR-BENAR gagal kalau MODAL_HTML[] sengaja
  dibikin beda jumlah dari HTML (sanity check manual, lalu direstore).
  `npm test` penuh (1087 test) juga sudah dijalankan ulang di sandbox — semua
  pass.
- `openModal(id)` di `modal-navigasi.js` (dan cerminannya di
  `app-bundle-b.min.js`, baris yg sama persis — BELUM di-rebuild lewat
  `npm run build` krn sandbox tidak ada akses `esbuild`/internet, jadi kedua
  file ini untuk sementara disinkronkan manual) sekarang `console.warn(...)`
  dengan pesan jelas ("Modal #id tidak ditemukan di DOM — cek document.write
  index...") SEBELUM crash kalau `document.getElementById(id)` balik `null` —
  supaya begitu ada modal yang lupa ditambahkan `document.write(MODAL_HTML[i])`-
  nya, error di console langsung nunjuk ke penyebabnya (bukan cuma
  "Cannot read properties of null (reading 'classList')" yang generik).
  **Jalankan `npm run build` setelah merge** supaya `app-bundle-b.min.js`
  ke-generate ulang dari source `modal-navigasi.js` yang sudah diedit (build
  akan menghasilkan bundle yang sama persis dgn yang sudah ditulis manual di
  sini, jadi aman, tapi tetap sebaiknya dijalankan supaya satu sumber
  kebenaran).
