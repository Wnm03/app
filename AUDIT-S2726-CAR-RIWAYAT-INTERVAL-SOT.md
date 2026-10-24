# AUDIT S2726 — Domain Car Notes: riwayat → interval (1 SOT) + tampilan pilihan kategori servis

Dijalankan nyata di Chromium (Playwright 1.56, Chromium 141) terhadap app-main_39, viewport 320/360/390/412 px. Tidak ada fungsi SOT yang diubah.

## A. Yang diperbaiki (tampilan saja)
**Gejala:** "Kategori Servis (pilih satu atau beberapa)" + chip kategori memanjang ke kanan, terpotong di tepi layar.
**Akar masalah (terukur):** `modern-ui-layer.css` memberi `#servisMasterCategoryChips.servis-category-chip-strip` `display:flex; nowrap` + `> * {flex:0 0 auto}`. Wadah itu berisi 3 anak (label 209px, deretan chip 1713px, teks bantuan 303px) → ketiganya berjejer satu baris, scrollWidth 2241px vs lebar 336px.
**Perbaikan:** wadah menjadi blok vertikal; deretan chip membungkus ke bawah; chip dibatasi `max-width:100%`. Hanya CSS (`modern-ui-layer.css`), JS tidak disentuh.
**Bukti sesudah:** scrollWidth = clientWidth di 320/360/412 px, elemen overflow 0, overflow dokumen 0, tinggi blok kategori 13 chip ≈ 318px (360px). Test baru `tests/s2726-servis-category-chips-wrap.test.js` (3 test). 640/640 test servis/reminder lolos. Build 2691, bundle segar.

## B. Temuan logika (TIDAK diubah — butuh keputusan Anda)
Matriks nyata `computeServiceUrgency` (odometer 22.000, log 21.311 km), per komponen × aksi:

| Komponen (mode) | ganti saja | periksa saja | bersih saja |
|---|---|---|---|
| V-Belt (periksa-conditional, gr=true) | reset ✔ | reset sumbu periksa ✔ | tidak reset |
| Boss Pulley (periksa) | reset ✔ | reset ✔ | tidak reset |
| **Pelumasan CVT Grease (none→Bersihkan)** | **TIDAK reset ✘ (unknown)** | tidak reset | reset ✔ |
| **Pembersihan Rumah CVT (bersih)** | **TIDAK reset ✘** | tidak reset | reset ✔ |
| **Busa Filter CVT (bersih)** | **TIDAK reset ✘** | tidak reset | reset ✔ |
| Per Sentri / Bearing Bak (gr=false) | tidak reset (sesuai kebijakan, berbasis kondisi) | – | – |

**T1 — "Ganti" tidak me-nol-kan interval pada komponen sumbu Bersihkan** (inilah layar Anda: "Terakhir diganti 18 Okt · 21.311 km" tapi "Belum ada riwayat yang mereset interval", status ⚪ baseline belum diketahui). Dua pembaca riwayat berbeda aturan: `summarizeServiceHistory` (baris "Terakhir diganti") menganggap ganti sah; `computeServiceUrgency/matchesActionTypeForReset` (baseline) hanya menerima `bersih`. Padahal pola yang sama sudah ada untuk sumbu periksa (S2230: ganti juga mereset sumbu periksa). Usulan 1 baris di `addCandidate` (`sparepart-servis.js`): perlakukan `lastFilter==='bersih'` seperti `inspectAxis` (ganti ⇒ reset). Aturan Anda terpenuhi: ganti ⇒ 0 di semua sumbu; periksa ⇒ hanya sumbu periksa; bersih ⇒ hanya sumbu bersih.

**T2 — Kartu kategori lama (tanpa `serviceComponentId`: "Servis Cvt", "Grease Cvt", "Pin brake pad", "Slidepiece cvt") tidak pernah punya baseline bila riwayatnya sesi multi-komponen.** Terbukti: 1 baris checklist ⇒ reset ✔; ≥2 baris (aksi apa pun, termasuk semua `ganti`) ⇒ `lastKm=null`, unknown, padahal "3 riwayat tercatat". Ini fail-closed S2175 yang disengaja (aksi kategori tak bisa dipetakan ke baris komponen). Solusi tanpa mengubah SOT: migrasi kartu lama ke komponen katalog (mis. Roller CVT/Slide Piece/Pelumasan Grease) lewat Kelola Kategori, atau beri tanda "butuh dipetakan" di kartu.

**T3 — Label kartu menyesatkan** saat T1/T2 terjadi: "Terakhir diganti…" bersebelahan dengan "Belum ada riwayat yang mereset interval". Cukup perbaiki teks setelah T1/T2 diputuskan.

## C. Belum dicakup
Data asli Anda (backup) tidak ada di ZIP, jadi angka di layar Anda (16 Aman / 12 Belum diketahui) belum direproduksi persis; matriks memakai fixture sintetis dari katalog komponen asli app. Full suite penuh (±7.000 test) tidak dijalankan; hanya 640 test servis/reminder.
