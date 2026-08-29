# Patch GABUNGAN: split oversized-files + split modules-render + cleanup dead files

ZIP ini menggabungkan **3 patch berurutan** yang belum di-upload/merge
ke GitHub, jadi tidak perlu apply satu-satu — cukup timpa (overwrite)
langsung isi ZIP ini ke project asli, LALU hapus 8 file yang disebut
di bagian "File yang harus DIHAPUS" di bawah. Tidak ada file
perbaikan dari ketiga patch asal yang hilang — semua sudah digabung
apa adanya dari hasil verifikasi berurutan (patch 1 -> patch 2 ->
cleanup, masing-masing sudah `npm test` hijau sebelum lanjut ke
berikutnya).

## Urutan asal (untuk referensi, sudah tergabung di ZIP ini)

1. **`PATCH-README-oversized-files-split.md`** — pecah
   `modules/asset/aset.js` jadi + `modules/asset/aset-owners.js`, dan
   `modules/shop/business-flow-presenter.js` jadi +
   `modules/shop/business-flow-presenter-inventory.js`.
2. **`PATCH-README-oversized-files-split-modules-render.md`** — pecah
   `modules/shared/modules-render.js` (2445->1277 baris) jadi +
   `modules/shared/modules-render-b.js` (1184 baris).
3. **`PATCH-README-cleanup-8-dead-files-modules-render-legacy.md`** —
   hapus 8 file dead code/duplikat legacy yang disinggung sbg
   "kandidat sesi berikutnya" di README patch #2 (0 referensi di
   `scripts/build.js`, terkonfirmasi via script
   `scripts/remove-shop-dead-files.sh` yang sudah ada di repo tapi
   belum pernah dijalankan).

Detail lengkap tiap patch ada di README masing-masing (ikut disertakan
di dalam ZIP ini, tidak dihapus, untuk jejak audit).

## File yang harus DIHAPUS (dari patch #3 — tidak ada isinya di ZIP ini, karena ZIP tidak bisa merepresentasikan penghapusan)

- `modules/shop/modals.js`
- `modules/shop/modules-render.js`
- `modules/shop/modules-calc.js`
- `modules/shop/multi-owner-engine.js`
- `modules/shop/features-helpers-global-security.js`
- `modules/modals.js`
- `modules/modules-render.js`
- `modules/modules-calc.js`

Bisa juga langsung jalankan `bash scripts/remove-shop-dead-files.sh`
di project asli setelah menimpa isi ZIP ini (script-nya sudah ada di
repo, tidak diubah oleh patch manapun di atas).

## Verifikasi akhir (gabungan ketiga patch + penghapusan, di working copy bersih)

- `node --test tests/*.test.js` -> **4857 pass, 0 fail**.
- `node scripts/build.js` -> versi `s672-cashflow-siklus-legacy-card`,
  `?v=1417`, `index.html`/`app_production.html`/`sw.js` sinkron.
- Release gate: lint & minify di-override (eslint/esbuild tidak
  tersedia di sandbox, dicatat di `docs/RELEASE-GATE-LOG.md`);
  html-sync & version-sync lolos murni. **Gate akhir: LOLOS.**
- Lint "file kegedean" (ambang 1600 baris): `modules/shared/modules-render.js`
  & kedua file yang dipecah patch #1 sudah lepas dari daftar. Sisa
  file oversized (belum disentuh, kandidat sesi mendatang):
  `scripts/build.js` (wajar), `modules/vehicle/sparepart-servis.js`,
  `modules/finance/transaksi.js`, `modules/shared/scan-ocr.js`,
  `modules/finance/dana-titipan-portfolio-render.js`.

## Setelah menimpa file-file ini, jalankan:
```
npm test          # harus 4857 pass, 0 fail
npm run build     # sudah dijalankan di sesi ini -- hasil rebuild ada di ZIP
```
