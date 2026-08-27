# Patch S665: Pay-all Upah Jam + guard delWorker + re-merge fix S660 yang sempat hilang

## ⚠️ Base fix: modals.js sempat regresi, kehilangan field DP dari S660
Ditemukan lewat pertanyaan user: `modules/shared/modals.js` di patch
S664 (basis awal patch S665 sebelumnya) ternyata BUKAN kelanjutan dari
S660→S661→S662 — versi itu kehilangan field `#txShopSaleDP` ("Uang
Diterima / DP (Rp)") di panel `txShopSalePanel` (bagian dari `txModal`)
yang ditambahkan Sesi S660 (DP + auto-piutang untuk penjualan Shop lewat
form Transaksi biasa). 3 file shared lain (`features-helpers-global-
security.js`, `modules-render.js`, `modules-calc.js`) dicek juga —
cuma beda version-string, isi identik, jadi aman.

Fix: `modals.js` di patch ini sekarang dibangun ulang dari basis S662
(sudah include field DP dari S660 + tetap sinkron dgn S661/S662, yang
memang tidak lagi menyentuh modals.js), BUKAN dari basis S664 yang stale.
`modules/shop/cobek-tx-cart.js` (logic `applyTxShopSaleFromTx` DP+piutang
dari S660) turut disertakan di patch ini juga supaya self-contained —
tidak bergantung urutan apply patch lama.

`modules/business/tukang-absensi.js` TIDAK terpengaruh isu ini — file
itu tidak pernah disentuh S660/S661/S662, jadi versi dari S664 tetap
valid dipakai sebagai basis.

## Fitur/perbaikan asli patch S665 (tidak berubah)
### 1. Tombol "Tandai Semua Upah Jam Bulan Ini Sudah Dibayar" (tkJamHistModal)
Modal Riwayat Borongan sudah punya tombol pemercepat
"💸 Tandai Semua Borongan Bulan Ini Sudah Dibayar"
(`Tukang.payBorHistoryAsExpense`). Modal Riwayat Absen Jam sekarang
punya tombol setara: `Tukang.payJamHistoryAsExpense()` — mirror 1:1,
filter `a.mode!=='borongan'`, skip entri yang sudah `paidTxId`/
`renovItemLinkId`, breakdown per nama tukang otomatis masuk ke catatan
pengeluaran.

### 2. Guard delWorker() untuk absensi yang sudah dibayar
`Tukang.delWorker()` sebelumnya cuma menolak hapus pekerja kalau ada
absensi `renovItemLinkId` — absensi yang sudah `paidTxId` ikut terhapus
diam-diam. Sekarang ditambah guard yang sama untuk `paidTxId`, konsisten
dengan guard yang sudah ada di `delAbsensiEntry()`.

## File di patch ini
- `modules/shared/modals.js` — basis S662 (fix S660 re-merged) + tombol
  pay-all baru di `tkJamHistModal`.
- `modules/shop/cobek-tx-cart.js` — dari S662 (identik S660/S661),
  disertakan supaya field DP baru di modals.js ada logic pendukungnya.
- `modules/business/tukang-absensi.js` — basis S664 + `payJamHistoryAsExpense()`
  baru + guard `paidTxId` di `delWorker()`.

## Belum di-rebuild
`app_production.html` / `index.html` / `app-bundle-*.min.js` — perlu
lewat build pipeline kamu seperti biasa, saya nggak punya akses ke situ.
