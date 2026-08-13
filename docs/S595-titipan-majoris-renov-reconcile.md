# S595 (lanjutan) — Pengeluaran Majoris (dari transaksi Renov) + Sisa Saldo

## Kontrak audit final (disetujui O)
- `tx.renovProjectLinkId` = scope eksplisit transaksi Renovasi (field
  SUDAH ADA, diisi transaksi.js/linktx.js/tx-renov.js/renovasi.js saat
  user centang "🔨 Catat juga ke Proyek Renovasi?").
- `t.accountId === akun tertaut Majoris` = sumber transaksi dari
  holding/account Majoris yang memang sudah terhubung (resolusi akun
  REUSE relasi `h.linkedAssetId`/`h.linkedInvestmentId -> asset.accountId`
  yang SAMA PERSIS dipakai `_expenseComparisonForOwner()` Sesi C/S597 —
  0 asumsi baru soal "Majoris" sebagai nama/tipe akun tertentu).
- Hanya `type === 'expense'`.
- `Pengeluaran Majoris` = live-derived `SUM(t.amount)`, tanpa
  field/cache baru.
- `Sisa Saldo Majoris Belum Terpotong` = Total Pokok Dikomit (manual,
  TIDAK disentuh) − Pengeluaran Majoris.
- Nilai negatif TIDAK di-clamp.
- Negatif → merah + badge "⚠️ Melebihi pokok".
- Owner resolution Gap #1 TIDAK diubah.
- Fitur "alihkan ke akun lain" tetap out of scope.

## Implementasi
1. **`modules/finance/dana-titipan-aggregation-api.js`** — 2 fungsi pure
   baru di `DanaTitipanPortfolioAPI`:
   - `_majorisLinkedAccountIds(owners)` — resolve akun-akun tertaut ke
     SELURUH holding Dana Titipan (union lintas SEMUA owner hasil
     `build()`, beda scope dari `_expenseComparisonForOwner()` yang
     per-owner). Perbandingan id pakai `String()` langsung (bukan
     `sameId()` global) supaya aman dipanggil dari harness test manapun
     yang belum tentu meng-inject `sameId` — 100% setara secara nilai
     (`sameId()` sendiri didefinisikan `String(a)===String(b)`).
   - `majorisRenovReconciliation(owners, principalAmountTotal)` — hitung
     `pengeluaranMajoris` + `sisaSaldo` sesuai kontrak di atas. Return
     `null` kalau tidak ada satupun akun tertaut (baris disembunyikan).
   0 fungsi/rumus lama di file ini diubah (`build()`, `_holdingSplits()`,
   `_assetSplits()`, `allocatedExcluding()`, `listExistingOwners()` apa
   adanya).
2. **`modules/finance/dana-titipan-portfolio-render.js`** — 2 baris baru
   di `_renderNow()`, ditaruh TEPAT di bawah baris "Total Pokok Dikomit"
   yang sudah ada (0 baris lama dipindah/dihapus): "Pengeluaran Majoris
   (dari transaksi Renov)" (angka biasa) dan "Sisa Saldo Majoris Belum
   Terpotong" (badge merah "⚠️ Melebihi pokok ..." kalau negatif, angka
   normal kalau ≥ 0). Murni wiring markup, 0 rumus ditulis di file ini.
3. **`tests/s595-titipan-majoris-renov-reconcile.test.js`** — 16 test
   baru: 4 test `_majorisLinkedAccountIds()` (resolusi akun aset/
   investasi-tertaut-aset/dedup lintas-owner/kosong), 8 test
   `majorisRenovReconciliation()` (hitung dasar, filter
   renovProjectLinkId, filter type expense, filter akun, tidak ada akun
   tertaut, negatif tidak di-clamp, dedup lintas-owner, principal
   default 0), 4 test wiring markup `_renderNow()` (baris muncul di
   bawah Total Pokok Dikomit, baris hilang kalau tidak ada akun tertaut,
   badge merah muncul saat negatif, Total Pokok Dikomit manual tidak
   berubah nilainya).

## Hasil regresi
- File baru: 16/16 PASS.
- Full suite (`node --test tests/*.test.js`): **4162/4162 PASS** (0
  regresi ke test lama — termasuk `sC-titipan-majoris-expense-comparison`,
  `s500-dana-titipan-f2-opsib-hide-gain-aset`,
  `s540d-investasi-custodian-grouping`,
  `s543-titipan-asset-pick-preserve-selection`, semua tetap hijau).
- `node scripts/verify-window-expose.js` → OK.

## Catatan build/bundle (PENTING — baca sebelum deploy)
Sesi ini dikerjakan di environment TANPA `esbuild` terpasang & TANPA
akses internet untuk `npm install`. `node scripts/build.js` sempat
dicoba di sini dan BERHASIL (bundle valid, `node --check` lolos), TAPI
hasilnya:
- Bundle jadi TIDAK terminifikasi (jauh lebih besar dari build produksi
  biasa — build.js sendiri kasih peringatan ini, bukan error).
- Nomor versi/label build ikut auto-bump ke label yang TIDAK berkaitan
  dgn sesi ini (state file versioning build.js beda track dari
  penomoran sesi `sXXX` dokumen).

Karena itu, **bundle hasil build TIDAK disertakan di ZIP ini** — patch
ini dikirim sbg **source (-WIP, pre-build)**, sesuai pola yang sudah
pernah dipakai sebelumnya (S486, Case F: "diserahkan sbg -WIP ZIPs
pre-build, verifikasi build di sesi berikutnya"). Langkah selanjutnya di
sisi O:
1. Timpa 2 file source (`dana-titipan-aggregation-api.js`,
   `dana-titipan-portfolio-render.js`) + tambahkan 1 file test baru ke
   working copy lokal.
2. Jalankan `npm test` (harus tetap 4162/4162 seperti di atas).
3. Jalankan `npm run build` di environment lokal O (yang sudah ada
   `esbuild` + state versi yang benar) untuk hasilkan bundle
   terminifikasi + bump versi yang konsisten dgn sesi-sesi sebelumnya.
4. Upload SEMUA file yang berubah (2 source + bundle hasil build lokal
   + HTML/sw.js yang ikut ke-bump build.js), bukan cuma source.
