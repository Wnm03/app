# Patch Kumulatif S2711 — Car Notes, build v2665

## Baseline dan akumulasi
- Baseline: `app-main (37).zip` (v2660).
- Mengakumulasikan file patch S2709 dan S2710, lalu membangun ulang bundle dari source repository.
- Build final repository menghasilkan versi `v2665`; `index.html`, `app_production.html`, dan `sw.js` sinkron pada v2665.
- ZIP berisi hanya file aplikasi/dokumen/test yang berbeda dari baseline. Folder `node_modules`, cache tes, dan backup otomatis build tidak disertakan.

## Perbaikan yang dibawa
- S2709: benturan nama loader ServiceMasterDB, filtering reminder hanya status actionable, komponen dengan riwayat belum cukup tidak dianggap overdue, konsistensi label kategori, dan SIM H-20 masuk ke reminder terpadu.
- S2710: skor kesehatan tidak memiliki bukti ditandai tidak tersedia; rata-rata armada mengecualikan skor invalid; breadcrumb Insight AI dirapikan.
- S2711: kartu Dashboard sekarang menampilkan `—` dan label `Data Kurang` ketika skor armada tidak tersedia. Ringkasan harian dan insight per kendaraan tidak lagi menghasilkan teks `null/100` untuk skor yang belum bisa dihitung.
- Build source penuh dijalankan melalui `npm run build`; kedua bundle diproduksi ulang dari source, bukan sekadar edit bundle manual.
- Tidak ada migrasi atau perubahan data pengguna.

## Verifikasi
- `npm run build`: PASS; minifikasi diwajibkan, pemeriksaan sintaks dua bundle PASS, HTML production dan index sinkron, cache service worker v2665.
- `node --test tests/carnotes-audit-regressions-s2709.test.js tests/carnotes-audit-regressions-s2710.test.js`: 9/9 PASS.
- `node --check` pada tiga source vehicle yang disentuh dan kedua bundle: PASS.
- `npm run audit:carnotes`: PASS (548 file dipindai, forbidden=0, duplicate IDs terdeteksi 0/0, deklarasi Servis=1).
- `npm run verify-window-expose`: PASS (85 modul yang digunakan via data-action terverifikasi).
- `npm run service-sot-gate`: tidak selesai dalam batas waktu tool; tidak diklaim lulus.
- `npm run test:full`: tidak selesai dalam batas waktu tool; sebagian shard selesai tetapi agregasi suite penuh tidak tercapai. Tidak diklaim full-suite PASS.
- Headless Chromium juga tidak selesai dalam batas waktu tool, sehingga validasi browser akhir S2711 masih belum terverifikasi.

## Sisa temuan / batasan yang belum ditutup
1. Dua entri `Kabel Rem Belakang` dengan ID berbeda belum digabung. Penggabungan otomatis tidak aman karena bisa salah mengatribusikan riwayat servis. Perlu pemetaan alias eksplisit setelah ID dan seluruh konsumen dikonfirmasi.
2. `Uji Kelayakan` tetap tersedia; belum ada predicate jenis kendaraan yang cukup kuat untuk menghapus/menyembunyikan item ini secara aman.
3. Skor `100/100` dengan bukti perawatan yang sedikit masih bisa memberi kesan kepastian terlalu tinggi. Ambang kecukupan bukti minimum belum ditetapkan oleh aturan domain; patch ini hanya memastikan ketiadaan skor tidak disamarkan sebagai nol.
4. Integrasi eksternal dan PWA offline masih belum tervalidasi dalam browser.

## Status
Patch siap untuk audit lanjutan, bukan bukti bahwa semua bug substantif sudah nol. Sebelum rilis, jalankan ulang full test, service SOT gate, dan audit Chromium pada hasil v2665.
