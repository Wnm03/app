# S2603 — Guard SOT dan Kepemilikan pada Alokasi Dana

## Keputusan
Tahap ini sengaja **tidak mengubah aturan SOT, OwnershipEngine, perhitungan saldo akun, skema data, atau alur penyimpanan**. Yang ditambahkan hanya tes regresi untuk menjaga batas arsitektur alokasi dana yang sudah ada.

## Perubahan
- Tambah `tests/s2603-finance-allocation-sot-ownership-guard.test.js`.
- Tidak ada perubahan pada `modules/finance/akun.js`, engine kepemilikan, klasifikasi SOT, dashboard, API alokasi, atau bundle produksi pada tahap ini.
- API alokasi tetap memakai proyeksi yang sudah tersedia sebagai indikasi, bukan mengklaim proyeksi itu sebagai kas bebas aktual.
- `safeInvestableAmount` tetap `null`; `investmentAllowed` tidak menjadi `true`.
- Tidak menambahkan mesin saldo/kewajiban kedua, tidak menulis transaksi, dan tidak mengubah storage.

## Pengujian
- Tes S2603 + tes API/kartu S2601 + tes engine kepemilikan dan integrasi agregat: **58 lulus, 0 gagal**.
- `release-ui-gate.js`: lulus (27 tes UI/kontrak yang ditampilkan oleh gate).
- `sot-integrity-gate.js`: lulus; sumber runtime 413, versi `s2595-carnotes-null-interval-guard-2602`, HTML dan SW 2602.
- `verify-bundle-freshness.js`: kedua bundle segar.
- Patch contamination: lulus.
- Performance budget: lulus.
- Build penuh dan full-suite tidak dijalankan pada tahap ini karena source produksi tidak berubah; ini bukan klaim full release certification.

## Batas dan risiko yang masih terbuka
Nominal kas bebas aktual belum dapat ditetapkan dengan aman hanya dari proyeksi bulanan. Perlu rekonsiliasi yang membuktikan satu sumber kanonis per kewajiban, status pembayaran periode, akun kas bebas vs dana dikunci/investasi, dana titipan, dan cadangan dana darurat tertaut—tanpa menulis ulang aturan SOT/kepemilikan. Sampai bukti tersebut tersedia, keputusan konservatif tetap: jangan mengeluarkan nominal investasi.

## Integritas baseline
Baseline asli `app-main (32).zip` tidak diubah. Source produksi dan bundle tidak diubah dalam S2603; perubahan tahap ini hanya tes dan dokumen.
