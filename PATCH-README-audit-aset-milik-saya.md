# Patch: Audit "Aset Milik Saya" & Sinkron Holding-Akun

Isi zip ini HANYA file yang diubah/baru. Timpa (overwrite) file dengan path
yang sama di project asli.

## File diubah
1. `modules/asset/asset-portfolio-api.js`
   Kartu "Portfolio Composition" sekarang pakai `Investment.selfOwnedTotalValue()`
   (terskala porsi kepemilikan SELF) untuk `investmentValue`, bukan
   `Investment.portfolioSummary().totalValue` (nilai penuh, tidak terskala
   untuk holding patungan). Sebelumnya angka ini bisa lebih besar dari Net
   Worth untuk investasi yang dimiliki patungan.

2. `ai-chat.js`
   - `asetInfo` (konteks AI Chat, ~baris 1056): rincian daftar aset sekarang
     difilter `isAssetOwnershipSelf` + diskalakan `MultiOwnerEngine.selfOwnedValue()`,
     sinkron dengan angka `Total` yang ditampilkan tepat sebelumnya (sebelumnya
     daftar berisi SEMUA aset termasuk milik keluarga/investor/pelanggan
     dengan nilai penuh).
   - `asetZakatable` (~baris 278): sekarang exclude aset yang sudah
     `_migratedToInvestmentId`/`investmentId` (pindah ke Investasi) + tambah
     `Investment.zakatableValue()`, disamakan dengan formula kanonik
     `Zakat.hitungMaal()` (modules/finance/pajak-pbb-zakat.js).

3. `modules/finance/tx-list-cashflow.js`
   `runTxDeleteCascades()` — cascade BARU untuk `investmentTxLinkId`.
   Sebelumnya field ini (dibuat `Investment.addTransaction()` saat Beli/Jual
   investasi pakai "Akun Sumber Dana") tidak pernah dibaca di mana pun. Kalau
   transaksi Keuangan yang ditautkan dihapus dari layar Transaksi/Cashflow,
   holding investasi TIDAK ikut disesuaikan (unit/avgPrice tetap seolah
   transaksi terjadi) — desync permanen dengan saldo akun. Fix: hapus tx
   investasi terkait & panggil `Investment.recomputeHolding()` (fungsi yang
   sudah ada, 0 rumus baru).

## File baru
4. `tests/investment-tx-delete-cascade-s-async-ownership.test.js`
   4 test regresi untuk fix #3 (beli, jual, transaksi biasa tanpa link,
   jalur hapus lama dari sisi Investasi tetap jalan).

## Status test
`npm test` (node --test tests/*.test.js): **4479/4479 pass** (4475 lama +
4 baru), 0 regresi terhadap suite yang sudah ada.

## Catatan (belum di-patch, di luar cakupan "ringan")
- Dividen investasi tetap tidak disinkron ke akun (`accountId` diabaikan
  untuk tipe `dividen`) — ini memang disengaja/didokumentasikan di kode asli,
  bukan bug baru.
