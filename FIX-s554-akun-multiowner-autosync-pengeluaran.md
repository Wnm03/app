# FIX s554 — Sinkronisasi Akun ↔ Aset Multi-Owner di Form Transaksi (+ Pengeluaran)

## Audit — 3 gap dikonfirmasi

1. **Dropdown "Kaitkan ke Aset Multi-Owner" hanya muncul untuk Pemasukan.**
   `updateTxAssetWrapVisibility()` (transaksi.js) sebelumnya digate
   `curTxType==='income'`, dan `_saveTxInner()` sengaja mengosongkan
   `txAssetIdVal` untuk transaksi bukan Pemasukan. Pengeluaran dari dana
   titipan/patungan — kasus yang justru paling sering butuh split porsi —
   tidak pernah bisa dicatat lewat jalur ini.

2. **Memilih akun tidak otomatis mengaitkan ke aset patungannya.**
   `#txAcc` dan `#txAssetId` adalah dua field independen: memilih akun cuma
   set `_txAccManuallySet=true`, tidak ada logic yang mencari aset mana yang
   `accountId`-nya menunjuk ke akun itu. User harus tahu & pilih manual aset
   yang benar dari daftar SEMUA aset multi-owner.

3. **`titipanLinkId` (jalur Dana Titipan) tetap terpisah dari `txAssetId`**
   (jalur Transaksi biasa) — TIDAK diubah oleh patch ini, dua mekanisme itu
   memang untuk kasus berbeda (lihat dokumentasi lama di
   FIX-v1250-to-v1251-s519-titipan-talangan-linkage.md).

## Perubahan

**modules/finance/transaksi.js**
- `updateTxAssetWrapVisibility()`: dropdown aset multi-owner sekarang tampil
  untuk Pemasukan *maupun* Pengeluaran (syarat tetap: minimal 1 aset
  multi-owner ada).
- `findMultiOwnerAssetForAccount(accId)` (baru): cari aset multi-owner yang
  `accountId`-nya cocok dengan akun yang dipilih.
- `onTxAccChange()` (baru, dipanggil dari `onchange` `#txAcc`): selain
  `_txAccManuallySet=true` (perilaku lama), sekarang juga auto-suggest aset
  yang cocok ke `#txAssetId` — kecuali user sudah pernah pilih aset sendiri
  (`_txAssetManuallySet`, guard baru, pola sama `_txAccManuallySet`).
- `onTxAssetChange()`: sekarang menandai `_txAssetManuallySet=true`.
- `openTxModal()` / `editTx()`: reset/seed `_txAssetManuallySet` supaya guard
  di atas berperilaku benar tiap buka modal (baru vs edit tx yang sudah
  punya `assetId`).
- `_saveTxInner()`: `txAssetIdVal` diambil apa adanya dari dropdown, tidak
  lagi difilter `curTxType==='income'`.

**modules/shared/features-helpers-global-security.js**
- Deklarasi global baru `_txAssetManuallySet=false` (di sebelah
  `_txAccManuallySet`).

**modules/modals.js**
- `#txAcc` onchange: `_txAccManuallySet=true` → `onTxAccChange()`.

## Yang TIDAK diubah
- Jalur Dana Titipan (`titipanLinkId`, tab Dana Titipan) — tetap terpisah,
  1 owner per transaksi/nominal penuh vs split porsi ke semua owner.
- `resolveTxAssetSplit()` / `MultiOwnerEngine` — tidak disentuh, split logic
  sudah reuse dari S394.
