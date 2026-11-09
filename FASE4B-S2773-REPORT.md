# Fase 4B — Tabel padat transaksi di layar lebar (S2773)

Rujukan: RENCANA-UPGRADE-FRONTEND.md §D Fase 4 ("Tabel padat untuk riwayat transaksi/produk di ≥1024px"); persetujuan ubah render JS diberikan di sesi ini.

## Temuan
- Jalur tabel padat (`txTableHTML`, S637/S641) sudah ada tetapi hanya aktif bila `D.profile.theme==='modern'`. CSS `.tx-tbl*` bersifat global (tidak terkunci tema).

## Perubahan
- `modules/finance/tx-list-cashflow.js`: helper `kwWideTxTable()` (`matchMedia('(min-width:1024px)')`) + listener breakpoint tunggal yang merender ulang daftar Uang saat melintasi 1024px (hanya bila halaman Keuangan aktif dan tema bukan modern).
- `modules/shared/modules-render-b.js` (#allTx) dan `modules/finance/filter-laporan.js` (Riwayat, render awal): kondisi modern lama dipertahankan persis, ditambah `||` jalur lebar. Penambahan baris "muat lebih banyak" di Riwayat mengikuti DOM yang ada (tabel bila `.tx-tbl` sudah ada).
- <1024px dan tema non-modern: jalur kartu `txHTML()` tidak berubah. Data, filter, `editTx`/`delTx`, saldo berjalan tidak berubah.
- `tokens.css`: blok "FASE 4B (S2773)" (hover baris, tanpa `!important`).
- Tes baru: `tests/fase4b-s2773-wide-tx-table.test.js` (6 tes; 3 menjalankan helper di sandbox VM).
- Build 2773 (`SKIP_LINT=1`), hash disegarkan.

## Verifikasi yang benar-benar dijalankan
- Full suite: 9558 tes, 9542 lulus, 15 gagal — identik dengan S2771/baseline (0 kegagalan baru; tes S637/S641/S643 yang mengunci gating modern tetap lulus).

## Belum / batas klaim
- Tidak diukur di browser (Chromium tidak tersedia di sesi ini): tampilan tabel di 1024–1440px pada tema Dark/Light/Graphite belum dilihat. Jalankan `tools/capture-fase1b-extended.py`.
- Cakupan hanya transaksi (Uang + Riwayat). Tabel Aset dan Dana Titipan tetap khusus tema modern; tabel produk Shop belum. Master–detail (4C) dan grid tablet belum.
- Lint/minify penuh, Safari/Firefox, Android belum. `!important` 186, `@layer` belum.
