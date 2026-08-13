# Patch gabungan — semua fix (7 bug, 1 zip)

Ini gabungan dari 2 sesi audit sebelumnya, di-build ULANG dari nol
dari repo GitHub asli (app-main__10_) supaya kedua bundle
(`app-bundle-a.min.js`/`app-bundle-b.min.js`) berisi SEMUA fix
sekaligus — bukan sekadar timpa-tindih file dari beberapa zip
terpisah (yang akan membuat salah satu set fix hilang dari bundle).

## Sesi 1 — Fix Buku Aset & Dana Titipan (Majoris/Custodian)
1. **orphan2** (`modules/asset/aset.js`) — hapus aset sekarang ikut
   membersihkan semua entry utang owner (`D.debts`) yang masih
   terkait `linkedAssetId`-nya (dulu nyangkut di Buku Utang).
2. **sD** (`modules/asset/investasi-list-view.js`) — rename/hapus
   kustodian sekarang memicu re-render tab Dana Titipan, jadi nama
   kustodian lama tidak lagi "menempel".

## Sesi 2 — Audit "tombol Lepas Keterikatan" & bug sekelas (5 lokasi)
Kartu owner Dana Titipan dirender ke 2 container
(`#danaTitipanPortfolioList` & `#danaTitipanTabList`). 5 fungsi
mutasi berikut lupa sync ke container kedua:
3. `removeOwnerLinkage()` — tombol "🔓 Lepas Keterikatan"
4. `DanaTitipanReturnUI.save()` — catat pengembalian
5. `DanaTitipanReturnUI.deleteEntry()` — hapus riwayat pengembalian
6. Submit `titipanExpenseModal` — catat pengeluaran titipan
7. `delTx()` cascade `titipanLinkId` — hapus transaksi titipan dari list umum

Semua: 0 perubahan kontrak/data, murni tambahan
`renderInto('danaTitipanTabList')` di titik yang tepat.

## File dalam patch ini
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — bundle final, berisi SEMUA 7 fix, WAJIB diupload
- `modules/asset/aset.js`, `modules/asset/investasi-list-view.js` — fix #1-2
- `modules/finance/dana-titipan-portfolio-render.js`, `titipan-expense-ui.js`, `tx-list-cashflow.js` — fix #3-7
- `chat-action-handlers.js`, `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `modules/shared/features-helpers-global-security.js` — bump versi otomatis (housekeeping)
- `index.html`, `app_production.html`, `sw.js` — bump `?v=` cache-busting (housekeeping)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis (housekeeping)
- 3 file `FIX-*.md` — dokumentasi tiap fix

## Verifikasi
`node scripts/build.js` sukses (sintaks bundle valid) dan
`node --test tests/*.test.js` — **4146/4146 test lolos** — dijalankan
dari base gabungan ini, bukan dari sesi terpisah.

Catatan: bundle TANPA minifikasi (esbuild tidak tersedia, sandbox
tanpa akses internet). Valid & aman dipakai. Untuk ukuran ter-minify:
`npm install --save-dev esbuild && node scripts/build.js` sekali di
environment Anda sendiri.
