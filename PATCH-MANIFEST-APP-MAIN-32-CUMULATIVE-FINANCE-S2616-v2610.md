# Manifest patch kumulatif S2616-R1 — app-main (32), aset v2610

## Rantai akumulasi
- Baseline: `app-main (32).zip`
- SHA-256 baseline: `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781`
- Parent langsung: `PATCH-APP-MAIN-32-CUMULATIVE-FINANCE-S2616-v2610-NOT-E2E-VERIFIED.zip`
- SHA-256 parent: `6a2645024979c84dab021dbfc44faff9f5771210a3ef3ee63e4d4034d2641232`
- Jenis: overlay kumulatif; bukan source archive mandiri.
- R1 hanya memperbaiki runner E2E dan metadata integritas/manifest; source aplikasi produksi serta bundle tidak berubah dari S2616.

## Perubahan R1
- `e2e/run-e2e.js` diganti dengan skrip yang mengaktifkan tab Laporan melalui `setKeuanganTab('laporan')` sebelum mengukur kartu `Alokasi Dana Aman`.
- Ini memperbaiki prasyarat visibilitas: kartu berada di `#keuanganTab-laporan`, yang tersembunyi sebelum tab Laporan dibuka.
- `FILE-HASHES-SHA256.txt` diperbarui untuk skrip E2E baru.
- Status full suite dinyatakan pending/tidak terverifikasi secara independen; tidak mengulang klaim angka yang belum bisa dibuktikan.

## Verifikasi yang dijalankan untuk R1
- `node --check e2e/run-e2e.js`: PASS.
- Tes terpilih finance S26xx, kontrak bundle, dan sinkronisasi hash: 114 lulus, 0 gagal (hasil pemeriksaan independen; set tes berbeda dari hitungan 111 sebelumnya).
- `FILE-HASHES-SHA256.txt` terhadap gabungan baseline + overlay: 41 entri, 0 basi, 0 hilang.
- Eksekusi E2E di lingkungan pembuat patch: tidak berjalan sampai skenario karena Chromium mengembalikan `net::ERR_BLOCKED_BY_ADMINISTRATOR`; ini bukan hasil PASS/FAIL aplikasi.
- E2E 19/19 setelah tab Laporan dibuka: terverifikasi oleh pemeriksa independen pada sandbox Chromium (laporan pemeriksaan terpisah). Ini bukti E2E di sandbox tersebut; bukan bukti bahwa E2E telah berjalan di lingkungan target rilis.
- ## Verifikasi tambahan setelah R2
- Full suite: 9.091 tes, 9.090 lulus, 0 gagal, 1 dilewati; seluruh 32 checkpoint valid pada run yang sama.
- `node scripts/release-final-gate.js`: PASS.
- `npm run test:e2e`: berhenti dengan `net::ERR_BLOCKED_BY_ADMINISTRATOR` sebelum skenario; hasilnya environment-blocked, bukan PASS/FAIL aplikasi.


## Status
**NOT-E2E-VERIFIED untuk lingkungan target.** Full suite dan release-final-gate lulus pada salinan kerja; E2E di lingkungan pembuat patch/target masih diblokir kebijakan browser.
