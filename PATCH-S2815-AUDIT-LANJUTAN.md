# PATCH S2815 — Audit lanjutan (akumulatif di atas S2814; basis app-main (10) + S2812 + S2813)
Isi zip = semua file yang berubah vs app-main asli, termasuk keluaran build (versi 2822) dan catatan PATCH-S2812/S2813/S2814. Unggah SEMUA file.

## Tambahan S2815
1. Utilitas u-* yang dipakai di markup tapi tanpa CSS kini terdefinisi (di modern-ui-layer.css, karena styles.css dibatasi 180000 byte oleh tes S1931): u-ml10, u-flex-between, u-jcsb, u-grid, u-grid3, u-t3, u-pt10, u-mt14, u-py4, u-my12, u-flex-1, u-fs20, u-fs9 (lantai var(--fs-caption), bukan 9px). Pemakai: Dana Titipan, Audit Keuangan, Renovasi (modal DP/Bayar), Servis, Proyeksi Kas, Aset, bagan alur Shop.
2. modules/shared/profil-pengaturan.js + modern-ui-layer.css — link ke console.anthropic.com dan aistudio.google.com (petunjuk API key) diberi kelas hint-ext-link: area sentuh 44px lewat ::after (teks tetap 17px tinggi) dan rel="noopener noreferrer". Hit-test ±18px dari tengah link = True di 360.
3. tests/s2815-utilitas-dan-link.test.js (baru, 3 tes).

## Bukti
- Menu "+" diuji tap asli di 6 halaman (Beranda, Uang, Shop, Aset, Mobil, Pajak) x 390 & 360: 4/4 item hit-test True di semua. Dugaan S2814 tentang navFabToggle/offsetParent DICABUT: FAB halaman memang sengaja dimatikan (S2617); menu pusat yang aktif.
- Aksi "Catat Sudah Bayar" (Pajak) bukan modal: toast bila kewajiban 0, selain itu askConfirm (kode dibaca; konfirmasi data tidak dijalankan).
- Checkbox 13-20px: semuanya di dalam <label> berbaris >= 44px; tap di sisi kanan label membuat toggle (kendaraan komponen, mode lama, budget rollover) di 360.
- Crawl baru: Pengaturan, AI, Pajak 360 (4 konfigurasi) dan tema modern + auto (390, semua halaman): 0 error JS, 0 scroll horizontal halaman, 0 teks meluap, 0 font <11px.
- Regresi penuh S2814 -> S2815 (4 konfigurasi): 0 error, 0 scroll horizontal, 0 teks meluap, 0 font <11px; tidak ada layar bersama yang memburuk. Layar 240->249 (390), 229->238 (360) karena Pengaturan/AI ikut di-crawl. offscreen +12 = chip "Pertanyaan cepat" AI (baris geser, disengaja). small +2 = link API (hit area via ::after tidak terhitung metrik).
- Build 2822, verify-bundle-freshness segar, hash 52/52. Full suite 9785 lulus, 3 gagal = baseline (S1780, s1608, S2308). Sempat gagal S1931 (anggaran styles.css) karena utilitas ditaruh di styles.css; dipindah, hijau.

## Belum terverifikasi
- Efek visual utilitas baru pada layar yang memakainya (Dana Titipan, Audit Keuangan, modal DP/Bayar Renovasi, Servis, Proyeksi Kas) tidak dilihat per layar; hanya computed style dan metrik crawl. Layar yang butuh data khusus mungkin tak tercapai crawl.
- Pengaturan hanya ter-crawl sebagian (tab Profil dan Keuangan + 1 modal); tab/seksi lain tidak terdeteksi harness.
- Simpan data lewat modal Produk/Kendaraan (lipatan baru), konfirmasi zakat berisi data, dan kontras warna (tidak diukur otomatis) belum diuji.
- Tema modern/auto hanya 390x844, tanpa 360x640.
- Perangkat nyata / Android WebView / keyboard virtual belum diuji.
- Harness melaporkan entri ERR/TAPFAIL/NOOVERLAY yang sama sebelum dan sesudah (artefak crawl).
- Screenshot dalam zip diperkecil 50% dan 40 warna agar muat batas unggah 30 MiB.
