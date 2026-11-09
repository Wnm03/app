# Fase 1B / Fase 1 — S2758 (akumulasi di atas S2757)

## Perubahan

- Mempertahankan seluruh file S2757.
- Memperbaiki lantai ukuran angka ringkasan Piutang dan Inventori di kartu Kekayaan Bersih: `clamp(10px, 2.8vw, 14px)` menjadi `clamp(12px, 3.1vw, 14px)`. Pada viewport 390px ukuran tidak lagi turun ke 10,92px; ukuran minimum 12px dipertahankan dan ukuran maksimum tetap 14px.
- Menambah tes regresi untuk lantai 12px.
- Menambahkan inventaris 185 deklarasi `!important` per selector dan catatan cakupan screenshot yang masih kosong.

## `!important` dan `@layer`

Jumlah tetap **185** (styles.css 106, modern-ui-layer.css 76, pwa-ui-layer.css 3). S2758 tidak menghapus deklarasi tambahan karena pemeriksaan statis menemukan deklarasi yang bergantung pada hidden/state, reduced-motion, modal, atau inline style. Target `<40` belum tercapai dan tidak akan diklaim selesai.

`@layer` belum diterapkan. Migrasi parsial akan mengubah cascade: normal unlayered mengalahkan normal layered, sedangkan urutan prioritas `!important` antar-layer berbalik. Ini perlu migrasi terpisah setelah capture lengkap, bukan menambahkan wrapper kosong yang tidak memberi manfaat.

## Verifikasi

- Tes fokus Fase 0/Fase 1/Fase 1B: dijalankan setelah overlay; hasil dicatat pada laporan final.
- Full suite: dimulai tetapi tidak selesai dalam batas eksekusi 300 detik (output mencapai test #3206 sebelum timeout). Tidak diklaim PASS.
- Browser capture: gagal dibuka karena Chromium memblokir localhost dan file URL dengan `ERR_BLOCKED_BY_ADMINISTRATOR`; screenshot sub-tab/modal belum tersedia.
- Release lint/minify: belum dijalankan; environment build/jaringan lengkap diperlukan sesuai catatan S2757.

## Batas perubahan

Tidak ada perubahan JavaScript, data, alur bisnis, markup, cache key, atau service worker. Perubahan runtime hanya satu deklarasi CSS di `modern-ui-layer.css`.
