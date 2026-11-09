# Fase 4C — Grid tablet dan panel detail di kanan (S2775)

Rujukan: RENCANA-UPGRADE-FRONTEND.md §C.5 ("tablet = 2 kolom; desktop = ... panel detail di kanan") dan §D Fase 4. Seluruhnya CSS di `tokens.css` (blok FASE 4C), tanpa `!important`, tanpa JS sumber baru.

## Perubahan
- **768–1279px:** ringkasan Aset dan Car Notes (`#asetTab-ringkasan`, `#cniTab-*`, `#cnbTab-ringkasan`) memakai 2 kolom. Aturan 4A yang sama sebelumnya baru mulai di 1280px (aturan 4A tidak diubah).
- **768–1023px:** daftar kartu Aset (`#assetList`) dan produk Shop (`#productList`) 2 kolom. Filter, banner, dan empty-state melebar penuh. Di ≥1024px kedua daftar sudah tabel padat (S2774).
- **≥1280px:** form edit Transaksi, Aset, dan Produk (`#txModal`, `#assetModal`, `#productModal`) tampil sebagai panel di sisi kanan selebar min(480px, 40vw), tinggi penuh, bukan bottom-sheet selebar layar. Animasi masuk hanya bila `prefers-reduced-motion: no-preference`. Modal lain (PIN, konfirmasi, kalkulator, menu cepat) tidak disentuh.
- Tes baru: `tests/fase4c-s2775-tablet-grid-detail-panel.test.js` (6 tes).

## Batas klaim (penting)
- **Bukan master–detail penuh.** Panel kanan tetap berupa modal: overlay masih menutupi daftar dan klik di luar panel menutupnya. Daftar tidak tetap interaktif di samping panel. Master–detail sungguhan (daftar tetap hidup, baris terpilih, panel membaca ulang saat memilih baris lain) butuh perubahan JS dan belum dikerjakan.
- **Tidak diukur di browser** (Chromium tidak tersedia): grid 768–1279px dan panel kanan ≥1280px belum dilihat, termasuk keyboard virtual (`--kb-h`) dan tema Graphite/Modern. Jalankan `tools/capture-fase1b-extended.py` di 768, 1024, 1280, dan 1440px.
- Belum: Dana Titipan dan Car Notes (selain ringkasan) di tablet, master–detail JS, lint/minify penuh, Safari/Firefox, Android. `!important` 186, `@layer` belum.
