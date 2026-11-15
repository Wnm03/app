# PATCH S2816 — Perbaikan LAPORAN-BUG-uji-backup-2026-11-12 (akumulatif di atas S2815, build 2825)
Unggah SEMUA file di zip ini (termasuk bundle hasil build).

| ID | Status | Perbaikan |
|---|---|---|
| B1 | Diperbaiki | Strip Beranda modern jadi grid 2x2 di <400px (diverifikasi Chromium 360: kanan 348px) |
| B2 | Diperbaiki | Label strip 11px |
| B3 | Diperbaiki | Lantai 11px: 33 aturan styles.css + 14 modern-ui-layer.css (kecuali .nav-item); crawl 4 tema: 0 teks <11px |
| B4 | Diperbaiki | txDate min/max, simpan ditolak (>1 thn ke depan / <2000), audit menandai tanggal tidak wajar di SEMUA transaksi |
| B5 | Dijelaskan + dibuat terlihat | Perubahan hanya ID (mergeDuplicates kategori kembar; reconciler S2451 hanya categoryId/catId), nominal tidak disentuh. Toast restore kini memberi tahu |
| B6 | Diperbaiki | overflow-wrap pada nama fitur & .bbm-val |
| B7 | Diperbaiki | Token terang (accent/2/3/4, money-pos/neg) dan modern (accent3/4) digelapkan ke >=4,5:1 |
| B8 | Diperbaiki | Cache saldo akun diinvalidasi saat restore (penyebab "Rp 0" dan saldo mesin != kartu) |
| B9 | Tidak diubah | Layar PIN setelah restore kemungkinan disengaja; butuh konfirmasi pemilik |

## Tes
- Tes baru: tests/s2816-laporan-bug-uji-backup.test.js (7 tes)
- Full suite: 9749 lulus, 10 gagal — semuanya sudah gagal sebelum patch ini (basis app-main__9_ v2803 tidak sama dengan "app-main (10)"): S1780, deleteProject, s1608, S2308, S2779, E2E renov, s447 x2, applyTxRenovFromTx, AIBus.
- Verifikasi data nyata TIDAK dilakukan (file backup tidak diunggah); pengukuran memakai data sintetis.
