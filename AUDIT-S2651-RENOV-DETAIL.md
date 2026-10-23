# Audit S2651 (build 2651), 23 Okt 2026
Akumulasi: S2649 + S2650 + S2651 di atas app-main (35). Beranda = baseline.

## Perbaikan (P1-2 Renovasi, detail proyek)
1. `modules/home/renovasi.js`: baris item membawa `data-renov-item-id`. Sebelumnya chip "Lunas" jatuh ke item yang salah (pemetaan indeks, daftar menampilkan belum lunas dulu).
2. `modules/shared/pwa-ux-performance.js`: tombol `renovDeleteProjectCur` di modal detail dipindah ke menu ⋯ di header. `data-action` dan konfirmasi tidak berubah.
3. `tests/s2651-renov-detail-fix.test.js` (baru).

## Bukti
- Build resmi `build.js --require-minify` -> 2651; hash 59 ok, 0 basi; bundle segar.
- Tes terarah 78 lulus, 0 gagal (termasuk Renovasi, hash, dua tes Beranda).
- Chromium 390x844 dan 360x640: chip Lunas pada item lunas, tanpa coretan; tombol hapus tersembunyi saat menu tertutup dan tampil saat dibuka; 0 scroll horizontal; 0 error JS. Shop (P1-3) dan Car Notes (P1-4) sesuai.

## Belum terverifikasi
- Full suite dan `verify-release-ready.js` belum dijalankan ulang pada 2651 (terakhir lulus di S2650).
- Keyboard Android nyata, jalur simpan Order/PO, OCR.
- Car Notes dengan data benar-benar kosong.
Unggah SEMUA file yang berubah, bukan hanya HTML.
