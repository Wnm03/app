# Manifest patch kumulatif S2614 — app-main (32), v2607

## Base
- Melanjutkan: `PATCH-APP-MAIN-32-CUMULATIVE-FINANCE-S2612-v2603.zip`
- Baseline source asli: `app-main (32).zip`
- SHA-256 baseline: `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781`
- Tipe paket: overlay kumulatif; bukan source lengkap mandiri.

## Perubahan S2614
- `modules/finance/finance-allocation-api.js`: nominal utang aktif hilang/kosong/non-numerik/negatif memblokir alokasi dengan `INVALID_ACTIVE_DEBT_AMOUNT`.
- `tests/s2613-finance-actual-cash-reconciliation.test.js`: regresi untuk empat bentuk nominal utang tidak valid; tes tetap memastikan saldo/utang diproses lewat sumber kanonis.
- Source dan bundle hasil rebuild, sinkronisasi versi aset ke 2607, `FILE-HASHES-SHA256.txt`, serta dokumen file map/coverage ikut diperbarui karena build menghasilkan perubahan tersebut.
- Tidak ada file yang dihapus; `DELETE-FILES.txt` menyatakan tidak ada penghapusan pada tahap ini.

## Validasi
- Full suite: 9.062 tes, 9.061 lulus, 0 gagal, 1 dilewati; semua checkpoint shard valid.
- Build dan bundle freshness: PASS.
- Lint: 0 error (1.822 warning).
- SOT, architecture, persistence, performance budget, patch contamination, release UI, production readiness 14/14, window expose, release-ready: PASS.
- E2E Chromium diblokir `ERR_BLOCKED_BY_ADMINISTRATOR`; full runtime E2E belum terverifikasi.
- `release-final-gate.js`: **PASS** saat dijalankan hingga selesai di proses terpisah; reproducible build PASS. Hash manifest diperbarui ulang setelah gate menulis dokumen build dan diverifikasi 41/41 entri valid.

## Guardrail
Tidak mengubah formula saldo kanonis, `OwnershipEngine`, aturan ownership, atau skema storage. Tidak membuat transaksi/transfer otomatis. Investasi hanya dapat direkomendasikan jika data kas, kewajiban, dan cadangan memenuhi rekonsiliasi; kondisi ambigu tetap fail-closed.
