# Patch: pecah modules/finance/dana-titipan-portfolio-render.js

Sesi terakhir dari backlog audit ukuran file (4 file awal: transaksi.js,
sparepart-servis.js, scan-ocr.js, dana-titipan-portfolio-render.js —
semua sudah tuntas setelah sesi ini).

## modules/finance/dana-titipan-portfolio-render.js (1615 -> 1092 baris)

Titik potong bersih: TEPAT SETELAH penutup object
`DanaTitipanPortfolioPresenter` (`};`), persis di depan header komentar
`DanaTitipanCommitmentUI`.

- **Diubah:** `modules/finance/dana-titipan-portfolio-render.js` —
  sisa bagian PERTAMA (object `DanaTitipanPortfolioPresenter` saja).
- **Baru:** `modules/finance/dana-titipan-portfolio-render-b.js`
  (547 baris) — object `DanaTitipanCommitmentUI` (modal CRUD Pokok
  Dana Titipan), `DanaTitipanReturnUI` (modal imbal hasil), &
  `DanaTitipanPoolUI` (modal kolam dana).

Sama seperti pola split sebelumnya: murni deklarasi const top-level,
TIDAK butuh `Object.assign` — cukup `dana-titipan-portfolio-render-b.js`
dimuat SETELAH file utama (urutan dijaga di `scripts/build.js`).

## Test

12 file test disesuaikan (`loadSource([...])` ditambah
`modules/finance/dana-titipan-portfolio-render-b.js`) karena menguji
`DanaTitipanCommitmentUI`/`DanaTitipanReturnUI`/`DanaTitipanPoolUI`:
`dana-titipan-asset-picker-holding-option-s608`,
`s485d-titipan-commitment-ui`, `s486-titipan-commitment-return`,
`s515-dana-titipan-owner-nominal-asset-kuota-porsi`,
`s516-dana-titipan-commitment-ownerid-escaping`,
`s523b-titipan-owner-creation`,
`s544-titipan-duplicate-container-scoped-porsi`,
`s550-titipan-commitment-ui-tablist-sync`,
`s631-titipan-holding-name-direct-porsi`,
`session04a-dana-titipan-pool-ui-summary`,
`session04b-dana-titipan-pool-ui-modal`,
`session05-dana-titipan-fill-remaining`.

4 "source guard" (baca file mentah via `fs.readFileSync`, bukan
`loadSource`) di 3 file (`s485d`, `s486`, `s523b`) diarahkan ke file
baru karena marker yang dicari (`const DanaTitipanCommitmentUI`/
`const DanaTitipanReturnUI`) ikut pindah — KECUALI 1 guard di `s485d`
yang mengecek `Presenter.render()` (tetap di bagian PERTAMA) sampai ke
marker `const DanaTitipanCommitmentUI` (bagian KEDUA): guard ini
dibaca gabungan kedua file.

44 file test lain yang menyebut file ini dicek — TIDAK butuh
perubahan (hanya pakai `DanaTitipanPortfolioPresenter`, tetap di
bagian PERTAMA).

## Verifikasi

- `node --test tests/*.test.js` -> **4857 pass, 0 fail** (sama
  persis sebelum & sesudah split).
- Build: versi `s678-cashflow-siklus-legacy-card`, `?v=1425`,
  `index.html`/`app_production.html`/`sw.js` sinkron.
- Lint "file kegedean" (ambang 1600 baris): **1 -> 0** file aktif.
  Backlog 4 file oversized sesi-sesi sebelumnya SELESAI. Sisa lint
  hanya `scripts/build.js` (wajar) + 2 file mati/duplikat
  (`modules/modules-render.js`, `modules/shop/modules-render.js`,
  tidak terdaftar di `scripts/build.js`).
- Release gate: lint & minify di-override (eslint/esbuild tidak
  tersedia di sandbox); html-sync & version-sync lolos murni.
  **Gate akhir: LOLOS.**

## Setelah menimpa file-file ini, jalankan:
```
npm test          # harus tetap 4857 pass, 0 fail
npm run build     # sudah dijalankan di sesi ini -- hasil rebuild ada di ZIP
```
