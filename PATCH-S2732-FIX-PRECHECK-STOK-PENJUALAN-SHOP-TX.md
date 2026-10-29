# PATCH S2731–S2732 — E2E browser nyata + fix T1 (pra-validasi stok Penjualan Shop dari modal Transaksi)

Kumulatif S2725–S2732 (di atas S2730).

## Perbaikan (opsi A, additive)
- Bug T1: penjualan Shop dari modal Transaksi dengan stok kurang menyimpan pemasukan yatim (tanpa cobekLinkId, stok tidak berubah, saldo naik) karena recordShopSale() baru gagal SETELAH transaksi dipersist.
- `txShopSalePrecheck(existingTx)` baru di modules/shop/cobek-tx-cart.js (aturan stok identik recordShopSale; saat edit, qty lama dikembalikan dulu).
- `_saveTxInner()` (modules/finance/transaksi-b.js) memanggilnya tepat setelah validasi kategori, sebelum persist; gagal -> toast + return, 0 transaksi dibuat.
- recordShopSale()/applyTxShopSaleFromTx() TIDAK diubah (tetap lapisan pertahanan kedua).
- Build: node scripts/build.js (versi 2711 -> 2713, bundle/HTML/sw.js sinkron).

## E2E opt-in (Playwright + Chromium, Node >= 22; bukan bagian npm test)
  NODE_PATH=$(npm root -g) PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node e2e/<skrip>.js   (E2E_STRICT=1 utk temuan terbuka = gagal)
| Skrip | Hasil |
|---|---|
| run-e2e-domain-uang-shop-carnotes.js | 41/41 |
| run-e2e-tx-links-shop-carnotes.js | 21/21 |
| run-e2e-edit-integritas-backup.js | 22/22 (strict) |
| run-e2e-vehicle-isolation.js (bawaan) | 9/9 |

## Test node
tests/s2732-tx-shop-sale-stock-precheck.test.js (+3). 672/672 pass pada 76 file terfokus (semua test yg menyentuh saveTx/transaksi-b/cobek-tx-cart + gate bundle/versi/window-expose + S2613/S2728-S2732).
Catatan: scripts/run-full-test.js di sandbox ini melapor "0 tests" (timeout 120s, flake runner yg sudah tercatat); full suite belum terverifikasi.
