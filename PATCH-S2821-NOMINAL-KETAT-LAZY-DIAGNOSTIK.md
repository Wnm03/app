# PATCH S2821 — Nominal transaksi ketat + peta lazy-load diagnostik
Dasar: app-main__11_.zip (build s2433-dana-titipan-akumulatif-2832) → hasil build 2835. Sumber: audit browser nyata (Playwright/Chromium).

## 1. Nominal transaksi dipotong diam-diam (modules/finance/transaksi-b.js, modules/shared/kalkulator-input.js)
Akar: `_saveTxInner` memakai `parseFloat(txAmt.value)`; `evalAmtExpr` hanya jalan bila ada operator/titik dan `safeCalc` menolak koma.
Dulu: `12abc34`→12, `1500,50`→1500, `1.500,50`→1,5, `1.5jt`→1,5, `1500.5`→1500,5 (pecahan).
Kini: `parseAmtStrict()` (koma = desimal gaya Indonesia, hanya angka tunggal; selain itu wajib lolos safeCalc) lalu `Math.round` ke rupiah utuh (selaras S2819). Input rusak DITOLAK dengan toast jelas.
Hasil browser: `12abc34`/`1.5jt` ditolak; `1.500,50`/`1500,50`/`1500.5`→1501; `12+3*2`→18; `1.500.000`→1500000.
Catatan: `0,5` kini tersimpan Rp 1 (pembulatan). `parseFloat` di modal lain (transfer, renov, BBM, dst.) BELUM diaudit/diubah.

## 2. Tombol diagnostik "belum berfungsi" di sesi segar (modules/shared/features-helpers-global-security.js)
Akar: peta `lazyOwnerLoaders` hanya memuat self-test.js untuk runSelfTest/copySelfTestResults.
Ditambah: runNavSmokeTest, runModalSweep, copyNavSmokeResults, copyModalSweepResults, repairTitipanOrphans → ensureSelfTest.
File dijaga tepat 1750 baris (guard cap 1750): 2 baris ditambah, 1 komentar di akhir baris entri.

## Tes & gerbang
- tests/s2821-nominal-ketat-dan-lazy-diagnostik.test.js: 4 tes baru lulus.
- Suite penuh: 9.824 tes, 9.820 lulus, 3 gagal BAWAAN zip (bukan dari patch): S1780 DELETE-FILES, s1608 modules/modals.js orphan, S2308 shadow global-security — file retired S2720 masih ikut di zip baseline.
- verify-bundle-freshness OK, verify-window-expose OK, node scripts/build.js --require-minify OK (versi 2835).
- Belum dikerjakan: `docs/` berisi salinan bundle terpisah (berbeda dari root) — perlu keputusan apakah dipakai deploy.
