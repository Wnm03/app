# Manifest patch kumulatif S2615 — app-main (32), v2608

## Rantai akumulasi dan baseline
- Baseline sumber asli: `app-main (32).zip`.
- SHA-256 baseline terverifikasi: `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781`.
- Parent langsung: `PATCH-APP-MAIN-32-CUMULATIVE-FINANCE-S2614-v2607-NOT-E2E-VERIFIED.zip`.
- Jenis paket: overlay kumulatif terhadap baseline; bukan arsip source lengkap mandiri.
- Tahap S2601–S2614 dipertahankan; S2615 menutup celah coercion nominal yang ditemukan pada audit lanjutan.

## Perubahan S2615
- `modules/finance/finance-allocation-api.js`: validasi nominal tagihan dan utang aktif kini menerima hanya tipe `number` atau `string`, menolak string kosong/whitespace, coercion boolean/array/object, nilai non-finite, dan nilai negatif. String numerik valid tetap didukung untuk kompatibilitas data lama.
- `tests/s2613-finance-actual-cash-reconciliation.test.js`: regresi tambahan untuk utang whitespace-only, boolean `false`, array kosong, dan tagihan dengan bentuk coercion tidak valid.
- Rebuild bundle A/B dan sinkronisasi aset versi ke 2608; manifest hash SHA-256 diperbarui.
- Tidak ada skema penyimpanan baru, transaksi otomatis, duplikasi fitur, atau perubahan formula saldo/ownership.
- `DELETE-FILES.txt` dipertahankan kumulatif; tidak ada penghapusan baru di S2615.

## Validasi
- Tes rekonsiliasi finansial, fail-closed S2612, dan sinkronisasi hash: 31/31 lulus.
- Full test suite final: 9.068 tes, 9.067 lulus, 0 gagal, 1 skipped; seluruh shard selesai.
- Build v2608, sintaks bundle, bundle freshness, reproducible build: PASS.
- Lint target file: 0 error, 5 warning existing pada source API.
- Window expose, SOT, architecture, persistence, PWA recovery, patch contamination, release UI/performance budget, production readiness 14/14, release-ready gate, release-final gate, dan hash check: PASS.
- E2E Chromium dicoba tetapi diblokir lingkungan dengan `net::ERR_BLOCKED_BY_ADMINISTRATOR`; E2E runtime belum terverifikasi.

## Guardrail
Semua rekomendasi investasi tetap non-otomatis. Bila sumber kas/kewajiban/cadangan ambigu atau nominal tagihan/utang invalid, API fail-closed (`safeInvestableAmount: null`, `investmentAllowed: false`).
