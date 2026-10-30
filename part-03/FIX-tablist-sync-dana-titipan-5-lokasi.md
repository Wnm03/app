# FIX: 5 tempat mutasi Dana Titipan tidak sinkron ke tab baru

## Latar belakang
Kartu owner Dana Titipan dirender ke 2 container dengan markup sama:
`#danaTitipanPortfolioList` (kartu lama, Dana Kelolaan) dan
`#danaTitipanTabList` (tab baru, Laporan > Dana Titipan). Sesi 550
sudah menambal 2 fungsi. Audit menyeluruh menemukan **5 tempat lain**
yang luput:

| # | Lokasi | Trigger | Field yang jadi stale di #danaTitipanTabList |
|---|---|---|---|
| 1 | `DanaTitipanCommitmentUI.removeOwnerLinkage()` | tombol "🔓 Lepas Keterikatan" | Status keterikatan owner |
| 2 | `DanaTitipanReturnUI.save()` | catat pengembalian | Nilai/riwayat pengembalian baru |
| 3 | `DanaTitipanReturnUI.deleteEntry()` | hapus riwayat pengembalian | Baris riwayat yang sudah dihapus |
| 4 | Submit `titipanExpenseModal` (titipan-expense-ui.js) | catat pengeluaran titipan | "Estimasi dari Transaksi <Akun>" |
| 5 | `delTx()` (tx-list-cashflow.js) — cascade `titipanLinkId` | hapus transaksi ber-titipanLinkId dari list transaksi umum | "Estimasi dari Transaksi <Akun>" |

Bug #5 ditemukan lewat pola struktural: `delTx()` punya cascade untuk
9 jenis link (bbm, part stock, stock, cobek, servis, renov, wishlist,
sewaKios, tukang) — SEMUA memanggil fungsi render modulnya sendiri
setelah mutasi, KECUALI `titipanLinkId`. Komentar Sesi 519 di kode
hanya menjamin kebenaran DATA (`usedTotal`/`available` otomatis benar
di render berikutnya), tidak membahas refresh TAMPILAN — celah yang
sama persis dengan bug #1-4.

Semua kasus: **data backend sudah benar** — murni bug render,
container kedua tidak ikut ter-refresh sampai user pindah tab/reload.

## Fix
5 titik ditambahkan pemanggilan (pola PERSIS sama dgn Sesi 550):
```js
if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
```
0 logic baru, 0 perubahan kontrak/data.

## File yang berubah (kode fix)
- `modules/finance/dana-titipan-portfolio-render.js` — 3 fix
- `modules/finance/titipan-expense-ui.js` — 1 fix
- `modules/finance/tx-list-cashflow.js` — 1 fix

## File pendukung (bundle & housekeeping otomatis dari build.js)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — WAJIB ikut diupload
- `chat-action-handlers.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `modules/shared/modules-render.js`,
  `modules/shared/features-helpers-global-security.js` — bump versi
- `index.html`, `app_production.html`, `sw.js` — bump `?v=` cache
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis

## Verifikasi
`node --test tests/*.test.js` — 4146/4146 lolos.
`node scripts/build.js` — sukses, sintaks bundle valid.

Catatan: bundle TANPA minifikasi (esbuild tidak ada, sandbox tanpa
internet). Valid & aman dipakai. Untuk ukuran ter-minify: `npm install
--save-dev esbuild && node scripts/build.js` di environment Anda.
