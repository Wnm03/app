# Fase 3A — S2763 (akumulasi di atas S2762)
- `tokens.css`: fade scroll-driven kiri/kanan untuk baris tab/chip horizontal (temuan #2: tab terpotong tanpa indikator). Dipakai `@property --kw-fade-l/r` + `animation-timeline: scroll(self inline)`; selector ber-ID ditambahkan karena aturan mobile `#page-*>.cn-tabs` sebelumnya mematikan mask.
- Diukur di Chromium: awal `0px / 24px`, tengah `24px / 24px`, akhir `24px / 0px` (kiri/kanan). Versi 2763; tes `tests/fase3a-s2763-tab-fade.test.js` (3 tes).
- Batas: Safari/Firefox belum diuji (tanpa dukungan → perilaku lama); tidak mengubah jumlah baris tab (itu sisa Fase 3).
