# Fase 1B — Pengurangan `!important` berbasis selector (S2757)

## Cakupan

Fase ini melanjutkan patch kumulatif Fase 0 + Fase 1 (S2756). Perubahan dibatasi pada dua deklarasi di `modern-ui-layer.css`; tidak ada refactor `@layer`, perubahan markup, JavaScript, data, maupun alur bisnis.

## Perubahan

1. `#page-shop .shop-import-export-actions > button`: `margin: 0 !important` menjadi `margin: 0`. Selector memuat ID `#page-shop` sehingga spesifisitasnya mengungguli utility `.u-mb8` dan aturan tombol generik yang memakai class. Tidak ada style inline pada tombol-tombol ini.
2. `#page-shop .shop-fab-retired`: `display: none !important` menjadi `display: none`. Elemen `#shopFab` adalah elemen retired tanpa style inline; aturan ini merupakan satu-satunya aturan `display` yang menargetkan `.shop-fab-retired`.

## Angka dan batas klaim

- Sebelum Fase 1B: 187 deklarasi `!important` pada tiga stylesheet utama (`styles.css` 106, `modern-ui-layer.css` 78, `pwa-ui-layer.css` 3).
- Sesudah Fase 1B: 185 deklarasi. Pengurangan 2 deklarasi (±1,1%).
- Angka 115 pada rencana awal berasal dari audit lama/cakupan file berbeda; inventaris aktual S2756 menghitung 187 pada tiga stylesheet tersebut.
- Tidak ada penghapusan massal. Deklarasi yang mengendalikan reduced-motion, navigasi atomik, modal, hidden state, scanner session, kontrol sentuh, atau override inline tetap dipertahankan.

## Cache dan rilis\n\n- Cache service worker dinaikkan ke `kw-cache-v2757`; query asset pada kedua HTML dinaikkan dari `v=2756` ke `v=2757` agar CSS baru tidak tertahan cache lama.\n- Build JS tidak diubah karena tidak ada perubahan JavaScript.\n\n## Regresi

Ditambahkan `tests/fase1b-important-reduction.test.js` untuk menjaga kedua rule tetap ada dan memastikan properti yang dirapikan tidak kembali memakai `!important`.

Full suite dan browser capture lintas viewport/tema tidak diklaim selesai pada tahap ini. Release lint/minify juga belum diklaim PASS; jalankan pada lingkungan build yang memiliki dependensi lengkap dan jaringan.
