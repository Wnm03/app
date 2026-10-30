# Patch: pecah 2 file oversized

Isi zip ini HANYA file yang berubah/baru — timpa (overwrite) langsung ke
lokasi yang sama di project asli. Tidak ada perubahan lain (tidak ada bump
versi, tidak ada regenerate bundle app-bundle-*.min.js, tidak ada ubah
index.html/app_production.html/sw.js).

## 1. modules/shop/business-flow-presenter.js (2776 -> 1598 baris)
Blok Purchase Order/Movement/Inventory Transfer/Modal UI dipindah ke file
baru:
- **Baru:** `modules/shop/business-flow-presenter-inventory.js` (1214 baris)
- **Diubah:** `modules/shop/business-flow-presenter.js` — digabung balik
  lewat `Object.assign(BusinessFlowPresenter, BusinessFlowPresenterInventoryMixin)`.

## 2. modules/asset/aset.js (2464 -> 1167 baris)
Fitur multi-owner/porsi kepemilikan (Owners Modal, rebalance, quota,
migrate-to-registry) dipindah ke file baru:
- **Baru:** `modules/asset/aset-owners.js` (1322 baris)
- **Diubah:** `modules/asset/aset.js` — digabung balik lewat
  `Object.assign(Aset, AssetOwnersMixin)`.

## Lainnya
- `scripts/build.js` — 2 entri baru ditambahkan ke GROUP_A/GROUP_B: kedua
  file mixin di atas WAJIB dimuat SEBELUM file utamanya masing-masing.
- ~70 file `tests/*.test.js` — array `loadSource([...])`-nya ditambah
  entri file baru (di posisi yang benar) supaya urutan load tetap sama
  seperti yang dipakai app. 4 dari file-file itu tadinya ikut ter-edit
  otomatis lalu dikoreksi manual karena membaca source langsung lewat
  `fs.readFileSync(path.join(...))` (bukan array loadSource) — sudah
  diverifikasi balik ke perilaku yang benar.

## Hasil
- `npm test` -> **4857 pass, 0 fail** (sama seperti baseline sebelum
  perubahan apa pun).
- Lint "file kegedean" (`scripts/build.js`, ambang 1600 baris): **10 -> 8**
  file yang masih di atas ambang. Sisa terbesar sekarang:
  `modules/shared/modules-render.js` (2445), `scripts/build.js` (2403 --
  wajar, ini script build itu sendiri), `modules/modules-render.js` (2165),
  `modules/vehicle/sparepart-servis.js` (2054), `modules/shop/modules-render.js`
  (1974), `modules/finance/transaksi.js` (1900), `modules/shared/scan-ocr.js`
  (1677), `modules/finance/dana-titipan-portfolio-render.js` (1616).

## Setelah menimpa file-file ini, jalankan:
```
npm test          # harus tetap 4857 pass, 0 fail
npm run build     # regenerate bundle + bump versi (jalankan manual saat siap rilis)
```
