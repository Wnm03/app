# Patch: hapus 8 file dead code duplikat (legacy modules-render.js dkk)

Lanjutan dari `PATCH-README-oversized-files-split-modules-render.md`,
yang menyinggung `modules/modules-render.js` dan
`modules/shop/modules-render.js` sebagai "duplikat/legacy, belum
diaudit — kandidat sesi berikutnya kalau memang masih relevan".

## Temuan

Kedua file itu (dan 6 file lain di folder yang sama) **0 referensi
path-exact** di `scripts/build.js` — tidak pernah ikut ke bundle
`app-bundle-a.min.js`/`app-bundle-b.min.js`, murni sisa peninggalan
restrukturisasi folder Sesi 17-18 (komentar header masing-masing file
sudah menyebut "Dipindah ke modules/shared/... isi & nama file TIDAK
berubah, cuma lokasi folder").

Ternyata sudah ada `scripts/remove-shop-dead-files.sh` dari sesi lebih
lama yang sudah mendaftarkan semua ini sebagai "TERKONFIRMASI 0
referensi" — tapi script itu belum pernah benar-benar dijalankan
(file-file masih ada di ZIP upload terbaru).

## Yang dilakukan

Menjalankan `scripts/remove-shop-dead-files.sh` apa adanya (tanpa
modifikasi). **8 file dihapus:**

- `modules/shop/modals.js`
- `modules/shop/modules-render.js`
- `modules/shop/modules-calc.js`
- `modules/shop/multi-owner-engine.js`
- `modules/shop/features-helpers-global-security.js`
- `modules/modals.js`
- `modules/modules-render.js`
- `modules/modules-calc.js`

(`finance/tx-cobek.js` ada di daftar script tapi sudah tidak ada
sebelumnya — dilewati otomatis oleh script.)

Tidak ada perubahan kode lain. Tidak ada file test yang perlu
disesuaikan (dicek: tidak ada test yang membaca file-file di atas
secara langsung).

## Cara apply

Zip ini **cuma berisi file yang berubah karena rebuild** (bundle,
HTML, sw.js, docs, & 5 file source yang kena bump versi otomatis).
**8 file di atas harus DIHAPUS manual** dari project asli — tidak ada
cara merepresentasikan penghapusan file lewat isi ZIP overwrite. Bisa
juga langsung jalankan `bash scripts/remove-shop-dead-files.sh` di
project asli (script ini sudah ada di repo, tidak diubah oleh patch
ini).

Setelah hapus 8 file + timpa isi zip ini, jalankan:
```
npm test          # harus tetap 4857 pass, 0 fail
npm run build     # sudah dijalankan di sesi ini -> hasilnya ada di zip
```

## Verifikasi

- `node --test tests/*.test.js` -> **4857 pass, 0 fail** (sama persis
  sebelum & sesudah penghapusan — tidak ada regresi).
- Build: versi bump otomatis ke `s672-cashflow-siklus-legacy-card`,
  `?v=1417`, `index.html`/`app_production.html` sinkron.
- Release gate: lint & minify di-override (eslint/esbuild tidak
  tersedia di sandbox, dicatat di `docs/RELEASE-GATE-LOG.md`);
  html-sync & version-sync lolos murni. **Gate akhir: LOLOS.**

## Sisa file oversized (belum disentuh, dari audit sesi split sebelumnya)

`scripts/build.js` (wajar), `modules/vehicle/sparepart-servis.js`,
`modules/finance/transaksi.js`, `modules/shared/scan-ocr.js`,
`modules/finance/dana-titipan-portfolio-render.js` — kandidat split
sesi mendatang kalau relevan.
