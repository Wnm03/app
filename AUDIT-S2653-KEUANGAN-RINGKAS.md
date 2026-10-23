# Audit S2653 (build 2653), 23 Okt 2026
Akumulasi S2649..S2653 di atas app-main (35)/(36). Tampilan saja; SOT, fungsi, alur sinkron tidak disentuh.

## Perubahan
- K1 Kartu insight Laporan (10) dilipat bawaan, tiap kartu menampilkan 1 baris ringkasan; pilihan buka/tutup pengguna (cardCollapsePrefs) dihormati.
- K1b Kontrol Laporan (bulan, periode, sub-tab) dipindah ke atas lewat CSS order; kartu insight di bawah dengan judul "Kartu Insight".
- K2 Filter Laporan dilipat jadi "Filter (n)"; id select tetap.
- K3 Judul kartu berbahasa Indonesia (runtime, sumber presenter tidak diubah).
- K4 Pilihan/label kepemilikan Akun: teks tampil Indonesia, value SELF/INVESTOR/... tetap.
- K5 Teks bantuan panjang (Laporan, Utang & Piutang, Aset) dilipat jadi ⓘ; font < 12px dinaikkan di Laporan.
- File: modules/shared/pwa-ux-performance.js, modern-ui-layer.css, tests/s2652-keuangan-ringkas.test.js, bundle/html/sw/hash (build resmi).

## Ukuran (390x844, data uji kosong)
Laporan 7,47 -> 3,62 layar; periode & sub-tab terlihat di layar pertama; font <12px 92 -> 0; 360x640: 4,86 layar. 0 scroll horizontal, 0 error JS.

## Bukti
Build 2653 lolos; hash 59 ok; bundle segar; 520 tes terkait (keuangan/laporan/insight/dashboard/hash/pwa-ux) lulus.

## Belum
Full suite & release gate; data nyata (kartu akan lebih tinggi); Android nyata; Utang&Piutang masih 3 teks kecil; Aset & Proyek 1,11 layar.
