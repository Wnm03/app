# PATCH S2814 — Audit UI lanjutan: FAB "+", lipatan modal, font kecil (390x844 & 360x640, gelap+terang)
Basis: app-main (10) + PATCH-S2813 (kumulatif; zip ini memuat juga file S2812/S2813). Isi zip = hanya file yang berubah vs app-main asli, termasuk keluaran build (versi 2820). Unggah SEMUA file.

## Perbaikan
1. index.html — #navFabFallbackMenu (menu aksi cepat "+") dipindah ke LUAR <nav>. Nav punya backdrop-filter (jadi containing block elemen fixed) + overflow:hidden, sehingga menu terpotong dan 3 dari 4 item tidak bisa diketuk.
2. modules/shared/pwa-ux-performance.js — lipatan modal Produk/Kendaraan memakai `.modal` di dalam overlay sebagai owner (sebelumnya overlay, sehingga seluruh .modal terbungkus <details>). "Identitas & stok" kini 4 field di bawah judul (sebelumnya 21 input).
3. modern-ui-layer.css — tombol "Nonaktif" (koreksi stok) tidak menyusut (sebelumnya terpotong di 360px); baris Harga Beli/Jual rata bawah.
4. styles.css — Car Notes: label metrik 10->11px; tombol aksi ringkasan 10->11px dan 9->11px (<380px).
5. tests/s2814-fab-modal-audit.test.js (baru, 3 tes). FILE-HASHES-SHA256.txt disegarkan.

## Bukti
- Tap asli FAB di Beranda (390 & 360): 4/4 item menu hit-test True dan terbuka (Pengeluaran membuka modal). Sebelumnya 3/4 tertutup (dilihat di audit Tahap 3).
- Screenshot modal Tambah Produk 360 dilihat langsung: lipatan di bawah judul; "Nonaktif" 76px tanpa terpotong; pBeli/pJual rata bawah (bottom 328/328).
- Audit browser 4 konfigurasi, S2813 -> S2814 (harness sama, tap asli): error JS 0 -> 0; scroll horizontal halaman 0 -> 0; teks meluap 0 -> 0; font <11px 73 -> 0 (390) dan 219 -> 0 (360); layar 234 -> 240 (390), 223 -> 229 (360).
- Area sentuh kecil 132 -> 367 per konfigurasi BUKAN regresi: seluruhnya dari modal Kendaraan (checkbox veh-maint-component, vehLegacyServiceMode) yang kini terstruktur dan terukur + 6 layar "validasi" baru terjangkau. Layar lain tidak berubah.
- Build 2820, verify-bundle-freshness segar, hash 52/52 ok. Full suite: 9782 lulus, 3 gagal = baseline (S1780, s1608, S2308).

## Belum terverifikasi
- Perubahan perilaku nyata: modal Produk & Kendaraan kini benar-benar memakai lipatan (kode sudah ada tapi tak berjalan). Belum dites simpan data lewat modal ini.
- navFabToggle memfilter .keu-fab dengan offsetParent!==null; elemen position:fixed selalu null, jadi FAB halaman (Uang/Shop/Mobil) tidak terbuka lewat "+" dan yang muncul menu cadangan (dugaan dari kode; logika event, tidak diubah).
- FAB Mobil tidak diuji ulang setelah menu dipindah. Pajak 360, Pengaturan, AI tidak di-crawl. Tema modern/auto tidak diaudit. Kontras tidak diukur otomatis.
- Checkbox 13px (budgetCatChk dll) belum diuji tap di input-nya. Perangkat nyata/Android WebView/keyboard virtual belum diuji.
- Harness mencatat 16-17 entri ERR/TAPFAIL/TABFAIL per konfigurasi, sama persis sebelum dan sesudah (artefak crawl, tidak diselidiki ulang).
- Screenshot dalam zip diperkecil 50% dan dikuantisasi ke 128 warna agar ringan; ukuran asli 2x tidak ikut.
