# Audit S2616 — Validasi nominal forecast dan cicilan utang

## Baseline dan akumulasi
- Baseline: `app-main (32).zip`
- SHA-256 baseline terverifikasi: `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781`
- Parent kumulatif: `PATCH-APP-MAIN-32-CUMULATIVE-FINANCE-S2615-v2608-NOT-E2E-VERIFIED.zip` (SHA-256 `7c391446df9293f1b6f1be37857dba623bc6a341d34a343860e3a27264945ff9`)
- Patch ini overlay kumulatif, bukan arsip source lengkap mandiri.

## Perubahan nyata
1. `modules/finance/finance-allocation-api.js`: validasi `cashForecast.upcoming` menolak nominal yang bukan number/string, null, string kosong/spasi, non-finite, atau negatif; tanggal jatuh tempo harus valid. Nilai tervalidasi dikonversi sekali sebelum agregasi.
2. `modules/finance/finance-allocation-api.js`: `debt.cicilanBulanan` tidak lagi memakai coercion `Number(value || 0)` untuk nilai eksplisit. Boolean, array, object, string kosong/spasi, string non-numerik, NaN, Infinity, dan nilai negatif ditolak dengan `INVALID_DEBT_INSTALLMENT`. Nilai null/absen tetap menuju jalur utang tanpa jadwal yang sudah fail-closed; string numerik valid masih diproses ke pemeriksaan tautan tagihan kanonis.
3. `tests/s2613-finance-actual-cash-reconciliation.test.js`: menambah regresi untuk tipe/angka cicilan tidak valid dan string numerik valid. Tes S2616 validasi forecast yang sudah ada tetap disertakan.
4. Build memperbarui bundle, HTML/service worker, file versi dan dokumen inventaris sesuai mekanisme build aplikasi.

## Verifikasi yang dijalankan dalam lingkungan kerja ini
- `node --test` pada 13 berkas tes finance S2601–S2613: **99 lulus, 0 gagal, 0 skipped**.
- Build `node scripts/build.js`: berhasil; versi aset otomatis naik ke **2610**; kedua bundle lolos pemeriksaan sintaks.
- `node scripts/verify-bundle-freshness.js`: PASS untuk bundle A dan B.
- `node scripts/verify-window-expose.js`: PASS.
- `python3 scripts/refresh-file-hashes.py --check`: **41 entri valid, 0 basi, 0 hilang**.
- `npm run test:e2e`: **tidak dapat menyelesaikan navigasi aplikasi** karena Chromium melaporkan `net::ERR_BLOCKED_BY_ADMINISTRATOR`; ini batasan lingkungan, bukan hasil E2E lulus. Skrip memiliki tiga cek kartu Alokasi Dana Aman, tetapi cek itu tidak sempat dieksekusi.
- Full suite (`node scripts/run-full-test.js`): **9.091 tes, 9.090 lulus, 0 gagal, 1 skipped**, seluruh shard selesai.

## Status
**NOT-E2E-VERIFIED; full suite masih menunggu hasil.** Jangan anggap patch ini sebagai rilis terverifikasi penuh sebelum full suite selesai dan E2E kartu alokasi benar-benar dijalankan pada lingkungan Chromium yang mengizinkan origin lokal.
