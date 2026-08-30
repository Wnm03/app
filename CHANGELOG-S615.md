# S615 — Fix: tab Investasi tidak respon + cleanup holding "hantu" hasil migrasi kendaraan

Lanjutan audit sesi sebelumnya (backup user `backup-keluarga-W-2026-08-29__2_.json`):
ditemukan aset "Vario 125" (kendaraan) punya `_migratedToInvestmentId` menunjuk ke holding
investasi hantu di `D.investments`, hasil bug lama di `migrateAssetInvestmentsToHoldings()`
sebelum gate `ASSET_JENIS_TO_INVESTMENT_TYPE` ada (fix source-nya sudah ada, tapi tidak
retroaktif). Dua perbaikan diimplementasikan:

## 1. `modules/asset/investasi-list-view.js`

- **`_renderSummary()` dibungkus try/catch** — sebelumnya `Investment.portfolioSummary()`
  dipanggil tanpa proteksi; kalau satu holding bikin salah satu hitungan (holdingValue/
  holdingCost/dividendTotal/realizedGainLoss/holdingYieldPct) throw, exception itu
  merambat keluar SEBELUM `_renderList()` sempat jalan (dipanggil setelahnya di `render()`)
  — gejalanya persis "tab Investasi tidak respon, tap 0 reaksi, 0 toast" karena `render()`
  dipanggil langsung dari `setAsetTab()`, bukan lewat dispatcher data-action yang punya
  toast. Fix: fallback ke ringkasan kosong/aman + pesan ⚠️ di kartu nilai, `_renderList()`
  tetap sempat jalan & tab tetap bisa dipakai.
- **Banner "holding hantu"** ditambahkan di `_renderList()` — mendeteksi lewat
  `findGhostMigratedAssets()` (aset-misc.js, baru) & menampilkan tombol "↩️ Pulihkan ke
  Buku Aset" per aset yang terdeteksi. Method baru `InvestmentListUI.unmigrateGhost(assetId)`
  minta konfirmasi (`askConfirm`), lalu panggil `unmigrateAssetFromInvestment()`, lalu
  refresh Investasi + Buku Aset + Kekayaan Bersih + Zakat Maal.

## 2. `modules/asset/aset-misc.js`

- **`findGhostMigratedAssets()`** (baru) — deteksi read-only aset dengan
  `_migratedToInvestmentId` terisi TAPI `jenis`-nya TIDAK ada di
  `ASSET_JENIS_TO_INVESTMENT_TYPE` (mis. Kendaraan) DAN holding tujuannya masih ada di
  `D.investments`. Kombinasi ini cuma mungkin terjadi lewat bug lama (gate yang sudah ada
  mencegah kombinasi ini terjadi lagi ke depannya).
- **`unmigrateAssetFromInvestment(assetId)`** (baru) — membalik migrasi 1 aset: hapus
  holding tujuan (`Investment.deleteHolding()`, sudah ada, sudah membersihkan
  `D.investmentTx` & entry Buku Utang tertaut) + bersihkan `_migratedToInvestmentId` di
  asetnya supaya aset itu lolos lagi dari filter exclude `Aset.renderList()`/
  `totalValue()`. 0 auto-fix — keputusan pulihkan selalu manual lewat UI.

## Test

`tests/investasi-ghost-migration-and-summary-guard-s614.test.js` (baru, 6 test):
1. `_renderSummary()` guard — holding beracun tidak menjatuhkan `render()`, `_renderList()`
   tetap jalan.
2. `findGhostMigratedAssets()` — Kendaraan terdeteksi, aset investasi normal (Kripto) tidak.
3. `unmigrateAssetFromInvestment()` — hapus holding & bersihkan flag.
4. `unmigrateAssetFromInvestment()` — assetId tidak valid → `false`, 0 perubahan.
5. Banner muncul & tombolnya memanggil `unmigrateGhost()` → refresh Investasi + Buku Aset.
6. Tidak ada ghost → tidak ada banner.

Full suite: **4915/4915 pass** (termasuk 6 test baru di atas).

## Build

`node scripts/build.js s615-fix-investasi-render-crash-and-ghost-migration` — versi app
naik ke **1457**, 5 file konstanta versi disinkronkan (modules-render.js, modals.js,
modules-calc.js, chat-action-handlers.js, features-helpers-global-security.js), kedua
bundle lolos cek sintaks.

## Belum dikerjakan / catatan

- Belum ada UI serupa untuk sisi Buku Aset (banner ini cuma dirender di tab Investasi).
- Belum ada scan otomatis global (mis. saat backup/restore) untuk holding hantu lain di
  luar kasus Kendaraan — cakupan sengaja dibatasi ke pola bug yang dikonfirmasi
  (`jenis` di luar `ASSET_JENIS_TO_INVESTMENT_TYPE`).
