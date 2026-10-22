# Manifest patch kumulatif S2616-R4 — app-main (32), aset v2610

## Rantai akumulasi
- Baseline: `app-main (32).zip`, SHA-256 `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781`.
- Parent langsung: `PATCH-APP-MAIN-32-CUMULATIVE-FINANCE-S2616-R3-v2610-NOT-E2E-VERIFIED.zip`, SHA-256 `1e928e93c123d1cc962572b6e01456fa0c0505fba5df12cfcd628dbec4e0d6ef`.
- Jenis: overlay kumulatif; bukan source archive mandiri.
- R4 hanya mengubah `e2e/run-e2e.js` dan `FILE-HASHES-SHA256.txt` (+ dokumen). Source produksi, bundle A/B, `sw.js`, `index.html`, `app_production.html` identik byte-per-byte dengan R3.

## Perubahan R4
- Runner E2E menambah 7 cek kartu Alokasi Dana Aman pada UI nyata (fixture sintetis di dalam halaman, dipulihkan setelah tiap skenario):
  1. state aman: kas terverifikasi, nominal aman dibuka (Rp 5.000.000), investasi diizinkan;
  2. state aman: kartu menyatakan rekomendasi, bukan transaksi, dan tanpa teks "Investasi dikunci";
  3. state aman: jumlah transaksi dan saldo akun tidak berubah;
  4. utang aktif bernominal spasi: terkunci, kode `INVALID_ACTIVE_DEBT_AMOUNT`;
  5. cicilan utang boolean: terkunci, kode `INVALID_DEBT_INSTALLMENT`;
  6. tagihan bernominal `false`: terkunci, kode `INVALID_BILL_AMOUNT`;
  7. cadangan darurat di bawah target: nominal investasi tidak dibuka.
- Cek nomor 5 membedakan S2616 dari S2615 (pada bundle S2615 kode berubah menjadi `DEBT_BILL_LINK_MISSING`; tetap terkunci).

## Hasil yang dijalankan (sandbox pemeriksa, Chromium headless)
- E2E: 26/26 cek lulus (sebelumnya 19/19), juga pada hasil build `release-final-gate`.
- Full suite (`TEST_SHARDS=32`, timeout shard dilonggarkan): 9.091 tes, 9.090 lulus, 0 gagal, 1 dilewati; 32 shard pass.
- `release-final-gate.js`: PASS; reproducible build 5 artefak identik di versi 2610.
- Tes hash sync + finance S26xx: 109 lulus, 0 gagal. `FILE-HASHES-SHA256.txt`: 0 mismatch terhadap baseline + overlay.

## Catatan temuan (tidak diubah di R4)
- Teks rekomendasi `review-verified-surplus` menampilkan nominal tanpa format ("5000000"), sedangkan angka lain di kartu berformat "Rp 7.000.000" (`finance-allocation-api.js` baris 240).
- Kartu setinggi sekitar 280px pada layar 390px vs sekitar 83px kartu lain karena keterangan panjang.

## Status
**NOT-E2E-VERIFIED untuk lingkungan target.** Hasil di atas berasal dari sandbox pemeriksa; E2E belum dijalankan di lingkungan target yang memblokir Chromium (`ERR_BLOCKED_BY_ADMINISTRATOR`).
