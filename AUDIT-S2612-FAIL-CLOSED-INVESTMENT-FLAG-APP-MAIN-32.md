# Audit S2612 — konsistensi fail-closed izin investasi

## Tujuan
Menjaga satu kontrak eksplisit untuk semua hasil `FinanceAllocationAPI.summary()`: bila data proyeksi tidak tersedia atau tidak valid, izin investasi harus bernilai `false`, kas bebas aktual tidak terverifikasi, dan nominal aman tetap `null`.

## Temuan yang diperbaiki
Pada cabang `INSUFFICIENT_DATA` di `modules/finance/finance-allocation-api.js`, API telah mengembalikan `actualFreeCashVerified: false` dan `safeInvestableAmount: null`, tetapi tidak menyertakan `investmentAllowed: false`. Akibatnya bentuk hasil gagal tidak konsisten dengan hasil valid dan pemanggil yang memeriksa flag secara eksplisit menerima `undefined`, bukan penolakan eksplisit.

## Perubahan S2612
- Menambahkan `investmentAllowed: false` pada cabang `INSUFFICIENT_DATA`.
- Memperkuat tes S2601 untuk memeriksa ketiga indikator fail-closed sekaligus.
- Menambahkan `tests/s2612-finance-allocation-fail-closed-flag.test.js`: forecast gagal, proyeksi hilang, nilai non-finite, dan cashflow dashboard tidak valid tanpa fallback/recompute.
- Build produksi dengan esbuild; versi sinkron diperbarui dari cache version 2602 menjadi 2603 dan kedua bundle dihasilkan ulang.
- Memperbarui `FILE-HASHES-SHA256.txt` setelah build.

## Batas yang sengaja dipertahankan
Perbaikan ini **tidak** menghitung kas bebas aktual, tidak membuka investasi, tidak membuat transaksi/target/storage baru, dan tidak mengubah SOT, `OwnershipEngine`, formula saldo, ownership, atau aturan pembayaran tagihan. Nominal aman tetap `null` sampai sumber kanonis dapat merekonsiliasi saldo SELF yang memenuhi syarat, dana terikat, cadangan, tagihan belum dibayar, dan kewajiban tanpa hitung ganda.

## Validasi
- Tes terkait S2601 + S2612: **11 lulus, 0 gagal**.
- Full suite: **9.045 tes, 9.044 lulus, 0 gagal, 1 dilewati**.
- Release UI gate: PASS.
- SOT integrity: PASS; runtimeSources=413, versi sumber/HTML/SW sinkron pada 2603.
- Bundle freshness: PASS untuk kedua bundle.
- Patch contamination: PASS.
- Performance budget: PASS.
- Architecture integrity: PASS; runtime entries=413.
- Persistence integrity: PASS.
- `FILE-HASHES-SHA256.txt --check`: 41 entri cocok, 0 basi, 0 hilang.
- ZIP integrity: diperiksa saat paket dibuat.
- E2E Chromium tidak dijalankan pada tahap ini.

## Keputusan
Kontrak izin investasi sekarang eksplisit fail-closed di cabang data tidak cukup. Ini bukan bukti kas bebas aktual telah direkonsiliasi dan bukan persetujuan rilis keseluruhan aplikasi. Baseline `app-main (32).zip` tidak diubah; SHA-256 tetap `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781`.
