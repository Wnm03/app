# PATCH S2905 — Dana Titipan: nilai pemilik = POKOK (selisih diselaraskan), untung hanya CATATAN
Basis: app-main_21 + S2900–S2904 -> build 2918. AKUMULATIF: semua file S2900–S2905 ada di ZIP ini; salin menimpa. Menggantikan zip S2904 (S2904 digantikan S2905; tes s2904 dihapus). Lalu hapus modules/modals.js dan modules/shop/modals.js (sudah tercantum di DELETE-FILES.txt bawaan).
KOREKSI: zip S2904 sebelumnya menimpa DELETE-FILES.txt dengan 2 baris -> 5 tes manifes hapus gagal. Zip ini TIDAK menyentuh DELETE-FILES.txt; bila S2904 sudah disalin, kembalikan DELETE-FILES.txt dari app-main_21 (13 baris).

## Latar (backup asli 21 Nov 2026)
Porsi holding Majoris diatur berdasarkan NILAI (mas sihab 15,674% x 10.845.758 = 1.700.000 = pokok), sedangkan biaya tercatat lebih rendah (1.673.502). Selisih 26.498 muncul ganda: sbg "untung" dan sbg "belum teralokasi". Pada renov: 141.777 (sisa) vs untung 128.707.

## Aturan (modules/finance/dana-titipan-portfolio-render.js; tampilan saja)
_ownerAlign(o), hanya status OK dgn pokok tercatat:
- align = min(sisa belum teralokasi, jumlah untung positif holding). Sisa di atas itu (uang menganggur) tetap tampil sbg belum teralokasi.
- Masuk holding = biaya + align; Kini = Masuk (untung TIDAK ditambahkan ke nilai pemilik; hasil tidak dibagi).
- "Catatan hasil" = nilai holding − Masuk (informatif; renov −13.070 = rugi bersih holding lain, mas sihab 0).
- Status "terpakai/sisa", "Estimasi Belum Teralokasi", "Total Teralokasi", "Total Estimasi Belum Teralokasi" dan tombol catat sisa memakai angka terselaraskan.
Agregasi (DanaTitipanPortfolioAPI), kekayaan bersih, dan baris per-holding tidak diubah (baris holding tetap menampilkan untung mentah sbg catatan).

## Bukti
Browser (Chromium, backup asli): mas sihab pokok 1,7 jt / terpakai 1,7 jt / sisa 0, Masuk 1.700.000 -> Kini 1.700.000, catatan +0. renov pokok 11 jt / terpakai 11 jt / sisa 0, Masuk 9.566.338, catatan −13.070. Total Estimasi Belum Teralokasi Rp 0. Tanpa error halaman/konsol.
Tes baru tests/s2905-titipan-pokok-untung-catatan.test.js (6). Full suite 10307 tes: 10306 lulus, 0 gagal, 1 dilewati. verify-docs-sync, verify-bundle-freshness, verify-window-expose lulus. Build 2918 (sw.js & docs/sw.js = kw-cache-v2918).

## Catatan
- Berlaku untuk semua pemilik titipan berstatus OK: untung tidak masuk nilai pemilik, selalu jadi catatan.
- Belum diuji di HP asli.
