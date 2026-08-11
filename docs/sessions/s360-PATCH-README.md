# Patch s360 (s265-sales-mutation-fix) — Modul 2 Sales Mutation

Lanjutan langsung dari audit repo yang di-upload user
(`KW-fullrelease-v1056-inventory-transfer-s265.zip`). Audit dianggap
valid, sesi ini implementasi fix-nya langsung (bukan audit ulang).

## Fix

1. `recordShopSale()` (`modules/shop/cobek-tx-cart.js`) tidak lagi bisa
   menghasilkan stok negatif — qty diakumulasikan per `productId` SEBELUM
   divalidasi terhadap stok (bug lama: duplicate cart item lolos krn tiap
   baris dicek terpisah terhadap `p.stock` yang sama).
2. Cart form Transaksi gabungan (`curTxShopSaleCart`, fungsi
   `addTxShopSaleCartItem()`) sekarang merge item sejenis, disamakan
   dengan `Order.addItem()` (form Transaksi Manual, yang sudah benar).
3. Rollback stok disatukan jadi 1 SSOT: `rollbackShopItems(items, sign)`
   (`cobek-tx-cart.js`), reuse `applyBundleLinkedStock()` yang sudah ada.
   Menghapus 3 duplikasi implementasi di `recordShopSale()` + memperbaiki
   1 implementasi lagi (`Laporan.delete()`, `cobek-order.js`) yang
   sebelumnya TIDAK memanggil `applyBundleLinkedStock()` sama sekali.
4. Bundle rollback (base product + addon alu/muntu) diperbaiki di jalur
   hapus/retur transaksi. Catatan penting: di app ini **"retur" = 100%
   delegasi ke `Laporan.delete()`** lewat
   `BusinessFlowPresenter.processReturn()` (lihat komentar
   "Wire Return->Refund", S209-210, di `cobek-order.js`) — tidak ada
   jalur retur terpisah, jadi 1 fix di `Laporan.delete()` menutup dua-
   duanya (hapus transaksi & retur).
5. Edit transaksi (`existingShopId`) sudah benar sebelumnya (restore stok
   lama dulu, baru apply baru) — perilaku dipastikan tetap sama lewat
   `rollbackShopItems`, ditambah test regresi eksplisit.
6. Validasi backend ditambahkan ke `recordShopSale()` — baris item dengan
   `productId` kosong atau `qty` bukan angka positif sekarang menolak
   SELURUH transaksi dengan pesan jelas, bukan di-skip diam-diam seperti
   sebelumnya (validasi sebelumnya hanya ada di form UI).

Detail root-cause & rationale tiap fix: lihat komentar `kw-sales-mutation-
fix` langsung di source (`cobek-tx-cart.js` & `cobek-order.js`).

## Batasan yang dipatuhi

- **Tidak ada refactor besar** — hanya 2 file domain Sales yang diubah
  (`cobek-tx-cart.js`, `cobek-order.js`).
- **Tidak mengubah business logic di luar modul Sales** — Shop Stok
  Masuk (`applyTxShopStockFromTx`), Kasir (`kasir.js`, cart-nya sudah
  benar/merge dari awal), dan semua modul lain TIDAK disentuh.
- **100% reuse fungsi existing** — `applyBundleLinkedStock()`,
  `Etalase.bracketRange/bundleAddonShape/parseSizeName`, `D.products`,
  `D.cobek` — 0 rumus bisnis baru.
- **Backward compatible** — signature `recordShopSale(opts)` tidak
  berubah, semua caller lama (`Order._saveInner`, `Kasir._checkoutInner`,
  `applyTxShopSaleFromTx`) jalan tanpa perubahan pemanggilan.
- **Format data tidak berubah** — struktur `D.cobek[].items[]` (shape
  `{productId, name, qty, harga, lineTotal}`) persis sama.

## File dalam patch ini

- `modules/shop/cobek-tx-cart.js` — `rollbackShopItems()` (baru),
  `recordShopSale()` (rewrite internal, validasi + agregasi + SSOT),
  `addTxShopSaleCartItem()` (merge cart).
- `modules/shop/cobek-order.js` — `Laporan.delete()` (SSOT rollback +
  guard idempotent `if(!t)return`).
- `tests/sales-mutation-fix-s265.test.js` — 18 test baru (lihat daftar di
  bawah).
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — konstanta versi
  naik (hasil `node scripts/build.js`).
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis, `?v=` naik
  ke versi terbaru. Tidak perlu jalankan `node scripts/build.js` lagi —
  bundle di patch ini sudah hasil build final.
- `CHANGELOG.md` — entri sesi ini ditambahkan di atas.

Cara pakai: timpa file-file di atas di project kerja Anda (struktur
folder sama persis), lalu jalankan `npm test` untuk verifikasi.

## Test baru (`tests/sales-mutation-fix-s265.test.js`)

1. Penjualan normal — stok berkurang sesuai qty.
2. Duplicate cart item — 2 baris produk sama, total melebihi stok ->
   ditolak, stok TIDAK berubah sama sekali.
3. Duplicate cart item yang totalnya masih muat -> diterima, stok
   dikurangi sesuai total gabungan.
4. Qty > stok (1 baris) -> ditolak.
5. Berkali-kali panggil hingga stok pas-pasan -> tidak pernah minus.
6. Edit transaksi — restore stok lama dulu, baru apply baru (ganti
   produk sepenuhnya).
7. Edit transaksi dengan qty baru melebihi stok -> ditolak, stok balik
   ke kondisi SEBELUM edit dipanggil (rollback restore dibatalkan lagi).
8. `Laporan.delete()` — hapus transaksi mengembalikan stok produk biasa.
9. Retur (`BusinessFlowPresenter.processReturn()` -> `Laporan.delete()`)
   — mengembalikan stok, dites lewat presenter aslinya (bukan cuma
   `Laporan.delete()` langsung), membuktikan wiring retur→delete tetap
   utuh.
10. Bundle: jual produk `+alu` mengurangi base product & addon alu.
11. Bundle: hapus transaksi bundle mengembalikan base + addon (bug lama).
12. Rollback idempotent — `Laporan.delete()` dipanggil 2× pada id yang
    sama, panggilan ke-2 no-op (tidak dobel restore / tidak crash).
13. `rollbackShopItems()` dengan item productId tidak dikenal/qty 0 ->
    aman, tidak throw, 0 perubahan.
14. Produk tidak ditemukan -> ditolak dengan pesan jelas.
15. Qty invalid (`0`, `-1`, `NaN`, `'abc'`) -> ditolak oleh validasi
    backend (bukan cuma dicegah UI).
16. Baris tanpa `productId` -> seluruh transaksi ditolak (tidak di-skip
    diam-diam).
17. `addTxShopSaleCartItem()` — produk sama ditambah 2× jadi 1 baris
    (qty tergabung), bukan duplikat.
18. `Order.addItem()` — perilaku acuan (baseline pattern yang dicontoh).

## Hasil regresi

`node --test tests/*.test.js` → **2339/2341 pass, 2 fail (pre-existing,
tidak terkait)**:

- `dashHubNavigateToFeature: ... "Penasihat AI" ...` dan
  `dashHubNavigateToFeature: ... "Life OS" ...` di
  `tests/dashboard-hub-goto-subtab.test.js` — soal timing
  `setTimeout`/`scrollIntoView` di Dashboard Hub, **tidak menyentuh file
  Shop/Sales manapun**. Sudah tercatat gagal di baseline sebelum sesi ini
  (`docs/CHECKPOINT.md`, sesi v1047: "2 fail pre-existing... sudah gagal
  di baseline sebelum sesi ini juga"). Diverifikasi ulang di sesi ini:
  fail konsisten di 3× run terpisah, dan tetap fail walau
  `cobek-tx-cart.js`/`cobek-order.js` dikembalikan ke versi asli
  (sebelum patch) — jadi dikonfirmasi 100% independen dari patch ini.

`node scripts/build.js` → sukses, sintaks kedua bundle valid
(`node --check` lolos), `index.html`/`app_production.html` identik.
