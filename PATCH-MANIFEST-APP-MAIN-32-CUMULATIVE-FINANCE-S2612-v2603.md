# Manifest patch kumulatif S2612 — app-main (32), v2603

## Base
- Melanjutkan: `PATCH-APP-MAIN-32-CUMULATIVE-FINANCE-S2611-v2602.zip`
- Baseline source asli: `app-main (32).zip`
- Baseline SHA-256: `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781`

## Perubahan S2612
- Fix `modules/finance/finance-allocation-api.js`: hasil `INSUFFICIENT_DATA` sekarang eksplisit mengembalikan `investmentAllowed: false`.
- Perkuat `tests/s2601-finance-allocation-api.test.js`.
- Tambah `tests/s2612-finance-allocation-fail-closed-flag.test.js` (4 skenario).
- Build ulang dua bundle, HTML runtime, service worker, konstanta versi sinkron, dokumen build, dan file hash.
- Tambah `AUDIT-S2612-FAIL-CLOSED-INVESTMENT-FLAG-APP-MAIN-32.md`.

## Validasi
- Tes terkait: 11/11 lulus.
- Full suite: 9.045 total, 9.044 lulus, 0 gagal, 1 dilewati.
- Release UI, SOT, bundle freshness, patch contamination, performance budget, architecture integrity, persistence integrity, dan file hash: PASS.
- E2E Chromium tidak dijalankan.

Patch merupakan overlay kumulatif dari S2601–S2612, bukan source lengkap mandiri. Nominal investasi tetap terkunci: `safeInvestableAmount: null`, `investmentAllowed: false`.
