# PATCH S2843 (akumulasi di atas S2840 + S2841 + S2842) — Debt Optimizer tidak memuat "Dana titipan akun"
Basis: app-main_17. ZIP KUMULATIF: S2840 + S2841 + S2842 + S2843.

## Masalah
DebtStrategy.activeDebts() sudah mengecualikan entri titipan aset (linkedAssetId, S455) dan investasi (linkedInvestmentId, S460), tetapi TIDAK entri "Dana titipan akun" (linkedAccountId, TitipanSync). Akibatnya Debt Optimizer menganggapnya utang riil: activeCount/payoffPlan/urutan snowball-avalanche memuat dana investor/titipan (bunga 0, tanpa jatuh tempo, bukan kewajiban yang dilunasi).
## Perbaikan
- finance/piutang-utang.js — activeDebts(): +`!d.linkedAccountId`. Debt.totalValue() & Buku Utang TIDAK diubah di sini (totalValue sudah ditangani S2842; entri tetap tampil di Buku Utang).
- Konsisten dgn finance-allocation-api.js dan piutang-utang.js (baris isTitipanLinked) yang sudah mengecualikan ketiga tag.
## Uji browser (Chromium 390x844; asli vs patch; akun investor 4,7jt + titipan 2jt + dompet)
| | Asli | Patch |
| activeDebts | Investor, Pihak Ketiga | kosong |
| Debt Optimizer: activeCount / totalValue / payoffPlan.order | 2 / 6,7jt / 2 entri | 0 / 0 / kosong |
| Buku Utang (D.debts) | 2 entri | 2 entri (histori utuh) |
DSR memakai pemasukan rata-rata pribadi (3jt; sebelumnya 10jt karena S2842 belum ada). Tanpa error JS/console.
## Tes
Baru: tests/s2843-debt-optimizer-exclude-titipan-akun.test.js (4; tes utama RED lalu hijau).
Full suite TZ=UTC: base 10010/38 gagal; patch 10034/38 gagal, daftar nama gagal IDENTIK.
## Tidak diubah
lifeos/adapters/goal-adapter.js (goalSourceDebt) hanya mengecualikan linkedAssetId; entri titipan investasi & akun masih bisa muncul sbg sumber tujuan "lunasi utang". Di luar Debt Optimizer; belum diubah.
## Belum
Build ulang bundle resmi (scripts/build.js); uji Android.
