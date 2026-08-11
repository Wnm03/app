# Patch s362 (Sesi 362) — Modul 4 Price Mutation Gate

Lanjutan langsung dari audit repo yang di-upload user
(`KW-fullrelease-v1058-product-repository-stock-gate-s361.zip`, hasil
Modul 3). Instruksi eksplisit user: implementasi langsung, bukan audit
ulang. Target dikonfirmasi user lewat pilihan eksplisit: "Price mutation
gate (hargaBeli/hargaJual writes scattered like stock was)".

## Fix

1. `ProductRepository.validatePriceValue(value)` / `mutateSetPrice
   (product, field, value)` (`modules/shop/generic/product-repository.js`)
   — Price Mutation Gate baru, pola identik Stock Mutation Gate Modul 3.
2. 7 titik mutasi mentah `.hargaBeli`/`.hargaJual` di 5 file dialihkan ke
   gate: `shop-data-io-api.js` (`commitShopRows`), `cobek-io.js`
   (`ImportShopExcel.commit`), `cobek-tx-cart.js`
   (`applyTxShopStockFromTx`), `cobek-pricing.js` (`PriceRekoWidget.
   applyOne`/`applyBulk`), `cobek-etalase.js` (`syncPairedPrice`/
   `confirmMerge`).
3. Semua titik pakai guard `typeof ProductRepository!=='undefined'` +
   fallback assignment lama — 0 perubahan perilaku kalau modul tidak
   dimuat, sama pola seluruh codebase.
4. `shop-pdf-import-ui.js`/`shop-scan-ui.js` diperiksa & dikonfirmasi
   TIDAK perlu diubah (staged row builder, bukan mutasi produk
   langsung — sudah otomatis ikut tergate lewat `commitShopRows()`).

## Known issue baru

- `hargaReseller` BELUM digate (di luar scope sesi ini, field ke-3 yang
  ditulis mentah di titik yang sama persis dengan `hargaBeli`/
  `hargaJual`). Lihat `CHANGELOG.md` §"Known issue baru" untuk detail &
  rekomendasi Modul 5.

## Test

- `tests/product-repository-price-gate-mod4.test.js` — 15 test baru (6
  unit + 9 integrasi), semua pass.
- Regresi penuh (`npm test`): 2374 test, 2372 pass, 2 gagal — dikonfirmasi
  pre-existing (`dashHubNavigateToFeature`, tidak terkait Shop), gagal
  identik di baseline sebelum sesi ini. 0 regresi baru.

## Build

- `node scripts/build.js` sukses → v1059
  (`s386-generic-shop-engine-tahap12-final-audit-final-release`).
- `esbuild`/`eslint` tidak terpasang di sandbox sesi ini (tidak ada akses
  jaringan) — bundle hasil build TIDAK diminifikasi tapi 100% valid
  (`node --check` lolos, `verify-bundle-freshness.js` ✓). Semua file yang
  diubah manual dicek `node --check` sbg pengganti eslint. Jalankan
  `npm install --save-dev esbuild eslint` di lingkungan dgn akses
  internet kalau minifikasi/lint penuh dibutuhkan sebelum deploy
  produksi.

## File yang berubah

Lihat `FILES-CHANGED.md` (root repo) untuk daftar lengkap + unified diff
di `MODUL4-PRICE-MUTATION-GATE.diff`.
