# S2643/2644 — Tahap 2 (tampilan saja; fungsi & SOT tidak diubah)

Akumulasi di atas S2638 + P0-6..9 (S2642). Build akhir 2644, `release:preflight` lolos, `npm test` 9.144 lulus / 0 gagal (+11 tes baru dari S2641 dan S2643).
Chromium 141, 360/390/430 px.

Dikerjakan: P0-4, P0-5, P1-6, P1-11/P1-22 (font select), P1-12 (toast), P1-13 (bilah Total), P1-21 (atribut input).
Belum: P0-1, P0-2, P0-3 (butuh helper baca-state), P1-1..5, P1-7..10, P1-14..20, P2.

| Langkah | Hasil terukur |
|---|---|
| P0-4 | placeholder Cari kategori tampil 🔍 (sebelumnya teks escape mentah) |
| P0-5 | hint Servis & Oli: "Jenis servis otomatis tercatat sebagai Oli Mesin" (sesuai A10; K7 masih terbuka) |
| P1-6 | label/teks teknis diganti bahasa awam (Komponen servis, Nama kategori mengikuti komponen, Harga total berbeda…); label `for` di komponen stok |
| P1-11/22 | select di `.overlay` dan input file = 16px (Order: 3 dari 3 select) |
| P1-12 | toast saat modal terbuka: di atas tombol/bilah Total (390: 660–700 vs bilah 728), tidak menutupi judul |
| P1-13 | bilah "Total tagihan Rp X" (Order) dan "N produk Rp X" (PO) sticky, tinggi 40 px, terlihat tanpa scroll di 390×844 (728–768, tombol 776–820) dan 360×640 (524–564, tombol 572–616); teks mengikuti sumber |
| P1-21 | enterkeyhint/autocomplete/autocapitalize pada input Order & PO; aria-label + enterkeyhint pada input baris Scan Nota; aria-label pada `servisJobType`, `stockCatId` |

Regresi: simpan Order identik dengan build sebelum perubahan; keyboard emulasi (390/330, 360/290) tetap lulus; scroll horizontal 0 px di 9 modal pada 360/390/430; kontras P0-8 tidak berubah.
Keterbatasan: keyboard Android nyata belum diuji; K16 (label Inggris Business Status) terbuka; modal `modules/modals.js`, `asset/modals.js`, `shop/modals.js` (salinan tak dibundel) tidak diubah.
